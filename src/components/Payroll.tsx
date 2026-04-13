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
import { useLanguage } from '../contexts/LanguageContext';
import { calculatePayroll } from '../lib/payrollUtils';

const DEFAULT_STAFF: any[] = [];

interface PayrollProps {
    churchId: string;
}

const Payroll: React.FC<PayrollProps> = ({ churchId }) => {
    const { t } = useLanguage();
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
    const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 22, seconds: 45 });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return { hours: 23, minutes: 59, seconds: 59 };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

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
                    type: s.type,
                    salary: s.salary,
                    housingAllowance: s.housing_allowance || 0,
                    stateTaxRate: s.state_tax_rate || 0.05,
                    lastPaid: s.last_paid,
                    status: s.status,
                    recurring: s.recurring,
                    frequency: s.frequency
                })) : []);
            } catch (err) {
                console.error('Error fetching staff:', err);
                setStaff(DEFAULT_STAFF);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStaff();
    }, [churchId]);

    // Hire Form States
    const [hireName, setHireName] = useState('');
    const [hireRole, setHireRole] = useState('');
    const [hireType, setHireType] = useState('Full-time');
    const [hireSalary, setHireSalary] = useState('');
    const [hireFrequency, setHireFrequency] = useState('Monthly');
    const [hireRecurring, setHireRecurring] = useState(true);
    const [hireHousingAllowance, setHireHousingAllowance] = useState('0');
    const [hireStateTaxRate, setHireStateTaxRate] = useState('0.05');

    const handleProcessPayroll = async () => {
        if (!churchId) {
            alert('Church session not found. Please log in again.');
            return;
        }
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
                    const taxes = calculatePayroll(s.salary, s.housingAllowance, s.type !== 'Contractor', s.stateTaxRate);
                    totalNet += taxes.net;

                    const shiftLabel = s.frequency === 'Twice Daily' ? ` [${activeShift} Shift]` : '';
                    const lastPaidStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + shiftLabel;

                    ledgerEntries.push({
                        date: new Date().toISOString().split('T')[0],
                        description: `Payroll Disbursement: ${s.name}${shiftLabel}`,
                        category: 'Payroll',
                        department: 'HR & Administration',
                        fund: 'General Fund (Tithes)',
                        amount: -taxes.net,
                        type: 'out',
                        notes: `${s.frequency} ${s.type} salary run${shiftLabel}`,
                        church_id: churchId,
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
                // Find General Fund to associate and deduct from
                // Find General Fund to associate and deduct from
                const { data: gfData, error: gfError } = await supabase
                    .from('funds')
                    .select('*')
                    .eq('church_id', churchId)
                    .ilike('name', '%General%')
                    .maybeSingle();

                if (gfError) console.warn('Fund lookup error:', gfError);
                
                // Fallback to first fund if General Fund not found
                let activeFund = gfData;
                if (!activeFund) {
                    const { data: anyFund } = await supabase.from('funds').select('*').eq('church_id', churchId).limit(1).maybeSingle();
                    activeFund = anyFund;
                }

                const finalLedgerEntries = ledgerEntries.map(tx => ({
                    ...tx,
                    fund_id: activeFund?.id
                }));

                const { error: ledgerError } = await supabase.from('ledger').insert(finalLedgerEntries);
                if (ledgerError) throw ledgerError;

                // Update Staff in Supabase (Process in parallel for speed)
                const updates = staffUpdates.map(u => 
                    supabase.from('staff').update({
                        status: u.status,
                        last_paid: u.last_paid
                    }).eq('id', u.id).eq('church_id', churchId)
                );
                
                const results = await Promise.all(updates);
                const firstError = results.find(r => r.error);
                if (firstError?.error) throw firstError.error;

                // Fund balance is now handled by database trigger
            }

            setStaff(newStaff);
            setProcessComplete({ staffCount: eligibleStaff.length, amount: totalNet });
        } catch (err: any) {
            console.error('Error processing payroll:', err);
            const msg = err.message || 'Check your database connection or try again.';
            alert(`Failed to process payroll: ${msg}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleHireMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!churchId) {
            alert('Error: No active church workspace selected.');
            return;
        }
        if (!hireName || !hireRole || !hireSalary) return;

        const salary = parseFloat(hireSalary);
        const housing = parseFloat(hireHousingAllowance) || 0;
        if (salary <= 0 || housing < 0) {
            alert('Financial Integrity Error: Salaries and allowances must be positive values.');
            return;
        }


        setIsLoading(true);
        try {
            const newStaff: any = {
                name: hireName,
                role: hireRole,
                type: hireType,
                salary: parseFloat(hireSalary) || 0,
                housing_allowance: parseFloat(hireHousingAllowance) || 0,
                state_tax_rate: parseFloat(hireStateTaxRate) || 0.05,
                last_paid: 'Never',
                status: 'Pending',
                frequency: hireFrequency,
                recurring: hireRecurring,
                church_id: churchId,
                created_at: new Date().toISOString()
            };

            let { error } = await supabase.from('staff').insert([newStaff]);
            
            // SECOND CHANCE: If columns are missing, try standard insert
            if (error && error.message?.includes('column')) {
               console.warn('New columns missing, trying simple insert.');
               const simpleStaff = { ...newStaff };
               delete simpleStaff.housing_allowance;
               delete simpleStaff.state_tax_rate;
               const result = await supabase.from('staff').insert([simpleStaff]);
               error = result.error;
            }

            if (error) throw error;

            // Refresh staff list
            const { data } = await supabase.from('staff').select('*').eq('church_id', churchId);
            if (data) {
                setStaff(data.map(s => ({
                    id: s.id,
                    name: s.name,
                    role: s.role,
                    type: s.type,
                    salary: s.salary,
                    housingAllowance: s.housing_allowance || 0,
                    stateTaxRate: s.state_tax_rate || 0.05,
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
            setHireHousingAllowance('0');
            setHireStateTaxRate('0.05');
        } catch (err: any) {
            console.error('Error hiring staff:', err);
            const msg = err.message || 'Database columns for Housing Allowance or Church ID may be missing. Please run the SQL Update.';
            alert(`Failed to save staff record to cloud: ${msg}`);
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


    const taxForms: any[] = [];

    if (isLoading) {
        return (
            <div className="container" style={{ padding: '3rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <Loader2 size={48} color="var(--primary)" />
                    </motion.div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('loading')}...</p>
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
                                    {t('teamCompensation')}
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>{t('payrollDesc')}</p>
                            </div>

                            {/* ── PAYROLL SYNC COUNTDOWN ── */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                style={{ 
                                    background: 'hsla(var(--p)/0.1)', border: '1px solid hsla(var(--p)/0.2)',
                                    padding: '1rem 1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem'
                                }}
                            >
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'hsl(var(--p))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={22} color="white" fill="white" strokeWidth={2.5} />
                                </div>
                                <div style={{ minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'hsl(var(--p))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payroll Sync Window</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', fontVariantNumeric: 'tabular-nums' }}>
                                        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                                    </div>
                                </div>
                            </motion.div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-ghost" onClick={() => setView('tax')}>
                                    <FileCheck size={18} /> {t('taxCenter')}
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
                                        <option value="AM">{t('amShift')}</option>
                                        <option value="PM">{t('pmShift')}</option>
                                    </select>
                                )}
                                <button className="btn btn-primary" style={{ background: 'var(--success)', border: 'none' }} onClick={handleProcessPayroll} disabled={processing}>
                                    {processing ? t('processing') : <><Zap size={18} /> {t('runPayroll')}</>}
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowHireModal(true)}>
                                    <Plus size={18} /> {t('onboardStaff')}
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
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('hireNewStaff')}</h2>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>{t('hireStaffDesc')}</p>

                                        <form onSubmit={handleHireMember}>
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('fullName').toUpperCase()}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={hireName}
                                                    onChange={(e) => setHireName(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('positionRole').toUpperCase()}</label>
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
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('type').toUpperCase()}</label>
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
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('salaryRate').toUpperCase()}</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0.01"
                                                        step="0.01"
                                                        value={hireSalary}
                                                        onChange={(e) => setHireSalary(e.target.value)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('housingAllowance') || 'HOUSING ALLOWANCE'} ($)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={hireHousingAllowance}
                                                        onChange={(e) => setHireHousingAllowance(e.target.value)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('stateTaxRateLabel') || 'STATE TAX RATE'} (0.05)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="0.5"
                                                        step="0.01"
                                                        value={hireStateTaxRate}
                                                        onChange={(e) => setHireStateTaxRate(e.target.value)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('payFrequency').toUpperCase()}</label>
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
                                                <span style={{ fontSize: '0.875rem', color: 'white' }}>{t('setRecurring')}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                                <button type="button" className="btn glass" style={{ flex: 1 }} onClick={() => setShowHireModal(false)}>{t('cancel')}</button>
                                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('hireNewStaff')}</button>
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
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>{t('payrollSuccessful')}</h3>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>{t('success')}</p>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Net Disbursed</p>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>${processComplete.amount.toLocaleString()}</p>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Tax Liability</p>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-light)' }}>${(processComplete.amount * 0.15).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setProcessComplete(null)}>{t('done')}</button>
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
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>{t('nextPayrollRun')}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                                        {activeFrequency === 'Twice Daily' ? t('today') : 'March 15'}
                                    </h2>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                                        {activeFrequency === 'Twice Daily' ? `${activeShift === 'AM' ? t('morning') : t('evening')} ${t('shift')}` : t('tMinus8Days')}
                                    </span>
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                    <Calendar size={20} className="gradient-text" />
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('estDisbursement')}: <strong style={{ color: 'white' }}>$0.00</strong></p>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>{t('activeWorkforce')}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>0</h2>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>8 FT / 4 {t('contractors')}</span>
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                    <Users size={20} className="gradient-text" />
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('status')}: <strong style={{ color: 'var(--success)' }}>{t('allCompliant')}</strong></p>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem', borderLeft: '4px solid var(--danger)' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>{t('actionRequired')}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>1</h2>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 700 }}>{t('pendingApproval')}</span>
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px' }}>
                                    <AlertCircle size={20} color="var(--danger)" />
                                    <p style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600 }}>{t('invoiceVerificationNeeded')}</p>
                                </div>
                            </motion.div>
                        </div>

                        <div className="glass-card" style={{ padding: '3rem', borderRadius: 'var(--radius-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{t('staffRegistry')}</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('staffRegistryDesc')}</p>
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
                                            placeholder={t('searchDirectory')}
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
                                    <Download size={18} /> {t('exportData')}
                                </button>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('member')}</th>
                                            <th>{t('classification')}</th>
                                            <th style={{ textAlign: 'right' }}>{t('grossSalary')}</th>
                                            <th style={{ textAlign: 'right' }}>{t('netDisbursement')}</th>
                                            <th>{t('status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staff.map((person: any) => {
                                            const taxes = calculatePayroll(person.salary, person.housingAllowance, person.type !== 'Contractor', person.stateTaxRate);
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
                                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t(person.role)}</p>
                                                                    <span style={{ fontSize: '0.65rem', color: 'var(--primary-light)', fontWeight: 800 }}>• {t(person.frequency)}</span>
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
                                                            {t(person.type)}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                                                        ${person.salary.toLocaleString()}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '6px' }}>{person.housingAllowance > 0 ? `(Inc. Housing)` : ''}</span>
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
                                                            {t(person.status)}
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
                                    {t('financialCompliance')}
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>{t('complianceDesc')}</p>
                            </div>
                        </header>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '1.5rem',
                            marginBottom: '4rem'
                        }}>
                            {[
                                { label: 'YTD Federal Withholding', value: '$0.00', icon: ShieldCheck, color: 'var(--primary)' },
                                { label: 'Employer FICA Liability', value: '$0.00', icon: Briefcase, color: '#a855f7' },
                                { label: 'Active Tax Forms', value: '0 Ready', icon: FileText, color: 'var(--success)' },
                                { label: 'Next Filing Deadline', value: 'N/A', icon: Calendar, color: '#f59e0b' },
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
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{t('taxFormsArchive') || 'Tax Forms Archive'}</h3>
                                    <button className="btn btn-ghost" style={{ fontSize: '0.875rem' }} onClick={() => setShowHistoryModal(true)}>{t('viewHistory') || 'View History'}</button>
                                </div>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Tax Year</th>
                                                <th>Template</th>
                                                <th>Recipient</th>
                                                <th>{t('status')}</th>
                                                <th style={{ textAlign: 'right' }}>{t('action') || 'Action'}</th>
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
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{t('auditShield')}</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px', color: 'white' }}>{t('w9CollectionCheck') || 'W-9 Collection Check'}</p>
                                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('w9CollectionCheckDesc') || 'All 4 contractors have verified W-9 documents on encrypted storage.'}</p>
                                    </div>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px', color: 'white' }}>{t('941QuarterlySync') || '941 Quarterly Sync'}</p>
                                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('941QuarterlySyncDesc') || 'Real-time synchronization with integrated general ledger for accuracy.'}</p>
                                    </div>
                                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.03)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px', color: 'var(--primary-light)' }}>{t('encryptedArchiving') || 'Encrypted Archiving'}</p>
                                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('encryptedArchivingDesc') || 'All payroll records are immutable and stored for the required 7-year period.'}</p>
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
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{t('payrollHistory') || 'Payroll History'}</h2>
                                            <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {[].map((h: any, i) => (
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
