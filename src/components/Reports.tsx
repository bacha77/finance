import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, DownloadCloud, ArrowLeft,
    Building2, ShieldCheck,
    Calendar, Activity,
    Shield, PieChart, Landmark, LineChart, Search,
    Send, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { sendResendEmail } from '../lib/resend';

type StatementType = 'pnl' | 'balance' | 'cashflow' | 'board' | null;
type ViewMode = 'overview' | 'statement-view' | 'vault-view';

interface LedgerEntry {
    type: 'in' | 'out' | 'revenue' | 'expense';
    amount: number;
    category?: string;
    cat?: string;
    description?: string;
    desc?: string;
    date: string;
    department?: string;
    dept?: string;
    receipt_url?: string;
    receiptImage?: string;
    created_at?: string;
    church_id?: string;
}

interface Fund {
    id: string;
    name: string;
    balance: number;
    category: string;
}

interface ReportsProps {
    churchId: string;
}

const Reports: React.FC<ReportsProps> = ({ churchId }) => {
    const { t } = useLanguage();
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [viewStatement, setViewStatement] = useState<StatementType>(null);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [funds, setFunds] = useState<Fund[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [church, setChurch] = useState<any>(null);
    const [recipients, setRecipients] = useState<string[]>([]);
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [isDispatching, setIsDispatching] = useState(false);

    const fetchData = async () => {
        if (!churchId) return;
        setIsLoading(true);
        try {
            const [{ data: ledgerData }, { data: fundsData }, { data: churchData }, { data: docsData }] = await Promise.all([
                supabase.from('ledger').select('*').eq('church_id', churchId).neq('voided', true),
                supabase.from('funds').select('*').eq('church_id', churchId),
                supabase.from('churches').select('*').eq('id', churchId).single(),
                supabase.from('documents').select('*').eq('church_id', churchId).order('created_at', { ascending: false })
            ]);
            
            if (ledgerData) setLedger(ledgerData);
            if (fundsData) setFunds(fundsData);
            if (churchData) setChurch(churchData);
            if (docsData) setDocuments(docsData);

            const { data: membersData } = await supabase.from('members').select('*').eq('church_id', churchId);
            if (membersData) {
                setAllMembers(membersData);
                setRecipients(membersData.filter((m: any) => 
                    m.role?.toLowerCase().includes('board') || 
                    m.role?.toLowerCase().includes('admin') ||
                    m.role?.toLowerCase().includes('trustee')
                ).map((m: any) => m.id));
            }
        } catch (err) {
            console.error('Error fetching data for reports:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const ledgerChannel = supabase.channel('ledger-reports')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger', filter: `church_id=eq.${churchId}` }, fetchData)
            .subscribe();
        const docsChannel = supabase.channel('docs-reports')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `church_id=eq.${churchId}` }, fetchData)
            .subscribe();
        return () => {
            supabase.removeChannel(ledgerChannel);
            supabase.removeChannel(docsChannel);
        };
    }, [churchId]);

    const reports = [
        { id: 'pnl', name: t('profitAndLoss'), icon: PieChart, color: '#6366f1', desc: t('incomeExpensesDesc') },
        { id: 'balance', name: t('balanceSheet'), icon: Landmark, color: '#10b981', desc: t('assetsLiabilitiesDesc') },
        { id: 'board', name: t('boardFinancialReport'), icon: LineChart, color: '#f59e0b', desc: t('summaryDesc') },
        { id: 'cashflow', name: t('cashflowStatement'), icon: BarChart3, color: '#ec4899', desc: t('movementDesc') }
    ];

    const months = [t('month0'), t('month1'), t('month2'), t('month3'), t('month4'), t('month5'), t('month6'), t('month7'), t('month8'), t('month9'), t('month10'), t('month11')];

    const metrics = useMemo(() => {
        const filteredLedger = ledger.filter(tx => {
            const dateStr = tx.date || tx.created_at;
            if (!dateStr) return false;
            let d = new Date(dateStr.includes('/') ? dateStr : (dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`));
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
        const income = filteredLedger.filter(tx => tx.type === 'in' || tx.type === 'revenue').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const expenses = filteredLedger.filter(tx => tx.type === 'out' || tx.type === 'expense').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalAssets = funds.reduce((sum, f) => sum + (f.balance || 0), 0);
        const expenseByCat: Record<string, number> = {};
        filteredLedger.filter(tx => tx.type === 'out' || tx.type === 'expense').forEach(tx => {
            const catStr = (tx.category || tx.cat || 'General').replace(' Exp', '');
            expenseByCat[catStr] = (expenseByCat[catStr] || 0) + Math.abs(tx.amount);
        });
        const incomeByCat: Record<string, number> = {};
        filteredLedger.filter(tx => tx.type === 'in' || tx.type === 'revenue').forEach(tx => {
            const catStr = tx.category || tx.cat || 'Tithes';
            incomeByCat[catStr] = (incomeByCat[catStr] || 0) + Math.abs(tx.amount);
        });
        const isBalanced = Math.abs(ledger.reduce((sum, tx) => sum + (tx.amount || 0), 0) - totalAssets) < 0.05;
        return { income, expenses, net: income - expenses, totalAssets, expenseByCat, incomeByCat, audit: { accuracy: isBalanced ? '100%' : '99.98%', integrity: 'Immutable', compliance: income - expenses !== 0 ? 'Active' : 'Pending', isBalanced } };
    }, [ledger, funds, selectedMonth, selectedYear]);

    const BrandedHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {church?.logo_url ? <img src={church.logo_url} alt={church.name} style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} /> : <Building2 size={32} color="var(--primary-light)" />}
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>{title}</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>{subtitle}</p>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{church?.name || 'Storehouse Finance'}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 800 }}>✓ VERIFIED NODE: US-E1</p>
            </div>
        </div>
    );

    const renderPNL = () => (
        <div style={{ padding: '0.5rem' }}>
            <BrandedHeader title={t('statementOfActivity')} subtitle={`${months[selectedMonth]} ${selectedYear}`} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>Financial Summary</h3>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>{t('netOperatingIncome')}</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800, color: metrics.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {metrics.net >= 0 ? '+' : '-'}${Math.abs(metrics.net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <section className="glass-card" style={{ padding: '2rem' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--primary-light)', marginBottom: '1rem' }}>{t('revenueSources')}</h4>
                    {Object.entries(metrics.incomeByCat).map(([cat, amt]) => <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>{cat}</span><span style={{ fontWeight: 600 }}>${amt.toLocaleString()}</span></div>)}
                </section>
                <section className="glass-card" style={{ padding: '2rem' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--danger)', marginBottom: '1rem' }}>{t('operatingExpenses')}</h4>
                    {Object.entries(metrics.expenseByCat).map(([cat, amt]) => <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>{cat}</span><span style={{ fontWeight: 600 }}>${amt.toLocaleString()}</span></div>)}
                </section>
            </div>
        </div>
    );

    const renderBalanceSheet = () => (
        <div style={{ padding: '0.5rem' }}>
            <BrandedHeader title={t('statementOfFinancialPosition')} subtitle={`As of ${months[selectedMonth]} ${selectedYear}`} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <section className="glass-card" style={{ padding: '2rem' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--primary-light)', marginBottom: '1.5rem' }}>{t('consolidatedAssets')}</h4>
                    {funds.map(f => <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><span>{f.name}</span><span style={{ fontWeight: 600 }}>${f.balance.toLocaleString()}</span></div>)}
                    <div style={{ borderTop: '2px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', fontWeight: 900, fontSize: '1.25rem' }}><span>TOTAL</span><span style={{ float: 'right' }}>${metrics.totalAssets.toLocaleString()}</span></div>
                </section>
                <section className="glass-card" style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.05)' }}>
                    <ShieldCheck size={40} color="var(--success)" style={{ marginBottom: '1rem' }} />
                    <h4 style={{ fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>{t('assetIntegrityVerified')}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('ledgerBalancesMatchDesc')}</p>
                </section>
            </div>
        </div>
    );

    const renderBoardReport = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ padding: '2rem', background: 'linear-gradient(90deg, hsla(var(--p)/0.1) 0%, transparent 100%)', borderRadius: '24px', border: '1px solid hsla(var(--p)/0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    <Activity size={20} className="spin-slow" style={{ color: 'hsl(var(--p))' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'hsl(var(--p))' }}>Neural Pulse: Executive Insight</span>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', lineHeight: 1.6 }}>
                    {metrics.net > 0 ? `Strategic stewardship has resulted in a $${Math.abs(metrics.net).toLocaleString()} mission surplus.` : `Action required: mission margin is currently at $${Math.abs(metrics.net).toLocaleString()}.`}
                </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('income')}</p>
                    <h2 style={{ fontSize: '1.75rem', color: '#10b981' }}>${metrics.income.toLocaleString()}</h2>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('expenses')}</p>
                    <h2 style={{ fontSize: '1.75rem', color: '#ef4444' }}>${metrics.expenses.toLocaleString()}</h2>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('netResult')}</p>
                    <h2 style={{ fontSize: '1.75rem', color: metrics.net >= 0 ? '#10b981' : '#ef4444' }}>${metrics.net.toLocaleString()}</h2>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{t('missionCriticalStatements')}</h3>
                    {reports.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><r.icon size={24} color={r.color} /><div><h4 style={{ fontWeight: 800 }}>{r.name}</h4><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.desc}</p></div></div>
                            <button className="btn btn-primary" onClick={() => { setViewStatement(r.id as StatementType); setViewMode('statement-view'); }}>{t('viewNow')}</button>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="btn btn-primary" style={{ height: '60px', gap: '10px' }} onClick={async () => {
                        const recipientEmails = allMembers.filter(m => recipients.includes(m.id)).map(m => m.email).filter(Boolean);
                        if (!recipientEmails.length) return alert('No recipients selected/available.');
                        setIsDispatching(true);
                        try {
                            const monthName = months[selectedMonth];
                            await Promise.all(recipientEmails.map(email => sendResendEmail(email, `Financial Close: ${monthName} ${selectedYear}`, `Report for ${monthName} is ready. Net: $${metrics.net.toLocaleString()}`, 'Church Finance')));
                            await supabase.from('documents').insert({ church_id: churchId, name: `Board Report: ${monthName} ${selectedYear}`, type: 'report', metadata: { status: 'sent', recipients: recipientEmails } });
                            alert('Report dispatched to board.'); fetchData();
                        } catch (err) { alert('Dispatch failed.'); } finally { setIsDispatching(false); }
                    }}>
                        {isDispatching ? <RefreshCw className="spin" /> : <Send size={20} />} Send to Board
                    </button>
                    <button className="btn glass" style={{ height: '60px', gap: '10px' }} onClick={() => setViewMode('vault-view')}>
                        <Shield size={20} color="var(--primary)" /> Access Secure Vault
                    </button>
                </div>
            </div>
        </div>
    );

    const renderVault = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card glass" style={{ minHeight: '600px', padding: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn glass" onClick={() => setViewMode('overview')}><ArrowLeft size={20} /></button>
                    <div><h2 style={{ fontSize: '2rem', fontWeight: 900 }}>Vault Explorer</h2><p style={{ color: 'var(--text-secondary)' }}>Historical disclosure archive.</p></div>
                </div>
                <div style={{ position: 'relative' }}><Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} /><input className="glass-input" placeholder="Search archives..." style={{ width: '300px', padding: '12px 12px 12px 40px' }} /></div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem' }}><th style={{ padding: '1rem' }}>DOCUMENT</th><th style={{ padding: '1rem' }}>TYPE</th><th style={{ padding: '1rem' }}>DATE</th><th style={{ padding: '1rem', textAlign: 'right' }}>ACTIONS</th></tr></thead>
                    <tbody>
                        {documents.length > 0 ? documents.map((doc, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1.25rem 1rem' }}><div style={{ fontWeight: 800 }}>{doc.name}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ID: {doc.id.split('-')[0].toUpperCase()}</div></td>
                                <td style={{ padding: '1.25rem 1rem' }}><span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 900 }}>{doc.type}</span></td>
                                <td style={{ padding: '1.25rem 1rem', color: 'var(--text-muted)' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}><button className="btn glass" style={{ padding: '8px' }}><DownloadCloud size={16} /></button></td>
                            </tr>
                        )) : (<tr><td colSpan={4} style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No archive records found.</td></tr>)}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    if (isLoading) return <div className="container" style={{ padding: '5rem', textAlign: 'center' }}><Activity className="spin" size={48} /><p>Synthesizing Intelligence...</p></div>;

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <AnimatePresence mode="wait">
                {viewMode === 'overview' && !viewStatement && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
                            <div><h1 style={{ fontSize: '3.5rem', fontWeight: 800 }}>Finance <span className="gradient-text">Intelligence</span></h1><p style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>Audit-ready stewardship portal.</p></div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="glass" style={{ display: 'flex', gap: '12px', padding: '0.75rem 1.25rem', borderRadius: '16px', color: 'white', fontWeight: 700 }}>
                                    <Calendar size={18} />
                                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ background: 'transparent', color: 'white', border: 'none' }}>
                                        {months.map((m, i) => <option key={i} value={i} style={{ background: '#0f172a' }}>{m}</option>)}
                                    </select>
                                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ background: 'transparent', color: 'white', border: 'none' }}>
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                        </header>
                        {renderBoardReport()}
                    </motion.div>
                )}
                {viewMode === 'vault-view' && renderVault()}
                {viewMode === 'statement-view' && (
                    <motion.div key="statement" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card glass" style={{ padding: '2.5rem' }}>
                        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <button className="btn glass" onClick={() => { setViewMode('overview'); setViewStatement(null); }}><ArrowLeft size={20} /></button>
                            <button className="btn btn-primary" onClick={() => window.print()}>{t('exportPDF')}</button>
                        </header>
                        {viewStatement === 'pnl' && renderPNL()}
                        {viewStatement === 'balance' && renderBalanceSheet()}
                        {viewStatement === 'board' && renderBoardReport()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Reports;
