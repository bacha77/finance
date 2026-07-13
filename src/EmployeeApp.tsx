import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import AdminPanel from './components/AdminPanel';
import { Loader2, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

export default function EmployeeApp() {
    const { t } = useLanguage();
    const [session, setSession] = useState<any>(null);
    const [_profile, setProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Login form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginMessage, setLoginMessage] = useState('');
    const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password');

    // Password Setup state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupError, setSetupError] = useState('');
    const [setupSuccess, setSetupSuccess] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else setProfileLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else { setProfile(null); setProfileLoading(false); setIsAdmin(false); }
        });

        return () => subscription.unsubscribe();
    }, [t]);

    const fetchProfile = async (userId: string) => {
        setProfileLoading(true);
        try {
            const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
            if (adminRow) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*, churches(*)')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setProfile(data);
            }
        } catch (e) {
            console.error('Profile fetch failed', e);
        } finally {
            setProfileLoading(false);
        }
    };

    if (profileLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))' }}>
                <Loader2 className="spin" size={32} color="hsl(var(--p))" />
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginMessage('');
        try {
            if (loginMode === 'password') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: window.location.origin + '/employee/' }
                });
                if (error) throw error;
                setLoginMessage('Check your email for the magic link!');
            }
        } catch (err: any) {
            setLoginMessage(err.message || 'Login failed');
        } finally {
            setLoginLoading(false);
        }
    };

    const handlePasswordSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSetupError('');
        if (newPassword !== confirmPassword) {
            setSetupError("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            setSetupError("Password must be at least 6 characters");
            return;
        }

        setSetupLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
                data: { password_setup_complete: true }
            });
            if (error) throw error;
            setSetupSuccess(true);
            // Refresh session metadata to hide this screen
            setTimeout(async () => {
                const { data } = await supabase.auth.getSession();
                setSession(data.session);
            }, 1500);
        } catch (err: any) {
            setSetupError(err.message || 'Failed to update password');
        } finally {
            setSetupLoading(false);
        }
    };

    // 1. Not Logged In -> Show Login Screen
    if (!session) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))', padding: '2rem' }}>
                <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'hsla(var(--p)/0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldAlert size={32} color="hsl(var(--p))" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Storehouse Employee</h1>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        Sign in to access your employee dashboard.
                    </p>
                    
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@storehousefinance.net"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                        </div>

                        {loginMode === 'password' && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loginLoading}
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', marginTop: '0.5rem' }}
                        >
                            {loginLoading ? <Loader2 size={18} className="spin" /> : (loginMode === 'password' ? 'Sign In' : 'Send Magic Link')}
                        </button>
                    </form>

                    {loginMessage && (
                        <div style={{ fontSize: '0.85rem', color: loginMessage.includes('Check') ? 'hsl(var(--p))' : 'hsl(var(--error))', marginBottom: '1.5rem' }}>
                            {loginMessage}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => {
                            setLoginMode(loginMode === 'password' ? 'magic' : 'password');
                            setLoginMessage('');
                        }}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'transparent', color: 'hsl(var(--p))', border: 'none', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem' }}
                    >
                        {loginMode === 'password' ? 'First time or forgot password? Use magic link' : 'Back to Password Login'}
                    </button>
                </div>
            </div>
        );
    }

    // 2. Logged In, but Unauthorized (not in admins table)
    if (!isAdmin) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))', padding: '2rem' }}>
                <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
                    <ShieldAlert size={48} color="hsl(var(--error))" style={{ margin: '0 auto 1rem' }} />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Unauthorized Access</h1>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        Your account is not registered as a Storehouse Finance employee. You cannot access this portal.
                    </p>
                    <button 
                        onClick={() => { supabase.auth.signOut(); window.location.href = '/'; }}
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px' }}
                    >
                        Return to Client Portal
                    </button>
                </div>
            </div>
        );
    }

    // 3. Logged In, Is Admin, but hasn't set a password yet
    if (session?.user?.user_metadata?.password_setup_complete !== true) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))', padding: '2rem' }}>
                <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'hsla(var(--p)/0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Lock size={32} color="hsl(var(--p))" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Set Your Password</h1>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        Welcome to the team! Before accessing the dashboard, please create a secure password for your account.
                    </p>
                    
                    {setupSuccess ? (
                        <div style={{ padding: '2rem 0' }}>
                            <CheckCircle2 size={48} color="hsl(var(--success))" style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Password Saved!</h3>
                            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Taking you to the dashboard...</p>
                        </div>
                    ) : (
                        <form onSubmit={handlePasswordSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', display: 'block' }}>New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', display: 'block' }}>Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>

                            {setupError && (
                                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--error))', marginTop: '0.5rem' }}>
                                    {setupError}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={setupLoading}
                                className="btn btn-primary" 
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', marginTop: '0.5rem' }}
                            >
                                {setupLoading ? <Loader2 size={18} className="spin" /> : 'Save Password & Continue'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // 4. Logged in, Is Admin, Password Setup Complete -> Show Dashboard directly!
    // (Notice that StaffSetup scheduling block was removed)
    return (
        <AdminPanel 
            adminEmail={session.user.email}
            onLogout={() => { supabase.auth.signOut(); window.location.href = '/employee/'; }} 
            onSwitchToUser={() => { window.location.href = '/'; }}
            onImpersonate={() => { window.location.href = '/'; }}
        />
    );
}
