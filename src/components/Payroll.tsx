import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Plus, ArrowRight,
    ShieldCheck, Zap,
    CheckCircle2, Loader2, Check, Activity, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { calculatePayroll } from '../lib/payrollUtils';

interface PayrollProps {
    churchId: string;
    userRole?: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const Payroll: React.FC<PayrollProps> = ({ churchId }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'run'>('overview');
    const [staff, setStaff] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Hire Modal
    const [showHireModal, setShowHireModal] = useState(false);
    const [hireForm, setHireForm] = useState({
        name: '', role: '', type: 'Full-time', salary: '', 
        housing_allowance: '0', state_tax_rate: '0.05', 
        recurring: true, frequency: 'Monthly'
    });

    // Wizard
    const [wizardStep, setWizardStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [processComplete, setProcessComplete] = useState<any>(null);

    useEffect(() => {
        const fetchStaff = async () => {
            if (!churchId) return;
            setIsLoading(true);
            try {
                const { data } = await supabase.from('staff').select('*').eq('church_id', churchId);
                setStaff(data ? data.map(s => ({
                    id: s.id,
                    name: s.name,
                    role: s.role,
                    type: s.type || 'Full-time',
                    salary: s.salary,
                    housingAllowance: s.housing_allowance || 0,
                    stateTaxRate: s.state_tax_rate || 0.05,
                    lastPaid: s.last_paid,
                    status: s.status,
                    recurring: s.recurring !== false,
                    frequency: s.frequency || 'Monthly'
                })) : []);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStaff();
    }, [churchId]);

    const handleHire = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const newStaff = {
                ...hireForm,
                salary: parseFloat(hireForm.salary) || 0,
                housing_allowance: parseFloat(hireForm.housing_allowance) || 0,
                state_tax_rate: parseFloat(hireForm.state_tax_rate) || 0.05,
                church_id: churchId,
                status: 'Pending',
                last_paid: 'Never'
            };

            let { error } = await supabase.from('staff').insert([newStaff]);
            
            if (error && error.message?.includes('column')) {
               const simpleStaff: any = { ...newStaff };
               delete simpleStaff.housing_allowance;
               delete simpleStaff.state_tax_rate;
               delete simpleStaff.type;
               delete simpleStaff.frequency;
               delete simpleStaff.recurring;
               const res = await supabase.from('staff').insert([simpleStaff]);
               error = res.error;
            }
            if (error) throw error;
            
            const { data } = await supabase.from('staff').select('*').eq('church_id', churchId);
            if (data) {
                setStaff(data.map(s => ({
                    id: s.id,
                    name: s.name,
                    role: s.role,
                    type: s.type || 'Full-time',
                    salary: s.salary,
                    housingAllowance: s.housing_allowance || 0,
                    stateTaxRate: s.state_tax_rate || 0.05,
                    lastPaid: s.last_paid,
                    status: s.status,
                    recurring: s.recurring !== false,
                    frequency: s.frequency || 'Monthly'
                })));
            }
            setShowHireModal(false);
            setHireForm({ name: '', role: '', type: 'Full-time', salary: '', housing_allowance: '0', state_tax_rate: '0.05', recurring: true, frequency: 'Monthly' });
        } catch (err) {
            alert('Error saving staff');
        } finally {
            setIsLoading(false);
        }
    };

    const eligibleStaff = useMemo(() => staff.filter(s => s.status !== 'Terminated'), [staff]);
    const totalMonthlySalary = useMemo(() => eligibleStaff.reduce((s, st) => s + (st.salary || 0), 0), [eligibleStaff]);

    const runPayroll = async () => {
        setProcessing(true);
        try {
            await new Promise(r => setTimeout(r, 1500));
            
            let totalNet = 0;
            const ledgerEntries: any[] = [];
            const staffUpdates: any[] = [];

            eligibleStaff.forEach(s => {
                const taxes = calculatePayroll(s.salary, s.housingAllowance, s.type !== 'Contractor', s.stateTaxRate);
                totalNet += taxes.net;
                
                const lastPaidStr = new Date().toLocaleDateString();
                ledgerEntries.push({
                    date: new Date().toISOString().split('T')[0],
                    description: `Payroll: ${s.name}`,
                    category: 'Payroll',
                    department: 'HR & Administration',
                    amount: -taxes.net,
                    type: 'out',
                    notes: `${s.frequency} ${s.type} salary run`,
                    church_id: churchId,
                    created_at: new Date().toISOString()
                });
                staffUpdates.push({ id: s.id, status: 'Paid', last_paid: lastPaidStr });
            });

            if (ledgerEntries.length > 0) {
                const { data: gfData } = await supabase.from('funds').select('*').eq('church_id', churchId).ilike('name', '%General%').maybeSingle();
                const activeFund = gfData || (await supabase.from('funds').select('*').eq('church_id', churchId).limit(1).maybeSingle()).data;

                const finalLedgerEntries = ledgerEntries.map(tx => ({ ...tx, fund_id: activeFund?.id }));
                await supabase.from('ledger').insert(finalLedgerEntries);

                const updates = staffUpdates.map(u => supabase.from('staff').update({ status: u.status, last_paid: u.last_paid }).eq('id', u.id).eq('church_id', churchId));
                await Promise.all(updates);
            }

            setProcessComplete({ staffCount: eligibleStaff.length, amount: totalNet });
            
            // Refetch
            const { data } = await supabase.from('staff').select('*').eq('church_id', churchId);
            if (data) {
                setStaff(data.map(s => ({
                    id: s.id, name: s.name, role: s.role, type: s.type || 'Full-time', salary: s.salary, housingAllowance: s.housing_allowance || 0,
                    stateTaxRate: s.state_tax_rate || 0.05, lastPaid: s.last_paid, status: s.status, recurring: s.recurring !== false, frequency: s.frequency || 'Monthly'
                })));
            }
        } catch (err) {
            alert('Failed to process payroll');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Team & Payroll
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.5rem' }}>Premium workforce management</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setShowHireModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        <Plus size={18} /> Add Team Member
                    </button>
                    <button onClick={() => { setActiveTab('run'); setWizardStep(1); setProcessComplete(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <Zap size={18} /> Run Payroll
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                {['overview', 'team', 'run'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ background: 'none', border: 'none', color: activeTab === tab ? '#a855f7' : '#94a3b8', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', position: 'relative', transition: 'color 0.2s' }}>
                        {tab === 'run' ? 'Run Payroll' : tab}
                        {activeTab === tab && <motion.div layoutId="activeTab" style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', background: '#a855f7' }} />}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(168,85,247,0.1), rgba(0,0,0,0))', border: '1px solid rgba(168,85,247,0.2)' }}>
                                <div style={{ color: '#a855f7', marginBottom: '1rem' }}><DollarSign size={24} /></div>
                                <h3 style={{ fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Est. Next Payroll</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', marginTop: '0.5rem' }}>{fmt(totalMonthlySalary)}</div>
                            </div>
                            <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(16,185,129,0.1), rgba(0,0,0,0))', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div style={{ color: '#10b981', marginBottom: '1rem' }}><Users size={24} /></div>
                                <h3 style={{ fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Active Team</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', marginTop: '0.5rem' }}>{eligibleStaff.length}</div>
                            </div>
                            <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(236,72,153,0.1), rgba(0,0,0,0))', border: '1px solid rgba(236,72,153,0.2)' }}>
                                <div style={{ color: '#ec4899', marginBottom: '1rem' }}><Activity size={24} /></div>
                                <h3 style={{ fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>YTD Taxes Paid</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', marginTop: '0.5rem' }}>$0.00</div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'team' && (
                    <motion.div key="team" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {staff.map(s => (
                                <div key={s.id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem', fontWeight: 800 }}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{s.name}</h3>
                                            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{s.role}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <span style={{ color: '#94a3b8' }}>Salary</span>
                                            <span style={{ color: 'white', fontWeight: 600 }}>{fmt(s.salary)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <span style={{ color: '#94a3b8' }}>Type</span>
                                            <span style={{ color: 'white', fontWeight: 600 }}>{s.type}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <span style={{ color: '#94a3b8' }}>Status</span>
                                            <span style={{ color: s.status === 'Paid' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{s.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'run' && (
                    <motion.div key="run" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {processComplete ? (
                            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: '#10b981' }}>
                                    <CheckCircle2 size={40} />
                                </motion.div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '1rem' }}>Payroll Complete</h2>
                                <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2rem' }}>Successfully processed {fmt(processComplete.amount)} for {processComplete.staffCount} team members.</p>
                                <button onClick={() => setActiveTab('overview')} style={{ padding: '0.75rem 2rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Back to Dashboard</button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '10%', right: '10%', top: '50%', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }} />
                                    {[1, 2, 3].map(step => (
                                        <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1 }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: wizardStep >= step ? '#a855f7' : '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, border: `2px solid ${wizardStep >= step ? '#a855f7' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.3s' }}>
                                                {wizardStep > step ? <Check size={20} /> : step}
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: wizardStep >= step ? 'white' : '#64748b' }}>
                                                {step === 1 ? 'Review' : step === 2 ? 'Taxes' : 'Confirm'}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {wizardStep === 1 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Review Salaries</h3>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Employee</th>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Role</th>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Gross Pay</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {eligibleStaff.map(s => (
                                                        <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '1rem 1.5rem', color: 'white', fontWeight: 600 }}>{s.name}</td>
                                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>{s.role}</td>
                                                            <td style={{ padding: '1rem 1.5rem', color: 'white' }}>{fmt(s.salary)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                            <button onClick={() => setWizardStep(2)} style={{ padding: '0.75rem 2rem', background: '#a855f7', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Continue <ArrowRight size={18} /></button>
                                        </div>
                                    </motion.div>
                                )}

                                {wizardStep === 2 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Taxes & Deductions</h3>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1.5rem' }}>
                                            {eligibleStaff.map(s => {
                                                const taxes = calculatePayroll(s.salary, s.housingAllowance, s.type !== 'Contractor', s.stateTaxRate);
                                                return (
                                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div>
                                                            <div style={{ color: 'white', fontWeight: 600 }}>{s.name}</div>
                                                            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{s.type !== 'Contractor' ? 'W-2 Employee' : '1099 Contractor'}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>- {fmt(taxes.totalWithholding)} Taxes</div>
                                                            <div style={{ color: '#10b981', fontWeight: 700 }}>Net: {fmt(taxes.net)}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                                            <button onClick={() => setWizardStep(1)} style={{ padding: '0.75rem 2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Back</button>
                                            <button onClick={() => setWizardStep(3)} style={{ padding: '0.75rem 2rem', background: '#a855f7', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Continue <ArrowRight size={18} /></button>
                                        </div>
                                    </motion.div>
                                )}

                                {wizardStep === 3 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Confirm & Pay</h3>
                                        <div style={{ background: 'linear-gradient(145deg, rgba(168,85,247,0.1), rgba(0,0,0,0.2))', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
                                            <div style={{ color: '#94a3b8', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '0.5rem' }}>Total Cash Requirement</div>
                                            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white', marginBottom: '1.5rem' }}>
                                                {fmt(eligibleStaff.reduce((s, st) => s + calculatePayroll(st.salary, st.housingAllowance, st.type !== 'Contractor', st.stateTaxRate).net, 0))}
                                            </div>
                                            <p style={{ color: '#cbd5e1' }}>This amount will be deducted from your General Fund and disbursed to {eligibleStaff.length} team members.</p>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                                            <button onClick={() => setWizardStep(2)} disabled={processing} style={{ padding: '0.75rem 2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Back</button>
                                            <button onClick={runPayroll} disabled={processing} style={{ padding: '0.75rem 2.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                                                {processing ? <><Loader2 size={18} className="spin" /> Processing...</> : <><ShieldCheck size={18} /> Submit Payroll</>}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hire Modal */}
            <AnimatePresence>
                {showHireModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHireModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: '500px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', overflow: 'hidden' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Add Team Member</h2>
                            <form onSubmit={handleHire} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Name</label>
                                    <input required value={hireForm.name} onChange={e => setHireForm({...hireForm, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Role</label>
                                        <input required value={hireForm.role} onChange={e => setHireForm({...hireForm, role: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Type</label>
                                        <select value={hireForm.type} onChange={e => setHireForm({...hireForm, type: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}>
                                            <option value="Full-time">Full-time (W-2)</option>
                                            <option value="Part-time">Part-time (W-2)</option>
                                            <option value="Contractor">Contractor (1099)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Gross Salary</label>
                                    <input type="number" required value={hireForm.salary} onChange={e => setHireForm({...hireForm, salary: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowHireModal(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={isLoading} style={{ padding: '0.75rem 1.5rem', background: '#a855f7', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{isLoading ? 'Saving...' : 'Add Member'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Payroll;
