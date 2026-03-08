import React, { useState, useEffect } from 'react';
import {
    Users,
    Calendar,
    Download,
    FileCheck,
    Search,
    Plus,
    AlertCircle,
    ArrowLeft,
    ShieldCheck,
    Briefcase,
    FileText,
    Zap,
    CheckCircle2,
    Loader2,
    Check,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const DEFAULT_STAFF = [
    { name: 'Dr. Marcus Thorne', role: 'Senior Pastor', type: 'Full-time', salary: 7500, lastPaid: 'Mar 01, 2026', status: 'Paid', recurring: true, frequency: 'Monthly' },
    { name: 'Sarah Jenkins', role: 'Worship Director', type: 'Full-time', salary: 5200, lastPaid: 'Mar 01, 2026', status: 'Paid', recurring: true, frequency: 'Monthly' },
    { name: 'Kevin O\'Brian', role: 'Youth Pastor', type: 'Full-time', salary: 4800, lastPaid: 'Mar 01, 2026', status: 'Paid', recurring: true, frequency: 'Monthly' },
    { name: 'Linda Vance', role: 'Cleaner', type: 'Contractor', salary: 1200, lastPaid: 'Feb 28, 2026', status: 'Paid', recurring: true, frequency: 'Monthly' },
    { name: 'Tom Harris', role: 'IT Support', type: 'Contractor', salary: 2800, lastPaid: 'Feb 15, 2026', status: 'Pending', recurring: false, frequency: 'Monthly' },
    { name: 'Jacob Miller', role: 'Security Detail', type: 'Contractor', salary: 150, lastPaid: 'Never', status: 'Pending', recurring: true, frequency: 'Twice Daily' },
];

const Payroll: React.FC = () => {
    const [view, setView] = useState<'staff' | 'tax'>('staff');
    const [showHireModal, setShowHireModal] = useState(false);
    const [staff, setStaff] = useState<any[]>([]);
    const [processing, setProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [processComplete, setProcessComplete] = useState<any>(null);
    const [activeFrequency, setActiveFrequency] = useState<'Monthly' | 'Twice Daily'>('Monthly');
    const [activeShift, setActiveShift] = useState<'AM' | 'PM'>('AM');
    const [downloadingForm, setDownloadingForm] = useState<number | null>(null);
    const [downloadedForms, setDownloadedForms] = useState<number[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    useEffect(() => {
        const fetchStaff = async () => {
            setIsLoading(true);
            try {
                const { data } = await supabase.from('staff').select('*');
                if (data && data.length > 0) {
                    setStaff(data.map(s => ({
                        id: s.id,
                        name: s.name,
                        role: s.role,
                        type: s.type,
                        salary: s.salary,
                        lastPaid: s.last_paid,
                        status: s.status,
                        recurring: s.recurring,
                        frequency: s.frequency
                    })));
                } else {
                    setStaff(DEFAULT_STAFF);
                }
            } catch (err) {
                console.error('Error fetching staff:', err);
                setStaff(DEFAULT_STAFF);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStaff();
    }, []);

    // Hire Form States
    const [hireName, setHireName] = useState('');
    const [hireRole, setHireRole] = useState('');
    const [hireType, setHireType] = useState('Full-time');
    const [hireSalary, setHireSalary] = useState('');
    const [hireFrequency, setHireFrequency] = useState('Monthly');
    const [hireRecurring, setHireRecurring] = useState(true);

    const handleProcessPayroll = async () => {
        setProcessing(true);
        try {
            // Emulate background processing
            await new Promise(r => setTimeout(r, 2000));

            const eligibleStaff = staff.filter(s =>
                (s.status === 'Paid' || s.status === 'Pending') &&
                s.recurring &&
                s.frequency === activeFrequency
            );

            let totalNet = 0;
            const ledgerEntries: any[] = [];
            const staffUpdates: any[] = [];

            const newStaff = staff.map(s => {
                const isMatch = s.frequency === activeFrequency && (s.status === 'Paid' || s.status === 'Pending') && s.recurring;

                if (isMatch) {
                    const taxes = calculateTaxes(s.salary, s.type === 'Full-time');
                    totalNet += taxes.net;

                    const shiftLabel = s.frequency === 'Twice Daily' ? ` [${activeShift} Shift]` : '';
                    const lastPaidStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + shiftLabel;

                    ledgerEntries.push({
                        id: `payroll_${Date.now()}_${s.id}`,
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                        desc: `Payroll Disbursement: ${s.name}${shiftLabel}`,
                        cat: 'Payroll',
                        dept: 'HR & Administration',
                        fund: 'General Fund (Tithes)',
                        fundId: 'gf',
                        amount: -taxes.net,
                        type: 'out',
                        notes: `${s.frequency} ${s.type} salary run${shiftLabel}`,
                        created_at: new Date().toISOString()
                    });

                    staffUpdates.push({
                        id: s.id,
                        status: 'Paid',
                        last_paid: lastPaidStr
                    });

                    return { ...s, status: 'Paid', lastPaid: lastPaidStr };
                }
                return s;
            });

            // Update Supabase
            if (ledgerEntries.length > 0) {
                const { error: ledgerError } = await supabase.from('ledger').insert(ledgerEntries);
                if (ledgerError) throw ledgerError;

                // Update Staff in Supabase
                for (const update of staffUpdates) {
                    await supabase.from('staff').update({
                        status: update.status,
                        last_paid: update.last_paid
                    }).eq('id', update.id);
                }

                // Update General Fund balance
                const { data: fundData } = await supabase.from('funds').select('balance').eq('id', 'gf').single();
                if (fundData) {
                    await supabase.from('funds').update({ balance: fundData.balance - totalNet }).eq('id', 'gf');
                }
            }

            setStaff(newStaff);
            setProcessComplete({ staffCount: eligibleStaff.length, amount: totalNet });
        } catch (err) {
            console.error('Error processing payroll:', err);
            alert('Failed to process payroll on cloud.');
        } finally {
            setProcessing(false);
        }
    };

    const handleHireMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hireName || !hireRole || !hireSalary) return;

        setIsLoading(true);
        try {
            const newStaff = {
                name: hireName,
                role: hireRole,
                type: hireType,
                salary: parseFloat(hireSalary),
                last_paid: 'Never',
                status: 'Pending',
                frequency: hireFrequency,
                recurring: hireRecurring,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('staff').insert([newStaff]);
            if (error) throw error;

            // Refresh staff list
            const { data } = await supabase.from('staff').select('*');
            if (data) {
                setStaff(data.map(s => ({
                    id: s.id,
                    name: s.name,
                    role: s.role,
                    type: s.type,
                    salary: s.salary,
                    lastPaid: s.last_paid,
                    status: s.status,
                    recurring: s.recurring,
                    frequency: s.frequency
                })));
            }

            setShowHireModal(false);
            setHireName('');
            setHireRole('');
            setHireSalary('');
        } catch (err) {
            console.error('Error hiring staff:', err);
            alert('Failed to save staff record to cloud.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadForm = async (idx: number) => {
        setDownloadingForm(idx);
        // Simulate secure document retrieval
        await new Promise(r => setTimeout(r, 1500));
        setDownloadingForm(null);
        setDownloadedForms(prev => [...prev, idx]);
        // Auto-reset checkmark after 3s
        setTimeout(() => {
            setDownloadedForms(prev => prev.filter(i => i !== idx));
        }, 3000);
    };

    const calculateTaxes = (amount: number, isEmployee: boolean) => {
        if (!isEmployee) return { total: amount, withholding: 0, net: amount };
        const ss = amount * 0.062;
        const medicare = amount * 0.0145;
        const federal = amount * 0.12; // Simplified
        return {
            gross: amount,
            ss,
            medicare,
            federal,
            totalWithholding: ss + medicare + federal,
            net: amount - (ss + medicare + federal)
        };
    };

    const taxForms = [
        { year: '2025', type: 'W-2', recipient: 'Dr. Marcus Thorne', status: 'Ready', date: 'Jan 15, 2026' },
        { year: '2025', type: 'W-2', recipient: 'Sarah Jenkins', status: 'Ready', date: 'Jan 15, 2026' },
        { year: '2025', type: '1099-NEC', recipient: 'Linda Vance', status: 'Ready', date: 'Jan 20, 2026' },
        { year: '2025', type: '941', recipient: 'IRS (Q4)', status: 'Filed', date: 'Jan 31, 2026' },
    ];

    if (isLoading) {
        return (
            <div className="container" style={{ padding: '3rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <Loader2 size={48} color="var(--primary)" />
                    </motion.div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Securing Payroll Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <AnimatePresence mode="wait">
                {view === 'staff' ? (
                    <motion.div
                        key="staff-list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
                            <div>
                                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                                    Team <span className="gradient-text">Compensation</span>
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Automated payroll management for church staff and specialized contractors</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-ghost" onClick={() => setView('tax')}>
                                    <FileCheck size={18} /> Tax Center
                                </button>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
                                    {['Monthly', 'Twice Daily'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setActiveFrequency(f as any)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: activeFrequency === f ? 'var(--primary)' : 'transparent',
                                                color: activeFrequency === f ? 'white' : 'var(--text-muted)',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                {activeFrequency === 'Twice Daily' && (
                                    <select
                                        value={activeShift}
                                        onChange={(e) => setActiveShift(e.target.value as any)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', padding: '0 12px', fontSize: '0.8rem' }}
                                    >
                                        <option value="AM">AM Shift</option>
                                        <option value="PM">PM Shift</option>
                                    </select>
                                )}
                                <button className="btn btn-primary" style={{ background: 'var(--success)', border: 'none' }} onClick={handleProcessPayroll} disabled={processing}>
                                    {processing ? 'Processing...' : <><Zap size={18} /> Run {activeFrequency} Payroll</>}
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowHireModal(true)}>
                                    <Plus size={18} /> Onboard Staff
                                </button>
                            </div>
                        </header>

                        <AnimatePresence>
                            {showHireModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        position: 'fixed',
                                        inset: 0,
                                        backgroundColor: 'rgba(0,0,0,0.8)',
                                        backdropFilter: 'blur(8px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 1000,
                                        padding: '1rem'
                                    }}
                                    onClick={() => setShowHireModal(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.95, y: 10, opacity: 0 }}
                                        animate={{ scale: 1, y: 0, opacity: 1 }}
                                        exit={{ scale: 0.95, y: 10, opacity: 0 }}
                                        style={{
                                            width: '100%',
                                            maxWidth: '440px',
                                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                            borderRadius: '28px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            padding: '2.5rem',
                                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Hire New Staff</h2>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>Add a new employee or contractor to payroll.</p>

                                        <form onSubmit={handleHireMember}>
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>FULL NAME</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={hireName}
                                                    onChange={(e) => setHireName(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>POSITION ROLE</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={hireRole}
                                                    onChange={(e) => setHireRole(e.target.value)}
                                                    placeholder="e.g. Facilities Manager"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>TYPE</label>
                                                    <select
                                                        value={hireType}
                                                        onChange={(e) => setHireType(e.target.value)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--primary-dark)', border: '1px solid var(--border)', color: 'white' }}
                                                    >
                                                        <option value="Full-time">Full-time</option>
                                                        <option value="Contractor">Contractor</option>
                                                        <option value="Part-time">Part-time</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>SALARY / RATE</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        value={hireSalary}
                                                        onChange={(e) => setHireSalary(e.target.value)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>PAY FREQUENCY</label>
                                                    <select
                                                        value={hireFrequency}
                                                        onChange={(e) => setHireFrequency(e.target.value)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--primary-dark)', border: '1px solid var(--border)', color: 'white' }}
                                                    >
                                                        <option value="Monthly">Monthly</option>
                                                        <option value="Twice Daily">Twice Daily</option>
                                                        <option value="Weekly">Weekly</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={hireRecurring}
                                                    onChange={e => setHireRecurring(e.target.checked)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '0.875rem', color: 'white' }}>Set as Recurring Payment</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                                <button type="button" className="btn glass" style={{ flex: 1 }} onClick={() => setShowHireModal(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Hire Member</button>
                                            </div>
                                        </form>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Processing Result Modal */}
                        <AnimatePresence>
                            {processComplete && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="glass-card"
                                        style={{ width: '400px', padding: '3rem', textAlign: 'center', borderRadius: '32px' }}
                                    >
                                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--success)' }}>
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>Payroll Successful</h3>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Processed disbursement for {processComplete.staffCount} team members.</p>

                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount Disbursed</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>${processComplete.amount.toLocaleString()}</p>
                                        </div>

                                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setProcessComplete(null)}>Done</button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem',
                            marginBottom: '3rem'
                        }}>
                            <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Next Payroll Run</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                                        {activeFrequency === 'Twice Daily' ? 'Today' : 'March 15'}
                                    </h2>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                                        {activeFrequency === 'Twice Daily' ? `${activeShift === 'AM' ? 'Morning' : 'Evening'} Shift` : 'T-Minus 8 Days'}
                                    </span>
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                    <Calendar size={20} className="gradient-text" />
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Est. Disbursement: <strong style={{ color: 'white' }}>$18,450.00</strong></p>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Active Workforce</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>12</h2>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>8 FT / 4 contractors</span>
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                    <Users size={20} className="gradient-text" />
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status: <strong style={{ color: 'var(--success)' }}>All Compliant</strong></p>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem', borderLeft: '4px solid var(--danger)' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Action Required</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>1</h2>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 700 }}>Pending Approval</span>
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px' }}>
                                    <AlertCircle size={20} color="var(--danger)" />
                                    <p style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600 }}>Invoice verification needed</p>
                                </div>
                            </motion.div>
                        </div>

                        <div className="glass-card" style={{ padding: '3rem', borderRadius: 'var(--radius-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Staff Registry</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Centralized management of team structure and compensation</p>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        padding: '0.75rem 1.25rem',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                        width: '320px'
                                    }}>
                                        <Search size={18} color="var(--text-muted)" />
                                        <input
                                            type="text"
                                            placeholder="Search directory..."
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'white',
                                                marginLeft: '0.75rem',
                                                outline: 'none',
                                                fontSize: '0.9rem',
                                                width: '100%'
                                            }}
                                        />
                                    </div>
                                </div>
                                <button className="btn btn-ghost" style={{ gap: '8px' }}>
                                    <Download size={18} /> Export Data
                                </button>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Classification</th>
                                            <th style={{ textAlign: 'right' }}>Gross Salary</th>
                                            <th style={{ textAlign: 'right' }}>Net Disbursement</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staff.map((person: any) => {
                                            const taxes = calculateTaxes(person.salary, person.type === 'Full-time');
                                            return (
                                                <tr key={person.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '12px',
                                                                background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 800,
                                                                boxShadow: '0 4px 8px -2px var(--primary-glow)'
                                                            }}>
                                                                {person.name.split(' ').map((n: string) => n[0]).join('')}
                                                            </div>
                                                            <div>
                                                                <p style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>{person.name}</p>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{person.role}</p>
                                                                    <span style={{ fontSize: '0.65rem', color: 'var(--primary-light)', fontWeight: 800 }}>• {person.frequency}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '4px 12px',
                                                            borderRadius: '6px',
                                                            backgroundColor: person.type === 'Full-time' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                                                            color: person.type === 'Full-time' ? 'var(--primary-light)' : '#c084fc',
                                                            fontWeight: 800,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.04em'
                                                        }}>
                                                            {person.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                                                        ${person.salary.toLocaleString()}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                                                        ${taxes.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 800,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            color: person.status === 'Paid' ? 'var(--success)' : 'var(--danger)'
                                                        }}>
                                                            <div style={{
                                                                width: '6px',
                                                                height: '6px',
                                                                borderRadius: '50%',
                                                                backgroundColor: person.status === 'Paid' ? 'var(--success)' : 'var(--danger)'
                                                            }} />
                                                            {person.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="tax-center"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <header style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '4rem' }}>
                            <button className="btn btn-ghost" style={{ padding: '12px', borderRadius: '15px' }} onClick={() => setView('staff')}>
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                                    Financial <span className="gradient-text">Compliance</span>
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Secure tax handling, automated filings, and audit-ready reporting</p>
                            </div>
                        </header>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '1.5rem',
                            marginBottom: '4rem'
                        }}>
                            {[
                                { label: 'YTD Federal Withholding', value: '$24,520.00', icon: ShieldCheck, color: 'var(--primary)' },
                                { label: 'Employer FICA Liability', value: '$12,180.50', icon: Briefcase, color: '#a855f7' },
                                { label: 'Active Tax Forms', value: '4 Ready', icon: FileText, color: 'var(--success)' },
                                { label: 'Next Filing Deadline', value: 'April 30', icon: Calendar, color: '#f59e0b' },
                            ].map((stat, idx) => (
                                <motion.div whileHover={{ scale: 1.02 }} key={idx} className="glass-card" style={{ padding: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
                                        <div style={{ color: stat.color }}><stat.icon size={20} /></div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</span>
                                    </div>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{stat.value}</p>
                                </motion.div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2.5rem' }}>
                            <div className="glass-card" style={{ padding: '3rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Tax Forms Archive</h3>
                                    <button className="btn btn-ghost" style={{ fontSize: '0.875rem' }} onClick={() => setShowHistoryModal(true)}>View History</button>
                                </div>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Tax Year</th>
                                                <th>Template</th>
                                                <th>Recipient</th>
                                                <th>Status</th>
                                                <th style={{ textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {taxForms.map((form, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ fontWeight: 800, color: 'white' }}>{form.year}</td>
                                                    <td>
                                                        <span style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '0.9rem' }}>{form.type}</span>
                                                    </td>
                                                    <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{form.recipient}</td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '4px 12px',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                            color: 'var(--success)',
                                                            fontWeight: 800,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.04em'
                                                        }}>{form.status}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button
                                                            className="btn btn-ghost"
                                                            style={{ padding: '8px', color: downloadedForms.includes(idx) ? 'var(--success)' : 'inherit' }}
                                                            onClick={() => handleDownloadForm(idx)}
                                                            disabled={downloadingForm === idx}
                                                        >
                                                            {downloadingForm === idx ? (
                                                                <Loader2 size={18} className="animate-spin" />
                                                            ) : downloadedForms.includes(idx) ? (
                                                                <Check size={18} />
                                                            ) : (
                                                                <Download size={18} />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '3rem', height: 'fit-content' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem' }}>
                                    <ShieldCheck size={24} className="gradient-text" />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>Audit Shield</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px', color: 'white' }}>W-9 Collection Check</p>
                                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>All 4 contractors have verified W-9 documents on encrypted storage.</p>
                                    </div>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px', color: 'white' }}>941 Quarterly Sync</p>
                                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Real-time synchronization with integrated general ledger for accuracy.</p>
                                    </div>
                                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.03)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px', color: 'var(--primary-light)' }}>Encrypted Archiving</p>
                                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>All payroll records are immutable and stored for the required 7-year period.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* History Modal */}
                        <AnimatePresence>
                            {showHistoryModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
                                    onClick={() => setShowHistoryModal(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.95, y: 10, opacity: 0 }}
                                        animate={{ scale: 1, y: 0, opacity: 1 }}
                                        exit={{ scale: 0.95, y: 10, opacity: 0 }}
                                        className="glass-card"
                                        style={{ width: '100%', maxWidth: '480px', borderRadius: '28px', padding: '3rem' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Payroll History</h2>
                                            <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {[
                                                { date: 'Mar 01, 2026', desc: 'Monthly Salary Run', amount: '$42,500.00', status: 'Completed' },
                                                { date: 'Feb 15, 2026', desc: 'Mid-Month Contractor Run', amount: '$12,800.00', status: 'Completed' },
                                                { date: 'Feb 01, 2026', desc: 'Monthly Salary Run', amount: '$42,500.00', status: 'Completed' },
                                                { date: 'Jan 15, 2026', desc: 'Tax Filing Period Q4', amount: '$8,420.00', status: 'Completed' },
                                            ].map((h, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                                    <div>
                                                        <p style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>{h.date}</p>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.desc}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontWeight: 800, color: 'var(--primary-light)' }}>{h.amount}</p>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 800 }}>{h.status}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '2.5rem' }} onClick={() => setShowHistoryModal(false)}>Close Archive</button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Payroll;
