import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, FileText, Scale, UserCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'terms' | 'privacy';
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
    const { t } = useLanguage();
    
    if (!isOpen) return null;

    const sections = type === 'terms' ? [
        { title: t('legalTerms_title1'), icon: Scale, content: t('legalTerms_content1') },
        { title: t('legalTerms_title2'), icon: Lock, content: t('legalTerms_content2') },
        { title: t('legalTerms_title3'), icon: Shield, content: t('legalTerms_content3') },
        { title: t('legalTerms_title4'), icon: FileText, content: t('legalTerms_content4') }
    ] : [
        { title: t('legalPrivacy_title1'), icon: Shield, content: t('legalPrivacy_content1') },
        { title: t('legalPrivacy_title2'), icon: UserCheck, content: t('legalPrivacy_content2') },
        { title: t('legalPrivacy_title3'), icon: Lock, content: t('legalPrivacy_content3') },
        { title: t('legalPrivacy_title4'), icon: FileText, content: t('legalPrivacy_content4') }
    ];

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
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    style={{
                        width: '100%', maxWidth: '600px', maxHeight: '90vh',
                        background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '24px', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)',
                        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                                {type === 'terms' ? t('legalTermsTitle') : t('legalPrivacyTitle')}
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500, marginTop: '4px' }}>
                                {t('legalLastUpdated')}: {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <button onClick={onClose} style={{ padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {sections.map((section, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ 
                                    minWidth: '40px', height: '40px', borderRadius: '12px', 
                                    background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa'
                                }}>
                                    <section.icon size={20} />
                                </div>
                                <div>
                                    <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>{section.title}</h3>
                                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.75', fontWeight: 400, margin: 0 }}>{section.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', textAlign: 'right' }}>
                        <button 
                            onClick={onClose}
                            style={{ 
                                padding: '0.75rem 2rem', borderRadius: '12px', 
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                                color: 'white', border: 'none', fontWeight: 800, 
                                fontSize: '0.9rem', cursor: 'pointer',
                                boxShadow: '0 8px 16px -4px rgba(37,99,235,0.4)',
                            }}
                        >
                            {t('legalUnderstand')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LegalModal;
