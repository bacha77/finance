import React, { useState, useEffect } from 'react';
import {
    Download, FileText, ShieldCheck, AlertCircle, CheckCircle2,
    Loader2, ArrowLeft, Calendar, Building2,
    FileCheck, BookOpen, Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
    generateW2,
    generate1099NEC,
    generate941,
    generateW3,
    generate990Summary,
} from '../lib/taxPdfGenerator';

interface TaxComplianceProps {
    onBack?: () => void;
    churchName?: string;
    churchId?: string;
}

const TAX_YEAR = '2025';

const FORM_INFO: Record<string, { title: string; desc: string; dueDate: string; icon: React.ElementType; color: string; bg: string }> = {
    'W-2': {
        title: 'Form W-2',
        desc: 'Wage and Tax Statement for full-time and part-time employees.',
        dueDate: 'January 31',
        icon: FileText,
        color: '#2563eb',
        bg: 'rgba(37,99,235,0.1)',
    },
    '1099-NEC': {
        title: 'Form 1099-NEC',
        desc: 'Nonemployee Compensation for contractors paid $600+ per year.',
        dueDate: 'January 31',
        icon: Receipt,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
    },
    '941': {
        title: 'Form 941',
        desc: "Employer's Quarterly Federal Tax Return — taxes withheld from wages.",
        dueDate: 'Quarterly',
        icon: BookOpen,
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.1)',
    },
    'W-3': {
        title: 'Form W-3',
        desc: 'Transmittal of Wage and Tax Statements — summary of all W-2s.',
        dueDate: 'January 31',
        icon: FileCheck,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.1)',
    },
    '990': {
        title: 'Form 990 Summary',
        desc: 'Nonprofit tax-exempt return — required for 501(c)(3) organizations.',
        dueDate: 'May 15',
        icon: Building2,
        color: '#06b6d4',
        bg: 'rgba(6,182,212,0.1)',
    },
};

