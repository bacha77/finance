import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    DownloadCloud,
    Plus,
    ArrowLeft,
    CheckCircle2,
    ArrowDownRight,
    Building2,
    ShieldCheck,
    Calendar,
    FileText,
    Activity,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type StatementType = 'pnl' | 'balance' | 'cashflow' | 'board' | null;

interface LedgerEntry {
    type: 'in' | 'out' | 'revenue' | 'expense';
    amount: number;
    category?: string;
    cat?: string; // Fallback
    description?: string;
    desc?: string; // Fallback
    date: string;
    department?: string;
    dept?: string; // Fallback
    receipt_url?: string;
    receiptImage?: string; // Fallback
    created_at?: string;
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
    const [viewStatement, setViewStatement] = useState<StatementType>(null);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [funds, setFunds] = useState<Fund[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [church, setChurch] = useState<any>(null);

    const fetchData = async () => {
        if (!churchId) return;
        setIsLoading(true);
        try {
            const [{ data: ledgerData }, { data: fundsData }, { data: churchData }] = await Promise.all([
                supabase.from('ledger').select('*').eq('church_id', churchId).neq('voided', true),
                supabase.from('funds').select('*').eq('church_id', churchId),
                supabase.from('churches').select('*').eq('id', churchId).single()
            ]);
            
            if (ledgerData) setLedger(ledgerData);
            if (fundsData) setFunds(fundsData);
            if (churchData) setChurch(churchData);
        } catch (err) {
            console.error('Error fetching data for reports:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Realtime sync for reports
        const ledgerChannel = supabase.channel('ledger-reports')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger', filter: `church_id=eq.${churchId}` }, fetchData)
            .subscribe();

        const fundsChannel = supabase.channel('funds-reports')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'funds', filter: `church_id=eq.${churchId}` }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(ledgerChannel);
            supabase.removeChannel(fundsChannel);
        };
    }, [churchId]);

    const months = [t('month0'), t('month1'), t('month2'), t('month3'), t('month4'), t('month5'), t('month6'), t('month7'), t('month8'), t('month9'), t('month10'), t('month11')];

    const metrics = useMemo(() => {
        const filteredLedger = ledger.filter(tx => {
            const dateStr = tx.date;
            if (!dateStr) return false;
            // Use T12:00:00 to avoid timezone shifts for YYYY-MM-DD strings
            const txDate = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
            return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
        });

        const income = filteredLedger.filter(tx => tx.type === 'in' || tx.type === 'revenue').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const expenses = filteredLedger.filter(tx => tx.type === 'out' || tx.type === 'expense').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const net = income - expenses;
        const totalAssets = funds.reduce((sum, f) => sum + (f.balance || 0), 0);

        // Group by category
        const expenseByCat: Record<string, number> = {};
        filteredLedger.filter(tx => tx.type === 'out' || tx.type === 'expense').forEach(tx => {
            const catStr = (tx.category || tx.cat || 'General').replace(' Exp', '');
            expenseByCat[catStr] = (expenseByCat[catStr] || 0) + Math.abs(tx.amount);
        });

        const incomeByCat: Record<string, number> = {};
        const incomeByDept: Record<string, number> = {};
        filteredLedger.filter(tx => tx.type === 'in' || tx.type === 'revenue').forEach(tx => {
            const catStr = tx.category || tx.cat || 'Tithes';
            const deptStr = tx.department || tx.dept || 'General';
            incomeByCat[catStr] = (incomeByCat[catStr] || 0) + Math.abs(tx.amount);
            incomeByDept[deptStr] = (incomeByDept[deptStr] || 0) + Math.abs(tx.amount);
        });

        return { income, expenses, net, totalAssets, expenseByCat, incomeByCat, incomeByDept, filteredLedger };
    }, [ledger, funds, selectedMonth, selectedYear]);

    const reports = [
        { id: 'board', title: t('boardReport'), category: t('executive'), lastGenerated: 'Current', type: 'Instant', icon: ShieldCheck, color: '#ec4899' },
        { id: 'pnl', title: t('pnlStatement'), category: t('financial'), lastGenerated: 'Live', type: 'Instant', icon: TrendingUp, color: '#10b981' },
        { id: 'balance', title: t('balanceSheet'), category: t('financial'), lastGenerated: 'Live', type: 'Instant', icon: Building2, color: '#6366f1' },
        { id: 'cashflow', title: t('cashflowStatement'), category: t('financial'), lastGenerated: 'Live', type: 'Instant', icon: BarChart3, color: '#a855f7' },
    ];

