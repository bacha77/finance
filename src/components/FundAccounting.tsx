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
    const { t } = useLanguage();
    const [showNewTxModal, setShowNewTxModal] = useState(false);
    const [selectedTxForAudit, setSelectedTxForAudit] = useState<Transaction | null>(null);
    const [showReconcile, setShowReconcile] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [funds, setFunds] = useState<Fund[]>([]);
    const [showNewFundModal, setShowNewFundModal] = useState(false);
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

                // Auto-seed General Fund if none exist
                if (!fundData || fundData.length === 0) {
                    const { data: seededFund, error: seedError } = await supabase.from('funds').insert({
                        name: 'General Fund',
                        balance: 0,
                        church_id: churchId,
                        type: 'Unrestricted',
                        status: 'Active',
                        color: '#6366f1'
                    }).select().single();
                    if (!seedError && seededFund) {
                        setFunds([seededFund]);
                    }
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
    }, [churchId, showNewTxModal, t]);

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
                alert(t('invalidAmount') || 'Please enter a valid positive amount.');
                return;
            }

            const selectedFund = updatedFunds.find(f => f.id === alloc.fundId);
            if (!selectedFund) {
                alert(t('selectFund') || 'Please select a valid fund.');
                return;
            }
            const selectedDept = availableDepts.find(d => d.id === alloc.deptId);

            newTxs.push({
                date: txDate,
                description: txNotes ? `${t('donations')}: ${txNotes}` : `${t('donations')} ${t('to')} ${selectedDept?.name}`,
                category: t('revenue'),
                fund: selectedFund?.name || 'General Fund',
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
            const { error: ledgerError } = await supabase
                .from('ledger')
                .insert(newTxs.map(tx => ({
                    ...tx,
                    member: tx.member?.trim() || null,
                    created_at: new Date().toISOString()
                })));

            if (ledgerError) throw ledgerError;

            const { data: freshLedger } = await supabase
                .from('ledger')
                .select('*')
                .eq('church_id', churchId)
                .order('created_at', { ascending: false });
            
            if (freshLedger) setLedger(freshLedger);
            setFunds([...updatedFunds]);

            setShowNewTxModal(false);
            setTxMember('');
            setTxNotes('');
            setPaymentMethod('Cash');
            setAllocations([{ deptId: '1', fundId: funds[0]?.id || '', amount: '' }]);

        } catch (err: any) {
            console.error('Save error:', err);
            alert(`Failed to save: ${err.message}`);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('Are you sure you want to permanently remove this transaction? Fund balances will be automatically recalculated.')) return;
        
        try {
            const { error } = await supabase
                .from('ledger')
                .delete()
                .eq('id', id)
                .eq('church_id', churchId);
            
            if (error) throw error;
            alert('Synchronized.');
        } catch (err: any) {
            console.error('Delete error:', err);
            alert(`Failed to remove transaction: ${err.message}`);
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
                    <button className="btn btn-ghost" onClick={() => setShowNewFundModal(true)}>
                        <PieChart size={18} /> {t('newFund') || 'New Fund'}
                    </button>
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
                                <button className="btn btn-ghost" onClick={() => setIsSyncing(true)}>
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
                                    ].map((item, i) => (
                                        <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: item.matched ? '1px solid var(--success)' : '1px solid var(--border)', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{item.date}</span>
                                                <span style={{ fontWeight: 800, color: item.amount > 0 ? 'var(--success)' : 'white' }}>${Math.abs(item.amount).toLocaleString()}</span>
                                            </div>
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>{t('ledgerRecommendations')}</h3>
                                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border)', textAlign: 'center' }}>
                                    <AlertCircle size={24} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('noDirectMatch')}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div key="ledger">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                            {funds.map((fund, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    className="glass-card"
                                    style={{ padding: '2rem', borderLeft: `5px solid ${fund.color}`, position: 'relative' }}
                                >
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
                                        ${fund.balance.toLocaleString()}
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
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: '320px' }}>
                                    <Search size={18} color="var(--text-muted)" />
                                    <input type="text" placeholder={t('searchPlaceholder')} style={{ background: 'none', border: 'none', color: 'white', marginLeft: '0.75rem', outline: 'none', width: '100%' }} />
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
                                                <td style={{ fontWeight: 600 }}>{new Date(tx.date || tx.created_at || '').toLocaleDateString()}</td>
                                                <td>
                                                    <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{tx.description}</div>
                                                    {tx.member && <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 800 }}>{tx.member}</div>}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>{tx.category}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.department}</span>
                                                    </div>
                                                </td>
                                                <td><span style={{ fontSize: '0.7rem', padding: '4px 12px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)', fontWeight: 800 }}>{tx.fund}</span></td>
                                                <td style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 800, color: tx.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                                                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => setSelectedTxForAudit(tx)} style={{ background: 'var(--glass-light)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem' }}><Shield size={12} /> {t('history')}</button>
                                                        <button onClick={async () => tx.id && await handleDeleteTransaction(tx.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem' }}><Trash2 size={12} /></button>
                                                    </div>
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

            <AnimatePresence>
                {showNewFundModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={() => setShowNewFundModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '400px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem', color: 'white' }}>{t('createFund')}</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const name = (e.target as any).fundName.value;
                                    const { data, error: _error } = await supabase.from('funds').insert({ name, church_id: churchId, balance: 0, status: 'Active', color: '#6366f1' }).select().single();
                                    if (data) setFunds([...funds, data]);
                                    if (_error) console.error(_error);
                                    setShowNewFundModal(false);
                                } catch (err) {}
                            }}>
                                <input name="fundName" required className="glass-input" style={{ width: '100%', marginBottom: '1.5rem' }} placeholder="Fund Name" />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewFundModal(false)}>{t('cancel')}</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('create')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {showNewTxModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={() => setShowNewTxModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 10, opacity: 0 }} className="glass-card" style={{ width: '520px', padding: '3rem' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>{t('recordDeposit')}</h2>
                                <button onClick={() => setShowNewTxModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddTransaction}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <select value={txMember} onChange={e => setTxMember(e.target.value)} className="glass-input">
                                        <option value="">{t('member')}</option>
                                        {members.map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
                                    </select>
                                    <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="glass-input" />
                                </div>
                                {allocations.map((alloc, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <select value={alloc.fundId} onChange={e => handleAllocationChange(idx, 'fundId', e.target.value)} className="glass-input" style={{ flex: 1 }}>
                                            <option value="">{t('fund')}</option>
                                            {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                        <input type="number" placeholder="0.00" value={alloc.amount} onChange={e => handleAllocationChange(idx, 'amount', e.target.value)} className="glass-input" style={{ width: '100px' }} />
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewTxModal(false)}>{t('cancel')}</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('recordDeposit')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {selectedTxForAudit && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={() => setSelectedTxForAudit(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '540px', padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '1.5rem' }}>{t('auditTrail')}</h3>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {selectedTxForAudit.audit_trail?.map((log, i) => (
                                    <div key={i} style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ fontWeight: 800 }}>{log.action}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{log.details}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setSelectedTxForAudit(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }}>{t('close')}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FundAccounting;
