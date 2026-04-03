import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface UpdatePasswordProps {
    onComplete: () => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onComplete }) => {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#020617', padding: '1.5rem', position: 'relative', overflow: 'hidden',
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
        }}>
            {/* Ambient Background Elements */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />
            
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1,
                    background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
                    padding: '2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                }}
            >
                {/* Visual Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '18px',
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(37,99,235,0.1))',
                        border: '1px solid rgba(37,99,235,0.3)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                        boxShadow: '0 8px 16px rgba(37,99,235,0.2)',
                    }}>
                        <ShieldCheck size={32} color="#60a5fa" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        {t('secureYourAccount') || 'Secure Your Account'}
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                        {t('enterNewPasswordDesc') || 'Please enter a strong new password to regain access to your dashboard.'}
                    </p>
                </div>

                {!success ? (
                    <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {t('newPassword') || 'New Password'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%', padding: '0.875rem 3rem 0.875rem 2.75rem',
                                        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.04)', color: 'white',
                                        fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {t('confirmNewPassword') || 'Confirm Password'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Sparkles size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem',
                                        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.04)', color: 'white',
                                        fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.875rem', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <AlertCircle size={16} color="#ef4444" />
                                <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</span>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white',
                                fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                opacity: loading ? 0.7 : 1, marginTop: '0.5rem',
                                boxShadow: '0 10px 20px -5px rgba(37,99,235,0.4)',
                            }}
                        >
                            {loading ? (t('updating') || 'Updating...') : (
                                <>
                                    {t('savePassword') || 'Save Password'} <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ textAlign: 'center', padding: '1rem 0' }}
                    >
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem', color: '#10b981'
                        }}>
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                            {t('passwordSuccess') || 'Password Updated!'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                            {t('redirectingToDashboard') || 'Your security credentials have been synchronized. Redirecting you to the sanctuary dashboard...'}
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default UpdatePassword;
