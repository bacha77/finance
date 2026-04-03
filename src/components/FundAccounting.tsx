import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    PieChart,
    ArrowUpRight,
    X,
    Trash2,
    Shield,
    CheckCircle,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface Fund {
    id: string;
    name: string;
    balance: number;
    status: string;
    color: string;
    type: string;
}

interface AuditLog {
    timestamp: string;
    user: string;
    action: string;
    details: string;
}

interface Transaction {
    id?: string;
    date: string;
    description: string;
    category: string;
    department: string;
    fund: string;
    fund_id: string;
    amount: number;
    type: 'in' | 'out' | 'expense' | 'revenue';
    member?: string;
    method?: string;
    notes?: string;
    audit_trail: AuditLog[];
    church_id?: string;
    created_at?: string;
}

interface FundAccountingProps {
    churchId: string;
}

const FundAccounting: React.FC<FundAccountingProps> = ({ churchId }) => {
    const { t, language } = useLanguage();
    const [showNewTxModal, setShowNewTxModal] = useState(false);
    const [selectedTxForAudit, setSelectedTxForAudit] = useState<Transaction | null>(null);
    const [showReconcile, setShowReconcile] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [funds, setFunds] = useState<Fund[]>([]);
    const [ledger, setLedger] = useState<Transaction[]>([]);

    // Supabase Sync & Realtime
    useEffect(() => {
        const fetchData = async () => {
            if (!churchId) return;
            setIsSyncing(true);
            try {
                // Fetch Ledger
                const { data: ledgerData } = await supabase
                    .from('ledger')
                    .select('*')
                    .eq('church_id', churchId)
                    .order('created_at', { ascending: false });

                setLedger(ledgerData || []);

                // Fetch Funds
                const { data: fundData } = await supabase
                    .from('funds')
                    .select('*')
                    .eq('church_id', churchId);

                setFunds(fundData || []);

                // Auto-select General Fund for new transactions if available
                const gf = fundData?.find(f => f.name.toLowerCase().includes('general'));
                if (gf && allocations[0].fundId === '') {
                    setAllocations([{ deptId: '1', fundId: gf.id, amount: '' }]);
                }
            } catch (err) {
                console.error('Error syncing with Supabase:', err);
            } finally {
                setIsSyncing(false);
            }
        };

        fetchData();

        // Subscribe to changes
        const ledgerChannel = supabase.channel('ledger-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger', filter: `church_id=eq.${churchId}` }, fetchData)
            .subscribe();

        const fundsChannel = supabase.channel('fund-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'funds', filter: `church_id=eq.${churchId}` }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(ledgerChannel);
            supabase.removeChannel(fundsChannel);
        };
    }, [churchId]);

    useEffect(() => {
        localStorage.setItem('sanctuary_funds', JSON.stringify(funds));
    }, [funds]);

    useEffect(() => {
        localStorage.setItem('sanctuary_ledger', JSON.stringify(ledger));
    }, [ledger]);

    // Form States
    const [txMember, setTxMember] = useState('');
    const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [txNotes, setTxNotes] = useState('');
    const [allocations, setAllocations] = useState([{ deptId: '', fundId: '', amount: '' }]);



    const [members, setAvailableMembers] = useState<{ name: string }[]>([]);
    const [availableDepts, setAvailableDepts] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const loadContext = async () => {
            if (!churchId) return;

            const { data: membersData } = await supabase.from('members').select('name').eq('church_id', churchId);
            if (membersData) setAvailableMembers(membersData);

            const { data: deptsData } = await supabase.from('departments').select('id, name').eq('church_id', churchId);
            if (deptsData && deptsData.length > 0) {
                setAvailableDepts(deptsData);
            } else {
                setAvailableDepts([
                    { id: '1', name: t('tithesFinance') },
                    { id: '2', name: t('buildingFacilities') },
                    { id: '3', name: t('sabbathSchool') },
                    { id: '4', name: t('sundaySchool') },
                    { id: '5', name: t('youthMinistry') },
                ]);
            }
        };
        loadContext();
    }, [churchId, showNewTxModal]);

    const handleAllocationChange = (index: number, field: string, value: string) => {
        const newAllocations = [...allocations];
        (newAllocations[index] as any)[field] = value;
        setAllocations(newAllocations);
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (allocations.length === 0 || !churchId) return;

        const newTxs: Transaction[] = [];
        let updatedFunds = [...funds];

        for (const alloc of allocations) {
            const amount = parseFloat(alloc.amount);
            if (isNaN(amount) || amount <= 0) {
                alert(t('invalidAmount') || 'Please enter a valid positive amount for all allocations.');
                return;
            }

            const selectedFund = updatedFunds.find(f => f.id === alloc.fundId);
            if (!selectedFund) {
                alert(t('selectFund') || 'Please select a valid fund for all allocations.');
                return;
            }
            const selectedDept = availableDepts.find(d => d.id === alloc.deptId);

            newTxs.push({
                date: txDate, // Store as ISO for reliable syncing
                description: txNotes ? `${t('donations')}: ${txNotes}` : `${t('donations')} ${t('to')} ${selectedDept?.name}`,
                category: t('revenue'),
                fund: selectedFund?.name || t('generalFundTithes'),
                fund_id: alloc.fundId,
                department: selectedDept?.name || 'General',
                amount: amount,
                type: 'in',
                member: txMember,
                method: paymentMethod,
                notes: txNotes,
                church_id: churchId,
                audit_trail: [{
                    timestamp: new Date().toISOString(),
                    user: 'Admin',
                    action: 'CREATED',
                    details: t('recordedManually').replace('{method}', paymentMethod)
                }]
            });

            updatedFunds = updatedFunds.map(f => 
                f.id === alloc.fundId ? { ...f, balance: f.balance + amount } : f
            );
        }

        try {
            // Save to Supabase Ledger
            const { error: ledgerError } = await supabase
                .from('ledger')
                .insert(newTxs.map(tx => ({
                    ...tx,
                    member: tx.member?.trim() || null, // Sanitize member name
                    audit_trail: tx.audit_trail, // Supabase handles serialization for JSONB columns automatically.
                    created_at: new Date().toISOString()
                })));

            if (ledgerError) throw ledgerError;

            // Update Funds in Supabase
            let anyFundError = false;
            for (const fund of updatedFunds) {
                if (fund.id && fund.id.length > 5) { // Skip local temp IDs
                    const { error: fundError } = await supabase
                        .from('funds')
                        .update({ balance: fund.balance })
                        .eq('id', fund.id)
                        .eq('church_id', churchId);
                    if (fundError) {
                        console.error('Error updating fund balance:', fundError);
                        anyFundError = true;
                    }
                }
            }

            if (anyFundError) {
                alert(t('balanceSyncWarning') || 'Transaction saved, but some fund balances failed to sync. Please refresh.');
            }

            // Refresh local state from DB to keep UI in sync
            const { data: freshLedger } = await supabase
                .from('ledger')
                .select('*')
                .eq('church_id', churchId)
                .neq('voided', true)
                .order('created_at', { ascending: false });
            
            if (freshLedger) setLedger(freshLedger);
            setFunds([...updatedFunds]); // Ensure state update

            setShowNewTxModal(false);
            setTxMember('');
            setTxNotes('');
            setPaymentMethod('Cash');
            const defaultFundId = funds[0]?.id || '';
            setAllocations([{ deptId: '1', fundId: defaultFundId, amount: '' }]);

        } catch (err: any) {
            console.error('Error saving transaction to Supabase:', err);
            alert(`${t('saveError') || 'Failed to save transaction'}: ${err.message || 'Unknown error'}`);
            // Don't clear form on error so user can retry
            return;
        }

    };

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
                <div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                        {t('fundStewardship')}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>{t('fundStewardshipDesc')}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className={`btn ${showReconcile ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowReconcile(!showReconcile)}>
                        {isSyncing ? <RefreshCw size={18} className="spin" /> : <CheckCircle size={18} />}
                        {showReconcile ? t('integratedLedger') : t('reconcileBank')}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowNewTxModal(true)}>
                        <Plus size={18} /> {t('recordDeposit')}
                    </button>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {showReconcile ? (
                    <motion.div
                        key="reconcile"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass-card"
                        style={{ padding: '3rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{t('bankReconHub')}</h2>
                                <p style={{ color: 'var(--text-muted)' }}>{t('bankReconDesc')}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setIsSyncing(true);
                                        setTimeout(() => setIsSyncing(false), 2000);
                                    }}
                                    disabled={isSyncing}
                                >
                                    <RefreshCw size={18} className={isSyncing ? 'spin' : ''} /> {t('refreshFeed')}
                                </button>
                                <button className="btn btn-primary">{t('processMatches')}</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div style={{ borderRight: '1px solid var(--border)', paddingRight: '2rem' }}>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>{t('bankStatementItems')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {[
                                        { date: 'Mar 08', desc: 'CHECK DEP 1002', amount: 450.00, matched: false },
                                        { date: 'Mar 07', desc: 'ONLINE TRANSFER TITHE', amount: 1250.00, matched: true },
                                        { date: 'Mar 06', desc: 'ATM WITHDRAWAL - UTILITIES', amount: -120.00, matched: false },
                                    ].map((item, i) => (
                                        <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: item.matched ? '1px solid var(--success)' : '1px solid var(--border)', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{item.date}</span>
                                                <span style={{ fontWeight: 800, color: item.amount > 0 ? 'var(--success)' : 'white' }}>${Math.abs(item.amount).toLocaleString()}</span>
                                            </div>
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{item.desc.replace('TITHE', t('tithes').toUpperCase()).replace('UTILITIES', t('buildingFacilities').toUpperCase())}</p>
                                            {item.matched && (
                                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 800 }}>
                                                    <CheckCircle size={14} /> {t('autoMatchedLedger')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>{t('ledgerRecommendations')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary-light)' }}>
                                            <Shield size={20} />
                                            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t('suggestedMatch')}</p>
                                        </div>
                                         <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('exactMatchDesc').replace('{desc}', `Online ${t('tithes')} - Recurring`).replace('{date}', 'Mar 07')}</p>
                                        <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.75rem' }}>{t('confirmMatch')}</button>
                                    </div>
                                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border)', textAlign: 'center' }}>
                                        <AlertCircle size={24} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('noDirectMatch').replace('{desc}', 'CHECK DEP 1002')}</p>
                                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', marginTop: '12px' }}>{t('createLedgerLink')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div key="ledger">
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem',
                            marginBottom: '3rem'
                        }}>
                            {funds.map((fund, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    className="glass-card"
                                    style={{ padding: '2rem', borderLeft: `5px solid ${fund.color}`, position: 'relative', overflow: 'hidden' }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: '80px',
                                        height: '80px',
                                        background: `radial-gradient(circle at top right, ${fund.color}20, transparent 70%)`,
                                        pointerEvents: 'none'
                                    }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: fund.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {fund.type}
                                        </span>
                                        <PieChart size={18} color="var(--text-muted)" />
                                    </div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                        {fund.name}
                                    </h3>
                                    <p style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: 'white' }}>
                                        ${fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>
                                        <ArrowUpRight size={14} /> {t('accountStatus')}: {fund.status}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="glass-card" style={{ padding: '3rem', borderRadius: 'var(--radius-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{t('integratedLedger')}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('ledgerDesc')}</p>
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
                                        placeholder={t('searchPlaceholder')}
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

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('date')}</th>
                                            <th>{t('description')}</th>
                                            <th>{t('allocationDetails')}</th>
                                            <th>{t('destinationFund')}</th>
                                            <th style={{ textAlign: 'right' }}>{t('amount')}</th>
                                            <th style={{ textAlign: 'right' }}>{t('auditLog')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.map((tx, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 600 }}>
                                                    {new Date((tx.date || tx.created_at) || new Date()).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                                </td>
                                                <td>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{tx.description}</div>
                                                        {tx.member && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', marginTop: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                {t('contributor')}: {tx.member}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>{tx.category}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.department || 'General Ops'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                                        color: '#c084fc',
                                                        border: '1px solid rgba(168, 85, 247, 0.2)',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.04em'
                                                    }}>
                                                        {tx.fund}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    textAlign: 'right',
                                                    fontSize: '1rem',
                                                    fontWeight: 800,
                                                    color: tx.type === 'in' ? 'var(--success)' : 'var(--danger)'
                                                }}>
                                                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setSelectedTxForAudit(tx)}
                                                        style={{ background: 'var(--glass-light)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <Shield size={12} /> {t('history')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {showNewTxModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
                        onClick={() => setShowNewTxModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 10, opacity: 0 }}
                            className="glass-card"
                            style={{ 
                                width: '100%', 
                                maxWidth: '520px', 
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                borderRadius: '28px', 
                                padding: window.innerWidth < 768 ? '1.5rem' : '3rem', 
                                boxShadow: 'var(--shadow-lg)' 
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.4rem', color: 'white', letterSpacing: '-0.03em' }}>{t('recordDeposit')}</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>{t('fundStewardshipDesc')}</p>
                                </div>
                                <button onClick={() => setShowNewTxModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleAddTransaction} style={{ marginTop: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{t('member')} *</label>
                                        <select
                                            required
                                            value={txMember}
                                            onChange={(e) => setTxMember(e.target.value)}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'hsla(var(--bg-card)/0.4)', border: '1px solid var(--border)', color: 'white', fontSize: '0.95rem' }}
                                        >
                                            <option value="" style={{ background: '#0f172a' }}>{t('typeToSearch')}</option>
                                            {members.map((m, i) => <option key={i} value={m.name} style={{ background: '#0f172a' }}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{t('date')} *</label>
                                        <input
                                            type="date"
                                            required
                                            value={txDate}
                                            onChange={(e) => setTxDate(e.target.value)}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'hsla(var(--bg-card)/0.4)', border: '1px solid var(--border)', color: 'white', fontSize: '0.95rem', colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem', width: '50%' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{t('paymentMethod')} *</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'hsla(var(--bg-card)/0.4)', border: '1px solid var(--border)', color: 'white', fontSize: '0.95rem' }}
                                    >
                                        <option value="Cash" style={{ background: '#0f172a' }}>{t('cash')}</option>
                                        <option value="Check" style={{ background: '#0f172a' }}>{t('check')}</option>
                                        <option value="Online" style={{ background: '#0f172a' }}>{t('online')}</option>
                                        <option value="Mobile" style={{ background: '#0f172a' }}>{t('mobileApp')}</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>{t('departmentAllocations')} *</label>
                                        <button
                                            type="button"
                                            onClick={() => setAllocations([...allocations, { deptId: '1', fundId: funds[0]?.id || '', amount: '' }])}
                                            className="btn btn-primary"
                                            style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '8px' }}
                                        >
                                            <Plus size={16} /> {t('department')}
                                        </button>
                                    </div>

                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {allocations.map((alloc, idx) => (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 32px', gap: '0.5rem', alignItems: 'center' }}>
                                                <select
                                                    value={alloc.deptId}
                                                    onChange={(e) => handleAllocationChange(idx, 'deptId', e.target.value)}
                                                    className="glass-input"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'hsla(var(--bg-card)/0.4)', border: '1px solid var(--border)', color: 'white', fontSize: '0.85rem' }}
                                                >
                                                    <option value="" style={{ background: '#0f172a' }}>{t('department')}</option>
                                                    {availableDepts.map(d => <option key={d.id} value={d.id} style={{ background: '#0f172a' }}>{d.name}</option>)}
                                                </select>

                                                <select
                                                    value={alloc.fundId}
                                                    required
                                                    onChange={(e) => handleAllocationChange(idx, 'fundId', e.target.value)}
                                                    className="glass-input"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'hsla(var(--bg-card)/0.4)', border: '1px solid var(--border)', color: 'white', fontSize: '0.85rem' }}
                                                >
                                                    <option value="" style={{ background: '#0f172a' }}>{t('fund')}</option>
                                                    {funds.map(f => <option key={f.id} value={f.id} style={{ background: '#0f172a' }}>{f.name}</option>)}
                                                </select>

                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    required
                                                    min="0.01"
                                                    step="0.01"
                                                    value={alloc.amount}
                                                    onChange={(e) => handleAllocationChange(idx, 'amount', e.target.value)}
                                                    className="glass-input"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'hsla(var(--bg-card)/0.4)', border: '1px solid var(--border)', color: 'white', fontSize: '0.85rem' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setAllocations(allocations.filter((_, i) => i !== idx))}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{t('notes')}</label>
                                    <textarea
                                        value={txNotes}
                                        onChange={(e) => setTxNotes(e.target.value)}
                                        placeholder={t('optionalNotesLabel')}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'hsla(var(--bg-card)/0.4)', border: '1px solid var(--border)', color: 'white', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="btn" style={{ padding: '10px 24px', background: 'white', color: '#1e293b', border: '1px solid #cbd5e1' }} onClick={() => setShowNewTxModal(false)}>{t('cancel')}</button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', background: '#2563eb' }}>{t('recordDeposit')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {selectedTxForAudit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                        onClick={() => setSelectedTxForAudit(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="glass-card"
                            style={{ 
                                width: '100%', 
                                maxWidth: '540px', 
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: window.innerWidth < 768 ? '1.5rem' : '2.5rem', 
                                borderRadius: '32px' 
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{t('auditTrail')}</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TXID: {selectedTxForAudit.id}</p>
                                </div>
                                <button onClick={() => setSelectedTxForAudit(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {selectedTxForAudit.audit_trail.map((log: AuditLog, i: number) => (
                                    <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginBottom: '4px' }} />
                                            {i !== selectedTxForAudit.audit_trail.length - 1 && <div style={{ width: '1px', flex: 1, background: 'var(--border)' }} />}
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{log.action}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>By: <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{log.user}</span></p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{log.details}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setSelectedTxForAudit(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }}>{t('closeAuditView')}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FundAccounting;
