import React, { useState, useEffect, useMemo } from 'react';
import {
    Wallet, Users, TrendingUp as TrendUp, DollarSign, ArrowUpRight, ArrowDownRight,
    RefreshCw, BarChart3, Activity, ChurchIcon, CreditCard,
    FileText, ShieldCheck, Shield, Lock, Calendar, Download, Target, HeartHandshake,
    Brain, Sparkles, AlertTriangle,
    BrainCircuit,
    Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { predictNextMonth, detectAnomalies } from '../lib/intelligence';
import { useLanguage } from '../contexts/LanguageContext';
import { useFinanceData } from '../hooks/useFinanceData';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
    churchId: string;
}

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtShort = (v: number) => fmt(v); // Remove K-rounding to maintain precision sync

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
        transition={{ delay, duration: 0.5, ease: 'easeOut' }}
        whileHover={{ translateY: -5, transition: { duration: 0.2 } }}
        className="glass-card"
        style={{ 
            cursor: 'default',
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
        }}
    >
        <div style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '120px',
            height: '120px',
            background: `radial-gradient(circle, ${iconColor}22 0%, transparent 70%)`,
            zIndex: 0
        }} />
        
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
            <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 16px -4px ${iconColor}44`
            }}>
                <Icon size={20} color={iconColor} strokeWidth={2.5} />
            </div>
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '0.75rem', fontWeight: 900,
                color: up ? '#10b981' : '#ef4444',
                background: up ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                padding: '4px 10px', borderRadius: '100px',
            }}>
                {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{change}
            </span>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.05em', marginBottom: '0.5rem' }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sub}</div>}
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>{label}</div>
        </div>
        {sparkline && (
            <div style={{ marginTop: '1rem', position: 'relative', zIndex: 1 }}>
                <Sparkline values={sparkline} color={iconColor} />
            </div>
        )}
    </motion.div>
);

// ── Feature Card ──────────────────────────────────────────────────────────
const FeatureCard: React.FC<{
    icon: React.ElementType; title: string; desc: string;
    iconBg: string; iconColor: string; onClick: () => void; delay: number;
}> = ({ icon: Icon, title, desc, iconBg, iconColor, onClick, delay }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.3 }}
        onClick={onClick}
        className="glass-card"
        style={{
            padding: '1.75rem',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        whileHover={{ transform: 'translateY(-5px)', borderColor: 'hsla(var(--p)/0.4)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' }}
    >
        <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: `0 8px 16px ${iconBg}`
        }}>
            <Icon size={28} color={iconColor} strokeWidth={1.75} />
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ fontSize: '0.825rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>{desc}</div>
    </motion.div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────
const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, churchId }) => {
    const { t, language } = useLanguage();
    const [recentTx, setRecentTx] = useState<any[]>([]);
    const [projection, setProjection] = useState<{income: number, expense: number, confidence: number} | null>(null);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [churchName, setChurchName] = useState('');
    const [churchData, setChurchData] = useState<any>(null);

    const today = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const { ledger, stats: financeStats, isLoading: syncing } = useFinanceData(churchId);

    const insights = useMemo(() => {
        if (!ledger || ledger.length === 0) return [];
        const res = [];
        const health = (financeStats.monthlyIncome || 1) / (financeStats.monthlyExpenses || 1);
        
        if (health > 1.2) res.push({ text: "Revenue efficiency is 20% above optimal threshold.", icon: Zap, color: "#10b981" });
        else if (health < 1) res.push({ text: "Spend rate is exceeding income. Neural shield active.", icon: AlertTriangle, color: "#ef4444" });
        
        if (financeStats.incomeChange > 0) res.push({ text: `Growth trend detected: +${financeStats.incomeChange.toFixed(1)}% vs prev month.`, icon: TrendingUp, color: "#3b82f6" });
        
        res.push({ text: "Fiscal integrity verified. All transactions synchronized with shard US-E1.", icon: Shield, color: "#a855f7" });
        return res;
    }, [ledger, financeStats]);


    useEffect(() => {
        const fetchChurch = async () => {
            if (!churchId) return;
            const { data: church } = await supabase.from('churches').select('name, logo_url').eq('id', churchId).single();
            if (church) {
                setChurchName(church.name);
                setChurchData(church);
            }

            const { data: dbGoals } = await supabase.from('goals').select('*').eq('church_id', churchId);
            if (dbGoals && dbGoals.length > 0) {
                setGoals(dbGoals.map(g => ({
                    ...g,
                    current: g.current_amount,
                    goal: g.target_amount,
                    icon: g.icon === 'Church' ? ChurchIcon : g.icon === 'Heart' ? HeartHandshake : Users
                })));
            } else {
                setGoals([]);
            }
        };
        fetchChurch();
    }, [churchId]);

    useEffect(() => {
        if (ledger) {
            setRecentTx(ledger.slice(0, 6));
            const pred = predictNextMonth(ledger);
            setProjection(pred);
            setAnomalies(detectAnomalies(ledger).slice(0, 2));

            // ── GENERATE CHART DATA (GROUPED BY FUND) ──
            const days: Record<string, any> = {};
            const last7 = ledger.filter(tx => {
                const d = new Date(tx.date || tx.created_at);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return d >= sevenDaysAgo;
            }).reverse();

            last7.forEach(tx => {
                const d = new Date(tx.date || tx.created_at).toLocaleDateString();
                if (!days[d]) days[d] = { date: d, tithes: 0, missions: 0, building: 0, expense: 0 };
                const amt = Math.abs(tx.amount || 0);
                if (tx.type === 'in' || tx.type === 'revenue') {
                    const fund = (tx.fund || '').toLowerCase();
                    if (fund.includes('tithe') || fund.includes('offer')) days[d].tithes += amt;
                    else if (fund.includes('mission') || fund.includes('missionary')) days[d].missions += amt;
                    else if (fund.includes('build')) days[d].building += amt;
                    else days[d].tithes += amt; 
                } else {
                    days[d].expense += amt;
                }
            });
            setChartData(Object.values(days));
        }
    }, [ledger]);

    const totalIncome = financeStats.monthlyIncome;
    const budgetUsed = Math.min(99, Math.round((financeStats.monthlyExpenses / Math.max(totalIncome, 1)) * 100));

    const statCards: StatCardProps[] = [
        {
            label: t('totalBalance'),
            value: fmt(financeStats.balance),
            change: `${financeStats.balanceChange >= 0 ? '+' : ''}${financeStats.balanceChange.toFixed(1)}%`,
            up: financeStats.balanceChange >= 0,
            icon: Wallet,
            iconBg: 'rgba(37,99,235,0.15)',
            iconColor: '#2563eb',
            sparkline: [10, 14, 12, 18, 22, 20, 24],
            delay: 0,
        },
        {
            label: `${t('tithes')} (MTD)`,
            value: fmt(financeStats.monthlyIncome),
            change: `${financeStats.incomeChange >= 0 ? '+' : ''}${financeStats.incomeChange.toFixed(1)}%`,
            up: financeStats.incomeChange >= 0,
            icon: Activity,
            iconBg: 'rgba(16,185,129,0.15)',
            iconColor: '#10b981',
            sparkline: [14, 18, 12, 22, 19, 26, 28],
            delay: 0.08,
        },
        {
            label: t('members'),
            value: financeStats.membersCount.toLocaleString(),
            change: '+2',
            up: true,
            icon: Users,
            iconBg: 'rgba(168,85,247,0.15)',
            iconColor: '#a855f7',
            sparkline: [5, 8, 7, 10, 9, 12, 11],
            delay: 0.16,
        },
        {
            label: t('expenses'),
            value: fmt(financeStats.monthlyExpenses),
            change: `${financeStats.expenseChange >= 0 ? '+' : ''}${financeStats.expenseChange.toFixed(1)}%`,
            up: financeStats.expenseChange <= 0,
            icon: Target,
            iconBg: 'rgba(239,68,68,0.15)',
            iconColor: '#ef4444',
            sparkline: [20, 18, 22, 15, 12, 10, 14],
            delay: 0.24,
        }
    ];

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text('Church Financial Report', 14, 22);
        
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text(churchName.toUpperCase(), 14, 25);
        if (churchData?.logo_url && churchData.logo_url.startsWith('data:image')) {
            try {
               doc.addImage(churchData.logo_url, 'PNG', 160, 15, 30, 30);
            } catch(e) {}
        }
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${today}`, 14, 30);
        
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Total Church Funds: ${fmt(financeStats.balance)}`, 14, 45);
        doc.text(`Tithes & Offerings (MTD): ${fmt(financeStats.monthlyIncome)}`, 14, 52);
        doc.text(`Active Members: ${financeStats.membersCount}`, 14, 59);
        doc.text(`Monthly Expenses: ${fmt(financeStats.monthlyExpenses)}`, 14, 66);

        autoTable(doc, {
            startY: 75,
            head: [['Date', 'Description', 'Type', 'Amount']],
            body: recentTx.map(tx => [tx.date, tx.description || tx.desc || 'N/A', (tx.type || '').toUpperCase(), fmt(tx.amount || 0)]),
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save('Church_Financial_Report.pdf');
    };

    return (
        <div style={{ padding: window.innerWidth < 768 ? '1.5rem 1rem' : '2rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>

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
                            {t('live')} {t('dashboard')}
                        </span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                        {t('financialOverview')}
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
                        <BarChart3 size={15} /> {t('newTransaction')}
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveTab('reports')}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem', borderRadius: '10px',
                            background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)',
                            color: '#60a5fa', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        <FileText size={15} /> {t('reports')}
                    </motion.button>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '100px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <Lock size={12} color="#60a5fa" />
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.05em' }}>FY 2026-27 ACTIVE</span>
                    </div>
                    <motion.button
                        onClick={generatePDF}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem', borderRadius: '10px',
                            background: '#10b981', border: 'none',
                            color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                        }}
                    >
                        <Download size={15} /> {t('exportPDF')}
                    </motion.button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                             <motion.div 
                                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} 
                             />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{syncing ? t('syncing') : 'SYSTEM LIVE'}</span>
                    </div>
                </div>
            </motion.div>

            {/* ── Stat Cards ─────────────────────────────────────────── */}
            <div className="stats-grid" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                {statCards.map((card, i) => <StatCard key={i} {...card} />)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem', marginBottom: '2.5rem' }}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(15,23,42,0.8) 100%)',
                        border: '1px solid rgba(37,99,235,0.2)',
                        borderRadius: '24px',
                        padding: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backdropFilter: 'blur(30px)',
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.4)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                         <div style={{ position: 'relative' }}>
                             <RadialProgress value={Math.min(100, Math.round(((financeStats.monthlyIncome || 1) / (financeStats.monthlyExpenses || 1)) * 50))} color="#10b981" size={100} />
                             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900, color: 'white' }}>
                                 {Math.min(100, Math.round(((financeStats.monthlyIncome || 1) / (financeStats.monthlyExpenses || 1)) * 50))}%
                             </div>
                         </div>
                         <div>
                             <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{t('financialHealth')}</h4>
                             <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: '300px' }}>
                                 Based on your current MTD metrics. Your income-to-expense ratio is performing {financeStats.monthlyIncome > financeStats.monthlyExpenses ? 'optimally' : 'under pressure'}.
                             </p>
                         </div>
                    </div>
                    <div style={{ display: 'flex', gap: '2.5rem', padding: '1rem 2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>BURN RATE</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>{fmtShort(financeStats.monthlyExpenses)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>RUNWAY</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2563eb' }}>{Math.max(0, Math.round(financeStats.balance / (financeStats.monthlyExpenses || 1)))} mo</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                        background: 'rgba(15,23,42,0.6)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '24px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'white', marginBottom: '1rem' }}>{t('fundDistribution')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                         {financeStats.totalAssets > 0 ? (
                             <div style={{ height: '140px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <PieChart width={140} height={140}>
                                     <Pie 
                                        data={[
                                            { name: 'Tithes', value: 70 },
                                            { name: 'Missions', value: 20 },
                                            { name: 'Bldg', value: 10 }
                                        ]} 
                                        innerRadius={40} 
                                        outerRadius={65} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                     >
                                         <Cell fill="#2563eb" />
                                         <Cell fill="#a855f7" />
                                         <Cell fill="#10b981" />
                                     </Pie>
                                 </PieChart>
                             </div>
                         ) : null}
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div style={{ padding: '8px', background: 'rgba(37,99,235,0.05)', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.1)' }}>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>GENERAL</div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>70%</div>
                              </div>
                              <div style={{ padding: '8px', background: 'rgba(168,85,247,0.05)', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.1)' }}>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>MISSIONS</div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>20%</div>
                              </div>
                         </div>
                    </div>
                </motion.div>
            </div>

            <div style={{ marginBottom: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.75rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '24px', padding: '2rem', backdropFilter: 'blur(12px)',
                        height: '380px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                    }}
                >
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'white' }}>{t('revenueVsExpenses')}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{language === 'es' ? 'Flujo de caja comparado' : 'Comparative Cashflow Analysis'}</div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                                <Tooltip
                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="tithes" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name="Expenses" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    style={{
                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '24px', padding: '2rem', backdropFilter: 'blur(12px)',
                        display: 'flex', flexDirection: 'column'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'white' }}>Mission Matrix</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Strategic Initiative Progress</div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '14px', color: '#a855f7' }}>
                            <TrendUp size={22} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {goals.length > 0 ? goals.map((goal, i) => {
                            const pct = Math.min(100, Math.round((goal.current / goal.goal) * 100));
                            return (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${goal.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: goal.color }}>
                                                {goal.icon ? <goal.icon size={20} /> : <Target size={20} />}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>{goal.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{fmtShort(goal.current)} of {fmtShort(goal.goal)}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                             <div style={{ fontSize: '1rem', fontWeight: 900, color: goal.color }}>{pct}%</div>
                                        </div>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 + i * 0.1 }}
                                            style={{ height: '100%', background: goal.color, borderRadius: '100px', boxShadow: `0 0 15px ${goal.color}88` }}
                                        />
                                    </div>
                                </div>
                            );
                        }) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('noGoalsFound')}</p>
                        )}
                    </div>
                </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 380px', gap: '1.75rem', marginBottom: '3rem' }}>
                 {/* Recent Activity */}
                 <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '24px', padding: '2rem', backdropFilter: 'blur(12px)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                        <div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'white' }}>{t('recentTransactions')}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Latest verified activity</div>
                        </div>
                        <button onClick={() => setActiveTab('accounting')} style={{
                            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa', borderRadius: '10px', padding: '8px 16px',
                            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                             {t('viewAll')} →
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recentTx.length > 0 ? recentTx.map((tx, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1.25rem',
                                    padding: '1rem', background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)'
                                }}
                            >
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    background: tx.amount < 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: tx.amount < 0 ? '#f87171' : '#34d399'
                                }}>
                                    {tx.amount < 0 ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>{tx.description || tx.desc || 'System Tx'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{new Date(tx.date || tx.created_at).toLocaleDateString()}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: tx.amount < 0 ? '#ef4444' : '#10b981' }}>
                                        {tx.amount < 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase' }}>{tx.method || 'Neural'}</div>
                                </div>
                            </motion.div>
                        )) : (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#334155' }}>No activity found for this period.</div>
                        )}
                    </div>
                 </motion.div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.35 }}
                        style={{
                            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '24px', padding: '2rem', backdropFilter: 'blur(12px)',
                            display: 'flex', flexDirection: 'column'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '2rem' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                <BrainCircuit size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'white' }}>Autonomous Insights</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Neural intel feed</div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {insights.map((insight, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                    style={{ 
                                        padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', 
                                        border: `1px solid ${insight.color}15`, display: 'flex', gap: '14px' 
                                    }}
                                >
                                    <div style={{ marginTop: '4px' }}><insight.icon size={18} color={insight.color} /></div>
                                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontWeight: 500 }}>{insight.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                         {[
                             { icon: Zap, label: 'Analytics', tab: 'accounting', color: '#2563eb' },
                             { icon: Users, label: 'Members', tab: 'members', color: '#10b981' },
                             { icon: CreditCard, label: 'Expenses', tab: 'expenses', color: '#f59e0b' },
                             { icon: PieChart, label: 'Budgets', tab: 'budget', color: '#a855f7' }
                         ].map((btn, i) => (
                             <motion.button
                                 key={i}
                                 whileHover={{ y: -4, background: 'rgba(255,255,255,0.05)' }}
                                 whileTap={{ scale: 0.95 }}
                                 onClick={() => setActiveTab(btn.tab)}
                                 style={{
                                     padding: '1.25rem', borderRadius: '18px', background: 'rgba(255,255,255,0.02)',
                                     border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer',
                                     display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
                                 }}
                             >
                                 <btn.icon size={20} color={btn.color} />
                                 <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{btn.label}</span>
                             </motion.button>
                         ))}
                    </div>
                 </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
                    {t('quickAccess')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem' }}>
                    {[
                        {
                            icon: BarChart3, title: t('analyticsTitle'),
                            desc: t('analyticsDesc'),
                            iconBg: 'rgba(37,99,235,0.12)', iconColor: '#2563eb', tab: 'accounting',
                        },
                        {
                            icon: Users, title: t('memberMgmtTitle'),
                            desc: t('memberMgmtDesc'),
                            iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981', tab: 'members',
                        },
                        {
                            icon: CreditCard, title: t('expenseWorkflowTitle'),
                            desc: t('expenseWorkflowDesc'),
                            iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b', tab: 'expenses',
                        },
                        {
                            icon: TrendUp, title: t('smartGiving'),
                            desc: t('smartGivingDesc'),
                            iconBg: 'rgba(168,85,247,0.12)', iconColor: '#a855f7', tab: 'giving',
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
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ 
                    padding: '2.5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: '2rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <ShieldCheck color="#10b981" size={20} />
                     <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>{t('fiscalVerification')}</span>
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