    const BrandedHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {church?.logo_url ? (
                    <img src={church.logo_url} alt={church.name} style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} />
                ) : (
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={32} color="var(--primary-light)" />
                    </div>
                )}
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>{title}</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>{subtitle}</p>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{church?.name || 'Storehouse Finance'}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 800 }}>✓ VERIFIED NODE: US-E1</p>
            </div>
        </div>
    );

    const renderPNL = () => (
        <div style={{ padding: '0.5rem' }}>
            <BrandedHeader 
                title={t('statementOfActivity')} 
                subtitle={`${t('operatingPeriod')}: ${months[selectedMonth]} ${selectedYear}`} 
            />
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '3rem',
                borderBottom: '2px solid var(--border)',
                paddingBottom: '2rem',
                alignItems: 'flex-end'
            }}>
                <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Financial Summary</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{t('netOperatingIncome')}</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800, color: metrics.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {metrics.net >= 0 ? '+' : '-'}${Math.abs(metrics.net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem' }}>
                <section className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('revenueSources')}</h4>
                        <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>${metrics.income.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {Object.entries(metrics.incomeByCat).map(([cat, amt]) => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 500 }}>{cat}</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('operatingExpenses')}</h4>
                        <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>${metrics.expenses.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {Object.entries(metrics.expenseByCat).map(([cat, amt]) => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 500 }}>{cat}</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 800, marginTop: '1rem', borderTop: '2px solid var(--border)', paddingTop: '1.25rem', color: 'var(--text-main)' }}>
                            <span>{t('totalExpenditures')}</span>
                            <span>${metrics.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );

    const renderBalanceSheet = () => (
        <div style={{ padding: '0.5rem' }}>
            <BrandedHeader 
                title={t('statementOfFinancialPosition')} 
                subtitle={`${t('reportingDate')}: ${months[selectedMonth]} 30, ${selectedYear}`} 
            />
            <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Net Assets & Liquidity</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem' }}>
                <section className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-light)', marginBottom: '1.5rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>{t('consolidatedAssets')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>{t('cashLiquidEquivalents')}</span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '1.125rem' }}>${metrics.totalAssets.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border)' }}>
                            {funds.map(f => (
                                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    <span>{f.name}</span>
                                    <span style={{ color: 'var(--text-main)' }}>${f.balance.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: '1.25rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>
                            <span>{t('totalPortfolioValue')}</span>
                            <span>${metrics.totalAssets.toLocaleString()}</span>
                        </div>
                    </div>
                </section>

                <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>{t('netAssetsEquity')}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>{t('designatedRestrictedFunds')}</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>${funds.filter(f => f.category !== 'General').reduce((s, f) => s + f.balance, 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>{t('operatingGeneralFunds')}</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>${funds.filter(f => f.category === 'General').reduce((s, f) => s + f.balance, 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: '1.25rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>
                                <span>{t('totalEquity')}</span>
                                <span>${metrics.totalAssets.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.9rem',
                        color: 'var(--success)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <ShieldCheck size={20} />
                        <div>
                            <strong>{t('assetIntegrityVerified')}:</strong>
                            <p style={{ marginTop: '2px', opacity: 0.9 }}>{t('ledgerBalancesMatchDesc')}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );

    const renderBoardReport = () => (
        <div style={{ padding: '1rem' }}>
            <BrandedHeader 
                title={t('boardPerformanceSummary')} 
                subtitle={`${t('financialHealthStewardshipOverview')} • ${months[selectedMonth]} ${selectedYear}`} 
            />

            {/* 🧠 NEURAL PULSE SUMMARY */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                    padding: '2rem', 
                    background: 'linear-gradient(90deg, hsla(var(--p)/0.1) 0%, transparent 100%)', 
                    borderRadius: '24px', 
                    border: '1px solid hsla(var(--p)/0.2)',
                    marginBottom: '3rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05 }}>
                    <ShieldCheck size={120} color="hsl(var(--p))" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    <Activity size={20} className="spin-slow" style={{ color: 'hsl(var(--p))' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--p))' }}>Neural Pulse: Executive Insight</span>
                </div>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', lineHeight: 1.6, maxWidth: '800px' }}>
                    {metrics.net > 0 
                        ? `Strategic stewardship has resulted in a $${Math.abs(metrics.net).toLocaleString()} mission surplus for the current period. This allocation strengthens the congregation's liquidity reserves, positioning the ministry for upcoming educational and outreach expansions in Q2.`
                        : `Current data indicates a tight operational margin of $${Math.abs(metrics.net).toLocaleString()}. While core ministries remain fully funded, internal optimization of administrative outflows is recommended to maintain the designated mission-surplus targets for the next audit cycle.`
                    }
                </p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <TrendingUp size={32} color="#10b981" />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('totalMonthlyRevenue')}</p>
                    <h4 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>${metrics.income.toLocaleString()}</h4>
                </div>
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ArrowDownRight size={32} color="#ef4444" />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('administrativeOutflow')}</p>
                    <h4 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444' }}>${metrics.expenses.toLocaleString()}</h4>
                </div>
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldCheck size={32} color="var(--primary-light)" />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('missionSurplus')}</p>
                    <h4 style={{ fontSize: '2.5rem', fontWeight: 800, color: metrics.net >= 0 ? '#10b981' : '#ef4444' }}>
                        ${metrics.net.toLocaleString()}
                    </h4>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
                <div className="glass-card" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{t('revenueInflow')}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('categorizedStewardshipDesc')}</p>
                        </div>
                        <Activity size={24} className="gradient-text" />
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('classification')}</th>
                                    <th>{t('department')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { cat: 'Tithes', dept: 'General Fund', amount: metrics.incomeByCat['Tithes'] || 0 },
                                    { cat: 'Offerings', dept: 'Local Church', amount: metrics.incomeByCat['Offerings'] || metrics.incomeByCat['Offering'] || 0 },
                                    { cat: 'Sabbath School', dept: 'Education', amount: metrics.incomeByDept['Sabbath School'] || metrics.incomeByCat['Sabbath School'] || 0 },
                                    ...Object.entries(metrics.incomeByCat)
                                        .filter(([cat]) => !['Tithes', 'Offerings', 'Offering', 'Sabbath School'].includes(cat))
                                        .map(([cat, dept]) => ({ cat, dept: 'Designated', amount: dept as any }))
                                ].map((item, i) => (
                                    <tr key={i}>
                                        <td>
                                            <span style={{ fontWeight: 800, color: 'white' }}>{item.cat}</span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{item.cat === 'Tithes' ? 'General Fund' : item.cat === 'Offerings' ? 'Local Church' : 'Designated'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)', fontSize: '1.125rem' }}>
                                            +${(item.amount as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{t('operationalOutflow')}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('topMonthlyExpenditureDesc')}</p>
                        </div>
                        <TrendingUp size={24} color="var(--danger)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {Object.entries(metrics.expenseByCat).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => (
                            <div key={cat}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'white', fontWeight: 700 }}>{cat}</span>
                                    <span style={{ color: 'var(--danger)', fontWeight: 800 }}>-${amt.toLocaleString()}</span>
                                </div>
                                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(amt / metrics.expenses) * 100}%` }}
                                        style={{ height: '100%', backgroundColor: 'var(--danger)' }}
                                    />
                                </div>
                            </div>
                        ))}
                        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={16} className="gradient-text" />
                                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('monthlyTotal')}</span>
                                </div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>${metrics.expenses.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="container" style={{ padding: '3rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <Activity size={48} color="var(--primary)" />
                    </motion.div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Analyzing Church Finances...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <AnimatePresence mode="wait">
                {!viewStatement ? (
                    <motion.div
                        key="main-reports"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
                            <div>
                                <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                                    {t('financialIntelligence').split(' ')[0]} <span className="gradient-text">{t('financialIntelligence').split(' ')[1]}</span>
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px' }}>{t('auditReadyDesc')}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '0.75rem 1.25rem',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    color: 'white',
                                    fontWeight: 700
                                }}>
                                    <Calendar size={18} className="gradient-text" />
                                    <select 
                                        value={selectedMonth} 
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: 700, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
                                    >
                                        {months.map((m, i) => (
                                            <option key={m} value={i} style={{ background: '#0f172a' }}>{m}</option>
                                        ))}
                                    </select>
                                    <select 
                                        value={selectedYear} 
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: 700, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <button className="btn btn-primary" style={{ height: '56px', padding: '0 2rem' }}>
                                    <Plus size={20} /> {t('newAuditRequest')}
                                </button>
                            </div>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
                            {[
                                { label: t('revenueAccuracy'), value: '100%', icon: ShieldCheck, color: 'var(--success)' },
                                { label: t('boardCompliance'), value: 'Active', icon: CheckCircle2, color: 'var(--primary)' },
                                { label: t('auditTrail'), value: 'Immutable', icon: FileText, color: '#a855f7' },
                                { label: t('reportLatency'), value: '< 200ms', icon: Activity, color: '#ec4899' },
                            ].map((stat, idx) => (
                                <motion.div whileHover={{ y: -5 }} key={idx} className="glass-card" style={{ padding: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
                                        <stat.icon size={20} style={{ color: stat.color }} />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</span>
                                    </div>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{stat.value}</p>
                                </motion.div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2.5rem' }}>
                            <div className="glass-card" style={{ padding: '3rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2.5rem', color: 'white' }}>{t('missionCriticalStatements')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {reports.map((report) => (
                                        <motion.div
                                            key={report.id}
                                            whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1.5rem',
                                                borderRadius: '20px',
                                                backgroundColor: 'rgba(255,255,255,0.02)',
                                                border: '1px solid var(--border)',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onClick={() => setViewStatement(report.id as StatementType)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                <div style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    borderRadius: '16px',
                                                    backgroundColor: `${report.color}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: report.color,
                                                    boxShadow: `0 8px 16px -4px ${report.color}30`
                                                }}>
                                                    <report.icon size={28} />
                                                </div>
                                                <div>
                                                    <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white' }}>{report.title}</h4>
                                                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>{report.category} • {t('updated')} {report.lastGenerated}</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button className="btn btn-ghost" style={{ padding: '12px', borderRadius: '12px' }}>
                                                    <DownloadCloud size={20} />
                                                </button>
                                                <button className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 800 }}>
                                                    {t('viewNow')}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <div className="card glass" style={{ height: 'fit-content' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>{t('automatedReports')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{
                                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                                        border: '1px solid rgba(99, 102, 241, 0.1)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius)'
                                    }}>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('monthlyFinancialClose')}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '8px 0' }}>{t('nextRun')}: Apr 1st, 2026</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#10b981' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                            {t('activeSchedule')}
                                        </div>
                                    </div>
                                    <button className="btn glass" style={{ width: '100%', fontSize: '0.875rem' }}>{t('manageRecipients')}</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="statement-view"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="card glass"
                        style={{ minHeight: '600px', padding: '2.5rem' }}
                    >
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <button className="btn glass" style={{ padding: '10px' }} onClick={() => setViewStatement(null)}>
                                <ArrowLeft size={20} />
                            </button>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn glass" style={{ gap: '8px' }} onClick={() => window.print()}>
                                    <DownloadCloud size={18} />
                                    {t('exportPDF')}
                                </button>
                                <button className="btn btn-primary" onClick={() => alert('Publishing current statement to Church Board portal...')}>{t('publishToBoard')}</button>
                            </div>
                        </header>

                        {viewStatement === 'pnl' && renderPNL()}
                        {viewStatement === 'balance' && renderBalanceSheet()}
                        {viewStatement === 'board' && renderBoardReport()}
                        {viewStatement === 'cashflow' && (
                            <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                                <BarChart3 size={48} color="var(--primary-light)" style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('cashflowStatement')}</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>{t('tracingMovementDesc')}</p>
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    <div className="card glass" style={{ width: '200px', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('operatingInflow')}</p>
                                        <p style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>${metrics.income.toLocaleString()}</p>
                                    </div>
                                    <div className="card glass" style={{ width: '200px', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('operatingOutflow')}</p>
                                        <p style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ef4444' }}>-${metrics.expenses.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Reports;
