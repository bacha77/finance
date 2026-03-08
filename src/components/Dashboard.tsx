import React, { useState, useEffect } from 'react';
import {
    Wallet, Users, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
    RefreshCw, BarChart3, Activity, ChurchIcon, CreditCard,
    FileText, ShieldCheck, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
}

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
const fmtShort = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : fmt(v);

// ── Mini Sparkline (CSS bar chart) ────────────────────────────────────────
const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
    const max = Math.max(...values);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px' }}>
            {values.map((v, i) => (
                <div key={i} style={{
                    flex: 1, borderRadius: '3px 3px 0 0',
                    background: i === values.length - 1 ? color : `${color}55`,
                    height: `${(v / max) * 100}%`,
                    transition: 'height 0.5s',
                }} />
            ))}
        </div>
    );
};

// ── Radial Progress ────────────────────────────────────────────────────────
const RadialProgress: React.FC<{ value: number; color: string; size?: number }> = ({
    value, color, size = 56,
}) => {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (value / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
    );
};

// ── Stat Card ─────────────────────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: string;
    sub?: string;
    change: string;
    up: boolean;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    sparkline?: number[];
    delay?: number;
}
const StatCard: React.FC<StatCardProps> = ({
    label, value, sub, change, up, icon: Icon, iconBg, iconColor, sparkline, delay = 0,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backdropFilter: 'blur(12px)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            cursor: 'default',
        }}
        whileHover={{ borderColor: 'rgba(37,99,235,0.4)', boxShadow: '0 0 24px rgba(37,99,235,0.1)' }}
    >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={22} color={iconColor} strokeWidth={2} />
            </div>
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '0.72rem', fontWeight: 700,
                color: up ? '#10b981' : '#ef4444',
                background: up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                padding: '3px 8px', borderRadius: '100px',
            }}>
                {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change}
            </span>
        </div>
        <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'white', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>{sub}</div>}
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>{label}</div>
        </div>
        {sparkline && <Sparkline values={sparkline} color={iconColor} />}
    </motion.div>
);

// ── Feature Card ──────────────────────────────────────────────────────────
const FeatureCard: React.FC<{
    icon: React.ElementType; title: string; desc: string;
    iconBg: string; iconColor: string; onClick: () => void; delay: number;
}> = ({ icon: Icon, title, desc, iconBg, iconColor, onClick, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        onClick={onClick}
        style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '1.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
        }}
        whileHover={{ borderColor: 'rgba(37,99,235,0.4)', y: -3, boxShadow: '0 8px 32px rgba(37,99,235,0.12)' }}
    >
        <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.25rem',
        }}>
            <Icon size={26} color={iconColor} strokeWidth={1.75} />
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>{title}</div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
    </motion.div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────
