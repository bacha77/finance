import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Mail, Book, X, Send, Sparkles } from 'lucide-react';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        // Simulate sending
        await new Promise(r => setTimeout(r, 1500));
        setSending(false);
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setMessage('');
            onClose();
        }, 2000);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)',
                    padding: '1.5rem',
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 30 }}
                    style={{
                        width: '100%', maxWidth: '480px', background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
                        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)',
                        position: 'relative', overflow: 'hidden'
                    }}
                >
                    {/* Visual Header Decoration */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #2563eb, #8b5cf6, #2563eb)' }} />
                    
                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa'
                            }}>
                                <HelpCircle size={28} />
                            </div>
                            <button onClick={onClose} style={{ padding: '8px', borderRadius: '10px', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                            Stewardship Support
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, lineHeight: '1.6', marginBottom: '2rem' }}>
                            Need assistance with your financial records or platform settings? Our support team is here to ensure your ministry remains synchronized.
                        </p>

                        {!success ? (
                            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                        How can we help?
                                    </label>
                                    <textarea 
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder="Describe the challenge or question you have..."
                                        required
                                        style={{
                                            width: '100%', minHeight: '120px', padding: '1rem',
                                            borderRadius: '12px', background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)', color: 'white',
                                            fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', resize: 'none'
                                        }}
                                        onFocus={e => (e.target.style.borderColor = '#2563eb')}
                                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending}
                                    style={{
                                        padding: '1rem', borderRadius: '12px', border: 'none',
                                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white',
                                        fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                        opacity: sending ? 0.7 : 1, transition: 'all 0.3s',
                                        boxShadow: '0 8px 20px -6px rgba(37,99,235,0.4)',
                                    }}
                                >
                                    {sending ? 'Sending...' : (
                                        <>
                                            Submit Request <Send size={18} />
                                        </>
                                    )}
                                </button>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                                        <Mail size={16} color="#60a5fa" style={{ marginBottom: '8px' }} />
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Email</div>
                                        <div style={{ fontSize: '0.8rem', color: 'white', marginTop: '4px' }}>support@churchhq.org</div>
                                    </div>
                                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                                        <Book size={16} color="#8b5cf6" style={{ marginBottom: '8px' }} />
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Guides</div>
                                        <div style={{ fontSize: '0.8rem', color: 'white', marginTop: '4px' }}>Knowledge Base</div>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ textAlign: 'center', padding: '2rem 0' }}
                            >
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 1.5rem', color: '#10b981'
                                }}>
                                    <Sparkles size={32} />
                                </div>
                                <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Request Received</h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Our stewards will review your request and get back to you within 24 hours.</p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SupportModal;
