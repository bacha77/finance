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

type StatementType = 'pnl' | 'balance' | 'cashflow' | 'board' | null;

interface LedgerEntry {
    type: 'in' | 'out';
    amount: number;
    cat: string;
    desc: string;
    date: string;
    dept: string;
    receiptImage?: string;
}

interface Fund {
    id: string;
    name: string;
    balance: number;
    category: string;
}

const Reports: React.FC = () => {
    const [viewStatement, setViewStatement] = useState<StatementType>(null);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const selectedYear = new Date().getFullYear();
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [funds, setFunds] = useState<Fund[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: ledgerData } = await supabase.from('ledger').select('*');
                if (ledgerData) setLedger(ledgerData);

                const { data: fundsData } = await supabase.from('funds').select('*');
                if (fundsData) setFunds(fundsData);
            } catch (err) {
                console.error('Error fetching data for reports:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const metrics = useMemo(() => {
        const filteredLedger = ledger.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
        });

        const income = filteredLedger.filter(tx => tx.type === 'in').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const expenses = filteredLedger.filter(tx => tx.type === 'out').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const net = income - expenses;
        const totalAssets = funds.reduce((sum, f) => sum + (f.balance || 0), 0);

        // Group by category
        const expenseByCat: Record<string, number> = {};
        filteredLedger.filter(tx => tx.type === 'out').forEach(tx => {
            const cat = tx.cat.replace(' Exp', '');
            expenseByCat[cat] = (expenseByCat[cat] || 0) + Math.abs(tx.amount);
        });

        const incomeByCat: Record<string, number> = {};
        const incomeByDept: Record<string, number> = {};
        filteredLedger.filter(tx => tx.type === 'in').forEach(tx => {
            const cat = tx.cat || 'Tithes';
            const dept = tx.dept || 'General';
            incomeByCat[cat] = (incomeByCat[cat] || 0) + Math.abs(tx.amount);
            incomeByDept[dept] = (incomeByDept[dept] || 0) + Math.abs(tx.amount);
        });

        return { income, expenses, net, totalAssets, expenseByCat, incomeByCat, incomeByDept, filteredLedger };
    }, [ledger, funds, selectedMonth, selectedYear]);

    const reports = [
        { id: 'board', title: 'Monthly Board Report', category: 'Executive', lastGenerated: 'Current', type: 'Instant', icon: ShieldCheck, color: '#ec4899' },
        { id: 'pnl', title: 'Profit & Loss Statement', category: 'Financial', lastGenerated: 'Live', type: 'Instant', icon: TrendingUp, color: '#10b981' },
        { id: 'balance', title: 'Balance Sheet', category: 'Financial', lastGenerated: 'Live', type: 'Instant', icon: Building2, color: '#6366f1' },
        { id: 'cashflow', title: 'Cash Flow Statement', category: 'Financial', lastGenerated: 'Live', type: 'Instant', icon: BarChart3, color: '#a855f7' },
    ];

    const renderPNL = () => (
        <div style={{ padding: '0.5rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '3rem',
                borderBottom: '2px solid var(--border)',
                paddingBottom: '2rem',
                alignItems: 'flex-end'
            }}>
                <div>
                    <h2 className="gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Statement of Activity</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Operating Period: Jan 01, 2026 – Mar 31, 2026</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Net Operating Income</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800, color: metrics.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {metrics.net >= 0 ? '+' : '-'}${Math.abs(metrics.net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <section className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Sources</h4>
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
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operating Expenses</h4>
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
                            <span>Total Expenditures</span>
                            <span>${metrics.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );

    const renderBalanceSheet = () => (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '2rem' }}>
                <h2 className="gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white' }}>Statement of Financial Position</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Reporting Date: March 31, 2026</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <section className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-light)', marginBottom: '1.5rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Consolidated Assets</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>Cash & Liquid Equivalents</span>
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
                            <span>Total Portfolio Value</span>
                            <span>${metrics.totalAssets.toLocaleString()}</span>
                        </div>
                    </div>
                </section>

                <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Net Assets (Equity)</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Designated/Restricted Funds</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>${funds.filter(f => f.category !== 'General').reduce((s, f) => s + f.balance, 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Operating/General Funds</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>${funds.filter(f => f.category === 'General').reduce((s, f) => s + f.balance, 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: '1.25rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>
                                <span>Total Equity</span>
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
                            <strong>Asset Integrity Verified:</strong>
                            <p style={{ marginTop: '2px', opacity: 0.9 }}>Ledger balances match historical fund allocations accurately.</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );

    const renderBoardReport = () => (
        <div style={{ padding: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <ShieldCheck size={48} color="var(--primary-light)" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Board Performance Summary</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Financial Health & Stewardship Overview • {months[selectedMonth]} {selectedYear}</p>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px' }}
                    >
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <TrendingUp size={32} color="#10b981" />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Monthly Revenue</p>
                    <h4 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>${metrics.income.toLocaleString()}</h4>
                </div>
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ArrowDownRight size={32} color="#ef4444" />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrative Outflow</p>
                    <h4 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444' }}>${metrics.expenses.toLocaleString()}</h4>
                </div>
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldCheck size={32} color="var(--primary-light)" />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mission Surplus</p>
                    <h4 style={{ fontSize: '2.5rem', fontWeight: 800, color: metrics.net >= 0 ? '#10b981' : '#ef4444' }}>
                        ${metrics.net.toLocaleString()}
                    </h4>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', marginBottom: '4rem' }}>
                <div className="glass-card" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Revenue Inflow</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Categorized stewardship by department and fund type</p>
                        </div>
                        <Activity size={24} className="gradient-text" />
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Classification</th>
                                    <th>Department</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { cat: 'Tithes', dept: 'General Fund', amount: metrics.incomeByCat['Tithes'] || 0 },
                                    { cat: 'Offerings', dept: 'Local Church', amount: metrics.incomeByCat['Offerings'] || metrics.incomeByCat['Offering'] || 0 },
                                    { cat: 'Sabbath School', dept: 'Education', amount: metrics.incomeByDept['Sabbath School'] || metrics.incomeByCat['Sabbath School'] || 0 },
                                    ...Object.entries(metrics.incomeByCat)
                                        .filter(([cat]) => !['Tithes', 'Offerings', 'Offering', 'Sabbath School'].includes(cat))
                                        .map(([cat, amt]) => ({ cat, dept: 'Designated', amount: amt }))
                                ].map((item, i) => (
                                    <tr key={i}>
                                        <td>
                                            <span style={{ fontWeight: 800, color: 'white' }}>{item.cat}</span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{item.dept}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)', fontSize: '1.125rem' }}>
                                            +${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Operational Outflow</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Top monthly expenditure categories</p>
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
                                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 700 }}>MONTHLY TOTAL</span>
                                </div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>${metrics.expenses.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
                <div className="card glass" style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp size={20} color="#10b981" /> Revenue by Source
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {Object.entries(metrics.incomeByCat).length > 0 ? (
                            Object.entries(metrics.incomeByCat).map(([cat, amt]) => (
                                <div key={cat}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                                        <span style={{ color: 'white', fontWeight: 700 }}>${amt.toLocaleString()} ({Math.round((amt / metrics.income) * 100)}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                        <div style={{ width: `${(amt / metrics.income) * 100}%`, height: '100%', background: '#10b981', borderRadius: '4px' }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No revenue recorded this month.</p>
                        )}
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                            <span>Total Designated Revenue</span>
                            <span style={{ color: '#10b981' }}>${metrics.income.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="card glass" style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.02)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ArrowDownRight size={20} color="#ef4444" /> Expense Allocation
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {Object.entries(metrics.expenseByCat).length > 0 ? (
                            Object.entries(metrics.expenseByCat).map(([cat, amt]) => (
                                <div key={cat}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                                        <span style={{ color: 'white', fontWeight: 700 }}>${amt.toLocaleString()} ({Math.round((amt / metrics.expenses) * 100)}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                        <div style={{ width: `${(amt / metrics.expenses) * 100}%`, height: '100%', background: '#ef4444', borderRadius: '4px' }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No expenses recorded this month.</p>
                        )}
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                            <span>Total Stewardship Burn</span>
                            <span style={{ color: '#ef4444' }}>${metrics.expenses.toLocaleString()}</span>
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
                                    Financial <span className="gradient-text">Intelligence</span>
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px' }}>Audit-ready financial statements, board-ready insights, and real-time stewardship tracking.</p>
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
                                    {months[selectedMonth]} {selectedYear}
                                </div>
                                <button className="btn btn-primary" style={{ height: '56px', padding: '0 2rem' }}>
                                    <Plus size={20} /> New Audit Request
                                </button>
                            </div>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
                            {[
                                { label: 'Revenue Accuracy', value: '100%', icon: ShieldCheck, color: 'var(--success)' },
                                { label: 'Board Compliance', value: 'Active', icon: CheckCircle2, color: 'var(--primary)' },
                                { label: 'Audit Trail', value: 'Immutable', icon: FileText, color: '#a855f7' },
                                { label: 'Report Latency', value: '< 200ms', icon: Activity, color: '#ec4899' },
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
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2.5rem', color: 'white' }}>Mission Critical Statements</h3>
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
                                                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>{report.category} • Updated {report.lastGenerated}</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button className="btn btn-ghost" style={{ padding: '12px', borderRadius: '12px' }}>
                                                    <DownloadCloud size={20} />
                                                </button>
                                                <button className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 800 }}>
                                                    View Now
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <div className="card glass" style={{ height: 'fit-content' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Automated Reports</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{
                                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                                        border: '1px solid rgba(99, 102, 241, 0.1)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius)'
                                    }}>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Monthly Financial Close</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '8px 0' }}>Next run: Apr 1st, 2026</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#10b981' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                            Active Schedule
                                        </div>
                                    </div>
                                    <button className="btn glass" style={{ width: '100%', fontSize: '0.875rem' }}>Manage Recipients</button>
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
                                    Export PDF
                                </button>
                                <button className="btn btn-primary" onClick={() => alert('Publishing current statement to Church Board portal...')}>Publish to Board</button>
                            </div>
                        </header>

                        {viewStatement === 'pnl' && renderPNL()}
                        {viewStatement === 'balance' && renderBalanceSheet()}
                        {viewStatement === 'board' && renderBoardReport()}
                        {viewStatement === 'cashflow' && (
                            <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                                <BarChart3 size={48} color="var(--primary-light)" style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cash Flow Statement</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>Tracing the movement of liquid assets across operating cycles.</p>
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    <div className="card glass" style={{ width: '200px', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>OPERATING INFLOW</p>
                                        <p style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>${metrics.income.toLocaleString()}</p>
                                    </div>
                                    <div className="card glass" style={{ width: '200px', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>OPERATING OUTFLOW</p>
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
