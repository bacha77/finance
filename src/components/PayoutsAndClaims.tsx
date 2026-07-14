import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, DollarSign, CheckCircle2, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { downloadCSV } from '../utils/exportCsv';

interface PayoutsAndClaimsProps {
    profiles: any[];
    admins: any[];
    churches: any[];
    myRole: string | string[];
    myUserId: string;
    onRefresh: () => void;
}

export default function PayoutsAndClaims({ profiles, admins, churches, myRole, myUserId, onRefresh }: PayoutsAndClaimsProps) {
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [claimChurchId, setClaimChurchId] = useState('');
    const [claimNotes, setClaimNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isSuperAdmin = myRole.includes('super_admin') || myRole === 'super_admin';

    const fetchClaims = async () => {
        setLoading(true);
        let query = supabase.from('referral_claims').select('*').order('created_at', { ascending: false });
        
        // If not super admin, only fetch their own claims
        if (!isSuperAdmin) {
            query = query.eq('employee_id', myUserId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching claims:', error);
        } else {
            setClaims(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchClaims();
    }, [isSuperAdmin, myUserId]);

    const handleSubmitClaim = async () => {
        if (!claimChurchId) return alert('Please select a church.');
        setSubmitting(true);
        const { error } = await supabase.from('referral_claims').insert({
            church_id: claimChurchId,
            employee_id: myUserId,
            notes: claimNotes
        });
        setSubmitting(false);
        if (error) {
            alert(`Error submitting claim: ${error.message}`);
        } else {
            setShowClaimModal(false);
            setClaimChurchId('');
            setClaimNotes('');
            fetchClaims();
        }
    };

    const handleResolveClaim = async (claimId: string, status: 'approved' | 'denied', churchId: string, employeeId: string) => {
        if (!confirm(`Are you sure you want to mark this claim as ${status}?`)) return;
        
        // If approved, update the church's referred_by
        if (status === 'approved') {
            const { error: churchError } = await supabase.from('churches').update({ referred_by: employeeId }).eq('id', churchId);
            if (churchError) {
                alert(`Error updating church referral: ${churchError.message}`);
                return;
            }
        }

        // Update the claim status
        const { error: claimError } = await supabase.from('referral_claims').update({
            status,
            resolved_at: new Date().toISOString()
        }).eq('id', claimId);

        if (claimError) {
            alert(`Error resolving claim: ${claimError.message}`);
        } else {
            fetchClaims();
            onRefresh(); // Refresh parent to get updated churches
        }
    };

    const fmt = (num: number) => `$${num.toFixed(2)}`;

    // Unassigned churches available to claim
    const unassignedChurches = useMemo(() => {
        return churches.filter(c => !c.referred_by);
    }, [churches]);

    // Calculate payouts for all employees
    const employeePayouts = useMemo(() => {
        const staffIds = Array.from(new Set(admins.map(a => a.user_id)));
        return staffIds.map(id => {
            const profile = profiles.find(p => p.id === id) || { id, email: 'Unknown', full_name: 'Unknown' };
            const empClients = churches.filter(c => c.referred_by === id);
            const empActiveClients = empClients.filter(c => c.plan !== 'trial');
            const totalCommission = empActiveClients.reduce((sum, c) => {
                const prices: Record<string, number> = { starter: 199.99, growth: 399.99, enterprise: 399.99 };
                return sum + ((prices[c.plan] || 0) * 0.2); // 20% commission
            }, 0);
            return { profile, totalCommission, activeClientCount: empActiveClients.length };
        }).sort((a, b) => b.totalCommission - a.totalCommission);
    }, [profiles, admins, churches]);

    // Calculate my own payout
    const myPayoutInfo = employeePayouts.find(p => p.profile.id === myUserId) || { totalCommission: 0, activeClientCount: 0 };

    const handleExportPayouts = () => {
        const rows = [
            ['Employee Name', 'Email', 'Active Clients', 'Total Commission']
        ];
        employeePayouts.filter(p => p.totalCommission > 0).forEach(p => {
            rows.push([
                p.profile.full_name || '',
                p.profile.email || '',
                p.activeClientCount,
                fmt(p.totalCommission)
            ]);
        });
        downloadCSV('monthly_payouts_export.csv', rows);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* My Earnings Card */}
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={24} color="#60a5fa" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Est. Commission (This Month)</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{fmt(myPayoutInfo.totalCommission)}<span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>/mo</span></div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Based on 20% of your {myPayoutInfo.activeClientCount} paying client subscriptions.</div>
                    <button 
                        onClick={() => setShowClaimModal(true)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem', transition: 'background 0.2s' }}
                    >
                        Submit New Claim
                    </button>
                </div>

                {/* Company Payouts Card (Admin Only) */}
                {isSuperAdmin && (
                    <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>Company Payouts (Monthly)</div>
                            <button onClick={handleExportPayouts} style={{ padding: '0.4rem 0.8rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                                <Download size={14} /> Export CSV
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {employeePayouts.filter(p => p.totalCommission > 0).length === 0 ? (
                                <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No active commissions this month.</div>
                            ) : (
                                employeePayouts.filter(p => p.totalCommission > 0).map((p, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{p.profile.full_name || p.profile.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.activeClientCount} active clients</div>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>
                                            {fmt(p.totalCommission)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Claims Table */}
            <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{isSuperAdmin ? 'All Referral Claims' : 'My Referral Claims'}</h2>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Track the status of your word-of-mouth client referrals.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isSuperAdmin ? '1.5fr 1fr 1fr 1fr 100px' : '1.5fr 1fr 1fr 100px', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Church / Client</div>
                    {isSuperAdmin && <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Claimed By</div>}
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date Submitted</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</div>
                    {isSuperAdmin && <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actions</div>}
                </div>

                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#334155' }}>
                        <Loader2 size={24} className="spin" />
                    </div>
                ) : claims.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                        No referral claims found.
                    </div>
                ) : (
                    claims.map((claim) => {
                        const church = churches.find(c => c.id === claim.church_id);
                        const employee = profiles.find(p => p.id === claim.employee_id);
                        return (
                            <div key={claim.id} style={{ display: 'grid', gridTemplateColumns: isSuperAdmin ? '1.5fr 1fr 1fr 1fr 100px' : '1.5fr 1fr 1fr 100px', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>{church?.name || 'Unknown Church'}</div>
                                    {claim.notes && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Note: {claim.notes}</div>}
                                </div>
                                
                                {isSuperAdmin && (
                                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{employee?.full_name || employee?.email || 'Unknown User'}</div>
                                )}

                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    {new Date(claim.created_at).toLocaleDateString()}
                                </div>

                                <div>
                                    {claim.status === 'pending' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}><Clock size={12} /> Pending</span>}
                                    {claim.status === 'approved' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}><CheckCircle2 size={12} /> Approved</span>}
                                    {claim.status === 'denied' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}><XCircle size={12} /> Denied</span>}
                                </div>

                                {isSuperAdmin && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {claim.status === 'pending' ? (
                                            <>
                                                <button onClick={() => handleResolveClaim(claim.id, 'approved', claim.church_id, claim.employee_id)} style={{ background: 'rgba(16,185,129,0.2)', border: 'none', color: '#10b981', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Approve">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                                <button onClick={() => handleResolveClaim(claim.id, 'denied', claim.church_id, claim.employee_id)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Deny">
                                                    <XCircle size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Resolved</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Claim Modal */}
            <AnimatePresence>
                {showClaimModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px' }}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Submit Referral Claim</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>Select Church/Client</label>
                                    <select 
                                        value={claimChurchId}
                                        onChange={e => setClaimChurchId(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                    >
                                        <option value="">-- Choose a recent signup --</option>
                                        {unassignedChurches.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {unassignedChurches.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <AlertCircle size={12} /> No unassigned churches available to claim.
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>Notes (Optional)</label>
                                    <textarea 
                                        value={claimNotes}
                                        onChange={e => setClaimNotes(e.target.value)}
                                        placeholder="e.g. Talked to Pastor John on Tuesday."
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button 
                                        onClick={() => setShowClaimModal(false)}
                                        style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSubmitClaim}
                                        disabled={submitting || !claimChurchId}
                                        style={{ flex: 1, padding: '0.75rem', background: '#2563eb', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, cursor: (submitting || !claimChurchId) ? 'not-allowed' : 'pointer', opacity: (submitting || !claimChurchId) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        {submitting ? <Loader2 size={16} className="spin" /> : 'Submit Claim'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
