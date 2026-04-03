import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent_accepted');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent_accepted', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                style={{
                    position: 'fixed', bottom: '2rem', left: '2rem', right: '2rem',
                    maxWidth: '100%', width: 'fit-content', margin: '0 auto',
                    zIndex: 99999, pointerEvents: 'auto'
                }}
            >
                <div style={{
                    background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
                    padding: '1.25rem 1.5rem', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', gap: '1.5rem',
                    flexWrap: 'wrap', justifyContent: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa'
                        }}>
                            <ShieldCheck size={18} />
                        </div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                            We use essential cookies to synchronize your sanctuary records and maintain your secure session.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button 
                            onClick={handleAccept}
                            style={{
                                padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                                color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                transition: 'all 0.2s', boxShadow: '0 4px 12px -2px rgba(37,99,235,0.4)',
                                whiteSpace: 'nowrap'
                            }}
                            onFocus={e => (e.target.style.transform = 'translateY(-1px)')}
                            onBlur={e => (e.target.style.transform = 'translateY(0)')}
                        >
                            Accept & Synchronize
                        </button>
                        <button 
                            onClick={() => setIsVisible(false)}
                            style={{ 
                                padding: '8px', borderRadius: '8px', background: 'none', border: 'none', 
                                color: '#475569', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CookieConsent;
