import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Plus, ArrowRight,
    ShieldCheck, Zap,
    CheckCircle2, Loader2, Check, DollarSign, Edit2, Download, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { calculatePayroll } from '../lib/payrollUtils';
import { generatePayStub } from '../lib/taxPdfGenerator';

interface PayrollProps {
    churchId: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const Payroll: React.FC<PayrollProps> = ({ churchId }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'run' | 'history'>('overview');
    const [staff, setStaff] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Hire Modal
    const [showHireModal, setShowHireModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [hireForm, setHireForm] = useState({
        name: '', role: '', type: 'Full-time', salary: '', 
        housing_allowance: '0', dependents: 0, filing_status: 'Single',
        state_residence: 'TX', recurring: true, frequency: 'Monthly'
    });

    // Wizard
    const [wizardStep, setWizardStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [processComplete, setProcessComplete] = useState<any>(null);
    const [hoursWorked, setHoursWorked] = useState<Record<string, number>>({});
    const [adjustments, setAdjustments] = useState<Record<string, number>>({});

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
                    dependents: s.dependents || 0,
                    filingStatus: s.filing_status || 'Single',
                    stateResidence: s.state_residence || 'TX',
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

    const fetchHistory = async () => {
        if (!churchId) return;
        const { data } = await supabase.from('payroll_history').select('*').eq('church_id', churchId).order('date', { ascending: false });
        if (data) setHistory(data);
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const handleEditClick = (s: any) => {
        setEditId(s.id);
        setHireForm({
            name: s.name,
            role: s.role,
            type: s.type,
            salary: s.salary.toString(),
            housing_allowance: s.housingAllowance.toString(),
            dependents: s.dependents,
            filing_status: s.filingStatus,
            state_residence: s.stateResidence,
            recurring: s.recurring,
            frequency: s.frequency
        });
        setShowHireModal(true);
    };

    const handleHire = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const newStaff = {
                ...hireForm,
                salary: parseFloat(hireForm.salary) || 0,
                housing_allowance: parseFloat(hireForm.housing_allowance) || 0,
                dependents: parseInt(hireForm.dependents as any) || 0,
                church_id: churchId,
                status: 'Pending',
                last_paid: 'Never'
            };

            let error;
            if (editId) {
                const { error: updateError } = await supabase.from('staff').update({
                    name: newStaff.name,
                    role: newStaff.role,
                    type: newStaff.type,
                    salary: newStaff.salary,
                    housing_allowance: newStaff.housing_allowance,
                    dependents: newStaff.dependents,
                    filing_status: newStaff.filing_status,
                    state_residence: newStaff.state_residence
                }).eq('id', editId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('staff').insert([newStaff]);
                error = insertError;
            }
            
            if (error && error.message?.includes('column')) {
               alert('Database migration required! The new tax profile columns (dependents, filing_status) do not exist in your database. Please run the SQL migration script in your Supabase SQL editor.');
               setIsLoading(false);
               return;
            }
            if (error) throw error;
            
            const { data } = await supabase.from('staff').select('*').eq('church_id', churchId);
            if (data) {
                setStaff(data.map(s => ({
                    id: s.id, name: s.name, role: s.role, type: s.type || 'Full-time', salary: s.salary, 
                    housingAllowance: s.housing_allowance || 0, dependents: s.dependents || 0, filingStatus: s.filing_status || 'Single',
                    stateResidence: s.state_residence || 'TX', lastPaid: s.last_paid, status: s.status, recurring: s.recurring !== false, frequency: s.frequency || 'Monthly'
                })));
            }
            setShowHireModal(false);
            setEditId(null);
            setHireForm({ name: '', role: '', type: 'Full-time', salary: '', housing_allowance: '0', dependents: 0, filing_status: 'Single', state_residence: 'TX', recurring: true, frequency: 'Monthly' });
        } catch (err: any) {
            alert('Error saving staff: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTerminate = async (id: string) => {
        if (!confirm('Are you sure you want to terminate this employee? They will be removed from future payroll runs, but their history will be preserved.')) return;
        setIsLoading(true);
        try {
            await supabase.from('staff').update({ status: 'Terminated' }).eq('id', id);
            setStaff(staff.map(s => s.id === id ? { ...s, status: 'Terminated' } : s));
            setShowHireModal(false);
        } catch (err: any) {
            alert('Error terminating staff: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this employee? Use this for mistakes. If they have already been paid, consider terminating them instead.')) return;
        setIsLoading(true);
        try {
            await supabase.from('staff').delete().eq('id', id);
            setStaff(staff.filter(s => s.id !== id));
        } catch (err: any) {
            alert('Error deleting staff: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const eligibleStaff = useMemo(() => staff.filter(s => s.status !== 'Terminated'), [staff]);
    const totalMonthlySalary = useMemo(() => eligibleStaff.reduce((s, st) => s + (st.salary || 0), 0), [eligibleStaff]);

    const getGrossPay = (s: any) => {
        const base = s.type === 'Hourly' ? (s.salary || 0) * (hoursWorked[s.id] || 0) : (s.salary || 0);
        return Math.max(0, base + (adjustments[s.id] || 0));
    };

    const runPayroll = async () => {
        setProcessing(true);
        try {
            await new Promise(r => setTimeout(r, 1500));
            
            let totalNet = 0;
            const historyEntries: any[] = [];
            const staffUpdates: any[] = [];

            eligibleStaff.forEach(s => {
                const gross = getGrossPay(s);
                if (s.type === 'Hourly' && gross === 0) return; // Skip hourly employees with 0 hours

                const taxes = calculatePayroll(gross, s.housingAllowance, s.type !== 'Contractor', s.stateResidence, s.filingStatus, s.dependents);
                totalNet += taxes.net;
                
                const lastPaidStr = new Date().toLocaleDateString();
                const notes = s.type === 'Hourly' ? `${hoursWorked[s.id] || 0} Hours worked` : `${s.frequency} ${s.type} salary run`;
                
                historyEntries.push({
                    church_id: churchId,
                    staff_id: s.id,
                    staff_name: s.name,
                    date: new Date().toISOString().split('T')[0],
                    gross_pay: taxes.gross,
                    net_pay: taxes.net,
                    federal_tax: taxes.federalTax,
                    state_tax: taxes.stateTax,
                    medicare: taxes.medicare,
                    social_security: taxes.socialSecurity,
                    notes: notes,
                    created_at: new Date().toISOString()
                });
                staffUpdates.push({ id: s.id, status: 'Paid', last_paid: lastPaidStr });
            });

            if (historyEntries.length > 0) {
                const { error: histError } = await supabase.from('payroll_history').insert(historyEntries);
                if (histError) throw histError;

                const updates = staffUpdates.map(u => supabase.from('staff').update({ status: u.status, last_paid: u.last_paid }).eq('id', u.id).eq('church_id', churchId));
                await Promise.all(updates);
            }

            setProcessComplete({ staffCount: historyEntries.length, amount: totalNet });
            
            // Refetch
            const { data } = await supabase.from('staff').select('*').eq('church_id', churchId);
            if (data) {
                setStaff(data.map(s => ({
                    id: s.id, name: s.name, role: s.role, type: s.type || 'Full-time', salary: s.salary, 
                    housingAllowance: s.housing_allowance || 0, dependents: s.dependents || 0, filingStatus: s.filing_status || 'Single',
                    stateResidence: s.state_residence || 'TX', lastPaid: s.last_paid, status: s.status, recurring: s.recurring !== false, frequency: s.frequency || 'Monthly'
                })));
            }
        } catch (err) {
            alert('Failed to process payroll. Check if payroll_history table exists.');
        } finally {
            setProcessing(false);
            setHoursWorked({});
            setAdjustments({});
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Team & Payroll
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.5rem' }}>Premium workforce management (Isolated from Main Ledger)</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => { setEditId(null); setHireForm({ name: '', role: '', type: 'Full-time', salary: '', housing_allowance: '0', dependents: 0, filing_status: 'Single', state_residence: 'TX', recurring: true, frequency: 'Monthly' }); setShowHireModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        <Plus size={18} /> Add Team Member
                    </button>
                    <button onClick={() => { setActiveTab('run'); setWizardStep(1); setProcessComplete(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <Zap size={18} /> Run Payroll
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                {['overview', 'team', 'run', 'history'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ background: 'none', border: 'none', color: activeTab === tab ? '#a855f7' : '#94a3b8', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', position: 'relative', transition: 'color 0.2s' }}>
                        {tab === 'run' ? 'Run Payroll' : tab === 'history' ? 'History & Stubs' : tab}
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
                        </div>
                    </motion.div>
                )}

                {activeTab === 'team' && (
                    <motion.div key="team" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {staff.map(s => (
                                <div key={s.id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleEditClick(s)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '0.5rem', color: 'white', cursor: 'pointer' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(s.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', padding: '0.5rem', color: '#ef4444', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem', fontWeight: 800 }}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{s.name}</h3>
                                            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{s.role} • {s.stateResidence}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <span style={{ color: '#94a3b8' }}>Tax Profile</span>
                                            <span style={{ color: 'white', fontWeight: 600 }}>{s.filingStatus}, {s.dependents} Kids</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <span style={{ color: '#94a3b8' }}>Type</span>
                                            <span style={{ color: 'white', fontWeight: 600 }}>{s.type}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <span style={{ color: '#94a3b8' }}>Rate / Salary</span>
                                            <span style={{ color: 'white', fontWeight: 600 }}>{s.type === 'Hourly' ? `${fmt(s.salary)}/hr` : fmt(s.salary)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Date</th>
                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Employee</th>
                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Gross Pay</th>
                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Net Pay</th>
                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(entry => (
                                        <tr key={entry.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>{entry.date}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'white', fontWeight: 600 }}>{entry.staff_name}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'white' }}>{fmt(entry.gross_pay)}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#10b981', fontWeight: 700 }}>{fmt(entry.net_pay)}</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <button onClick={() => generatePayStub(entry, { name: 'Your Church' })} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Download size={14} /> Stub
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No payroll history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                                <button onClick={() => setActiveTab('history')} style={{ padding: '0.75rem 2rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>View History</button>
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
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Review Salaries & Hours</h3>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Employee</th>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Type</th>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Rate / Salary</th>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Hours Worked</th>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Adjustments ($)</th>
                                                        <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Gross Pay</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {eligibleStaff.map(s => {
                                                        const isHourly = s.type === 'Hourly';
                                                        const gross = getGrossPay(s);
                                                        return (
                                                        <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '1rem 1.5rem', color: 'white', fontWeight: 600 }}>{s.name}</td>
                                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>{s.type}</td>
                                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>{isHourly ? `${fmt(s.salary)}/hr` : fmt(s.salary)}</td>
                                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                                {isHourly ? (
                                                                    <input 
                                                                        type="number" 
                                                                        min="0"
                                                                        placeholder="0"
                                                                        value={hoursWorked[s.id] || ''}
                                                                        onChange={e => setHoursWorked({...hoursWorked, [s.id]: parseFloat(e.target.value) || 0})}
                                                                        style={{ width: '80px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                                                                    />
                                                                ) : <span style={{ color: '#475569' }}>—</span>}
                                                            </td>
                                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="0"
                                                                    value={adjustments[s.id] || ''}
                                                                    onChange={e => setAdjustments({...adjustments, [s.id]: parseFloat(e.target.value) || 0})}
                                                                    style={{ width: '80px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '1rem 1.5rem', color: 'white', fontWeight: 600 }}>{fmt(gross)}</td>
                                                        </tr>
                                                    )})}
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
                                                const gross = getGrossPay(s);
                                                if (s.type === 'Hourly' && gross === 0) return null;

                                                const taxes = calculatePayroll(gross, s.housingAllowance, s.type !== 'Contractor', s.stateResidence, s.filingStatus, s.dependents);
                                                return (
                                                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div>
                                                            <div style={{ color: 'white', fontWeight: 600 }}>{s.name}</div>
                                                            <div style={{ color: '#a855f7', fontSize: '0.875rem' }}>{s.stateResidence} • {s.filingStatus} • {s.dependents} Dependents</div>
                                                        </div>
                                                        <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                                                            {s.type !== 'Contractor' ? (
                                                                <>
                                                                    <div>Fed Tax: {fmt(taxes.federalTax)}</div>
                                                                    <div>State Tax: {fmt(taxes.stateTax)}</div>
                                                                    <div>FICA: {fmt(taxes.socialSecurity + taxes.medicare)}</div>
                                                                </>
                                                            ) : 'No Withholdings (1099)'}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: 800 }}>{fmt(taxes.net)}</div>
                                                            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Net Pay</div>
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
                                                {fmt(eligibleStaff.reduce((s, st) => {
                                                    const g = getGrossPay(st);
                                                    if (g === 0) return s;
                                                    return s + calculatePayroll(g, st.housingAllowance, st.type !== 'Contractor', st.stateResidence, st.filingStatus, st.dependents).net;
                                                }, 0))}
                                            </div>
                                            <p style={{ color: '#cbd5e1' }}>This will be processed to the <strong>payroll_history</strong> ledger and will not affect the main church dashboard.</p>
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
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: '600px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', overflow: 'hidden' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{editId ? 'Edit Team Member' : 'Add Team Member'}</h2>
                            <form onSubmit={handleHire} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Name</label>
                                        <input required value={hireForm.name} onChange={e => setHireForm({...hireForm, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Type</label>
                                        <select value={hireForm.type} onChange={e => setHireForm({...hireForm, type: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}>
                                            <option value="Full-time">Full-time (W-2)</option>
                                            <option value="Part-time">Part-time (W-2)</option>
                                            <option value="Contractor">Contractor (1099)</option>
                                            <option value="Hourly">Hourly</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Role</label>
                                        <input required value={hireForm.role} onChange={e => setHireForm({...hireForm, role: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{hireForm.type === 'Hourly' ? 'Hourly Rate' : 'Gross Salary'}</label>
                                        <input type="number" required value={hireForm.salary} onChange={e => setHireForm({...hireForm, salary: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                                    <h4 style={{ color: '#a855f7', fontWeight: 600, marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tax Profile</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>State</label>
                                            <select value={hireForm.state_residence} onChange={e => setHireForm({...hireForm, state_residence: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}>
                                                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Filing Status</label>
                                            <select value={hireForm.filing_status} onChange={e => setHireForm({...hireForm, filing_status: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}>
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Head of Household">Head of House</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Dependents</label>
                                            <input type="number" required value={hireForm.dependents} onChange={e => setHireForm({...hireForm, dependents: parseInt(e.target.value) || 0})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowHireModal(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    {editId && <button type="button" onClick={() => handleTerminate(editId)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontWeight: 600, cursor: 'pointer', marginRight: 'auto' }}>Terminate</button>}
                                    <button type="submit" disabled={isLoading} style={{ padding: '0.75rem 1.5rem', background: '#a855f7', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{isLoading ? 'Saving...' : editId ? 'Save Changes' : 'Add Member'}</button>
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
