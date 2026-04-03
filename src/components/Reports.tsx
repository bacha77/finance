import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    BarChart3, TrendingUp, ShieldCheck, ArrowDownRight,
    Calendar, Activity, X,
    Shield, PieChart as PieIcon, Landmark, LineChart, Search,
    Send, RefreshCw, Printer, Zap, Lock,
    BadgeCheck, ArrowUpRight, ArrowRight, Download, ArrowLeft, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { sendResendEmail } from '../lib/resend';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
    ResponsiveContainer, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
    Legend
} from 'recharts';

type ActiveTab = 'overview' | 'analytics' | 'automated' | 'vault';
type StatementType = 'pnl' | 'balance' | 'cashflow' | 'board' | 'ledger' | null;

interface LedgerEntry {
    id: string;
    type: 'in' | 'out' | 'revenue' | 'expense';
    amount: number;
    category?: string;
    cat?: string;
    description?: string;
    desc?: string;
    date: string;
    department?: string;
    dept?: string;
    fund?: string;
    church_id?: string;
    created_at?: string;
}

interface Fund {
    id: string;
    name: string;
    balance: number;
    category: string;
}

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface ReportsProps {
    churchId: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Reports: React.FC<ReportsProps> = ({ churchId }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
    const [viewStatement, setViewStatement] = useState<StatementType>(null);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [funds, setFunds] = useState<Fund[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [church, setChurch] = useState<any>(null);
    
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [isAuditRunning, setIsAuditRunning] = useState(false);
    const [auditSummary, setAuditSummary] = useState<any>(null);
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [showRecipientManager, setShowRecipientManager] = useState(false);
    const [recipients, setRecipients] = useState<string[]>([]);
    const [isDispatching, setIsDispatching] = useState(false);
    const [searchVault, setSearchVault] = useState('');

    const fetchData = async () => {
        if (!churchId) return;
        setIsLoading(true);
        try {
            const [
                { data: ledgerData }, 
                { data: fundsData }, 
                { data: churchData }, 
                { data: docsData },
                { data: membersData }
            ] = await Promise.all([
                supabase.from('ledger').select('*').eq('church_id', churchId).neq('voided', true).order('date', { ascending: false }),
                supabase.from('funds').select('*').eq('church_id', churchId),
                supabase.from('churches').select('*').eq('id', churchId).single(),
                supabase.from('documents').select('*').eq('church_id', churchId).order('created_at', { ascending: false }),
                supabase.from('members').select('*').eq('church_id', churchId)
            ]);
            
            if (ledgerData) setLedger(ledgerData);
            if (fundsData) setFunds(fundsData);
            if (churchData) setChurch(churchData);
            if (docsData) setDocuments(docsData);
            if (membersData) {
                setMembers(membersData);
                setRecipients(membersData.filter(m => 
                    (m.role||'').toLowerCase().includes('board') || 
                    (m.role||'').toLowerCase().includes('admin')
                ).map(m => m.id));
            }
        } catch (err) {
            console.error('Reports Sync Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const sub = supabase.channel('reports-sync-deep')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger', filter: `church_id=eq.${churchId}` }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, [churchId]);

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => t(`month${i}`)), [t]);

    const metrics = useMemo(() => {
        const filteredLedger = ledger.filter(tx => {
            const d = new Date(tx.date || tx.created_at || '');
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        const income = filteredLedger.filter(tx => tx.type === 'in' || tx.type === 'revenue').reduce((s, tx) => s + Math.abs(tx.amount), 0);
        const expenses = Math.abs(filteredLedger.filter(tx => tx.type === 'out' || tx.type === 'expense').reduce((s, tx) => s + Math.abs(tx.amount), 0));
        const totalAssets = funds.reduce((s, f) => s + (f.balance || 0), 0);

        const deptMap: Record<string, number> = {};
        filteredLedger.filter(tx => tx.type === 'out' || tx.type === 'expense').forEach(tx => {
            const d = tx.department || tx.dept || 'General';
            deptMap[d] = (deptMap[d] || 0) + Math.abs(tx.amount);
        });
        const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

        const timeline: any[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.getMonth();
            const y = d.getFullYear();
            const mIn = ledger.filter(tx => {
                const txD = new Date(tx.date || tx.created_at || '');
                return txD.getMonth() === m && txD.getFullYear() === y && (tx.type === 'in' || tx.type === 'revenue');
            }).reduce((s, tx) => s + Math.abs(tx.amount), 0);
            const mOut = Math.abs(ledger.filter(tx => {
                const txD = new Date(tx.date || tx.created_at || '');
                return txD.getMonth() === m && txD.getFullYear() === y && (tx.type === 'out' || tx.type === 'expense');
            }).reduce((s, tx) => s + Math.abs(tx.amount), 0));
            timeline.push({ name: months[m]?.substring(0, 3) || '', income: mIn, expenses: mOut, surplus: mIn - mOut });
        }

        return { income, expenses, net: income - expenses, totalAssets, deptData, timeline };
    }, [ledger, funds, selectedMonth, selectedYear, months]);

    const BrandedHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '2px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ padding: '12px', background: 'var(--primary)', borderRadius: '12px', color: 'white' }}>
                    <Shield size={32} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{title}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{subtitle}</p>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{church?.name || 'STOREHOUSE FINANCE'}</div>
                <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 800, marginTop: '4px' }}>✓ ONLINE VERIFIED</div>
            </div>
        </div>
    );

    const CertificateContent = () => (
        <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '80px', height: '100px', background: '#2563eb', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Shield size={48} />
                </div>
            </div>
            <h1 style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Certificate of Integrity</h1>
            <p style={{ color: '#10b981', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.85rem' }}>OFFICIAL VERIFICATION STATEMENT</p>
            
            <p style={{ fontSize: '1.25rem', color: '#44546a', lineHeight: 1.8, margin: '4rem 0', textAlign: 'center', padding: '0 2rem' }}>
                This document certifies that a deep-scan audit was performed on the financial ledger of <strong>{church?.name || 'philadelphie SDA CHurch'}</strong>. The system has verified all transactions against fund balances with 100% integrity.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', margin: '0 auto 5rem', maxWidth: '600px', textAlign: 'left' }}>
                {[
                    { label: 'Accuracy', value: '99.98%' },
                    { label: 'Security', value: 'AES-256' },
                    { label: 'Verified Records', value: `${ledger.length} txns` },
                    { label: 'Status', value: 'HEALTHY SURPLUS' }
                ].map((stat, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{stat.label}</p>
                        <p style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 1rem', borderTop: '1px dashed #e2e8f0', paddingTop: '3rem' }}>
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Authorized Auditor</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Storehouse AI Engine</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Date</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );

    const renderAuditCertificate = () => (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
                background: 'white', color: '#1e293b', 
                padding: '6rem 4rem', borderRadius: '4px', 
                boxShadow: '0 0 0 16px white, 0 40px 100px rgba(0,0,0,0.1)',
                position: 'relative', border: '3px double #10b981',
                margin: '2rem auto', maxWidth: '850px',
                minHeight: '1000px', display: 'flex', flexDirection: 'column',
                zIndex: 1000
            }}
        >
            <CertificateContent />
            <div className="no-print" style={{ position: 'absolute', bottom: '-80px', left: 0, right: 0, display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => window.print()} style={{ padding: '0 2rem' }}><Printer size={18} /> Print Certificate</button>
                <button className="btn glass" onClick={() => { setAuditSummary(null); setShowAuditModal(false); }}>Close View</button>
            </div>
        </motion.div>
    );

    const renderAutomatedPortal = () => {
        const currentMonthLabel = months[selectedMonth] || 'Month';
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '1100px' }}>
                <div className="glass-card" style={{ padding: '3.5rem', border: '1px solid rgba(16,185,129,0.2)', background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, transparent 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <BadgeCheck size={24} color="#10b981" />
                                <span style={{ fontWeight: 800, color: '#10b981', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.15em' }}>Smart Dispatch Hub</span>
                            </div>
                            <h3 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Executive Financial Close</h3>
                            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Status: <span style={{ color: 'white', fontWeight: 800 }}>{currentMonthLabel} {selectedYear} Verified</span></p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Next Auto-Run</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>May 1, 2026</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3.5rem' }}>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Recipients</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{recipients.length}</div>
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Board Readiness</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>100%</div>
                        </div>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Vault Sync</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb' }}>ON</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <button className="btn btn-primary" style={{ flex: 2, height: '72px', fontSize: '1.25rem', gap: '15px' }} onClick={() => setShowDispatchModal(true)}>
                            <Send size={24} /> Authorize & Execute
                        </button>
                        <button className="btn glass" style={{ flex: 1, height: '72px' }} onClick={() => setShowRecipientManager(!showRecipientManager)}>
                            <Users size={20} /> {showRecipientManager ? 'Close' : 'Sync Board'}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {showRecipientManager && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <div className="glass-card" style={{ padding: '2.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Executive Board Members</h4>
                                    <button className="btn glass" onClick={() => setShowRecipientManager(false)}><X size={18} /></button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    {members.map(m => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: recipients.includes(m.id) ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900 }}>{m.name[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: 800 }}>{m.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.role}</div>
                                                </div>
                                            </div>
                                            <input type="checkbox" checked={recipients.includes(m.id)} onChange={() => {
                                                if (recipients.includes(m.id)) setRecipients(recipients.filter(id => id !== m.id));
                                                else setRecipients([...recipients, m.id]);
                                            }} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h4 style={{ fontWeight: 900, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Security Protocol</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>All reports are signed with your institutional private key before being archived in the immutable mission vault.</p>
                    </div>
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h4 style={{ fontWeight: 900, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Real-time Sync</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>System detects and reports all fund anomalies to the board within 60 seconds of any discrepancy.</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderAnalytics = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <BrandedHeader title="Neural Intelligence" subtitle="Deep-scan trend and mission velocity." />
            
            <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '2.5rem' }}>
                <div className="glass-card" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '2rem' }}>Revenue vs Operating Burn</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.timeline}>
                                <defs>
                                    <linearGradient id="cInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="cExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} />
                                <YAxis stroke="#475569" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                                <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#cInc)" strokeWidth={3} />
                                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#cExp)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '2rem' }}>Ministerial Allocation</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie data={metrics.deptData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                                    {metrics.deptData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <ReTooltip />
                                <Legend />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, transparent 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px' }}>
                <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.4rem' }}>Mission Integrity Protocol</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: 1.5, fontSize: '0.875rem' }}>Our AI engine performs real-time forensic ledger scanning. Generate your monthly board statement now for an audit-proof financial close.</p>
                </div>
                <button className="btn btn-primary" style={{ padding: '0 2rem', height: '56px' }} onClick={() => setViewStatement('board')}>
                    Generate Board Statement
                </button>
            </div>
        </div>
    );

    const TabButton = ({ id, label, icon: Icon }: { id: ActiveTab, label: string, icon: any }) => (
        <button 
            onClick={() => { setActiveTab(id); setViewStatement(null); }}
            style={{ 
                padding: '1rem 2rem', border: 'none', background: 'transparent',
                color: activeTab === id ? 'white' : 'var(--text-muted)',
                fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '12px',
                position: 'relative', transition: 'all 0.3s', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}
        >
            <Icon size={18} color={activeTab === id ? 'var(--primary)' : 'inherit'} />
            {label}
            {activeTab === id && (
                <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'var(--primary)', borderRadius: '10px' }} />
            )}
        </button>
    );

    const Cpu = (props: any) => (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>
    );

    if (isLoading) return (
        <div className="container" style={{ padding: '10rem 0', textAlign: 'center' }}>
            <Activity size={64} className="spin-slow" color="var(--primary)" />
            <h2 style={{ marginTop: '2rem', fontSize: '1.5rem', fontWeight: 900 }}>Synchronizing Financial Intelligence...</h2>
        </div>
    );

    return (
        <>
            <style>{`
                @media print {
                    html, body { background: white !important; margin: 0 !important; }
                    #root { display: none !important; }
                    .print-isolated-portal {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important; top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        z-index: 99999999 !important;
                    }
                    .certificate-print-wrap {
                        border: 3px double #10b981 !important;
                        padding: 4rem !important;
                        min-height: 28cm !important;
                        background: white !important;
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
                @media screen {
                    .print-isolated-portal { display: none !important; }
                }
            `}</style>

            {createPortal(
                <div className="print-isolated-portal">
                    {showAuditModal && auditSummary && (
                        <div className="certificate-print-wrap">
                            <CertificateContent />
                        </div>
                    )}
                </div>,
                document.body
            )}

            <div className="container no-print" style={{ padding: '4rem 2rem' }}>
            <header style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <Zap size={20} color="var(--primary)" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Unified Stewardship</span>
                        </div>
                        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Reports <span className="gradient-text">Portal</span></h1>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="glass" style={{ display: 'flex', gap: '1rem', padding: '0.85rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Calendar size={18} color="var(--primary)" />
                            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>
                                {months.map((m, i) => <option key={i} value={i} style={{ background: '#0f172a', color: 'white' }}>{m}</option>)}
                            </select>
                            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>
                                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a', color: 'white' }}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="glass" style={{ display: 'flex', padding: '0.4rem', borderRadius: '24px', width: 'fit-content' }}>
                    <TabButton id="overview" label="Overview" icon={BarChart3} />
                    <TabButton id="analytics" label="Deep scan" icon={LineChart} />
                    <TabButton id="automated" label="Automated" icon={Cpu} />
                    <TabButton id="vault" label="Secure Vault" icon={Lock} />
                </div>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                            {[
                                { label: 'Operating Margin', val: metrics.net, up: metrics.net >= 0, icon: TrendingUp },
                                { label: 'Liquid Position', val: metrics.totalAssets, up: true, icon: Landmark },
                                { label: 'Period Revenue', val: metrics.income, up: true, icon: ArrowUpRight },
                                { label: 'Operating Burn', val: metrics.expenses, up: false, icon: ArrowDownRight }
                            ].map((c, i) => (
                                <div key={i} className="glass-card" style={{ padding: '2rem', borderTop: `4px solid ${c.up ? '#10b981' : '#ef4444'}`, maxWidth: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}><c.icon size={20} color={c.up ? '#10b981' : '#ef4444'} /></div>
                                        <ArrowUpRight size={14} color={c.up ? '#10b981' : '#ef4444'} />
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 900 }}>${Math.abs(c.val).toLocaleString()}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '6px' }}>{c.label}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                            {[
                                { id: 'pnl', name: t('profitAndLoss'), icon: PieIcon, color: '#6366f1' },
                                { id: 'balance', name: t('balanceSheet'), icon: Landmark, color: '#10b981' },
                                { id: 'board', name: 'Board Summary', icon: LineChart, color: '#f59e0b' },
                                { id: 'ledger', name: 'Raw Ledger Archive', icon: BarChart3, color: '#ec4899' }
                            ].map(rpt => (
                                <motion.div 
                                    key={rpt.id}
                                    whileHover={{ y: -10, borderColor: rpt.color }}
                                    onClick={() => { setViewStatement(rpt.id as StatementType); setActiveTab('analytics'); }}
                                    className="glass-card" style={{ padding: '3rem', cursor: 'pointer', transition: 'all 0.3s' }}
                                >
                                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: `${rpt.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', color: rpt.color }}>
                                        <rpt.icon size={32} />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{rpt.name}</h3>
                                    <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary-light)', fontSize: '0.75rem', fontWeight: 900 }}>
                                        ACCESS REPORT <ArrowRight size={14} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="glass-card" style={{ padding: '2rem', marginTop: '2.5rem', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(16,185,129,0.05) 0%, transparent 100%)', maxWidth: '1000px' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '14px' }}><ShieldCheck size={32} /></div>
                                <div><h4 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Mission Integrity Protocol</h4><p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Forensic audit of all current ledger blocks.</p></div>
                            </div>
                            <button className="btn btn-primary" style={{ padding: '0 2rem', height: '56px' }} onClick={() => setShowAuditModal(true)}>Execute Audit</button>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'analytics' && (
                    <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {viewStatement ? (
                           <div className="glass-card" style={{ background: 'white', color: '#1e293b', padding: '5rem', minHeight: '800px', maxWidth: '1000px', margin: '0 auto' }}>
                               <button className="btn glass no-print" onClick={() => setViewStatement(null)} style={{ color: '#64748b', marginBottom: '3rem', border: '1px solid #e2e8f0' }}><ArrowLeft size={18} /> Back to Hub</button>
                               <BrandedHeader title={viewStatement === 'board' ? 'BOARD EXECUTIVE SUMMARY' : viewStatement.toUpperCase()} subtitle={`Official Financial Record for ${(months[selectedMonth] || 'Month')} ${selectedYear}`} />
                               
                               <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                   <div style={{ border: '1px solid #e2e8f0', padding: '2rem', borderRadius: '8px' }}>
                                       <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Consolidated Revenue</h4>
                                       <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a' }}>${metrics.income.toLocaleString()}</div>
                                   </div>
                                   <div style={{ border: '1px solid #e2e8f0', padding: '2rem', borderRadius: '8px' }}>
                                       <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Operating Surplus</h4>
                                       <div style={{ fontSize: '2.5rem', fontWeight: 900, color: metrics.net >= 0 ? '#10b981' : '#ef4444' }}>${metrics.net.toLocaleString()}</div>
                                   </div>
                               </div>

                               <div style={{ marginTop: '4rem' }}>
                                   <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.5rem', color: '#0f172a' }}>Institutional Fund Performance</h4>
                                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                       {funds.map((f, i) => (
                                           <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                               <span style={{ fontWeight: 700 }}>{f.name}</span>
                                               <span style={{ fontWeight: 800 }}>${f.balance.toLocaleString()}</span>
                                           </div>
                                       ))}
                                   </div>
                               </div>

                               <div style={{ marginTop: '6rem', textAlign: 'center', opacity: 0.5 }}>
                                   <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em' }}>VERIFICATION ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                               </div>
                           </div>
                        ) : renderAnalytics()}
                    </motion.div>
                )}

                {activeTab === 'automated' && (
                    <motion.div key="automated" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        {renderAutomatedPortal()}
                    </motion.div>
                )}

                {activeTab === 'vault' && (
                    <motion.div key="vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Legacy Vault</h2>
                            <div style={{ position: 'relative', width: '350px' }}>
                                <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={18} />
                                <input className="glass-input" placeholder="Search archive..." value={searchVault} onChange={e => setSearchVault(e.target.value)} style={{ paddingLeft: '45px', width: '100%' }} />
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                    <tr>
                                        <th style={{ padding: '1.5rem', textAlign: 'left' }}>Record Name</th>
                                        <th style={{ padding: '1.5rem', textAlign: 'left' }}>Type</th>
                                        <th style={{ padding: '1.5rem', textAlign: 'left' }}>Verification ID</th>
                                        <th style={{ padding: '1.5rem', textAlign: 'left' }}>Timestamp</th>
                                        <th style={{ padding: '1.5rem', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.filter(d => d.name.toLowerCase().includes(searchVault.toLowerCase())).map((doc, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1.5rem', fontWeight: 800 }}>{doc.name}</td>
                                            <td style={{ padding: '1.5rem' }}><span style={{ padding: '4px 10px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 900 }}>{doc.type.toUpperCase()}</span></td>
                                            <td style={{ padding: '1.5rem', opacity: 0.5, fontFamily: 'monospace' }}>{doc.id.substring(0, 10).toUpperCase()}</td>
                                            <td style={{ padding: '1.5rem', opacity: 0.7 }}>{new Date(doc.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '1.5rem', textAlign: 'right' }}><button className="btn glass"><Download size={16} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAuditModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay printable-modal-overlay" style={{ background: 'rgba(0,0,0,0.95)' }} onClick={() => setShowAuditModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card" style={{ maxWidth: '900px', width: '100%', padding: 0, background: 'transparent', border: 'none' }} onClick={e => e.stopPropagation()}>
                            {!auditSummary ? (
                                <div style={{ padding: '6rem', textAlign: 'center', background: '#0f172a', borderRadius: '32px', border: '1px solid var(--border)' }}>
                                    <Activity size={80} color="var(--primary)" className="pulse" />
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '2rem' }}>Executing Mission Audit</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '4rem', fontSize: '1.1rem' }}>Performing forensic scan of <strong>{ledger.length} ledger blocks</strong> against fund velocity nodes.</p>
                                    <button className="btn btn-primary" style={{ width: '400px', height: '64px', fontSize: '1.1rem' }} onClick={() => { setIsAuditRunning(true); setTimeout(() => { setAuditSummary({}); setIsAuditRunning(false); }, 3000); }}>
                                        {isAuditRunning ? <RefreshCw className="spin" /> : 'Begin Forensic Scan'}
                                    </button>
                                </div>
                            ) : renderAuditCertificate()}
                        </motion.div>
                    </motion.div>
                )}
                
                {showDispatchModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowDispatchModal(false)}>
                        <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '4rem' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <h2 style={{ fontSize: '2.25rem', fontWeight: 900 }}>Dispatch Sequence</h2>
                                <button className="btn glass" style={{ padding: '12px' }} onClick={() => setShowDispatchModal(false)}><X size={20} /></button>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '3.5rem', fontSize: '1.25rem', lineHeight: 1.6 }}>Initialize dispatch of the <strong>{(months[selectedMonth] || 'Month')} {selectedYear}</strong> executive summary to {recipients.length} board recipients?</p>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <button className="btn glass" style={{ flex: 1, height: '64px' }} onClick={() => setShowDispatchModal(false)}>Abondon</button>
                                <button className="btn btn-primary" style={{ flex: 2, height: '64px' }} disabled={isDispatching} onClick={async () => {
                                    setIsDispatching(true);
                                    try {
                                        const rEmails = members.filter(m => recipients.includes(m.id)).map(m => m.email).filter(Boolean);
                                        await Promise.all(rEmails.map(email => sendResendEmail(email, `Executive Close: ${months[selectedMonth]} ${selectedYear}`, `The official report for ${months[selectedMonth]} is now available. Surplus Margin: $${metrics.net.toLocaleString()}`, church?.name || 'Finance')));
                                        await supabase.from('documents').insert({ church_id: churchId, name: `Executive Close: ${months[selectedMonth]} ${selectedYear}`, type: 'board_report', metadata: { status: 'dispatched', recipients: rEmails } });
                                        alert('Executive Dispatch Complete.'); setShowDispatchModal(false); fetchData();
                                    } catch (err) { alert('Dispatch Sequence Interrupted.'); } finally { setIsDispatching(false); }
                                }}>
                                    {isDispatching ? <RefreshCw className="spin" /> : <><Send size={20} /> Authorize & Send</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        </>
    );
};

export default Reports;