const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
    const [stats, setStats] = useState({ balance: 142500, tithes: 28450, members: 1240, expenses: 19800 });
    const [recentTx, setRecentTx] = useState<any[]>([]);
    const [syncing, setSyncing] = useState(false);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    useEffect(() => {
        const fetchData = async () => {
            setSyncing(true);
            try {
                const [{ data: ledger }, { data: funds }, { data: members }] = await Promise.all([
                    supabase.from('ledger').select('*').order('created_at', { ascending: false }),
                    supabase.from('funds').select('*'),
                    supabase.from('members').select('id'),
                ]);
                const totalBalance = funds?.reduce((s: number, f: any) => s + (f.balance || 0), 0) || 0;
                const totalTithes = ledger?.filter((t: any) => t.type === 'in').reduce((s: number, t: any) => s + (t.amount || 0), 0) || 0;
                const totalExpenses = ledger?.filter((t: any) => t.type === 'out').reduce((s: number, t: any) => s + (t.amount || 0), 0) || 0;
                setStats(prev => ({
                    balance: totalBalance || prev.balance,
                    tithes: totalTithes || prev.tithes,
                    members: members?.length || prev.members,
                    expenses: totalExpenses || prev.expenses,
                }));
                if (ledger) setRecentTx(ledger.slice(0, 6));
            } catch (e) {
                console.error(e);
            } finally {
                setSyncing(false);
            }
        };
        fetchData();
        const channels = [
            supabase.channel('db-ledger').on('postgres_changes', { event: '*', schema: 'public', table: 'ledger' }, fetchData),
            supabase.channel('db-funds').on('postgres_changes', { event: '*', schema: 'public', table: 'funds' }, fetchData),
        ];
        channels.forEach(c => c.subscribe());
        return () => { channels.forEach(c => supabase.removeChannel(c)); };
    }, []);

    const totalIncome = stats.tithes;
    const budgetUsed = Math.min(99, Math.round((stats.expenses / Math.max(totalIncome, 1)) * 100));
    const sparkData = [14, 18, 12, 22, 19, 26, 28];

    const statCards: StatCardProps[] = [
        {
            label: 'Total Church Funds',
            value: fmtShort(stats.balance),
            change: '+5.4%',
            up: true,
            icon: Wallet,
            iconBg: 'rgba(37,99,235,0.15)',
            iconColor: '#2563eb',
            sparkline: [10, 14, 12, 18, 22, 20, 24],
            delay: 0,
        },
        {
            label: 'Tithes & Offerings (MTD)',
            value: fmtShort(stats.tithes),
            change: '+12.5%',
            up: true,
            icon: DollarSign,
            iconBg: 'rgba(16,185,129,0.15)',
            iconColor: '#10b981',
            sparkline: sparkData,
            sub: 'This month',
            delay: 0.08,
        },
        {
            label: 'Active Members',
            value: stats.members.toLocaleString(),
            change: '+3.2%',
            up: true,
            icon: Users,
            iconBg: 'rgba(168,85,247,0.15)',
            iconColor: '#a855f7',
            sparkline: [8, 10, 9, 11, 12, 13, 15],
            delay: 0.16,
        },
        {
            label: 'Monthly Expenses',
            value: fmtShort(stats.expenses),
            change: '-2.1%',
            up: false,
            icon: CreditCard,
            iconBg: 'rgba(245,158,11,0.15)',
            iconColor: '#f59e0b',
            sparkline: [20, 18, 22, 16, 19, 17, 15],
            delay: 0.24,
        },
    ];

    return (
        <div style={{ padding: '2rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>

            {/* ── Header ─────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}
            >
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Live Dashboard
                        </span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                        Financial Overview
                    </h1>
                    <p style={{ color: '#475569', fontSize: '0.875rem', marginTop: '0.35rem' }}>{today}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <motion.button
                        onClick={() => setActiveTab('accounting')}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem', borderRadius: '10px',
                            background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)',
                            color: '#60a5fa', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        <BarChart3 size={15} /> New Transaction
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveTab('reports')}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem', borderRadius: '10px',
                            background: '#2563eb', border: 'none',
                            color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                        }}
                    >
                        <FileText size={15} /> View Reports
                    </motion.button>
                    {syncing && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}
                        >
                            <RefreshCw size={18} />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* ── Stat Cards ─────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {statCards.map((card, i) => <StatCard key={i} {...card} />)}
            </div>

            {/* ── Middle Row: Transaction List + Health Panel ─────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>

                {/* Recent Transactions */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '16px', padding: '1.75rem', backdropFilter: 'blur(12px)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Recent Transactions</div>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Latest ledger activity</div>
                        </div>
                        <button onClick={() => setActiveTab('accounting')} style={{
                            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)',
                            color: '#60a5fa', borderRadius: '8px', padding: '5px 12px',
                            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                            View all →
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {recentTx.length > 0 ? recentTx.map((tx, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.85rem 1rem', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                                        background: tx.type === 'in' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {tx.type === 'in'
                                            ? <ArrowUpRight size={18} color="#10b981" />
                                            : <ArrowDownRight size={18} color="#ef4444" />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                                            {tx.description || tx.desc || 'Transaction'}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '1px' }}>
                                            {tx.date} • {tx.fund || tx.category || 'General'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontSize: '0.9rem', fontWeight: 800,
                                        color: tx.type === 'in' ? '#10b981' : '#ef4444',
                                    }}>
                                        {tx.type === 'in' ? '+' : '-'}{fmtShort(Math.abs(tx.amount || 0))}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                                        Verified
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '3rem', color: '#334155', gap: '0.75rem',
                            }}>
                                <Activity size={36} strokeWidth={1.5} />
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No transactions yet</div>
                                <button onClick={() => setActiveTab('accounting')} style={{
                                    background: '#2563eb', border: 'none', color: 'white',
                                    padding: '8px 18px', borderRadius: '8px', fontWeight: 700,
                                    fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                                    marginTop: '0.25rem',
                                }}>
                                    Add First Transaction
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Financial Health Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    style={{
                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '16px', padding: '1.75rem', backdropFilter: 'blur(12px)',
                        display: 'flex', flexDirection: 'column', gap: '1.25rem',
                    }}
                >
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Financial Health</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Key performance indicators</div>
                    </div>

                    {/* Budget Gauge */}
                    <div style={{
                        background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
                        borderRadius: '14px', padding: '1.25rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                    }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Budget Utilization</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1, marginTop: '4px' }}>{budgetUsed}%</div>
                            <div style={{ fontSize: '0.7rem', color: budgetUsed < 80 ? '#10b981' : '#f59e0b', fontWeight: 700, marginTop: '2px' }}>
                                {budgetUsed < 80 ? '✓ Within target' : '⚠ Near limit'}
                            </div>
                        </div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RadialProgress value={budgetUsed} color={budgetUsed < 80 ? '#10b981' : '#f59e0b'} size={64} />
                            <div style={{ position: 'absolute', fontSize: '0.7rem', fontWeight: 800, color: 'white' }}>{budgetUsed}%</div>
                        </div>
                    </div>

                    {/* KPI rows */}
                    {[
                        { label: 'Liquidity Ratio', value: '2.4x', status: 'Healthy', color: '#10b981', pct: 80 },
                        { label: 'Budget Adherence', value: '94%', status: 'On Track', color: '#2563eb', pct: 94 },
                        { label: 'Reserve Fund', value: `${fmtShort(stats.balance * 0.18)}`, status: 'Stable', color: '#f59e0b', pct: 65 },
                    ].map((kpi, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{kpi.label}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: kpi.color, textTransform: 'uppercase' }}>{kpi.status}</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white' }}>{kpi.value}</span>
                                </div>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${kpi.pct}%` }}
                                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                                    style={{ height: '100%', background: kpi.color, borderRadius: '100px' }}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Security badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.85rem 1rem', borderRadius: '12px',
                        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                        marginTop: 'auto',
                    }}>
                        <ShieldCheck size={18} color="#10b981" />
                        <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>Secure & Encrypted</div>
                            <div style={{ fontSize: '0.68rem', color: '#334155' }}>All data protected • SOC2 Ready</div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Feature / Module Cards ──────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ marginBottom: '1.25rem' }}
            >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    Quick Access
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {[
                        {
                            icon: BarChart3, title: 'Financial Analytics',
                            desc: 'YTD/MTD metrics, revenue trends, and expense breakdowns.',
                            iconBg: 'rgba(37,99,235,0.12)', iconColor: '#2563eb', tab: 'accounting',
                        },
                        {
                            icon: Users, title: 'Member Management',
                            desc: 'Secure database with complete giving history and insights.',
                            iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981', tab: 'members',
                        },
                        {
                            icon: CreditCard, title: 'Expense Workflow',
                            desc: 'Categorized expense tracking with multi-level approvals.',
                            iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b', tab: 'expenses',
                        },
                        {
                            icon: TrendingUp, title: 'Smart Giving',
                            desc: 'Online giving, pledge tracking, and donor analytics.',
                            iconBg: 'rgba(168,85,247,0.12)', iconColor: '#a855f7', tab: 'giving',
                        },
                        {
                            icon: ChurchIcon, title: 'Payroll & Staff',
                            desc: 'Automated payroll with tax calculations and compliance.',
                            iconBg: 'rgba(239,68,68,0.12)', iconColor: '#ef4444', tab: 'payroll',
                        },
                        {
                            icon: Calendar, title: 'Budget Planning',
                            desc: 'Annual budget allocation by department and fund.',
                            iconBg: 'rgba(6,182,212,0.12)', iconColor: '#06b6d4', tab: 'budget',
                        },
                    ].map((card, i) => (
                        <FeatureCard
                            key={i}
                            icon={card.icon}
                            title={card.title}
                            desc={card.desc}
                            iconBg={card.iconBg}
                            iconColor={card.iconColor}
                            onClick={() => setActiveTab(card.tab)}
                            delay={0.45 + i * 0.05}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
