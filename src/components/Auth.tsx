import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import LegalModal from './LegalModals';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Lock, LogIn, UserPlus, Eye, EyeOff, ChevronRight,
    ChevronLeft, Church, Phone, User, Globe, CheckCircle2,
    RefreshCw, AlertCircle, Shield, DollarSign, Github, ShieldCheck, MapPin
} from 'lucide-react';

function getStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak', color: 'text-red-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'text-amber-500' };
    if (score <= 3) return { score, label: 'Good', color: 'text-blue-500' };
    return { score, label: 'Strong', color: 'text-emerald-500' };
}

const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

function getStrengthBg(pw: string): { score: number; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, color: 'bg-red-500' };
    if (score <= 2) return { score, color: 'bg-amber-500' };
    if (score <= 3) return { score, color: 'bg-blue-500' };
    return { score, color: 'bg-emerald-500' };
}

const Field: React.FC<{
    label: string; placeholder: string; type?: string;
    value: string; onChange: (v: string) => void;
    icon: React.ElementType; required?: boolean;
    rightEl?: React.ReactNode;
}> = ({ label, placeholder, type = 'text', value, onChange, icon: Icon, required, rightEl }) => (
    <div className="flex flex-col" style={{ gap: '8px', marginBottom: '8px' }}>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" style={{ marginBottom: '4px' }}>
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
            <Icon size={18} className="absolute text-slate-500 pointer-events-none" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-xl border border-white/10 bg-white/5 text-white outline-none transition-colors focus:border-blue-500/60"
                style={{ padding: '14px 16px', paddingLeft: '46px', fontSize: '15px' }}
            />
            {rightEl && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {rightEl}
                </div>
            )}
        </div>
    </div>
);

const StepDots: React.FC<{ total: number; current: number }> = ({ total, current }) => (
    <div className="flex justify-center gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-5 bg-blue-600' : i < current ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-white/10'
            }`} />
        ))}
    </div>
);

const EmailVerifyScreen: React.FC<{ email: string; onResend: () => Promise<void> }> = ({ email, onResend }) => {
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const { t } = useLanguage();

    const handleResend = async () => {
        setResending(true);
        await onResend();
        setResending(false);
        setResent(true);
        setTimeout(() => setResent(false), 5000);
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2">
            <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-blue-600/10 border-2 border-blue-600/30 flex items-center justify-center mx-auto mb-6"
            >
                <Mail size={32} className="text-blue-400" />
            </motion.div>

            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                {t('checkInbox')}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-2">
                {t('sentLinkTo')}
            </p>
            <div className="inline-block px-4 py-1.5 rounded-lg bg-blue-600/10 border border-blue-600/20 text-sm font-bold text-blue-400 mb-6">
                {email}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 text-left">
                {[
                    t('step1Verify'),
                    t('step2Verify'),
                    t('step3Verify'),
                ].map((step, i) => (
                    <div key={i} className={`flex items-start gap-3 ${i < 2 ? 'mb-3' : ''}`}>
                        <div className="w-5 h-5 rounded-full shrink-0 bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-[10px] font-black text-blue-400">
                            {i + 1}
                        </div>
                        <span className="text-xs text-slate-400 leading-relaxed">{step}</span>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {resent && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-1.5 text-emerald-500 text-xs font-semibold mb-4">
                        <CheckCircle2 size={15} /> {t('emailResent')}
                    </motion.div>
                )}
            </AnimatePresence>

            <button onClick={handleResend} disabled={resending}
                className={`mx-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-opacity hover:text-slate-300 ${resending ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}>
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? t('processing') : t('didntReceive')}
            </button>

            <p className="text-[11px] text-slate-600 mt-6">
                {t('checkSpam')}
            </p>
        </motion.div>
    );
};

