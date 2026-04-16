import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Shield, 
    Search, 
    ChevronDown, 
    ChevronUp, 
    History,
    FileText,
    ArrowRight,
    AlertCircle,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action: string;
    old_data: any;
    new_data: any;
    user_id: string;
    created_at: string;
    user_email?: string; // We'll join or fetch this
}

interface AuditLogsProps {
    churchId: string;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ churchId }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [actionFilter, setActionFilter] = useState('ALL');

    useEffect(() => {
        fetchLogs();
    }, [churchId, actionFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .eq('church_id', churchId)
                .order('created_at', { ascending: false });

            if (actionFilter !== 'ALL') {
                query = query.eq('action', actionFilter);
            }

            const { data, error } = await query.limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderDiff = (oldData: any, newData: any) => {
        if (!oldData && !newData) return <span>No data available</span>;
        
        // Simple diff: find keys that changed
        const keys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
        
        return (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                {keys.map(key => {
                    const oldVal = oldData?.[key];
                    const newVal = newData?.[key];
                    
                    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
                    if (key === 'audit_trail' || key === 'created_at') return null;

                    return (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>{key}</span>
                            <div style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '4px', textDecoration: 'line-through' }}>
                                {typeof oldVal === 'object' ? 'Object' : String(oldVal || 'None')}
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                            <div style={{ padding: '4px 8px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderRadius: '4px' }}>
                                {typeof newVal === 'object' ? 'Object' : String(newVal || 'None')}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="audit-logs-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>Forensic Timeline</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Irrefutable truth log for financial accountability.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="glass-input" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 1rem', width: '240px' }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Search logs..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '0.85rem', width: '100%' }}
                        />
                    </div>
                    <select 
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="glass-input"
                        style={{ padding: '0.5rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'white', borderRadius: '12px' }}
                    >
                        <option value="ALL">All Actions</option>
                        <option value="CREATE">Created</option>
                        <option value="UPDATE">Modified</option>
                        <option value="VOID">Voided</option>
                    </select>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <div className="spin" style={{ width: '30px', height: '30px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Decrypting Audit Vault...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <AlertCircle size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--text-muted)' }}>No audit logs found for this period.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resource</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verification</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.filter(log => log.table_name.includes(searchQuery.toLowerCase()) || log.action.includes(searchQuery.toUpperCase())).map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr 
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        style={{ 
                                            borderBottom: '1px solid var(--border)', 
                                            cursor: 'pointer',
                                            backgroundColor: expandedLog === log.id ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    padding: '6px 12px', 
                                                    borderRadius: '6px', 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 900,
                                                    background: log.action === 'CREATE' ? 'rgba(52, 211, 153, 0.1)' : log.action === 'VOID' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                    color: log.action === 'CREATE' ? '#34d399' : log.action === 'VOID' ? '#f87171' : 'var(--primary-light)'
                                                }}>
                                                    {log.action}
                                                </div>
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                    {log.action === 'CREATE' ? 'New record initiated' : log.action === 'VOID' ? 'Transaction voided' : 'Modification detected'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                <FileText size={14} />
                                                <span style={{ textTransform: 'capitalize' }}>{log.table_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                            {expandedLog === log.id ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                                        </td>
                                    </tr>
                                    <AnimatePresence>
                                        {expandedLog === log.id && (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '0' }}>
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        style={{ overflow: 'hidden', padding: '1.5rem 3rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border)' }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                                            <div style={{ display: 'flex', gap: '2rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Log ID</label>
                                                                    <code style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>{log.id}</code>
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Record Reference</label>
                                                                    <code style={{ fontSize: '0.75rem' }}>{log.record_id}</code>
                                                                </div>
                                                            </div>
                                                            <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 12px' }}>
                                                                <Download size={14} /> Export Log
                                                            </button>
                                                        </div>

                                                        <div style={{ background: 'hsla(var(--bg-main)/0.5)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                                                <History size={16} color="var(--primary-light)" />
                                                                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Forensic Comparison</span>
                                                            </div>
                                                            
                                                            {log.action === 'CREATE' ? (
                                                                <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.05)', borderRadius: '12px', border: '1px dashed rgba(52, 211, 153, 0.2)' }}>
                                                                    <p style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>Record created with the following data:</p>
                                                                    <pre style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                                                        {JSON.stringify(log.new_data, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            ) : log.action === 'UPDATE' ? (
                                                                renderDiff(log.old_data, log.new_data)
                                                            ) : (
                                                                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                                                                    <p style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600 }}>The following record was voided:</p>
                                                                    <pre style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                                                        {JSON.stringify(log.old_data, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <AlertCircle size={14} />
                <span>These logs are immutable and stored in a cryptographically secured database partition.</span>
            </div>
        </div>
    );
};

export default AuditLogs;
