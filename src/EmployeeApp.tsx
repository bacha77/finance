import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import AdminPanel from './components/AdminPanel';
import StaffSetup from './components/StaffSetup';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

export default function EmployeeApp() {
    const { t } = useLanguage();
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Login form state
    const [email, setEmail] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginMessage, setLoginMessage] = useState('');

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
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: window.location.origin + '/employee' }
            });
            if (error) throw error;
            setLoginMessage('Check your email for the login link!');
        } catch (err: any) {
            setLoginMessage(err.message || 'Failed to send magic link');
        } finally {
            setLoginLoading(false);
        }
    };

    if (!session) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))', padding: '2rem' }}>
                <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'hsla(var(--p)/0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldAlert size={32} color="hsl(var(--p))" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Storehouse Employee Portal</h1>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        This portal is strictly for authorized Storehouse Finance employees and support agents.
                    </p>
                    
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Employee Email"
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <button 
                            type="submit" 
                            disabled={loginLoading}
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                        >
                            {loginLoading ? <Loader2 size={18} className="spin" /> : 'Send Login Link'}
                        </button>
                    </form>

                    {loginMessage && (
                        <div style={{ fontSize: '0.85rem', color: loginMessage.includes('Check') ? 'hsl(var(--p))' : 'hsl(var(--error))', marginBottom: '1rem' }}>
                            {loginMessage}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => window.location.href = '/'}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'transparent', color: 'hsl(var(--text-muted))', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        ← Back to Client Login
                    </button>
                </div>
            </div>
        );
    }

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

    if (profile && !profile.working_hours) {
        return <StaffSetup profile={profile} onComplete={() => fetchProfile(session.user.id)} />;
    }

    return (
        <AdminPanel 
            adminEmail={session.user.email}
            onLogout={() => { supabase.auth.signOut(); window.location.href = '/employee/'; }} 
            onSwitchToUser={() => { window.location.href = '/'; }}
            onImpersonate={() => { window.location.href = '/'; }}
        />
    );
}
