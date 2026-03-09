import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Lock, LogIn, UserPlus, Eye, EyeOff, ChevronRight,
    ChevronLeft, Church, Phone, User, Globe, CheckCircle2,
    RefreshCw, AlertCircle, Shield
} from 'lucide-react';

// ── Password strength ────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' };
    if (score <= 3) return { score, label: 'Good', color: '#3b82f6' };
    return { score, label: 'Strong', color: '#10b981' };
}

// ── Input field ──────────────────────────────────────────────────────────────
const Field: React.FC<{
    label: string; placeholder: string; type?: string;
    value: string; onChange: (v: string) => void;
    icon: React.ElementType; required?: boolean;
    rightEl?: React.ReactNode;
}> = ({ label, placeholder, type = 'text', value, onChange, icon: Icon, required, rightEl }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {label}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
        </label>
        <div style={{ position: 'relative' }}>
            <Icon size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                style={{
                    width: '100%', padding: '0.7rem 2.75rem 0.7rem 2.5rem',
                    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: 'white',
                    fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(37,99,235,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            {rightEl && (
                <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}>
                    {rightEl}
                </div>
            )}
        </div>
    </div>
);

// ── Step indicator ────────────────────────────────────────────────────────────
const StepDots: React.FC<{ total: number; current: number }> = ({ total, current }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '1.5rem' }}>
        {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
                width: i === current ? '20px' : '6px', height: '6px', borderRadius: '3px',
                background: i === current ? '#2563eb' : i < current ? '#10b981' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s',
            }} />
        ))}
    </div>
);

// ── Email Confirmed Screen ────────────────────────────────────────────────────
const EmailVerifyScreen: React.FC<{ email: string; onResend: () => Promise<void> }> = ({ email, onResend }) => {
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    const handleResend = async () => {
        setResending(true);
        await onResend();
        setResending(false);
        setResent(true);
        setTimeout(() => setResent(false), 5000);
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(37,99,235,0.12)', border: '2px solid rgba(37,99,235,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                }}
            >
                <Mail size={32} color="#60a5fa" />
            </motion.div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
                Check Your Inbox!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                We sent a confirmation link to:
            </p>
            <div style={{
                display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '8px',
                background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                fontSize: '0.875rem', fontWeight: 700, color: '#60a5fa', marginBottom: '1.5rem',
            }}>
                {email}
            </div>

            <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left',
            }}>
                {[
                    'Open the confirmation email from Storehouse Finance',
                    'Click the "Confirm your email" button inside',
                    'You will be automatically logged in',
                ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: i < 2 ? '0.75rem' : 0 }}>
                        <div style={{
                            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 800, color: '#60a5fa',
                        }}>{i + 1}</div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{step}</span>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {resent && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem' }}>
                        <CheckCircle2 size={15} /> Email resent successfully!
                    </motion.div>
                )}
            </AnimatePresence>

            <button onClick={handleResend} disabled={resending}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
                    fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center',
                    gap: '5px', margin: '0 auto', fontFamily: 'inherit',
                    opacity: resending ? 0.6 : 1,
                }}>
                <RefreshCw size={13} style={resending ? { animation: 'spin 1s linear infinite' } : {}} />
                {resending ? 'Resending...' : "Didn't receive it? Resend email"}
            </button>

            <p style={{ color: '#1e293b', fontSize: '0.72rem', marginTop: '1.5rem' }}>
                Check your spam folder · Link expires in 24 hours
            </p>
        </motion.div>
    );
};

