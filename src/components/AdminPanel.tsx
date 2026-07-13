import React, { useState, useEffect, useCallback } from 'react';
import {
    Building2, Users, DollarSign, LogOut, RefreshCw,
    Crown, AlertTriangle, CheckCircle2,
    Search, Edit3, Save, X,
    Eye, Loader2, Ban, Key, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import LeadsCRM from './LeadsCRM';

interface AdminPanelProps {
    adminEmail: string;
    onLogout: () => void;
    onSwitchToUser?: () => void;
    onImpersonate?: (churchId: string) => void;
}

const PLAN_COLORS: Record<string, string> = {
    trial: '#f59e0b',
    starter: '#2563eb',
    growth: '#a855f7',
    enterprise: '#10b981',
};

const PLAN_LABELS: Record<string, string> = {
    trial: 'Free Trial',
    starter: 'Starter $199.99',
    growth: 'Growth $399.99',
    enterprise: 'Enterprise $399.99', // Keep as fallback if needed
};

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Stat Card ─────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; delay?: number }> = ({
    label, value, sub, icon: Icon, color, delay = 0,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        style={{
            background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
            </div>
            <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: '#475569' }}>{sub}</div>}
    </motion.div>
);

// ── Edit Plan Modal ────────────────────────────────────────────────────────
const EditPlanModal: React.FC<{
    church: any;
    onClose: () => void;
    onSave: (churchId: string, plan: string, endDate: string) => Promise<void>;
}> = ({ church, onClose, onSave }) => {
    const [plan, setPlan] = useState(church.plan || 'trial');
    const [endDate, setEndDate] = useState(
        church.subscription_end_date
            ? new Date(church.subscription_end_date).toISOString().split('T')[0]
            : ''
    );
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(church.id, plan, endDate);
        setSaving(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '420px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>Edit Subscription</div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>{church.name}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                            Plan
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {Object.entries(PLAN_LABELS).map(([id, label]) => (
                                <button key={id} onClick={() => setPlan(id)} style={{
                                    padding: '0.65rem', borderRadius: '10px', cursor: 'pointer',
                                    border: plan === id ? `2px solid ${PLAN_COLORS[id]}` : '1px solid rgba(255,255,255,0.07)',
                                    background: plan === id ? `${PLAN_COLORS[id]}18` : 'rgba(255,255,255,0.03)',
                                    color: plan === id ? PLAN_COLORS[id] : '#64748b',
                                    fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                            Subscription End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'white', fontFamily: 'inherit', fontSize: '0.875rem',
                                colorScheme: 'dark',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button onClick={onClose} style={{
                            flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.875rem',
                        }}>Cancel</button>
                        <button onClick={handleSave} disabled={saving} style={{
                            flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
                            background: '#2563eb', border: 'none',
                            color: 'white', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.875rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            opacity: saving ? 0.7 : 1,
                        }}>
                            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ── Manual Payment Modal ───────────────────────────────────────────────────
const PaymentModal: React.FC<{
    church: any;
    onClose: () => void;
    onSave: (churchId: string, amount: number, method: string, notes: string) => Promise<void>;
}> = ({ church, onClose, onSave }) => {
    const [amount, setAmount] = useState('99.99');
    const [method, setMethod] = useState('Check');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        setSaving(true);
        await onSave(church.id, parseFloat(amount), method, notes);
        setSaving(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '420px',
                    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>Log Manual Payment</div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>{church.name}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                            Amount ($)
                        </label>
                        <input
                            type="number" step="0.01" min="0" value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'white', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                            Payment Method
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {['Check', 'Cash', 'Wire', 'Zelle'].map(m => (
                                <button key={m} onClick={() => setMethod(m)} style={{
                                    padding: '0.65rem', borderRadius: '10px', cursor: 'pointer',
                                    border: method === m ? `2px solid #10b981` : '1px solid rgba(255,255,255,0.07)',
                                    background: method === m ? `#10b98118` : 'rgba(255,255,255,0.03)',
                                    color: method === m ? '#10b981' : '#64748b',
                                    fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
                                }}>{m}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                            Notes / Reference (Optional)
                        </label>
                        <input
                            type="text" value={notes} placeholder="Check #1234..."
                            onChange={e => setNotes(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'white', fontFamily: 'inherit', fontSize: '0.875rem'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button onClick={onClose} style={{
                            flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.875rem',
                        }}>Cancel</button>
                        <button onClick={handleSave} disabled={saving} style={{
                            flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
                            background: '#10b981', border: 'none',
                            color: 'white', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.875rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            opacity: saving ? 0.7 : 1,
                        }}>
                            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <DollarSign size={16} />}
                            {saving ? 'Saving...' : 'Log Payment'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ── Main Admin Panel ───────────────────────────────────────────────────────
const AdminPanel: React.FC<AdminPanelProps> = ({ adminEmail, onLogout, onSwitchToUser, onImpersonate }) => {
    const [churches, setChurches] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [editingChurch, setEditingChurch] = useState<any | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'churches' | 'users' | 'admins' | 'marketing' | 'sales' | 'support'>('churches');
    const [admins, setAdmins] = useState<{user_id: string, role: string}[]>([]);
    const [myRole, setMyRole] = useState<'super_admin' | 'marketing' | 'sales' | 'support'>('super_admin');
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [systemInvites, setSystemInvites] = useState<{email: string, roles: string[], job_title?: string}[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [recordingPayment, setRecordingPayment] = useState<any | null>(null);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteFirstName, setInviteFirstName] = useState('');
    const [inviteLastName, setInviteLastName] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteJobTitle, setInviteJobTitle] = useState('');
    const [inviteRoles, setInviteRoles] = useState<string[]>([]);

    const fetchAll = useCallback(async () => {
        setSyncing(true);
        try {
            const { data: churchData } = await supabase
                .from('churches')
                .select('*')
                .order('created_at', { ascending: false });

            if (churchData) {
                // For each church, fetch member count
                const enriched = await Promise.all(
                    churchData.map(async (c: any) => {
                        const { count } = await supabase
                            .from('members')
                            .select('id', { count: 'exact' })
                            .eq('church_id', c.id);
                        return { ...c, memberCount: count || 0 };
                    })
                );
                setChurches(enriched);
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*, churches(name)')
                .order('created_at', { ascending: false });
            
            if (profileData) {
                setProfiles(profileData);
            }

            const { data: adminData } = await supabase.from('admins').select('user_id, role');
            if (adminData) {
                setAdmins(adminData);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setMyUserId(user.id);
                const me = adminData.filter(a => a.user_id === user?.id).map(a => a.role);
                if (me.length > 0) setMyRole(me as any);
            }

            const { data: inviteData } = await supabase.from('system_invites').select('email, roles, job_title');
            if (inviteData) {
                setSystemInvites(inviteData);
            }

            const { data: payData } = await supabase.from('admin_payments').select('*').order('created_at', { ascending: false });
            if (payData) {
                setPayments(payData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSavePlan = async (churchId: string, plan: string, endDate: string) => {
        await supabase.from('churches').update({
            plan,
            subscription_end_date: endDate ? new Date(endDate).toISOString() : null,
        }).eq('id', churchId);
        await fetchAll();
    };

    const handleSavePayment = async (churchId: string, amount: number, method: string, notes: string) => {
        // Log the payment
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('admin_payments').insert({
            church_id: churchId,
            amount,
            payment_method: method,
            notes,
            created_by: user?.id,
        });

        // Automatically extend subscription end date by 1 month or year (default to 1 month for simplicity here, or just let them edit plan)
        // Actually, we can just fetch the current church and extend it
        const church = churches.find(c => c.id === churchId);
        if (church) {
            const currentEnd = church.subscription_end_date ? new Date(church.subscription_end_date) : new Date();
            const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
            // If they paid roughly 1 year (e.g. > $900), add a year. Else add a month.
            if (amount >= 900) {
                newEnd.setFullYear(newEnd.getFullYear() + 1);
            } else {
                newEnd.setMonth(newEnd.getMonth() + 1);
            }
            
            await supabase.from('churches').update({
                subscription_end_date: newEnd.toISOString(),
                // If they were on trial, maybe bump them to starter? Let's leave plan as is.
            }).eq('id', churchId);
        }

        await fetchAll();
    };

    const handleToggleActive = async (churchId: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'reactivate'} this account?`)) return;
        await supabase.from('churches').update({ is_active: !currentStatus }).eq('id', churchId);
        await fetchAll();
    };

    const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'reactivate'} this user?`)) return;
        await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', userId);
        await fetchAll();
    };

    const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean, role: string = 'super_admin') => {
        if (!confirm(`Are you sure you want to ${isCurrentlyAdmin ? 'revoke' : 'grant ' + role + ' '}Admin access for this user?`)) return;
        if (isCurrentlyAdmin) {
            await supabase.from('admins').delete().eq('user_id', userId);
        } else {
            await supabase.from('admins').insert({ user_id: userId, role });
        }
        await fetchAll();
    };

    const handleSendInvite = async () => {
        if (!inviteEmail || inviteRoles.length === 0) {
            alert('Please provide an email and select at least one role.');
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        
        // 1. Save detailed invite (use upsert to prevent primary key violation if email already exists)
        const { error: insertError } = await supabase.from('system_invites').upsert({
            email: inviteEmail.toLowerCase().trim(),
            first_name: inviteFirstName,
            last_name: inviteLastName,
            phone: invitePhone,
            job_title: inviteJobTitle,
            roles: inviteRoles,
            invited_by: user?.id
        }, { onConflict: 'email' });
        
        if (insertError) {
            alert(`Error saving invite: ${insertError.message}`);
            return;
        }

        // 2. Send Magic Link Email via Supabase Auth
        const { error: emailError } = await supabase.auth.signInWithOtp({
            email: inviteEmail.toLowerCase().trim(),
            options: {
                emailRedirectTo: window.location.origin + '/employee/'
            }
        });

        if (emailError) {
            alert(`Invite saved, but error sending automated email: ${emailError.message}. You can still send them a manual email.`);
        } else {
            alert(`Success! An automated email invite has been sent to ${inviteEmail}.`);
            setInviteEmail('');
            setInviteFirstName('');
            setInviteLastName('');
            setInvitePhone('');
            setInviteJobTitle('');
            setInviteRoles([]);
            await fetchAll();
        }
    };

    const handleRevokeInvite = async (email: string) => {
        if (!confirm(`Revoke invite for ${email}?`)) return;
        await supabase.from('system_invites').delete().eq('email', email);
        await fetchAll();
    };

    const handleResendInvite = async (email: string) => {
        if (!confirm(`Resend invite email to ${email}?`)) return;
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.origin + '/admin'
            }
        });
        if (error) {
            alert(`Error sending email: ${error.message}`);
        } else {
            alert(`A new magic link has been sent to ${email}.`);
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!email) {
            alert('No email address on file for this account.');
            return;
        }
        if (!confirm(`Send password reset email to ${email}?`)) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) {
            alert(`Error sending reset link: ${error.message}`);
        } else {
            alert(`Password reset link sent to ${email}`);
        }
    };

    const totalRevenue = churches
        .filter(c => c.plan !== 'trial')
        .reduce((sum, c) => {
            const prices: Record<string, number> = { starter: 199.99, growth: 399.99, enterprise: 399.99 };
            return sum + (prices[c.plan] || 0);
        }, 0);

    const paidCount = churches.filter(c => c.plan !== 'trial').length;
    const trialCount = churches.filter(c => c.plan === 'trial').length;
    const expiredCount = churches.filter(c => {
        if (!c.subscription_end_date) return false;
        return new Date(c.subscription_end_date) < new Date();
    }).length;

    const filtered = churches.filter(c => {
        const churchEmail = profiles.find(p => p.id === c.owner_id)?.email || c.treasurer_email;
        const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
            churchEmail?.toLowerCase().includes(search.toLowerCase());
        const matchPlan = filterPlan === 'all' || c.plan === filterPlan;
        return matchSearch && matchPlan;
    });

    // Staff Commission Metrics
    const myClients = churches.filter(c => c.referred_by === myUserId);
    const myCommission = myClients.filter(c => c.plan !== 'trial').reduce((sum, c) => {
        const prices: Record<string, number> = { starter: 199.99, growth: 399.99, enterprise: 399.99 };
        return sum + ((prices[c.plan] || 0) * 0.2);
    }, 0);
    const myReferralLink = `${window.location.origin}/?ref=${myUserId}`;

    const staffMetricsView = (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={20} color="#60a5fa" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Commissions (MRR)</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{fmt(myCommission)}<span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>/mo</span></div>
                    </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Based on 20% of your paying client subscriptions.</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} color="#10b981" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Clients</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{myClients.length} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>signed up</span></div>
                    </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{myClients.filter(c => c.plan !== 'trial').length} paying • {myClients.filter(c => c.plan === 'trial').length} on trial</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Referral Link</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" readOnly value={myReferralLink} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.8rem' }} />
                    <button onClick={() => navigator.clipboard.writeText(myReferralLink)} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '0 1rem', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Copy</button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Send this link to prospects so they are automatically credited to your commissions.</div>
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh', background: '#020617',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: 'white',
        }}>
            {/* Top Nav */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0 2rem', height: '60px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Crown size={16} color="white" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>Storehouse Admin</div>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>Super-Admin Portal</div>
                    </div>
                    <div style={{
                        marginLeft: '0.5rem', padding: '2px 10px', borderRadius: '100px',
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                        fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase',
                    }}>ADMIN</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        Signed in as <span style={{ color: '#60a5fa', fontWeight: 700 }}>{adminEmail}</span>
                    </div>
                    <motion.button
                        onClick={() => fetchAll()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8',
                            display: 'flex', alignItems: 'center',
                        }}
                    >
                        <motion.div animate={syncing ? { rotate: 360 } : {}} transition={{ repeat: syncing ? Infinity : 0, duration: 1, ease: 'linear' }}>
                            <RefreshCw size={15} />
                        </motion.div>
                    </motion.button>
                    <motion.button
                        onClick={onLogout}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', color: '#ef4444',
                            fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
                        }}
                    >
                        <LogOut size={14} /> Sign Out
                    </motion.button>
                    {onSwitchToUser && (
                        <motion.button
                            onClick={onSwitchToUser}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                                borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', color: '#60a5fa',
                                fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
                            }}
                        >
                            Return to Church App
                        </motion.button>
                    )}
                </div>
            </header>

            <div style={{ padding: '2rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>

                {/* Page Title & Tabs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.25rem' }}>
                            Admin Dashboard
                        </h1>
                        <p style={{ color: '#475569', fontSize: '0.82rem' }}>
                            All registered churches & users · Real-time management
                        </p>
                    </motion.div>
                    
                    <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', padding: '4px', flexWrap: 'wrap' }}>
                        <button onClick={() => setActiveTab('churches')} style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === 'churches' ? '#2563eb' : 'transparent', color: activeTab === 'churches' ? 'white' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>Churches</button>
                        {(myRole.includes('super_admin') || myRole === 'super_admin') && (
                            <>
                                <button onClick={() => setActiveTab('users')} style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === 'users' ? '#2563eb' : 'transparent', color: activeTab === 'users' ? 'white' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>Users</button>
                                <button onClick={() => setActiveTab('admins')} style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === 'admins' ? '#2563eb' : 'transparent', color: activeTab === 'admins' ? 'white' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>Staff Directory</button>
                            </>
                        )}
                        {(myRole.includes('super_admin') || myRole.includes('marketing') || myRole === 'super_admin') && <button onClick={() => setActiveTab('marketing')} style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === 'marketing' ? '#2563eb' : 'transparent', color: activeTab === 'marketing' ? 'white' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>Marketing</button>}
                        {(myRole.includes('super_admin') || myRole.includes('sales') || myRole === 'super_admin') && <button onClick={() => setActiveTab('sales')} style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === 'sales' ? '#2563eb' : 'transparent', color: activeTab === 'sales' ? 'white' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>Sales</button>}
                        {(myRole.includes('super_admin') || myRole.includes('support') || myRole === 'super_admin') && <button onClick={() => setActiveTab('support')} style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === 'support' ? '#2563eb' : 'transparent', color: activeTab === 'support' ? 'white' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>Support</button>}
                    </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <StatCard label="Total Churches" value={churches.length} sub="All registered" icon={Building2} color="#2563eb" delay={0} />
                    <StatCard label="Paid Subscribers" value={paidCount} sub={`${trialCount} on free trial`} icon={CheckCircle2} color="#10b981" delay={0.06} />
                    <StatCard label="Est. Monthly Revenue" value={fmt(totalRevenue)} sub="Active paid plans" icon={DollarSign} color="#a855f7" delay={0.12} />
                    <StatCard label="Expired / At Risk" value={expiredCount} sub="Need attention" icon={AlertTriangle} color="#ef4444" delay={0.18} />
                    <StatCard label="Total Members" value={churches.reduce((s, c) => s + (c.memberCount || 0), 0).toLocaleString()} sub="Across all churches" icon={Users} color="#f59e0b" delay={0.24} />
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '10px', padding: '0.5rem 1rem', flex: 1, maxWidth: '340px',
                    }}>
                        <Search size={14} color="#475569" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search churches or email..."
                            style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem', width: '100%' }}
                        />
                    </div>
                    <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
                        {['all', 'trial', 'starter', 'growth', 'enterprise'].map(p => (
                            <button key={p} onClick={() => setFilterPlan(p)} style={{
                                padding: '0.5rem 0.875rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                background: filterPlan === p ? '#2563eb' : 'transparent',
                                color: filterPlan === p ? 'white' : '#475569',
                                fontWeight: 700, fontSize: '0.72rem', textTransform: 'capitalize',
                            }}>{p}</button>
                        ))}
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#334155' }}>
                        {activeTab === 'churches' ? `${filtered.length} of ${churches.length} churches` : `${profiles.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())).length} of ${profiles.length} users`}
                    </div>
                </div>

                {/* Church Table */}
                {activeTab === 'churches' && (
                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 120px',
                        padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(255,255,255,0.02)',
                    }}>
                        {['Church', 'Plan', 'Members', 'Sub. Expires', 'PayPal Order', 'Actions'].map(h => (
                            <div key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: '#334155' }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                <Loader2 size={20} />
                            </motion.div>
                            <span style={{ fontSize: '0.85rem' }}>Loading all churches...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#334155', fontSize: '0.85rem' }}>
                            No churches match your search.
                        </div>
                    ) : (
                        filtered.map((church, i) => {
                            const planColor = PLAN_COLORS[church.plan] || '#475569';
                            const days = daysUntil(church.subscription_end_date);
                            const isExpired = days !== null && days < 0;
                            const isWarning = days !== null && days >= 0 && days <= 7;
                            const isExpanded = expandedId === church.id;

                            return (
                                <motion.div
                                    key={church.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                >
                                    {/* Main Row */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 120px',
                                        padding: '1rem 1.5rem', alignItems: 'center',
                                        background: isExpanded ? 'rgba(37,99,235,0.06)' : 'transparent',
                                        transition: 'background 0.2s',
                                    }}>
                                        {/* Church name */}
                                        <div>
                                            <div style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {church.name || '—'}
                                                {church.is_active === false && (
                                                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#ef444420', color: '#ef4444', borderRadius: '4px', textTransform: 'uppercase' }}>Disabled</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: '2px' }}>
                                                {profiles.find(p => p.id === church.owner_id)?.email || church.treasurer_email || 'No email'} · ID: {church.id?.slice(0, 8)}...
                                            </div>
                                        </div>

                                        {/* Plan badge */}
                                        <div>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                padding: '3px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700,
                                                background: `${planColor}18`, color: planColor, border: `1px solid ${planColor}30`,
                                            }}>
                                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: planColor, display: 'inline-block' }} />
                                                {PLAN_LABELS[church.plan] || church.plan || 'Unknown'}
                                            </span>
                                        </div>

                                        {/* Members */}
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                                            {(church.memberCount || 0).toLocaleString()}
                                        </div>

                                        {/* Sub expiry */}
                                        <div>
                                            {church.subscription_end_date ? (
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.78rem', fontWeight: 700,
                                                        color: isExpired ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981',
                                                    }}>
                                                        {isExpired ? `⚠ Expired ${Math.abs(days!)}d ago` : `${days}d left`}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: '#334155' }}>
                                                        {new Date(church.subscription_end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.72rem', color: '#334155' }}>
                                                    {church.plan === 'trial' ? 'Trial period' : 'No end date'}
                                                </span>
                                            )}
                                        </div>

                                        {/* PayPal order ID */}
                                        <div style={{ fontSize: '0.7rem', color: '#334155', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {church.paypal_order_id || '—'}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : church.id)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '7px', padding: '5px', cursor: 'pointer', color: '#64748b',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title="Details"
                                            >
                                                <Eye size={13} />
                                            </button>
                                            <button
                                                onClick={() => setEditingChurch(church)}
                                                style={{
                                                    background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                                                    borderRadius: '7px', padding: '5px', cursor: 'pointer', color: '#60a5fa',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title="Edit plan / expiry"
                                            >
                                                <Edit3 size={13} />
                                            </button>
                                            <button
                                                onClick={() => setRecordingPayment(church)}
                                                style={{
                                                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                                    borderRadius: '7px', padding: '5px', cursor: 'pointer', color: '#10b981',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title="Log Manual Payment"
                                            >
                                                <DollarSign size={13} />
                                            </button>
                                            {onImpersonate && (
                                                <button
                                                    onClick={() => onImpersonate(church.id)}
                                                    style={{
                                                        background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)',
                                                        borderRadius: '7px', padding: '5px', cursor: 'pointer', color: '#ec4899',
                                                        display: 'flex', alignItems: 'center',
                                                    }}
                                                    title="Support Login (Impersonate)"
                                                >
                                                    <Key size={13} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleToggleActive(church.id, church.is_active !== false)}
                                                style={{
                                                    background: church.is_active !== false ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                    border: `1px solid ${church.is_active !== false ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                                    borderRadius: '7px', padding: '5px', cursor: 'pointer',
                                                    color: church.is_active !== false ? '#f59e0b' : '#10b981',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title={church.is_active !== false ? "Disable Account" : "Reactivate Account"}
                                            >
                                                {church.is_active !== false ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(profiles.find(p => p.id === church.owner_id)?.email || church.treasurer_email)}
                                                style={{
                                                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                                                    borderRadius: '7px', padding: '5px', cursor: 'pointer', color: '#a855f7',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title="Send Password Reset"
                                            >
                                                <Key size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{
                                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                                    gap: '1rem', padding: '1rem 1.5rem 1.25rem',
                                                    background: 'rgba(37,99,235,0.04)', borderTop: '1px solid rgba(37,99,235,0.08)',
                                                }}>
                                                    {[
                                                        { label: 'Church ID', value: church.id },
                                                        { label: 'Created', value: church.created_at ? new Date(church.created_at).toLocaleDateString() : '—' },
                                                        { label: 'Country', value: church.country || church.denomination || '—' },
                                                        { label: 'PayPal Order', value: church.paypal_order_id || 'No payment yet' },
                                                        { label: 'Sub End Date', value: church.subscription_end_date ? new Date(church.subscription_end_date).toLocaleDateString() : 'N/A' },
                                                        { label: 'Member Limit', value: church.plan === 'trial' ? '15' : church.plan === 'enterprise' ? 'Unlimited' : '500' },
                                                    ].map(({ label, value }) => (
                                                        <div key={label}>
                                                            <div style={{ fontSize: '0.62rem', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</div>
                                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, wordBreak: 'break-all' }}>{value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {payments.filter(p => p.church_id === church.id).length > 0 && (
                                                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Manual Payment History</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {payments.filter(p => p.church_id === church.id).map(pay => (
                                                                <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>+${pay.amount}</span>
                                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '100px' }}>{pay.payment_method}</span>
                                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{pay.notes || 'No notes'}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                                                                        {new Date(pay.created_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </div>
                )}

                {/* Users Table */}
                {activeTab === 'users' && myRole === 'super_admin' && (
                    <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                            {['User', 'Church', 'Role', 'Joined', 'Actions'].map(h => (
                                <div key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                            ))}
                        </div>
                        {loading ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: '#334155' }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                                    <Loader2 size={20} />
                                </motion.div>
                            </div>
                        ) : profiles.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: '#334155', fontSize: '0.85rem' }}>
                                No users match your search.
                            </div>
                        ) : profiles.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())).map((profile, i) => (
                            <motion.div key={profile.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px', padding: '1rem 1.5rem', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {profile.full_name || '—'}
                                        {profile.is_active === false && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#ef444420', color: '#ef4444', borderRadius: '4px', textTransform: 'uppercase' }}>Disabled</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '2px' }}>{profile.email}</div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{profile.churches?.name || 'No Church'}</div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>{profile.role || 'user'}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button onClick={() => handleToggleUserActive(profile.id, profile.is_active !== false)} style={{ background: profile.is_active !== false ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${profile.is_active !== false ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '7px', padding: '5px', cursor: 'pointer', color: profile.is_active !== false ? '#f59e0b' : '#10b981', display: 'flex' }} title={profile.is_active !== false ? "Disable User" : "Reactivate User"}>
                                        {profile.is_active !== false ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                                    </button>
                                    <button onClick={() => handleResetPassword(profile.email)} style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '7px', padding: '5px', cursor: 'pointer', color: '#a855f7', display: 'flex' }} title="Send Password Reset">
                                        <Key size={13} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Staff Directory Table */}
                {activeTab === 'admins' && (myRole.includes('super_admin') || myRole === 'super_admin') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        
                        {/* Invite Section */}
                        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Send size={16} color="#60a5fa" /> Invite Staff Member
                            </h2>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                <input 
                                    type="text"
                                    placeholder="First Name"
                                    value={inviteFirstName}
                                    onChange={(e) => setInviteFirstName(e.target.value)}
                                    style={{ flex: 1, minWidth: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                                />
                                <input 
                                    type="text"
                                    placeholder="Last Name"
                                    value={inviteLastName}
                                    onChange={(e) => setInviteLastName(e.target.value)}
                                    style={{ flex: 1, minWidth: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                                />
                                <input 
                                    type="tel"
                                    placeholder="Phone Number"
                                    value={invitePhone}
                                    onChange={(e) => setInvitePhone(e.target.value)}
                                    style={{ flex: 1, minWidth: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input 
                                    type="email"
                                    placeholder="Employee Email Address..."
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    style={{ flex: 2, minWidth: '250px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                                />
                                <input 
                                    type="text"
                                    placeholder="Job Title (e.g. Head of Marketing)"
                                    value={inviteJobTitle}
                                    onChange={(e) => setInviteJobTitle(e.target.value)}
                                    style={{ flex: 1, minWidth: '200px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
                                />
                            </div>
                            
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>Assign Roles:</div>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {['super_admin', 'marketing', 'sales', 'support'].map(r => (
                                        <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox"
                                                checked={inviteRoles.includes(r)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setInviteRoles([...inviteRoles, r]);
                                                    else setInviteRoles(inviteRoles.filter(role => role !== r));
                                                }}
                                            />
                                            {r === 'super_admin' ? 'Full Admin' : r.charAt(0).toUpperCase() + r.slice(1)}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={{ marginTop: '1.5rem' }}>
                                <button onClick={handleSendInvite} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Send Invite & Magic Link</button>
                            </div>
                            
                            {systemInvites.length > 0 && (
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                    <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Invites</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {systemInvites.map(inv => (
                                            <div key={inv.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{inv.email}</span>
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        {inv.roles?.map((r: string) => (
                                                            <span key={r} style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '4px', textTransform: 'uppercase' }}>{r.replace('_', ' ')}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleResendInvite(inv.email)} style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>Resend</button>
                                                    <button onClick={() => handleRevokeInvite(inv.email)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>Revoke</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Current Staff */}
                        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Current Staff Directory</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 180px', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                                {['User', 'Church / Dept', 'Joined', 'Actions'].map(h => (
                                    <div key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                                ))}
                            </div>
                            {loading ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#334155' }}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                                        <Loader2 size={20} />
                                    </motion.div>
                                </div>
                            ) : profiles.filter(p => admins.find(a => a.user_id === p.id)).length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#334155', fontSize: '0.85rem' }}>
                                    No staff members found.
                                </div>
                            ) : Array.from(new Set(profiles.filter(p => admins.find(a => a.user_id === p.id)).map(p => p.id))).map((profileId, i) => {
                                const profile = profiles.find(p => p.id === profileId)!;
                                const userRoles = admins.filter(a => a.user_id === profile.id).map(a => a.role);
                                
                                return (
                                    <motion.div key={profile.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 180px', padding: '1rem 1.5rem', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {profile.full_name || '—'}
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {userRoles.map(r => (
                                                        <span key={r} style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                            {r === 'super_admin' && <Crown size={10} color="#60a5fa" />} 
                                                            {r.replace('_', ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '2px' }}>{profile.email} {profile.phone && `• ${profile.phone}`}</div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                            {/* We can show Job Title here if we had it in profiles, fallback to church name */}
                                            {profile.churches?.name || 'Storehouse HQ'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <button onClick={() => handleToggleAdmin(profile.id, true)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '5px 10px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700 }} title="Revoke Admin Access">
                                                <Crown size={13} /> Revoke Access
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Marketing Playbook Tab */}
                {activeTab === 'marketing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {staffMetricsView}
                        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Marketing & Outreach Playbook</h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                                Use these proven templates to reach out to pastors, treasurers, and local church boards. Click any template to copy it to your clipboard.
                            </p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {/* Template 1 */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>Inner Circle Approach</h3>
                                        <button onClick={() => navigator.clipboard.writeText("Hi [Pastor/Treasurer Name],\n\nI’m part of the [Your Local Church Name] community. I’ve noticed the challenges our finance team faces tracking funds, managing the ledger, and ensuring complete transparency.\n\nI wanted to share a platform designed specifically for churches like ours: **Storehouse Finance** (storehouse-finance.com). It provides a real-time ledger, distinct fund tracking, and built-in budget safeguards to prevent overspending.\n\nIt could significantly lighten the administrative load. Let me know if you’d like to see how it works!\n\nBest,\n[Your Name]")} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.7rem', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>Copy</button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Best for reaching out to churches where you have a personal connection.</p>
                                    <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                        Hi [Pastor/Treasurer Name],<br/><br/>I’m part of the [Your Local Church Name] community... (Click copy for full text)
                                    </div>
                                </div>

                                {/* Template 2 */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>Direct Email Campaign</h3>
                                        <button onClick={() => navigator.clipboard.writeText("Subject: Modernizing [Church Name]'s Finances\n\nDear [Pastor/Leader Name],\n\nManaging church finances shouldn't require a degree in accounting or wrestling with complex spreadsheets.\n\n**Storehouse Finance** is a new, secure platform built exclusively for ministries. It replaces outdated spreadsheets with a real-time, double-entry ledger, clear fund separation, and automated compliance checks.\n\nWe offer a 30-day free trial, allowing your team to experience the platform with no risk. You can learn more and sign up at storehouse-finance.com.\n\nIn His Service,\n[Your Name/Storehouse Team]")} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.7rem', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>Copy</button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Cold outreach to local ministries in your area.</p>
                                    <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                        Subject: Modernizing [Church Name]'s Finances<br/><br/>Dear [Pastor/Leader Name]... (Click copy for full text)
                                    </div>
                                </div>
                            </div>
                        </div>
                        <LeadsCRM />
                    </div>
                )}

                {/* Sales Tab */}
                {activeTab === 'sales' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {staffMetricsView}
                        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Sales Dashboard</h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Use the Leads CRM below to track sales targets and conversions.</p>
                        </div>
                        <LeadsCRM />
                    </div>
                )}

                {/* Support Tab */}
                {activeTab === 'support' && (
                    <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Technical Support</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Support tickets and diagnostic tools will be integrated here.</p>
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: '#1e293b' }}>
                    Storehouse Finance Admin Portal · Access restricted to authorized administrators only
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingChurch && (
                    <EditPlanModal
                        church={editingChurch}
                        onClose={() => setEditingChurch(null)}
                        onSave={handleSavePlan}
                    />
                )}
                {recordingPayment && (
                    <PaymentModal
                        church={recordingPayment}
                        onClose={() => setRecordingPayment(null)}
                        onSave={handleSavePayment}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPanel;