// ── Row Component ──────────────────────────────────────────────────────────
function FormRow({
    form,
    person,
    year,
    onDownload,
    status,
}: {
    form: string;
    person: string;
    year: string;
    onDownload: () => void;
    status: 'idle' | 'loading' | 'done';
}) {
    const info = FORM_INFO[form] || FORM_INFO['W-2'];
    const Icon = info.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                gap: '1rem',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: info.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <Icon size={18} color={info.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>{info.title}</span>
                        <span style={{
                            fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px',
                            background: 'rgba(16,185,129,0.1)', color: '#10b981', textTransform: 'uppercase',
                        }}>
                            {year} · Ready
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {person} · Due {info.dueDate}
                    </div>
                </div>
            </div>
            <motion.button
                onClick={onDownload}
                disabled={status === 'loading'}
                whileHover={status === 'idle' ? { scale: 1.05 } : {}}
                whileTap={{ scale: 0.95 }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', borderRadius: '8px', border: 'none',
                    background: status === 'done'
                        ? 'rgba(16,185,129,0.15)'
                        : status === 'loading'
                            ? 'rgba(255,255,255,0.05)'
                            : `${info.bg}`,
                    color: status === 'done' ? '#10b981' : info.color,
                    fontWeight: 700, fontSize: '0.78rem', cursor: status === 'loading' ? 'default' : 'pointer',
                    fontFamily: 'inherit', flexShrink: 0,
                    outline: `1px solid ${status === 'done' ? 'rgba(16,185,129,0.2)' : `${info.color}30`}`,
                }}
            >
                {status === 'loading' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Loader2 size={14} /></motion.div>}
                {status === 'done' && <CheckCircle2 size={14} />}
                {status === 'idle' && <Download size={14} />}
                {status === 'loading' ? 'Generating...' : status === 'done' ? 'Downloaded' : 'Download PDF'}
            </motion.button>
        </motion.div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
const TaxCompliance: React.FC<TaxComplianceProps> = ({ onBack, churchName: propChurchName, churchId }) => {
    const [staff, setStaff] = useState<any[]>([]);
    const [churchInfo, setChurchInfo] = useState({ name: propChurchName || 'Your Church', ein: 'XX-XXXXXXX', address: '', logo_url: '' });
    const [stats, setStats] = useState({ income: 0, expenses: 0, balance: 0, members: 0 });
    const [dlStatus, setDlStatus] = useState<Record<string, 'idle' | 'loading' | 'done'>>({});
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const [editEin, setEditEin] = useState(false);
    const [einInput, setEinInput] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [{ data: staffData }, { data: ledger }, { data: funds }, { data: members }, { data: church }] = await Promise.all([
                    supabase.from('staff').select('*').eq('church_id', churchId),
                    supabase.from('ledger').select('*').eq('church_id', churchId),
                    supabase.from('funds').select('*').eq('church_id', churchId),
                    supabase.from('members').select('id').eq('church_id', churchId),
                    churchId ? supabase.from('churches').select('*').eq('id', churchId).single() : { data: null },
                ]);

                if (staffData && staffData.length > 0) {
                    setStaff(staffData.map((s: any) => ({
                        id: s.id, name: s.name, role: s.role, type: s.type,
                        salary: s.salary, status: s.status, frequency: s.frequency,
                    })));
                } else {
                    setStaff([
                        { name: 'Dr. Marcus Thorne', role: 'Senior Pastor', type: 'Full-time', salary: 7500 },
                        { name: 'Sarah Jenkins', role: 'Worship Director', type: 'Full-time', salary: 5200 },
                        { name: 'Kevin O\'Brian', role: 'Youth Pastor', type: 'Full-time', salary: 4800 },
                        { name: 'Linda Vance', role: 'Cleaner', type: 'Contractor', salary: 1200 },
                        { name: 'Tom Harris', role: 'IT Support', type: 'Contractor', salary: 2800 },
                    ]);
                }

                const income = ledger?.filter((t: any) => t.type === 'in').reduce((s: number, t: any) => s + (t.amount || 0), 0) || 28450;
                const expenses = ledger?.filter((t: any) => t.type === 'out').reduce((s: number, t: any) => s + (t.amount || 0), 0) || 19800;
                const balance = funds?.reduce((s: number, f: any) => s + (f.balance || 0), 0) || 142500;

                setStats({ income, expenses, balance, members: members?.length || 124 });

                if (church) {
                    setChurchInfo({
                        name: church.name || propChurchName || 'Your Church',
                        ein: church.ein || 'XX-XXXXXXX',
                        address: church.address || '',
                        logo_url: church.logo_url || '',
                    });
                    setEinInput(church.ein || '');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [churchId]);

    const setStatus = (key: string, status: 'idle' | 'loading' | 'done') => {
        setDlStatus(prev => ({ ...prev, [key]: status }));
        if (status === 'done') setTimeout(() => setDlStatus(prev => ({ ...prev, [key]: 'idle' })), 4000);
    };

    const handleDownload = async (key: string, fn: () => void) => {
        setStatus(key, 'loading');
        await new Promise(r => setTimeout(r, 600)); // slight delay so UI updates
        try { fn(); setStatus(key, 'done'); }
        catch (e) { console.error(e); setStatus(key, 'idle'); }
    };

    const church = { name: churchInfo.name, ein: churchInfo.ein, address: churchInfo.address, logo_url: churchInfo.logo_url };
    const employees = staff.filter(s => s.type === 'Full-time' || s.type === 'Part-time');
    const contractors = staff.filter(s => s.type === 'Contractor');

    const ytdWithholding = employees.reduce((sum, s) => {
        const gross = s.salary * 12;
        return sum + gross * (0.062 + 0.0145 + 0.12);
    }, 0);

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Loader2 size={36} color="var(--primary)" />
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem 2.5rem', maxWidth: '1100px', margin: '0 auto' }}>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                {onBack && (
                    <button onClick={onBack} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#94a3b8',
                        display: 'flex', alignItems: 'center',
                    }}><ArrowLeft size={18} /></button>
                )}
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>
                        Financial Compliance & Tax Center
                    </h1>
                    <p style={{ color: '#475569', fontSize: '0.82rem', marginTop: '2px' }}>
                        Tax Year {TAX_YEAR} · Generate and download all IRS tax forms as PDF worksheets
                    </p>
                </div>
            </motion.div>

            {/* Church EIN strip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    padding: '0.85rem 1.25rem', borderRadius: '12px',
                    background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
                    marginBottom: '1.75rem',
                }}>
                <Building2 size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Church / Organization:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{churchInfo.name}</span>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>EIN:</span>
                {editEin ? (
                    <input
                        value={einInput}
                        onChange={e => setEinInput(e.target.value)}
                        onBlur={() => { setChurchInfo(p => ({ ...p, ein: einInput })); setEditEin(false); }}
                        autoFocus
                        style={{
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(37,99,235,0.4)',
                            borderRadius: '6px', padding: '3px 8px', color: 'white', fontWeight: 700,
                            fontSize: '0.85rem', width: '140px',
                        }}
                    />
                ) : (
                    <button onClick={() => setEditEin(true)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa',
                        fontFamily: 'inherit', textDecoration: 'underline dotted',
                    }}>
                        {churchInfo.ein} ✏️
                    </button>
                )}
                <span style={{ fontSize: '0.7rem', color: '#334155', marginLeft: 'auto' }}>
                    Click EIN to update · EIN is printed on all generated forms
                </span>
            </motion.div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'YTD Federal Withholding', value: fmt(ytdWithholding), icon: ShieldCheck, color: '#2563eb' },
                    { label: 'W-2 Forms', value: `${employees.length} Employees`, icon: FileText, color: '#10b981' },
                    { label: '1099-NEC Forms', value: `${contractors.length} Contractors`, icon: Receipt, color: '#f59e0b' },
                    { label: 'Next Filing Deadline', value: 'April 30', icon: Calendar, color: '#a855f7' },
                ].map((s, i) => (
                    <motion.div key={i}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        style={{
                            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <s.icon size={16} color={s.color} />
                            <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>{s.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* W-2 Forms Section */}
            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: '6px', height: '22px', borderRadius: '3px', background: '#2563eb' }} />
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>W-2 — Employee Wage Statements</h2>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>Due Jan 31</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {employees.length === 0 && (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#334155', fontSize: '0.85rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                            No full-time employees found. Add staff in the Payroll section.
                        </div>
                    )}
                    {employees.map((emp, i) => (
                        <FormRow
                            key={i}
                            form="W-2"
                            person={`${emp.name} — ${emp.role}`}
                            year={TAX_YEAR}
                            status={dlStatus[`w2_${i}`] || 'idle'}
                            onDownload={() => handleDownload(`w2_${i}`, () => generateW2(emp, church))}
                        />
                    ))}
                    {employees.length > 0 && (
                        <FormRow
                            form="W-3"
                            person={`All ${employees.length} employees — W-3 Transmittal`}
                            year={TAX_YEAR}
                            status={dlStatus['w3'] || 'idle'}
                            onDownload={() => handleDownload('w3', () => generateW3(staff, church))}
                        />
                    )}
                </div>
            </section>

            {/* 1099-NEC Section */}
            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: '6px', height: '22px', borderRadius: '3px', background: '#f59e0b' }} />
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>1099-NEC — Contractor Compensation</h2>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>Due Jan 31 · Only for contractors paid $600+</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {contractors.length === 0 && (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#334155', fontSize: '0.85rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                            No contractors found. Add them in the Payroll section.
                        </div>
                    )}
                    {contractors.map((con, i) => (
                        <FormRow
                            key={i}
                            form="1099-NEC"
                            person={`${con.name} — ${con.role}`}
                            year={TAX_YEAR}
                            status={dlStatus[`1099_${i}`] || 'idle'}
                            onDownload={() => handleDownload(`1099_${i}`, () => generate1099NEC(con, church))}
                        />
                    ))}
                </div>
            </section>

            {/* Form 941 Section */}
            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: '6px', height: '22px', borderRadius: '3px', background: '#a855f7' }} />
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Form 941 — Quarterly Federal Tax Returns</h2>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>Due last day of month after quarter ends</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4].map(q => (
                        <button key={q} onClick={() => setSelectedQuarter(q)}
                            style={{
                                padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: selectedQuarter === q ? '#a855f7' : 'rgba(168,85,247,0.1)',
                                color: selectedQuarter === q ? 'white' : '#a855f7',
                                fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
                            }}>
                            Q{q} {['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'][q - 1]}
                        </button>
                    ))}
                </div>
                <FormRow
                    form="941"
                    person={`IRS — Quarter ${selectedQuarter}, ${TAX_YEAR} · ${employees.length} employees`}
                    year={TAX_YEAR}
                    status={dlStatus[`941_q${selectedQuarter}`] || 'idle'}
                    onDownload={() => handleDownload(`941_q${selectedQuarter}`, () => generate941(staff, church, selectedQuarter))}
                />
            </section>

            {/* Form 990 Section */}
            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: '6px', height: '22px', borderRadius: '3px', background: '#06b6d4' }} />
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Form 990 — Nonprofit Annual Return (501c3)</h2>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>Due May 15</span>
                </div>
                <FormRow
                    form="990"
                    person={`${churchInfo.name} — Full Year ${TAX_YEAR}`}
                    year={TAX_YEAR}
                    status={dlStatus['990'] || 'idle'}
                    onDownload={() => handleDownload('990', () => generate990Summary(stats, church))}
                />
            </section>

            {/* IRS Quick Links */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                style={{
                    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px', padding: '1.5rem',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                    <AlertCircle size={16} color="#f59e0b" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>Official IRS Resources</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                    {[
                        { label: 'File W-2 / W-3 with SSA', url: 'https://www.ssa.gov/employer/' },
                        { label: 'File 1099-NEC with IRS', url: 'https://www.irs.gov/forms-pubs/about-form-1099-nec' },
                        { label: 'File Form 941 Online', url: 'https://www.irs.gov/e-file-providers/e-file-for-business-and-self-employed-taxpayers' },
                        { label: 'Form 990-EZ / 990 Filing', url: 'https://www.irs.gov/charities-non-profits/annual-filing-and-forms' },
                        { label: 'Electronic Federal Tax Payment (EFTPS)', url: 'https://www.eftps.gov/' },
                        { label: 'IRS Church Tax Guide', url: 'https://www.irs.gov/pub/irs-pdf/p1828.pdf' },
                    ].map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '0.65rem 0.9rem', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                color: '#60a5fa', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
                                transition: 'all 0.2s',
                            }}>
                            <FileText size={13} />
                            {link.label} ↗
                        </a>
                    ))}
                </div>
                <p style={{ fontSize: '0.7rem', color: '#334155', marginTop: '1rem' }}>
                    ⚠ PDFs generated by Storehouse Finance are worksheets to help prepare official filings. Always submit final forms directly to the IRS or SSA. Consult a tax professional for complex situations.
                </p>
            </motion.div>
        </div>
    );
};

export default TaxCompliance;
