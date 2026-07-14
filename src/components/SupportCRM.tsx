import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, Plus, Mail, Clock, Ticket } from 'lucide-react';

export default function SupportCRM() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // New Ticket Form
    const [churchName, setChurchName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [issueTitle, setIssueTitle] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    
    const fetchTickets = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
        if (data) setTickets(data);
        if (error) console.error("Error fetching tickets:", error);
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleAddTicket = async () => {
        if (!churchName || !issueTitle) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('support_tickets').insert({
            church_name: churchName,
            contact_email: contactEmail,
            issue_title: issueTitle,
            issue_description: issueDescription,
            priority,
            assigned_to: user?.id
        });
        
        if (error) {
            alert(`Error adding ticket: ${error.message}`);
        } else {
            setChurchName('');
            setContactEmail('');
            setIssueTitle('');
            setIssueDescription('');
            setPriority('Medium');
            setIsAdding(false);
            fetchTickets();
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', id);
        if (error) alert(`Error updating status: ${error.message}`);
        else fetchTickets();
    };

    const updatePriority = async (id: string, newPriority: string) => {
        const { error } = await supabase.from('support_tickets').update({ priority: newPriority }).eq('id', id);
        if (error) alert(`Error updating priority: ${error.message}`);
        else fetchTickets();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.2)' };
            case 'In Progress': return { bg: 'rgba(234,179,8,0.1)', color: '#facc15', border: 'rgba(234,179,8,0.2)' };
            case 'Resolved': return { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.2)' };
            default: return { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
        }
    };

    const getPriorityColor = (prio: string) => {
        switch (prio) {
            case 'Low': return { color: '#4ade80' };
            case 'Medium': return { color: '#facc15' };
            case 'Urgent': return { color: '#ef4444' };
            default: return { color: '#94a3b8' };
        }
    };

    return (
        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', marginTop: '1.5rem' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Ticket size={20} color="#60a5fa" /> Support Tickets
                </h2>
                <button onClick={() => setIsAdding(!isAdding)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                    <Plus size={16} /> New Ticket
                </button>
            </div>

            {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <input type="text" placeholder="Church Name *" value={churchName} onChange={e => setChurchName(e.target.value)} style={{ flex: 2, minWidth: '200px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                        <input type="email" placeholder="Contact Email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={{ flex: 2, minWidth: '200px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                        <select value={priority} onChange={e => setPriority(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Urgent">Urgent Priority</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', flexDirection: 'column' }}>
                        <input type="text" placeholder="Issue Title *" value={issueTitle} onChange={e => setIssueTitle(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                        <textarea placeholder="Issue Description" value={issueDescription} onChange={e => setIssueDescription(e.target.value)} rows={3} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleAddTicket} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Ticket</button>
                    </div>
                </motion.div>
            )}

            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                    <Loader2 size={24} className="spin" color="#64748b" style={{ margin: '0 auto' }} />
                </div>
            ) : tickets.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    No support tickets found. Great job!
                </div>
            ) : (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 120px 120px 150px', padding: '0.75rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <div>Church</div>
                        <div>Issue</div>
                        <div>Priority</div>
                        <div>Status</div>
                        <div>Date</div>
                    </div>
                    {tickets.map((ticket) => {
                        const style = getStatusColor(ticket.status);
                        const prioStyle = getPriorityColor(ticket.priority);
                        return (
                            <div key={ticket.id} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 120px 120px 150px', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>{ticket.church_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {ticket.contact_email && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Mail size={10} /> {ticket.contact_email}</span>}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.85rem' }}>{ticket.issue_title}</div>
                                    {ticket.issue_description && (
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {ticket.issue_description}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <select 
                                        value={ticket.priority}
                                        onChange={(e) => updatePriority(ticket.id, e.target.value)}
                                        style={{ 
                                            background: 'rgba(255,255,255,0.03)', 
                                            color: prioStyle.color, 
                                            border: '1px solid rgba(255,255,255,0.1)', 
                                            padding: '4px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="Low" style={{ background: '#0f172a' }}>Low</option>
                                        <option value="Medium" style={{ background: '#0f172a' }}>Medium</option>
                                        <option value="Urgent" style={{ background: '#0f172a' }}>Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <select 
                                        value={ticket.status}
                                        onChange={(e) => updateStatus(ticket.id, e.target.value)}
                                        style={{ 
                                            background: style.bg, 
                                            color: style.color, 
                                            border: `1px solid ${style.border}`, 
                                            padding: '4px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="Open" style={{ background: '#0f172a' }}>Open</option>
                                        <option value="In Progress" style={{ background: '#0f172a' }}>In Progress</option>
                                        <option value="Resolved" style={{ background: '#0f172a' }}>Resolved</option>
                                    </select>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