interface AuthProps {
    onBypass?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onBypass }) => {
    const { language, setLanguage, t } = useLanguage();
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const [mode, setMode] = useState<'login' | 'signup' | 'verified' | 'reset'>('login');
    const [step, setStep] = useState(0);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [legalModal, setLegalModal] = useState<{ open: boolean, type: 'terms' | 'privacy' }>({ open: false, type: 'terms' });

    const [churchName, setChurchName] = useState('');
    const [pastorName, setPastorName] = useState('');
    const [phone, setPhone] = useState('');
    const [denomination, setDenomination] = useState('');
    const [country, setCountry] = useState('');
    const [address, setAddress] = useState('');

    const [treasurerName, setTreasurerName] = useState('');
    const [treasurerEmail, setTreasurerEmail] = useState('');
    const [treasurerPhone, setTreasurerPhone] = useState('');

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signedUpEmail, setSignedUpEmail] = useState('');

    const pwStrengthLabel = getStrength(password);
    const pwStrengthBg = getStrengthBg(password);

    const [isInvited, setIsInvited] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [role, setRole] = useState('');
    const [referralSource, setReferralSource] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let invitedEmail = params.get('email');
        
        if (!invitedEmail && window.location.hash.includes('?')) {
            const hashParts = window.location.hash.split('?');
            if (hashParts[1]) {
                const hashParams = new URLSearchParams(hashParts[1]);
                invitedEmail = hashParams.get('email');
            }
        }

        if (invitedEmail) {
            setEmail(invitedEmail);
            setMode('signup');
            setIsInvited(true);
            setStep(0);
        }
    }, []);

    const reset = () => {
        setStep(0); setError(null);
        setEmail(''); setPassword(''); setConfirmPassword('');
        setChurchName(''); setPastorName(''); setPhone(''); setDenomination(''); setCountry('');
        setRole(''); setReferralSource(''); setTermsAccepted(false); setAddress('');
        setTreasurerName(''); setTreasurerEmail(''); setTreasurerPhone('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(null);

        if (isLocal && email === 'admin@bias.com' && password === 'admin') {
            if (onBypass) {
                onBypass();
                setLoading(false);
                return;
            }
        }

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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.href.split('#')[0].split('?')[0],
            });
            if (error) throw error;
            setSignedUpEmail(email);
            setMode('verified');
        } catch (err: any) {
            setError(err.message || 'Reset failed. Please try again.');
        } finally { setLoading(false); }
    };

    const handleStep0 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        
        if (isInvited) {
            handleSignUp(e);
        } else {
            setStep(1);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isInvited && (!churchName.trim() || !pastorName.trim() || !phone.trim() || !address.trim() || !country.trim())) {
            setError('Please fill out all required church information (Name, Role, Phone, Country, Address).');
            return;
        }

        if (phone.trim() && phone.replace(/[^\d]/g, '').length !== 10) {
            setError('Please enter a valid 10-digit phone number for the church.');
            return;
        }

        if (treasurerPhone.trim() && treasurerPhone.replace(/[^\d]/g, '').length !== 10) {
            setError('Please enter a valid 10-digit phone number for the treasurer.');
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
                        role: role.trim(),
                        referral_source: referralSource.trim(),
                        phone: phone.trim(),
                        denomination: denomination.trim(),
                        country: country.trim(),
                        address: address.trim(),
                        full_name: pastorName.trim(),
                        treasurer_name: treasurerName.trim(),
                        treasurer_email: treasurerEmail.trim(),
                        treasurer_phone: treasurerPhone.trim(),
                    },
                    emailRedirectTo: window.location.href.split('#')[0].split('?')[0],
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
        const redirectTo = window.location.href.split('#')[0].split('?')[0];
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
        if (error) { setError(error.message); setGoogleLoading(false); }
    };

    const handleResendEmail = async () => {
        await supabase.auth.resend({ type: 'signup', email: signedUpEmail });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative font-['Plus_Jakarta_Sans',Inter,sans-serif]">
            {/* Background glows */}
            <div className="fixed inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(37,99,235,0.15) 0%, transparent 70%)' }}
            />
            <div className="fixed inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 40% at 80% 60%, rgba(124,58,237,0.08) 0%, transparent 70%)' }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full relative z-10 bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out max-h-[calc(100vh-2rem)] overflow-y-auto"
                style={{ 
                    padding: '40px', 
                    maxWidth: mode === 'signup' && step === 1 ? '600px' : '500px', 
                    margin: '0 auto' 
                }}
            >
                {/* 30-Day Free Trial Banner for Sign Up */}
                {mode === 'signup' && step === 0 && !isInvited && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full shadow-lg border border-white/10">
                        Start your 30-Day Free Trial
                    </div>
                )}

                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="flex justify-center items-center relative">
                        <img
                            src={`${import.meta.env.BASE_URL}logo.png`}
                            alt="Storehouse Finance"
                            className="drop-shadow-[0_0_16px_rgba(37,99,235,0.4)]"
                            style={{ height: '56px', width: 'auto', marginBottom: '16px' }}
                        />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2">
                            <button
                                onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                                className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-slate-400 text-[10px] font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                            >
                                {language === 'en' ? 'ES' : 'EN'}
                            </button>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm">
                        {mode === 'login' ? t('welcomeBack') :
                            mode === 'verified' ? (t('almostThere') || 'Almost there!') :
                                mode === 'reset' ? (t('resetPassword') || 'Reset Password') :
                                    step === 0 ? t('createAccount') : t('tellUsAboutChurch')}
                    </p>
                </div>

                <AnimatePresence mode="wait">

                    {/* VERIFIED SCREEN */}
                    {mode === 'verified' && (
                        <motion.div key="verified" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <EmailVerifyScreen email={signedUpEmail} onResend={handleResendEmail} />
                            <button onClick={() => { setMode('login'); reset(); }}
                                className="mt-6 w-full p-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-colors"
                            >
                                ← {t('backToSignIn') || 'Back to Sign In'}
                            </button>
                        </motion.div>
                    )}

                    {/* LOGIN */}
                    {mode === 'login' && (
                        <motion.div key="login" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                            {/* Social Logins */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || loading}
                                    className="flex items-center justify-center gap-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold shadow-sm transition-all hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed"
                                    style={{ padding: '14px', fontSize: '15px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Google
                                </button>
                                <button type="button" onClick={() => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })}
                                    className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-800 text-white font-bold shadow-sm transition-all hover:bg-slate-700"
                                    style={{ padding: '14px', fontSize: '15px' }}
                                >
                                    <Github size={16} />
                                    GitHub
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-5">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs font-bold text-slate-500 uppercase">{t('or')}</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <Field label={t('emailAddress')} placeholder="pastor@mychurch.org" type="email"
                                    value={email} onChange={setEmail} icon={Mail} required />
                                
                                <div className="flex flex-col">
                                    <Field label={t('password')} placeholder="••••••••" type={showPw ? 'text' : 'password'}
                                        value={password} onChange={setPassword} icon={Lock} required
                                        rightEl={
                                            <button type="button" onClick={() => setShowPw(p => !p)}
                                                className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        } />
                                    <div className="text-right mt-1">
                                        <button type="button" onClick={() => { setMode('reset'); setError(null); }}
                                            className="text-slate-400 hover:text-white text-xs font-semibold transition-colors">
                                            {t('forgotPassword') || 'Forgot password?'}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                        <span className="text-red-500 text-sm font-semibold">{error}</span>
                                    </motion.div>
                                )}

                                <button type="submit" disabled={loading || googleLoading}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black text-sm shadow-lg shadow-blue-900/20 hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
                                >
                                    <LogIn size={16} />
                                    {loading ? t('signingIn') : t('signIn')}
                                </button>
                            </form>

                            <button type="button" onClick={() => { setMode('signup'); reset(); setError(null); }}
                                className="w-full text-center mt-6 text-slate-400 text-sm font-semibold hover:text-slate-300 transition-colors">
                                {t('dontHaveAccount')} <span className="text-blue-400">{t('createOneFree')}</span>
                            </button>

                            <div className="mt-8 pt-5 border-t border-white/5 flex justify-center gap-6">
                                <button type="button" onClick={() => setLegalModal({ open: true, type: 'terms' })} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors">
                                    {t('termsOfService')}
                                </button>
                                <button type="button" onClick={() => setLegalModal({ open: true, type: 'privacy' })} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors">
                                    {t('privacyPolicy')}
                                </button>
                            </div>

                            {isLocal && (
                                <button
                                    type="button"
                                    onClick={onBypass}
                                    className="w-full mt-6 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-sm font-bold hover:bg-emerald-500/10 transition-colors"
                                >
                                    Bypass Login (Dev mode)
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* RESET PASSWORD */}
                    {mode === 'reset' && (
                        <motion.div key="reset" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}>
                            <h2 className="text-xl font-black text-white mb-2">{t('troubleSigningIn') || 'Trouble signing in?'}</h2>
                            <p className="text-sm text-slate-400 mb-8">{t('resetInstructions') || 'Enter your email and we will send you a link to reset your password.'}</p>

                            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                                <Field label={t('emailAddress')} placeholder="pastor@mychurch.org" type="email"
                                    value={email} onChange={setEmail} icon={Mail} required />

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                        <span className="text-red-500 text-sm font-semibold">{error}</span>
                                    </motion.div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="w-full rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black shadow-lg shadow-blue-900/20 hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                                    style={{ padding: '16px', fontSize: '15px' }}
                                >
                                    {loading ? (t('sending') || 'Sending...') : (t('sendResetLink') || 'Send Reset Link')}
                                </button>
                            </form>

                            <button type="button" onClick={() => { setMode('login'); reset(); setError(null); }}
                                className="w-full text-center mt-6 text-slate-400 text-sm font-semibold hover:text-slate-300 transition-colors"
                            >
                                ← {t('backToSignIn') || 'Back to Sign In'}
                            </button>
                        </motion.div>
                    )}

                    {/* SIGN UP STEP 0: Account credentials */}
                    {mode === 'signup' && step === 0 && (
                        <motion.div key="signup-0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                            {isInvited ? (
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                        <ShieldCheck size={32} className="text-emerald-500" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white mb-2">Welcome to the Team!</h2>
                                    <p className="text-sm text-slate-400">You've been invited to manage your church records. Choose a password to secure your account.</p>
                                </div>
                            ) : (
                                <StepDots total={2} current={0} />
                            )}

                            {!isInvited && (
                                <>
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || loading}
                                            className="flex items-center justify-center gap-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold shadow-sm transition-all hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed"
                                            style={{ padding: '14px', fontSize: '15px' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            Google
                                        </button>
                                        <button type="button" onClick={() => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })}
                                            className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-800 text-white font-bold shadow-sm transition-all hover:bg-slate-700"
                                            style={{ padding: '14px', fontSize: '15px' }}
                                        >
                                            <Github size={16} />
                                            GitHub
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span className="text-xs font-bold text-slate-500 uppercase">{t('orWithEmail')}</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>
                                </>
                            )}

                            <form onSubmit={handleStep0} className="flex flex-col gap-4">
                                <Field label={t('emailAddress')} placeholder="pastor@mychurch.org" type="email"
                                    value={email} onChange={setEmail} icon={Mail} required />

                                <div>
                                    <Field label={t('password')} placeholder="Min. 8 characters" type={showPw ? 'text' : 'password'}
                                        value={password} onChange={setPassword} icon={Lock} required
                                        rightEl={
                                            <button type="button" onClick={() => setShowPw(p => !p)}
                                                className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        } />
                                    
                                    {password.length > 0 && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors duration-300 ${i <= pwStrengthBg.score ? pwStrengthBg.color : 'bg-white/10'}`} />
                                                ))}
                                            </div>
                                            <div className={`text-[10px] font-bold ${pwStrengthLabel.color}`}>
                                                {pwStrengthLabel.label} password
                                                {pwStrengthBg.score < 3 && <span className="text-slate-500 font-normal"> — Add uppercase, numbers or symbols</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Field label={t('confirmPassword')} placeholder="Re-enter password" type={showConfirmPw ? 'text' : 'password'}
                                        value={confirmPassword} onChange={setConfirmPassword} icon={Shield} required
                                        rightEl={
                                            <button type="button" onClick={() => setShowConfirmPw(p => !p)}
                                                className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                                                {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        } />
                                    
                                    {confirmPassword.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs mt-2">
                                            {password === confirmPassword
                                                ? <><CheckCircle2 size={12} className="text-emerald-500" /><span className="text-emerald-500">{t('passwordsMatch')}</span></>
                                                : <><AlertCircle size={12} className="text-red-500" /><span className="text-red-500">{t('passwordsDoNotMatch')}</span></>}
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                        <span className="text-red-500 text-sm font-semibold">{error}</span>
                                    </motion.div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="w-full rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black shadow-lg shadow-blue-900/20 hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                                    style={{ padding: '16px', fontSize: '15px' }}
                                >
                                    {isInvited ? (loading ? t('processing') : 'Join Church Team') : t('nextChurchInfo')} <ChevronRight size={16} />
                                </button>
                            </form>

                            <button type="button" onClick={() => { setMode('login'); reset(); setError(null); }}
                                className="w-full text-center mt-6 text-slate-400 text-sm font-semibold hover:text-slate-300 transition-colors"
                            >
                                {t('alreadyHaveAccount')} <span className="text-blue-400">{t('signInLink')}</span>
                            </button>
                        </motion.div>
                    )}

                    {/* SIGN UP STEP 1: Church information */}
                    {mode === 'signup' && step === 1 && (
                        <motion.div key="signup-1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                            <StepDots total={2} current={1} />

                            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <Field label={t('churchNameLabel')} placeholder="Grace Community Church" type="text"
                                            value={churchName} onChange={setChurchName} icon={Church} required />
                                    </div>
                                    <div className="col-span-2 grid grid-cols-2 gap-3">
                                        <Field label="Your Name" placeholder="John Smith" type="text"
                                            value={pastorName} onChange={setPastorName} icon={User} required />
                                        <div className="flex flex-col" style={{ gap: '8px', marginBottom: '8px' }}>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" style={{ marginBottom: '4px' }}>
                                                Your Role <span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <select
                                                value={role}
                                                onChange={e => setRole(e.target.value)}
                                                required
                                                className={`w-full rounded-xl border border-white/10 bg-white/5 text-sm font-medium outline-none transition-colors focus:border-blue-500/60 ${role ? 'text-white' : 'text-slate-500'}`}
                                                style={{ padding: '14px 16px', fontSize: '15px', appearance: 'none' }}
                                            >
                                                <option value="" className="bg-slate-900">Select Role...</option>
                                                {['Pastor', 'Treasurer', 'Church Administrator', 'Board Member', 'Accountant', 'Other'].map(r => (
                                                    <option key={r} value={r} className="bg-slate-900">{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <Field label={t('phoneNumber')} placeholder="(555) 000-0000" type="tel"
                                        value={phone} onChange={(v) => setPhone(formatPhoneNumber(v))} icon={Phone} required />
                                    <Field label={t('country')} placeholder="United States" type="text"
                                        value={country} onChange={setCountry} icon={Globe} required />
                                    <div className="col-span-2">
                                        <Field label="Church Address" placeholder="123 Main St, City, State ZIP"
                                            value={address} onChange={setAddress} icon={MapPin} required />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {t('denominationType')}
                                    </label>
                                    <select
                                        value={denomination}
                                        onChange={e => setDenomination(e.target.value)}
                                        className={`w-full py-2.5 px-3.5 rounded-xl border border-white/10 bg-white/5 text-sm font-medium outline-none transition-colors focus:border-blue-500/60 ${denomination ? 'text-white' : 'text-slate-500'}`}
                                    >
                                        <option value="" className="bg-slate-900">{t('selectDenomination')}</option>
                                        {['Baptist', 'Methodist', 'Pentecostal', 'Non-denominational', 'Catholic', 'Anglican / Episcopal',
                                            'Lutheran', 'Presbyterian', 'Adventist', 'Church of Christ', 'AME / Black Church', 'Other'].map(d => (
                                                <option key={d} value={d} className="bg-slate-900">{d}</option>
                                            ))}
                                    </select>
                                </div>

                                <div className="flex flex-col" style={{ gap: '8px', marginBottom: '8px' }}>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" style={{ marginBottom: '4px' }}>
                                        How did you hear about us? <span className="text-slate-600 ml-1">(Optional)</span>
                                    </label>
                                    <select
                                        value={referralSource}
                                        onChange={e => setReferralSource(e.target.value)}
                                        className={`w-full rounded-xl border border-white/10 bg-white/5 text-sm font-medium outline-none transition-colors focus:border-blue-500/60 ${referralSource ? 'text-white' : 'text-slate-500'}`}
                                        style={{ padding: '14px 16px', fontSize: '15px', appearance: 'none' }}
                                    >
                                        <option value="" className="bg-slate-900">Select Source...</option>
                                        {['Google Search', 'Facebook/Instagram', 'Word of Mouth / Referral', 'Conference / Event', 'Other'].map(r => (
                                            <option key={r} value={r} className="bg-slate-900">{r}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Treasurer Section */}
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                            <DollarSign size={15} className="text-emerald-500" />
                                        </div>
                                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                                            {t('churchTreasurerTitle')}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold">— {t('optional')}</span>
                                    </div>
                                    <Field label={t('treasurerFullName')} placeholder="e.g. Deacon Robert Lee"
                                        value={treasurerName} onChange={setTreasurerName} icon={User} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label={t('treasurerEmailLabel')} placeholder="treasurer@church.org" type="email"
                                            value={treasurerEmail} onChange={setTreasurerEmail} icon={Mail} />
                                        <Field label={t('treasurerPhoneLabel')} placeholder="(555) 000-0000" type="tel"
                                            value={treasurerPhone} onChange={(v) => setTreasurerPhone(formatPhoneNumber(v))} icon={Phone} />
                                    </div>
                                </div>

                                {/* Terms */}
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left">
                                    <div className="flex items-start gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="termsCheck"
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                            className="mt-1 w-4 h-4 shrink-0 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                                            required
                                        />
                                        <label htmlFor="termsCheck" className="text-xs text-slate-400 cursor-pointer leading-relaxed">
                                            I confirm that I have read and agree to the{' '}
                                            <button type="button" onClick={(e) => { e.preventDefault(); setLegalModal({ open: true, type: 'terms' }); }} className="text-blue-400 font-bold hover:text-blue-300 transition-colors">Terms of Service</button>
                                            {' '}and{' '}
                                            <button type="button" onClick={(e) => { e.preventDefault(); setLegalModal({ open: true, type: 'privacy' }); }} className="text-blue-400 font-bold hover:text-blue-300 transition-colors">Privacy Policy</button>
                                            , and I consent to the processing of my data.
                                        </label>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-blue-500/10 text-center font-bold text-[10px] text-slate-500">
                                        {t('confirmationEmailSent').replace('{email}', email)}
                                    </div>
                                </div>

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                        <span className="text-red-500 text-sm font-semibold">{error}</span>
                                    </motion.div>
                                )}

                                <div className="flex gap-3 mt-2">
                                    <button type="button" onClick={() => { setStep(0); setError(null); }}
                                        className="px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 font-bold text-sm flex items-center gap-1 hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronLeft size={16} /> {t('back')}
                                    </button>
                                    <button type="submit" disabled={loading || !termsAccepted}
                                        className="flex-1 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black shadow-lg shadow-blue-900/20 hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                        style={{ padding: '16px', fontSize: '15px' }}
                                    >
                                        <UserPlus size={16} />
                                        {loading ? t('creatingAccount') : t('createAccount')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                </AnimatePresence>

                <div className="mt-10 flex justify-center gap-8 opacity-40">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Lock size={16} className="text-purple-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ecclesiastical Shield</span>
                    </div>
                </div>

                <LegalModal
                    isOpen={legalModal.open}
                    type={legalModal.type}
                    onClose={() => setLegalModal({ ...legalModal, open: false })}
                />
            </motion.div>
        </div>
    );
};

export default Auth;
