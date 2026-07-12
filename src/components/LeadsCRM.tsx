import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, Plus, Phone, Mail, Building, Clock } from 'lucide-react';

export default function LeadsCRM() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // New Lead Form
    const [churchName, setChurchName] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [source, setSource] = useState('Cold Outreach');
    
    const fetchLeads = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('marketing_leads').select('*').order('created_at', { ascending: false });
        if (data) setLeads(data);
        if (error) console.error("Error fetching leads:", error);
        setLoading(false);
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleAddLead = async () => {
        if (!churchName) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('marketing_leads').insert({
            church_name: churchName,
            contact_name: contactName,
            email,
            phone,
            source,
            assigned_to: user?.id
        });
        
        if (error) {
            alert(`Error adding lead: ${error.message}`);
        } else {
            setChurchName('');
            setContactName('');
            setEmail('');
            setPhone('');
            setIsAdding(false);
            fetchLeads();
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('marketing_leads').update({ status: newStatus }).eq('id', id);
        if (error) alert(`Error updating status: ${error.message}`);
        else fetchLeads();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.2)' };
            case 'Contacted': return { bg: 'rgba(168,85,247,0.1)', color: '#c084fc', border: 'rgba(168,85,247,0.2)' };
            case 'Meeting Scheduled': return { bg: 'rgba(234,179,8,0.1)', color: '#facc15', border: 'rgba(234,179,8,0.2)' };
            case 'Converted': return { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.2)' };
            case 'Not Interested': return { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)' };
            default: return { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
        }
    };

    return (
        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', marginTop: '1.5rem' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={20} color="#60a5fa" /> Lead Tracking
                </h2>
                <button onClick={() => setIsAdding(!isAdding)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                    <Plus size={16} /> New Lead
                </button>
            </div>

            {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <input type="text" placeholder="Church / Organization Name *" value={churchName} onChange={e => setChurchName(e.target.value)} style={{ flex: 2, minWidth: '200px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                        <select value={source} onChange={e => setSource(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                            <option value="Cold Outreach">Cold Outreach</option>
                            <option value="Referral">Referral</option>
                            <option value="Website">Website</option>
                            <option value="Event">Event</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <input type="text" placeholder="Contact Name" value={contactName} onChange={e => setContactName(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                        <input type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleAddLead} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Lead</button>
                    </div>
                </motion.div>
            )}

            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                    <Loader2 size={24} className="spin" color="#64748b" style={{ margin: '0 auto' }} />
                </div>
            ) : leads.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    No leads found. Start reaching out!
                </div>
            ) : (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 180px', padding: '0.75rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <div>Target</div>
                        <div>Source</div>
                        <div>Status</div>
                        <div>Actions</div>
                    </div>
                    {leads.map((lead) => {
                        const style = getStatusColor(lead.status);
                        return (
                            <div key={lead.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 180px', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>{lead.church_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {lead.contact_name && <span>{lead.contact_name}</span>}
                                        {lead.email && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Mail size={10} /> {lead.email}</span>}
                                        {lead.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={10} /> {lead.phone}</span>}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{lead.source}</div>
                                <div>
                                    <select 
                                        value={lead.status}
                                        onChange={(e) => updateStatus(lead.id, e.target.value)}
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
                                        <option value="New" style={{ background: '#0f172a' }}>New</option>
                                        <option value="Contacted" style={{ background: '#0f172a' }}>Contacted</option>
                                        <option value="Meeting Scheduled" style={{ background: '#0f172a' }}>Meeting Scheduled</option>
                                        <option value="Converted" style={{ background: '#0f172a' }}>Converted</option>
                                        <option value="Not Interested" style={{ background: '#0f172a' }}>Not Interested</option>
                                    </select>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {new Date(lead.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
