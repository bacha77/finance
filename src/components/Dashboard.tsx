import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Users,
    DollarSign,
    ArrowUpRight,
    Clock,
    RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import StatsCard from './StatsCard';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
    const [stats, setStats] = useState({
        balance: 142500.00,
        tithes: 28450.00,
        members: 1240,
        growth: 12.5
    });

    const [recentTx, setRecentTx] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsSyncing(true);
            try {
                // Fetch Ledger for Tithes and Recent Tx
                const { data: ledger } = await supabase
                    .from('ledger')
                    .select('*')
                    .order('created_at', { ascending: false });

                // Fetch Funds for Balance
                const { data: funds } = await supabase
                    .from('funds')
                    .select('*');

                // Fetch Members for Count
                const { data: members } = await supabase
                    .from('members')
                    .select('id');

                const totalTithes = ledger
                    ? ledger
                        .filter((tx: any) => tx.cat === 'Income' || tx.cat === 'Tithes & Finance')
                        .reduce((sum: number, tx: any) => sum + tx.amount, 0)
                    : 0;

                const totalBalance = funds
                    ? funds.reduce((sum: number, f: any) => sum + f.balance, 0)
                    : 0;

                setStats(prev => ({
                    ...prev,
                    balance: totalBalance || prev.balance,
                    tithes: totalTithes || prev.tithes,
                    members: members?.length || prev.members
                }));

                if (ledger) setRecentTx(ledger.slice(0, 5));
            } catch (err) {
                console.error('Error fetching dashboard stats from Supabase:', err);

                // Fallback to localStorage if error
                const savedLedger = localStorage.getItem('sanctuary_ledger');
                const ledger = savedLedger ? JSON.parse(savedLedger) : [];
                const totalTithes = ledger
                    .filter((tx: any) => tx.cat === 'Income' || tx.cat === 'Tithes & Finance')
                    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

                const savedFunds = localStorage.getItem('sanctuary_funds');
                const funds = savedFunds ? JSON.parse(savedFunds) : [];
                const totalBalance = funds.reduce((sum: number, f: any) => sum + f.balance, 0);

                const savedMembers = localStorage.getItem('sanctuary_members');
                const membersList = savedMembers ? JSON.parse(savedMembers) : [];

                setStats(prev => ({
                    ...prev,
                    balance: totalBalance || prev.balance,
                    tithes: totalTithes || prev.tithes,
                    members: membersList.length || prev.members
                }));
                setRecentTx(ledger.slice(0, 5));
            } finally {
                setIsSyncing(false);
            }
        };

        fetchData();

        const channels = [
            supabase.channel('ledger-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'ledger' }, () => fetchData()),
            supabase.channel('funds-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'funds' }, () => fetchData()),
            supabase.channel('members-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchData())
        ];

        channels.forEach(channel => channel.subscribe());

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(val);
    };

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.05em' }}>
                        Welcome Home, <span className="gradient-text">Sanctuary</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>Financial stewardship and mission analytics overview</p>
                </div>
                {isSyncing && (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ color: 'var(--primary)', marginTop: '1rem' }}
                    >
                        <RefreshCw size={24} />
                    </motion.div>
                )}
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                <StatsCard
                    label="Consolidated Funds"
                    value={formatCurrency(stats.balance)}
                    change="+5.4%"
                    trend="up"
                    icon={Wallet}
                    color="#f43f5e"
                />
                <StatsCard
                    label="General Tithes"
                    value={formatCurrency(stats.tithes)}
                    change="+12.5%"
                    trend="up"
                    icon={DollarSign}
                    color="#10b981"
                />
                <StatsCard
                    label="Active Members"
                    value={stats.members.toLocaleString()}
                    change="+3.2%"
                    trend="up"
                    icon={Users}
                    color="#a855f7"
                />
                <StatsCard
                    label="Growth Rate"
                    value={`${stats.growth}%`}
                    change="+1.1%"
                    trend="up"
                    icon={ArrowUpRight}
                    color="#6366f1"
                />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '2.2fr 1fr',
                gap: '2.5rem'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card"
                    style={{ padding: '2.5rem', borderRadius: 'var(--radius-xl)' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Recent Activity</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Latest stewardship and mission transactions</p>
                        </div>
                        <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setActiveTab('accounting')}
                        >
                            View Full Ledger
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentTx.length > 0 ? recentTx.map((tx, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        backgroundColor: tx.type === 'in' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: tx.type === 'in' ? '#10b981' : '#f43f5e'
                                    }}>
                                        {tx.type === 'in' ? <ArrowUpRight size={20} /> : <ArrowUpRight size={20} style={{ transform: 'rotate(90deg)' }} />}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{tx.desc}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.date} • {tx.cat}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 800, color: tx.type === 'in' ? '#10b981' : 'white', fontSize: '1rem' }}>
                                        {tx.type === 'in' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>VERIFIED</p>
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Clock size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                <p>No recent transactions found.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card"
                    style={{ padding: '2.5rem', borderRadius: 'var(--radius-xl)' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>Quick Insights</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Operational health indicators</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {[
                                { label: 'Tithe Performance', status: 'Optimal', color: 'var(--success)' },
                                { label: 'Expense Ratio', status: 'Within target', color: 'var(--primary-light)' },
                                { label: 'Fund Availability', status: 'Stable', color: '#f59e0b' },
                            ].map((item, i) => (
                                <div key={i} style={{ padding: '1.25rem', borderRadius: 'var(--radius)', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '4px' }}>{item.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{item.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Health Radar</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {[
                                    { label: 'Liquidity Ratio', value: '2.4', trend: 'Healthy', color: 'var(--success)' },
                                    { label: 'Budget Adherence', value: '94%', trend: 'On Track', color: 'var(--primary-light)' },
                                    { label: 'Fund Reserved', value: '18%', trend: 'Stable', color: '#f59e0b' },
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontSize: '0.825rem', color: 'white', fontWeight: 700 }}>{item.label}</p>
                                            <p style={{ fontSize: '0.7rem', color: item.color, fontWeight: 800, textTransform: 'uppercase' }}>{item.trend}</p>
                                        </div>
                                        <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Milestone</p>
                            <div style={{
                                padding: '1.25rem',
                                borderRadius: 'var(--radius)',
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)'
                            }}>
                                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>Easter Sunday Service</p>
                                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>April 12, 10:00 AM • Main Sanctuary</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
