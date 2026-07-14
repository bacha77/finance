import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, Crown, Search, Edit2, Save, X, Activity } from 'lucide-react';

interface StaffDirectoryProps {
    profiles: any[];
    admins: any[];
    churches: any[];
    loading: boolean;
    onRefresh: () => void;
}

export default function StaffDirectory({ profiles, admins, churches, loading, onRefresh }: StaffDirectoryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editJobTitle, setEditJobTitle] = useState('');
    const [editPhone, setEditPhone] = useState('');

    const staffProfiles = useMemo(() => {
        const staffIds = Array.from(new Set(admins.map(a => a.user_id)));
        return staffIds.map(id => {
            const profile = profiles.find(p => p.id === id) || { id, email: 'Unknown', full_name: 'Unknown', job_title: '', phone: '', created_at: '' };
            const userRoles = admins.filter(a => a.user_id === id).map(a => a.role);
            const clients = churches.filter(c => c.assigned_to === id);
            
            // Basic performance mock based on data
            const activeClients = clients.filter(c => c.plan !== 'trial');
            const totalCommission = activeClients.length > 0 ? (activeClients.length * 40) : 0;

            return { ...profile, userRoles, clients, activeClients, totalCommission };
        }).filter(p => {
            if (filterRole !== 'all' && !p.userRoles.includes(filterRole)) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (p.full_name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term) || p.job_title?.toLowerCase().includes(term));
            }
            return true;
        });
    }, [profiles, admins, churches, filterRole, searchTerm]);

    const handleSaveProfile = async (id: string) => {
        const { error } = await supabase.from('profiles').update({
            job_title: editJobTitle,
            phone: editPhone
        }).eq('id', id);

        if (error) {
            alert(`Error updating profile: ${error.message}`);
        } else {
            setEditingId(null);
            onRefresh();
        }
    };

    const handleRevokeAdmin = async (id: string) => {
        if (!confirm('Are you sure you want to revoke ALL access for this staff member?')) return;
        const { error } = await supabase.from('admins').delete().eq('user_id', id);
        if (error) alert(`Error revoking access: ${error.message}`);
        else onRefresh();
    };

    const fmt = (num: number) => `$${num.toFixed(2)}`;

    return (
        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>Current Staff Directory</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text" 
                                placeholder="Search staff..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem', width: '200px' }}
                            />
                        </div>
                        <select 
                            value={filterRole} 
                            onChange={e => setFilterRole(e.target.value)}
                            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                            <option value="all">All Departments</option>
                            <option value="sales">Sales</option>
                            <option value="marketing">Marketing</option>
                            <option value="support">Support</option>
                            <option value="super_admin">Super Admin</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 120px', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                {['User', 'Dept & Role', 'Clients', 'Commissions', 'Status', 'Actions'].map(h => (
                    <div key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#334155' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                        <Loader2 size={24} />
                    </motion.div>
                </div>
            ) : staffProfiles.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    No staff members found matching criteria.
                </div>
            ) : staffProfiles.map((profile, i) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={profile.id} 
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 120px', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', gap: '1rem' }}
                >
                    <div>
                        <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {profile.full_name || 'No Name Set'}
                            {editingId === profile.id ? null : (
                                <button onClick={() => {
                                    setEditJobTitle(profile.job_title || '');
                                    setEditPhone(profile.phone || '');
                                    setEditingId(profile.id);
                                }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '2px' }}>{profile.email}</div>
                        
                        {editingId === profile.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <input type="text" placeholder="Phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #334155', background: 'rgba(0,0,0,0.3)', color: 'white', width: '100px' }} />
                            </div>
                        ) : (
                            profile.phone && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{profile.phone}</div>
                        )}
                    </div>

                    <div>
                        {editingId === profile.id ? (
                            <input type="text" placeholder="Job Title" value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #334155', background: 'rgba(0,0,0,0.3)', color: 'white', width: '100%' }} />
                        ) : (
                            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>{profile.job_title || 'Staff Member'}</div>
                        )}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {profile.userRoles.map((r: string) => (
                                <span key={r} style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {r === 'super_admin' && <Crown size={9} color="#60a5fa" />} 
                                    {r.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>
                        {profile.activeClients.length} <span style={{ color: '#64748b', fontWeight: 400 }}>active</span>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>
                        {fmt(profile.totalCommission)}
                    </div>
                    
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                            <Activity size={10} /> Online
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                            Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {editingId === profile.id ? (
                            <>
                                <button onClick={() => handleSaveProfile(profile.id)} style={{ background: 'rgba(34,197,94,0.2)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#4ade80' }} title="Save">
                                    <Save size={14} />
                                </button>
                                <button onClick={() => setEditingId(null)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#ef4444' }} title="Cancel">
                                    <X size={14} />
                                </button>
                            </>
                        ) : (
                            <button onClick={() => handleRevokeAdmin(profile.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '5px 10px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700 }} title="Revoke Admin Access">
                                <Crown size={12} /> Revoke
                            </button>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
