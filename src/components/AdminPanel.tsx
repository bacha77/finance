import React, { useState, useEffect, useCallback } from 'react';
import {
    Building2, Users, DollarSign, LogOut, RefreshCw,
    Crown, AlertTriangle, CheckCircle2,
    Search, Edit3, Save, X,
    Eye, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
    adminEmail: string;
    onLogout: () => void;
}

const PLAN_COLORS: Record<string, string> = {
    trial: '#f59e0b',
    starter: '#2563eb',
    growth: '#a855f7',
    enterprise: '#10b981',
};

const PLAN_LABELS: Record<string, string> = {
    trial: 'Free Trial',
    starter: 'Starter $99.99',
    growth: 'Growth $149.99',
    enterprise: 'Enterprise $300',
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

// ── Main Admin Panel ───────────────────────────────────────────────────────
const AdminPanel: React.FC<AdminPanelProps> = ({ adminEmail, onLogout }) => {
    const [churches, setChurches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [editingChurch, setEditingChurch] = useState<any | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterPlan, setFilterPlan] = useState<string>('all');

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

    const totalRevenue = churches
        .filter(c => c.plan !== 'trial')
        .reduce((sum, c) => {
            const prices: Record<string, number> = { starter: 99.99, growth: 149.99, enterprise: 300 };
            return sum + (prices[c.plan] || 0);
        }, 0);

    const paidCount = churches.filter(c => c.plan !== 'trial').length;
    const trialCount = churches.filter(c => c.plan === 'trial').length;
    const expiredCount = churches.filter(c => {
        if (!c.subscription_end_date) return false;
        return new Date(c.subscription_end_date) < new Date();
    }).length;

    const filtered = churches.filter(c => {
        const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.contact_email?.toLowerCase().includes(search.toLowerCase());
        const matchPlan = filterPlan === 'all' || c.plan === filterPlan;
        return matchSearch && matchPlan;
    });

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
                </div>
            </header>

            <div style={{ padding: '2rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>

                {/* Page Title */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.25rem' }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: '#475569', fontSize: '0.82rem' }}>
                        All registered churches · Real-time subscription management
                    </p>
                </motion.div>

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
                        {filtered.length} of {churches.length} churches
                    </div>
                </div>

                {/* Church Table */}
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
                                            <div style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem' }}>{church.name || '—'}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: '2px' }}>
                                                {church.contact_email || church.admin_email || 'No email'} · ID: {church.id?.slice(0, 8)}...
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
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </div>

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
            </AnimatePresence>
        </div>
    );
};

export default AdminPanel;
