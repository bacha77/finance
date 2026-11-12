import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Printer, CheckCircle, Calculator, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

interface Fund {
    id: string;
    name: string;
    balance: number;
}

interface EnvelopeEntry {
    id: string;
    giverName: string;
    envelopeNo: string;
    category: string;
    fundId: string;
    method: 'Cash' | 'Check' | 'Zelle' | 'Card';
    checkNumber: string;
    amount: string;
}

interface SundayBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    churchId: string;
    churchName: string;
    funds: Fund[];
    members: { name: string }[];
    onBatchSubmitted: () => void;
}

const CATEGORIES = ['Tithe', 'General Offering', 'Building Fund', 'Missions', 'Youth Ministry', 'Benevolence / Love', 'Special Project'];

export const SundayBatchModal: React.FC<SundayBatchModalProps> = ({
    isOpen,
    onClose,
    churchId,
    churchName,
    funds,
    members,
    onBatchSubmitted
}) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const [serviceDate, setServiceDate] = useState(todayStr);
    const [serviceType, setServiceType] = useState('Sunday Morning Worship');
    const [counter1, setCounter1] = useState('');
    const [counter2, setCounter2] = useState('');
    const [showCashCalc, setShowCashCalc] = useState(false);

    // Cash Breakdown Count
    const [cashDenoms, setCashDenoms] = useState<{ [key: string]: number }>({
        '100': 0,
        '50': 0,
        '20': 0,
        '10': 0,
        '5': 0,
        '1': 0,
        'coins': 0
    });

    const [entries, setEntries] = useState<EnvelopeEntry[]>([
        {
            id: '1',
            giverName: '',
            envelopeNo: '',
            category: 'Tithe',
            fundId: funds[0]?.id || '',
            method: 'Check',
            checkNumber: '',
            amount: ''
        },
        {
            id: '2',
            giverName: '',
            envelopeNo: '',
            category: 'General Offering',
            fundId: funds[0]?.id || '',
            method: 'Cash',
            checkNumber: '',
            amount: ''
        }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const handleDenomChange = (denom: string, qtyStr: string) => {
        const qty = parseInt(qtyStr) || 0;
        setCashDenoms(prev => ({ ...prev, [denom]: Math.max(0, qty) }));
    };

    const cashCalcTotal = 
        cashDenoms['100'] * 100 +
        cashDenoms['50'] * 50 +
        cashDenoms['20'] * 20 +
        cashDenoms['10'] * 10 +
        cashDenoms['5'] * 5 +
        cashDenoms['1'] * 1 +
        (Number(cashDenoms['coins']) || 0);

    const addEntry = () => {
        setEntries(prev => [
            ...prev,
            {
                id: Math.random().toString(36).substring(2, 9),
                giverName: '',
                envelopeNo: '',
                category: 'Tithe',
                fundId: funds[0]?.id || '',
                method: 'Check',
                checkNumber: '',
                amount: ''
            }
        ]);
    };

    const removeEntry = (id: string) => {
        if (entries.length > 1) {
            setEntries(prev => prev.filter(e => e.id !== id));
        }
    };

    const updateEntry = (id: string, field: keyof EnvelopeEntry, value: string) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    // Calculate Totals
    const validEntries = entries.filter(e => parseFloat(e.amount) > 0);
    const totalCash = validEntries.filter(e => e.method === 'Cash').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalChecks = validEntries.filter(e => e.method === 'Check').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalOther = validEntries.filter(e => e.method !== 'Cash' && e.method !== 'Check').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const grandTotal = totalCash + totalChecks + totalOther;

    const generateDepositSlipPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text(churchName || 'Storehouse Sanctuary', 14, 22);
        
        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229);
        doc.text('OFFICIAL SUNDAY OFFERING COUNT & DEPOSIT SHEET', 14, 30);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Service: ${serviceType} | Date: ${serviceDate}`, 14, 37);
        doc.text(`Counters: ${counter1 || 'Counter 1'} & ${counter2 || 'Counter 2'}`, 14, 43);

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 48, 196, 48);

        // Summary Boxes
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 52, 182, 24, 'F');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total Cash: $${totalCash.toFixed(2)}`, 20, 64);
        doc.text(`Total Checks (${validEntries.filter(e => e.method === 'Check').length}): $${totalChecks.toFixed(2)}`, 75, 64);
        doc.text(`Grand Deposit Total: $${grandTotal.toFixed(2)}`, 135, 64);

        // Table
        autoTable(doc, {
            startY: 82,
            head: [['#', 'Giver / Member', 'Env #', 'Category', 'Fund', 'Method', 'Check #', 'Amount']],
            body: validEntries.map((e, idx) => {
                const fundName = funds.find(f => f.id === e.fundId)?.name || 'General';
                return [
                    idx + 1,
                    e.giverName || 'Anonymous',
                    e.envelopeNo || '—',
                    e.category,
                    fundName,
                    e.method,
                    e.checkNumber || '—',
                    `$${parseFloat(e.amount).toFixed(2)}`
                ];
            }),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
            bodyStyles: { fontSize: 8 }
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 180;

        // Dual Verification Signatures
        doc.setFontSize(9);
        doc.setTextColor(70);
        doc.text('We certify under penalty of perjury that this offering was counted together and verified intact:', 14, finalY + 20);
        
        doc.line(14, finalY + 40, 90, finalY + 40);
        doc.text(`Counter 1 Signature (${counter1 || 'Print Name'})`, 14, finalY + 46);

        doc.line(110, finalY + 40, 190, finalY + 40);
        doc.text(`Counter 2 Signature (${counter2 || 'Print Name'})`, 110, finalY + 46);

        doc.save(`Offering_Batch_${serviceDate.replace(/-/g, '')}.pdf`);
    };

    const handleSubmitBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validEntries.length === 0) {
            alert('Please add at least one valid offering entry with an amount greater than $0.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Prepare Ledger Insertions
            const insertions = validEntries.map(entry => {
                const fundObj = funds.find(f => f.id === entry.fundId);
                const desc = entry.checkNumber 
                    ? `Sunday Offering - ${entry.category} (Check #${entry.checkNumber})`
                    : `Sunday Offering - ${entry.category}`;

                return {
                    church_id: churchId,
                    date: serviceDate,
                    description: desc,
                    category: entry.category,
                    fund: fundObj?.name || 'General',
                    fund_id: entry.fundId || (funds[0]?.id || null),
                    department: 'Tithe & Stewardship',
                    amount: parseFloat(entry.amount),
                    type: 'in',
                    member: entry.giverName.trim() || null,
                    method: entry.method,
                    reconciled: true,
                    notes: `Counted by ${counter1 || 'Counter 1'} & ${counter2 || 'Counter 2'} for ${serviceType}`,
                    audit_trail: [{
                        timestamp: new Date().toISOString(),
                        user: counter1 ? `${counter1} & ${counter2}` : 'Offering Counters',
                        action: 'SUNDAY_BATCH_RECORD',
                        details: `Recorded in Sunday Batch deposit for ${serviceDate}`
                    }]
                };
            });

            // 2. Insert into Ledger
            const { error: ledgerError } = await supabase.from('ledger').insert(insertions);
            if (ledgerError) throw ledgerError;

            // 3. Update Fund Balances
            const fundIncrements: { [fundId: string]: number } = {};
            validEntries.forEach(entry => {
                const fId = entry.fundId || funds[0]?.id;
                if (fId) {
                    fundIncrements[fId] = (fundIncrements[fId] || 0) + parseFloat(entry.amount);
                }
            });

            for (const [fundId, addAmt] of Object.entries(fundIncrements)) {
                const targetFund = funds.find(f => f.id === fundId);
                if (targetFund) {
                    const newBalance = (targetFund.balance || 0) + addAmt;
                    await supabase.from('funds').update({ balance: newBalance }).eq('id', fundId);
                }
            }

            // 4. Register new members if any
            const newGivers = Array.from(new Set(
                validEntries
                    .map(e => e.giverName.trim())
                    .filter(name => name && !members.some(m => m.name.toLowerCase() === name.toLowerCase()))
            ));

            if (newGivers.length > 0) {
                const newMemberRows = newGivers.map(name => ({
                    church_id: churchId,
                    name,
                    role: 'Giver',
                    status: 'Active',
                    created_at: new Date().toISOString()
                }));
                await supabase.from('members').insert(newMemberRows);
            }

            setSuccessMessage(`Successfully posted ${validEntries.length} offerings ($${grandTotal.toFixed(2)}) to church funds.`);
            setTimeout(() => {
                onBatchSubmitted();
                onClose();
            }, 1200);
        } catch (err: any) {
            console.error('Batch submission failed:', err);
            alert(`Error submitting batch: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="modal-backdrop" 
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1.5rem'
                }}
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.95, opacity: 0, y: 15 }} 
                    className="glass-card" 
                    style={{ 
                        width: '100%', 
                        maxWidth: '960px', 
                        maxHeight: '92vh',
                        overflowY: 'auto',
                        padding: '2.5rem',
                        borderRadius: '24px',
                        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    }} 
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '10px', borderRadius: '14px', display: 'flex' }}>
                                    <Users size={22} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', margin: 0 }}>
                                        Sunday Service Batch Offering
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                        Dual-verified church tithe & offering count sheet with direct fund allocation
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {successMessage && (
                        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                            <CheckCircle size={20} />
                            <span style={{ fontWeight: 700 }}>{successMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmitBatch}>
                        {/* Service & Dual Verification Bar */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Service Date
                                </label>
                                <input 
                                    type="date" 
                                    value={serviceDate} 
                                    onChange={e => setServiceDate(e.target.value)} 
                                    className="glass-input" 
                                    style={{ width: '100%', fontSize: '0.85rem' }} 
                                    required 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Service Type
                                </label>
                                <input 
                                    type="text" 
                                    value={serviceType} 
                                    onChange={e => setServiceType(e.target.value)} 
                                    className="glass-input" 
                                    style={{ width: '100%', fontSize: '0.85rem' }} 
                                    placeholder="e.g. Sunday Morning Worship" 
                                    required 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Counter 1 (Deacon / Officer)
                                </label>
                                <input 
                                    type="text" 
                                    value={counter1} 
                                    onChange={e => setCounter1(e.target.value)} 
                                    className="glass-input" 
                                    style={{ width: '100%', fontSize: '0.85rem' }} 
                                    placeholder="Name of Counter 1" 
                                    required 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Counter 2 (Deacon / Officer)
                                </label>
                                <input 
                                    type="text" 
                                    value={counter2} 
                                    onChange={e => setCounter2(e.target.value)} 
                                    className="glass-input" 
                                    style={{ width: '100%', fontSize: '0.85rem' }} 
                                    placeholder="Name of Counter 2" 
                                    required 
                                />
                            </div>
                        </div>

                        {/* Collapsible Currency Tally Helper */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <button 
                                type="button" 
                                onClick={() => setShowCashCalc(!showCashCalc)} 
                                className="btn btn-ghost" 
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', padding: '6px 12px' }}
                            >
                                <Calculator size={16} />
                                {showCashCalc ? 'Hide Cash Denomination Counter' : 'Open Cash Currency Counter (Bills & Coins)'}
                                {cashCalcTotal > 0 && <span style={{ color: '#10b981', fontWeight: 800 }}>— Total: ${cashCalcTotal.toFixed(2)}</span>}
                            </button>

                            {showCashCalc && (
                                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.25rem', marginTop: '0.75rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                        {['100', '50', '20', '10', '5', '1'].map(bill => (
                                            <div key={bill}>
                                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>${bill} Bills</label>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={cashDenoms[bill] || ''} 
                                                    onChange={e => handleDenomChange(bill, e.target.value)} 
                                                    className="glass-input" 
                                                    style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }} 
                                                    placeholder="0" 
                                                />
                                            </div>
                                        ))}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Coins Total ($)</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                min="0"
                                                value={cashDenoms['coins'] || ''} 
                                                onChange={e => handleDenomChange('coins', e.target.value)} 
                                                className="glass-input" 
                                                style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }} 
                                                placeholder="0.00" 
                                            />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>
                                        Verified Physical Cash Tally: ${cashCalcTotal.toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Envelope Entry Table */}
                        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white' }}>
                                    Offering Envelopes & Loose Collections ({entries.length} items)
                                </span>
                                <button 
                                    type="button" 
                                    onClick={addEntry} 
                                    className="btn btn-ghost" 
                                    style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Plus size={14} /> Add Row
                                </button>
                            </div>

                            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', width: '22%' }}>Giver Name</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', width: '10%' }}>Env #</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', width: '18%' }}>Category</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', width: '18%' }}>Fund</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', width: '12%' }}>Method</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', width: '10%' }}>Check #</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', width: '10%' }}>Amount ($)</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '5%' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((entry) => (
                                            <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <input 
                                                        list="batch-members"
                                                        value={entry.giverName}
                                                        onChange={e => updateEntry(entry.id, 'giverName', e.target.value)}
                                                        className="glass-input"
                                                        placeholder="Giver or Anonymous"
                                                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input 
                                                        value={entry.envelopeNo}
                                                        onChange={e => updateEntry(entry.id, 'envelopeNo', e.target.value)}
                                                        className="glass-input"
                                                        placeholder="Env #"
                                                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <select 
                                                        value={entry.category}
                                                        onChange={e => updateEntry(entry.id, 'category', e.target.value)}
                                                        className="glass-input"
                                                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                                                    >
                                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <select 
                                                        value={entry.fundId}
                                                        onChange={e => updateEntry(entry.id, 'fundId', e.target.value)}
                                                        className="glass-input"
                                                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                                                    >
                                                        {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <select 
                                                        value={entry.method}
                                                        onChange={e => updateEntry(entry.id, 'method', e.target.value as any)}
                                                        className="glass-input"
                                                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                                                    >
                                                        <option value="Cash">Cash</option>
                                                        <option value="Check">Check</option>
                                                        <option value="Zelle">Zelle</option>
                                                        <option value="Card">Card</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input 
                                                        value={entry.checkNumber}
                                                        disabled={entry.method !== 'Check'}
                                                        onChange={e => updateEntry(entry.id, 'checkNumber', e.target.value)}
                                                        className="glass-input"
                                                        placeholder={entry.method === 'Check' ? '1024' : '—'}
                                                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', opacity: entry.method === 'Check' ? 1 : 0.4 }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={entry.amount}
                                                        onChange={e => updateEntry(entry.id, 'amount', e.target.value)}
                                                        className="glass-input"
                                                        placeholder="0.00"
                                                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right', color: '#10b981' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeEntry(entry.id)} 
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
                                                        title="Delete row"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <datalist id="batch-members">
                            {members.map((m, i) => <option key={i} value={m.name} />)}
                        </datalist>

                        {/* Summary Bar */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cash Total</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>${totalCash.toFixed(2)}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Checks Total</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>${totalChecks.toFixed(2)}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Electronic / Other</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>${totalOther.toFixed(2)}</span>
                            </div>
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>Grand Deposit Total</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>${grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                                type="button" 
                                className="btn btn-ghost" 
                                onClick={generateDepositSlipPDF}
                                disabled={validEntries.length === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Printer size={16} /> Print Bank Deposit Sheet (PDF)
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-ghost" 
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                disabled={isSubmitting || validEntries.length === 0}
                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
                            >
                                {isSubmitting ? 'Posting...' : `Post Batch ($${grandTotal.toFixed(2)})`}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

