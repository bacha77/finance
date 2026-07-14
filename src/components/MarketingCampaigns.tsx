import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, Plus, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function MarketingCampaigns() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [platform, setPlatform] = useState('Facebook');
    const [budget, setBudget] = useState('');
    
    const fetchCampaigns = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
        if (data) setCampaigns(data);
        if (error) console.error("Error fetching campaigns:", error);
        setLoading(false);
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleAddCampaign = async () => {
        if (!name || !budget) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('marketing_campaigns').insert({
            campaign_name: name,
            platform,
            budget: parseFloat(budget),
            created_by: user?.id
        });
        
        if (error) {
            alert(`Error adding campaign: ${error.message}`);
        } else {
            setName('');
            setPlatform('Facebook');
            setBudget('');
            setIsAdding(false);
            fetchCampaigns();
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('marketing_campaigns').update({ status: newStatus }).eq('id', id);
        if (error) alert(`Error updating status: ${error.message}`);
        else fetchCampaigns();
    };

    const updateMetrics = async (id: string, newSpend: number, newLeads: number) => {
        const { error } = await supabase.from('marketing_campaigns').update({ spend: newSpend, leads_generated: newLeads }).eq('id', id);
        if (error) alert(`Error updating metrics: ${error.message}`);
        else fetchCampaigns();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.2)' };
            case 'Paused': return { bg: 'rgba(234,179,8,0.1)', color: '#facc15', border: 'rgba(234,179,8,0.2)' };
            case 'Completed': return { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: 'rgba(96,165,250,0.2)' };
            default: return { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
        }
    };

    const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.spend || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + Number(c.leads_generated || 0), 0);
    const avgCpl = totalLeads > 0 ? (totalSpend / totalLeads) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Top Level Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.8rem', borderRadius: '12px' }}>
                        <DollarSign size={24} color="#10b981" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Spend</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>${totalSpend.toFixed(2)}</div>
                    </div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(59,130,246,0.1)', padding: '0.8rem', borderRadius: '12px' }}>
                        <TrendingUp size={24} color="#3b82f6" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Leads</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{totalLeads}</div>
                    </div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(139,92,246,0.1)', padding: '0.8rem', borderRadius: '12px' }}>
                        <Activity size={24} color="#8b5cf6" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Cost Per Lead</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>${avgCpl.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} color="#f43f5e" /> Active Campaigns
                    </h2>
                    <button onClick={() => setIsAdding(!isAdding)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                        <Plus size={16} /> New Campaign
                    </button>
                </div>

                {isAdding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <input type="text" placeholder="Campaign Name *" value={name} onChange={e => setName(e.target.value)} style={{ flex: 2, minWidth: '200px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                            <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                                <option value="Facebook">Facebook Ads</option>
                                <option value="Google">Google Ads</option>
                                <option value="Email">Email Blast</option>
                                <option value="Event">Event/Conference</option>
                            </select>
                            <input type="number" placeholder="Budget ($) *" value={budget} onChange={e => setBudget(e.target.value)} style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'white' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleAddCampaign} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Campaign</button>
                        </div>
                    </motion.div>
                )}

                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <Loader2 size={24} className="spin" color="#64748b" style={{ margin: '0 auto' }} />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                        No campaigns found. Time to run some ads!
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', padding: '0.75rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            <div>Campaign</div>
                            <div>Platform</div>
                            <div>Budget / Spend</div>
                            <div>Leads</div>
                            <div>CPL</div>
                            <div>Status</div>
                        </div>
                        {campaigns.map((camp) => {
                            const style = getStatusColor(camp.status);
                            const cpl = camp.leads_generated > 0 ? (Number(camp.spend) / Number(camp.leads_generated)) : 0;
                            
                            return (
                                <div key={camp.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>{camp.campaign_name}</div>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{camp.platform}</div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>${Number(camp.budget).toFixed(2)} /</div>
                                        <input 
                                            type="number" 
                                            defaultValue={camp.spend}
                                            onBlur={(e) => updateMetrics(camp.id, parseFloat(e.target.value) || 0, camp.leads_generated)}
                                            style={{ width: '60px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#10b981', padding: '2px 4px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }} 
                                        />
                                    </div>
                                    <div>
                                        <input 
                                            type="number" 
                                            defaultValue={camp.leads_generated}
                                            onBlur={(e) => updateMetrics(camp.id, camp.spend, parseInt(e.target.value) || 0)}
                                            style={{ width: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '2px 4px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }} 
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: cpl > 50 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                                        ${cpl.toFixed(2)}
                                    </div>
                                    <div>
                                        <select 
                                            value={camp.status}
                                            onChange={(e) => updateStatus(camp.id, e.target.value)}
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
                                            <option value="Active" style={{ background: '#0f172a' }}>Active</option>
                                            <option value="Paused" style={{ background: '#0f172a' }}>Paused</option>
                                            <option value="Completed" style={{ background: '#0f172a' }}>Completed</option>
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
