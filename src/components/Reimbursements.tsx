import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Check, X } from 'lucide-react';

interface Reimbursement {
    id: string;
    amount: number;
    description: string;
    receipt_url: string;
    status: 'pending' | 'approved' | 'rejected';
    submitted_by: string;
    created_at: string;
}

export default function Reimbursements({ churchId, userRole, userName }: { churchId: string, userRole: string, userName: string }) {
    const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const isAdmin = userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('treasurer') || userRole.toLowerCase().includes('pastor');

    useEffect(() => {
        fetchReimbursements();
    }, [churchId]);

    async function fetchReimbursements() {
        const { data } = await supabase.from('reimbursements').select('*').eq('church_id', churchId).order('created_at', { ascending: false });
        if (data) setReimbursements(data);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await supabase.from('reimbursements').insert({
            church_id: churchId,
            amount: parseFloat(amount),
            description,
            receipt_url: receiptUrl,
            submitted_by: userName
        });
        setShowModal(false);
        setAmount('');
        setDescription('');
        setReceiptUrl('');
        fetchReimbursements();
    };

    const handleUpdateStatus = async (id: string, status: string, amount: number, desc: string, submitter: string) => {
        await supabase.from('reimbursements').update({ status }).eq('id', id);
        
        if (status === 'approved') {
            // Automatically log to ledger
            await supabase.from('ledger').insert({
                church_id: churchId,
                amount: amount,
                type: 'out',
                category: 'Expense',
                member: submitter,
                desc: `Reimbursement: ${desc}`,
                date: new Date().toISOString().split('T')[0]
            });
        }
        fetchReimbursements();
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Expense Reimbursements</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus /> New Expense</button>
            </div>

            <div className="glass-card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Date</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Submitted By</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Description</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Amount</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status</th>
                            {isAdmin && <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {reimbursements.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{r.submitted_by}</td>
                                <td style={{ padding: '1rem' }}>{r.description}</td>
                                <td style={{ padding: '1rem', fontWeight: 800 }}>${r.amount.toFixed(2)}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', background: r.status === 'approved' ? 'rgba(16,185,129,0.2)' : r.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: r.status === 'approved' ? '#10b981' : r.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>
                                        {r.status.toUpperCase()}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td style={{ padding: '1rem' }}>
                                        {r.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleUpdateStatus(r.id, 'approved', r.amount, r.description, r.submitted_by)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><Check size={16} /></button>
                                                <button onClick={() => handleUpdateStatus(r.id, 'rejected', r.amount, r.description, r.submitted_by)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><X size={16} /></button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
                        <h2>Submit Expense</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <input type="number" step="0.01" placeholder="Amount" required value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            <input type="text" placeholder="Description" required value={description} onChange={e => setDescription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            <input type="url" placeholder="Receipt Image URL" value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