// ── Main Auth Component ───────────────────────────────────────────────────────
const Auth: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'signup' | 'verified'>('login');
    const [step, setStep] = useState(0); // sign-up step: 0=account, 1=church info

    // Account fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    // Church info fields
    const [churchName, setChurchName] = useState('');
    const [pastorName, setPastorName] = useState('');
    const [phone, setPhone] = useState('');
    const [denomination, setDenomination] = useState('');
    const [country, setCountry] = useState('');

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signedUpEmail, setSignedUpEmail] = useState('');

    const pwStrength = getStrength(password);

    const reset = () => {
        setStep(0); setError(null);
        setEmail(''); setPassword(''); setConfirmPassword('');
        setChurchName(''); setPastorName(''); setPhone(''); setDenomination(''); setCountry('');
    };

    // ── Login ────────────────────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    setError('Please confirm your email before signing in. Check your inbox.');
                } else if (error.message.includes('Invalid login')) {
                    setError('Incorrect email or password. Please try again.');
                } else {
                    throw error;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Sign in failed. Please try again.');
        } finally { setLoading(false); }
    };

    // ── Sign-up Step 0 → validate & advance ─────────────────────────────────
    const handleStep0 = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setStep(1);
    };

    // ── Sign-up Step 1 → create account ─────────────────────────────────────
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!churchName.trim() || !pastorName.trim()) {
            setError('Church name and pastor name are required.');
            return;
        }
        setLoading(true); setError(null);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        church_name: churchName.trim(),
                        pastor_name: pastorName.trim(),
                        phone: phone.trim(),
                        denomination: denomination.trim(),
                        country: country.trim(),
                        full_name: pastorName.trim(),
                    },
                    emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
                },
            });
            if (error) throw error;
            setSignedUpEmail(email);
            setMode('verified');
        } catch (err: any) {
            if (err.message?.includes('already registered')) {
                setError('An account with this email already exists. Please sign in instead.');
            } else {
                setError(err.message || 'Sign up failed. Please try again.');
            }
        } finally { setLoading(false); }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true); setError(null);
        const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
        if (error) { setError(error.message); setGoogleLoading(false); }
    };

    const handleResendEmail = async () => {
        await supabase.auth.resend({ type: 'signup', email: signedUpEmail });
    };

    // ── Layout shell ─────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#020617', padding: '1.5rem', position: 'relative', overflowY: 'auto',
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
        }}>
            {/* Background glows */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 60% 40% at 80% 60%, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                    width: '100%', maxWidth: mode === 'signup' && step === 1 ? '480px' : '420px',
                    position: 'relative', zIndex: 1,
                    background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
                    padding: '2rem',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                    transition: 'max-width 0.3s ease',
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <img
                        src={`${import.meta.env.BASE_URL}logo.png`}
                        alt="Storehouse Finance"
                        style={{ height: '52px', width: 'auto', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 16px rgba(37,99,235,0.4))' }}
                    />
                    <p style={{ color: '#475569', fontSize: '0.82rem' }}>
                        {mode === 'login' ? 'Welcome back — sign in to your church account' :
                         mode === 'verified' ? 'Almost there!' :
                         step === 0 ? 'Create your church account' : 'Tell us about your church'}
                    </p>
                </div>

                <AnimatePresence mode="wait">

                    {/* ── EMAIL VERIFIED SCREEN ── */}
                    {mode === 'verified' && (
                        <motion.div key="verified" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <EmailVerifyScreen email={signedUpEmail} onResend={handleResendEmail} />
                            <button onClick={() => { setMode('login'); reset(); }}
                                style={{
                                    marginTop: '1.5rem', width: '100%', padding: '0.7rem',
                                    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)',
                                    background: 'rgba(255,255,255,0.04)', color: '#64748b',
                                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                }}>
                                ← Back to Sign In
                            </button>
                        </motion.div>
                    )}

                    {/* ── LOGIN ── */}
                    {mode === 'login' && (
                        <motion.div key="login" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                            {/* Google */}
                            <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || loading}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.75rem', padding: '0.8rem', borderRadius: '12px',
                                    background: 'white', border: 'none', cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a',
                                    marginBottom: '1.25rem', opacity: googleLoading ? 0.7 : 1,
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)', transition: 'opacity 0.2s',
                                }}>
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                <span style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 700 }}>OR</span>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                            </div>

                            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <Field label="Email Address" placeholder="pastor@mychurch.org" type="email"
                                    value={email} onChange={setEmail} icon={Mail} required />
                                <Field label="Password" placeholder="••••••••" type={showPw ? 'text' : 'password'}
                                    value={password} onChange={setPassword} icon={Lock} required
                                    rightEl={
                                        <button type="button" onClick={() => setShowPw(p => !p)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}>
                                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    } />

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>{error}</span>
                                    </motion.div>
                                )}

                                <button type="submit" disabled={loading || googleLoading}
                                    style={{
                                        width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
                                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white',
                                        fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        opacity: loading ? 0.7 : 1, marginTop: '0.25rem',
                                    }}>
                                    <LogIn size={16} />
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>

                            <button type="button" onClick={() => { setMode('signup'); reset(); setError(null); }}
                                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', marginTop: '1.25rem', fontWeight: 600, width: '100%', textAlign: 'center', fontFamily: 'inherit' }}>
                                Don't have an account? <span style={{ color: '#60a5fa' }}>Create one free →</span>
                            </button>
                        </motion.div>
                    )}

                    {/* ── SIGN UP STEP 0: Account credentials ── */}
                    {mode === 'signup' && step === 0 && (
                        <motion.div key="signup-0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                            <StepDots total={2} current={0} />

                            {/* Google */}
                            <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || loading}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.75rem', padding: '0.8rem', borderRadius: '12px',
                                    background: 'white', border: 'none', cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a',
                                    marginBottom: '1.25rem', opacity: googleLoading ? 0.7 : 1,
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                                }}>
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {googleLoading ? 'Redirecting...' : 'Sign up with Google'}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                <span style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 700 }}>OR WITH EMAIL</span>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                            </div>

                            <form onSubmit={handleStep0} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <Field label="Email Address" placeholder="pastor@mychurch.org" type="email"
                                    value={email} onChange={setEmail} icon={Mail} required />

                                <div>
                                    <Field label="Password" placeholder="Min. 8 characters" type={showPw ? 'text' : 'password'}
                                        value={password} onChange={setPassword} icon={Lock} required
                                        rightEl={
                                            <button type="button" onClick={() => setShowPw(p => !p)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}>
                                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        } />
                                    {/* Strength bar */}
                                    {password.length > 0 && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} style={{
                                                        flex: 1, height: '3px', borderRadius: '2px',
                                                        background: i <= pwStrength.score ? pwStrength.color : 'rgba(255,255,255,0.08)',
                                                        transition: 'background 0.3s',
                                                    }} />
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.67rem', color: pwStrength.color, fontWeight: 700 }}>
                                                {pwStrength.label} password
                                                {pwStrength.score < 3 && <span style={{ color: '#334155', fontWeight: 400 }}> — Add uppercase, numbers or symbols</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Field label="Confirm Password" placeholder="Re-enter password" type={showConfirmPw ? 'text' : 'password'}
                                    value={confirmPassword} onChange={setConfirmPassword} icon={Shield} required
                                    rightEl={
                                        <button type="button" onClick={() => setShowConfirmPw(p => !p)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}>
                                            {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    } />

                                {confirmPassword.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', marginTop: '-0.5rem' }}>
                                        {password === confirmPassword
                                            ? <><CheckCircle2 size={12} color="#10b981" /><span style={{ color: '#10b981' }}>Passwords match</span></>
                                            : <><AlertCircle size={12} color="#ef4444" /><span style={{ color: '#ef4444' }}>Passwords do not match</span></>}
                                    </div>
                                )}

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>{error}</span>
                                    </motion.div>
                                )}

                                <button type="submit" disabled={loading}
                                    style={{
                                        width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
                                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white',
                                        fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        marginTop: '0.25rem',
                                    }}>
                                    Next — Church Info <ChevronRight size={16} />
                                </button>
                            </form>

                            <button type="button" onClick={() => { setMode('login'); reset(); setError(null); }}
                                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', marginTop: '1.25rem', fontWeight: 600, width: '100%', textAlign: 'center', fontFamily: 'inherit' }}>
                                Already have an account? <span style={{ color: '#60a5fa' }}>Sign in →</span>
                            </button>
                        </motion.div>
                    )}

                    {/* ── SIGN UP STEP 1: Church information ── */}
                    {mode === 'signup' && step === 1 && (
                        <motion.div key="signup-1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                            <StepDots total={2} current={1} />

                            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <Field label="Church Name" placeholder="Grace Community Church" type="text"
                                            value={churchName} onChange={setChurchName} icon={Church} required />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <Field label="Senior Pastor / Leader Name" placeholder="Pastor John Smith" type="text"
                                            value={pastorName} onChange={setPastorName} icon={User} required />
                                    </div>
                                    <Field label="Phone Number" placeholder="+1 (555) 000-0000" type="tel"
                                        value={phone} onChange={setPhone} icon={Phone} />
                                    <Field label="Country" placeholder="United States" type="text"
                                        value={country} onChange={setCountry} icon={Globe} />
                                </div>

                                {/* Denomination selector */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                        Denomination / Type
                                    </label>
                                    <select
                                        value={denomination}
                                        onChange={e => setDenomination(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.7rem 0.875rem', borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                                            color: denomination ? 'white' : '#475569', fontSize: '0.875rem',
                                            fontFamily: 'inherit', outline: 'none', colorScheme: 'dark',
                                        }}
                                    >
                                        <option value="" style={{ background: '#0f172a' }}>Select denomination...</option>
                                        {['Baptist', 'Methodist', 'Pentecostal', 'Non-denominational', 'Catholic', 'Anglican / Episcopal',
                                          'Lutheran', 'Presbyterian', 'Adventist', 'Church of Christ', 'AME / Black Church', 'Other'].map(d => (
                                            <option key={d} value={d} style={{ background: '#0f172a' }}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Terms */}
                                <div style={{
                                    padding: '0.85rem', borderRadius: '10px',
                                    background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
                                    fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5,
                                }}>
                                    By creating an account you agree to our{' '}
                                    <a href="#" style={{ color: '#60a5fa' }}>Terms of Service</a> and{' '}
                                    <a href="#" style={{ color: '#60a5fa' }}>Privacy Policy</a>.
                                    A confirmation email will be sent to <strong style={{ color: '#94a3b8' }}>{email}</strong>.
                                </div>

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>{error}</span>
                                    </motion.div>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                    <button type="button" onClick={() => { setStep(0); setError(null); }}
                                        style={{
                                            padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'rgba(255,255,255,0.04)', color: '#64748b',
                                            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
                                            fontWeight: 700, fontSize: '0.85rem',
                                        }}>
                                        <ChevronLeft size={15} /> Back
                                    </button>
                                    <button type="submit" disabled={loading}
                                        style={{
                                            flex: 1, padding: '0.85rem', borderRadius: '10px', border: 'none',
                                            background: loading ? '#1e3a8a' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                            color: 'white', fontWeight: 800, fontSize: '0.9rem',
                                            cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        }}>
                                        <UserPlus size={16} />
                                        {loading ? 'Creating account...' : 'Create Account'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default Auth;
