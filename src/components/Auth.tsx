import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Account created! Please check your email to verify your address.');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError(null);
        // Use the full href base so GitHub Pages (/finance/) is included in the redirect
        const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
            },
        });
        if (error) {
            setError(error.message);
            setGoogleLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'flex-start',
            justifyContent: 'center', background: 'var(--bg-dark)', padding: '1.5rem',
            position: 'relative', overflowY: 'auto'
        }}>
            {/* Background glow */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%)',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: '420px', padding: '2rem', position: 'relative', zIndex: 1, marginTop: 'auto', marginBottom: 'auto' }}
            >
                {/* Logo / Branding */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <img
                        src={`${import.meta.env.BASE_URL}logo.png`}
                        alt="Storehouse Finance"
                        style={{
                            height: '60px',
                            width: 'auto',
                            marginBottom: '0.75rem',
                            filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.5))',
                        }}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isLogin ? 'Welcome back, servant leader' : 'Create your church\'s account'}
                    </p>
                </div>

                {/* Google Sign-In */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '0.75rem', padding: '0.85rem', borderRadius: '12px',
                        background: 'white', border: 'none', cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 700,
                        color: '#1a1a1a', marginBottom: '1.5rem',
                        opacity: googleLoading ? 0.7 : 1,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s',
                    }}
                >
                    {/* Google G icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {googleLoading ? 'Redirecting...' : `${isLogin ? 'Sign in' : 'Sign up'} with Google`}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                {/* Email/Password form */}
                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email" value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-input"
                                style={{ paddingLeft: '2.75rem', width: '100%' }}
                                placeholder="pastor@mychurch.org"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password" value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="glass-input"
                                style={{ paddingLeft: '2.75rem', width: '100%' }}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                            {error}
                        </motion.p>
                    )}

                    {message && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                            {message}
                        </motion.p>
                    )}

                    <button type="submit" className="btn btn-primary"
                        disabled={loading || googleLoading}
                        style={{ width: '100%', height: '52px', justifyContent: 'center', marginTop: '0.5rem' }}
                    >
                        {loading ? 'Processing...' : isLogin
                            ? <><LogIn size={18} /> Sign In with Email</>
                            : <><UserPlus size={18} /> Create Account</>
                        }
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
                    style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: '0.875rem', cursor: 'pointer', marginTop: '1.5rem',
                        fontWeight: 600, width: '100%', textAlign: 'center'
                    }}
                >
                    {isLogin ? "Don't have an account? Sign up free" : 'Already have an account? Log in'}
                </button>
            </motion.div>
        </div>
    );
};

export default Auth;
