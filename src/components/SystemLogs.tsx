import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Calendar, User, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemLog {
    id: string;
    user_id: string;
    action_type: string;
    description: string;
    created_at: string;
}

export default function SystemLogs() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    const fetchLogs = async () => {
        setLoading(true);
        const { data: lData, error: lErr } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(500);
        if (!lErr && lData) setLogs(lData);
        
        const { data: pData, error: pErr } = await supabase.from('profiles').select('id, full_name, email');
        if (!pErr && pData) setProfiles(pData);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getUserName = (id: string) => {
        if (!id) return 'System / Unknown';
        const p = profiles.find(pr => pr.id === id);
        return p?.full_name || p?.email || id;
    };

    const actionTypes = Array.from(new Set(logs.map(l => l.action_type)));

    const filteredLogs = logs.filter(l => {
        const matchesSearch = l.description.toLowerCase().includes(search.toLowerCase()) || 
                              getUserName(l.user_id).toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'ALL' || l.action_type === filterType;
        return matchesSearch && matchesType;
    });

    const getActionColor = (type: string) => {
        if (type.includes('DELETE') || type.includes('REVOKE')) return '#ef4444'; // Red
        if (type.includes('GRANT') || type.includes('APPROVE') || type.includes('NEW')) return '#10b981'; // Green
        if (type.includes('UPDATE')) return '#f59e0b'; // Orange
        return '#3b82f6'; // Blue
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Loading Audit Logs...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={24} color="#3b82f6" /> System Audit Logs
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        Track all major actions, permission changes, and data modifications across the Admin Portal.
                    </p>
                </div>
                <button 
                    onClick={fetchLogs}
                    style={{
                        padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, fontSize: '0.8rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <RefreshCw size={14} /> Refresh Logs
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                    <Search size={16} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text" 
                        placeholder="Search logs by action or user..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                            color: 'white', fontFamily: 'inherit', fontSize: '0.875rem'
                        }}
                    />
                </div>
                <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    style={{
                        padding: '0.75rem 1rem', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                        color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer'
                    }}
                >
                    <option value="ALL">All Actions</option>
                    {actionTypes.map(type => (
                        <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Type</th>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                            No logs found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <motion.tr 
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            key={log.id} 
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                                        >
                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Calendar size={14} />
                                                    {new Date(log.created_at).toLocaleString()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <User size={14} color="#64748b" />
                                                    {getUserName(log.user_id)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{ 
                                                    background: `${getActionColor(log.action_type)}15`,
                                                    color: getActionColor(log.action_type), 
                                                    padding: '0.25rem 0.75rem', 
                                                    borderRadius: '9999px', 
                                                    fontSize: '0.7rem', 
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {log.action_type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#cbd5e1', fontSize: '0.875rem' }}>
                                                {log.description}
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
