import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import AdminPanel from './components/AdminPanel';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth, useUser, SignIn } from '@clerk/react';

export default function EmployeeApp() {
    // const { t } = useLanguage();
    const { isLoaded, isSignedIn, signOut, getToken } = useAuth();
    const { user } = useUser();
    const [profileLoading, setProfileLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const syncUser = async () => {
            if (isLoaded && isSignedIn && user) {
                let supabaseId = user.unsafeMetadata?.supabase_uuid as string | undefined;
                
                if (!supabaseId) {
                    supabaseId = crypto.randomUUID();
                    try {
                        await user.update({
                            unsafeMetadata: { ...user.unsafeMetadata, supabase_uuid: supabaseId }
                        });
                        await user.reload();
                        await getToken({ template: 'supabase', skipCache: true });
                    } catch (e) {
                        console.error('Failed to update Clerk user metadata', e);
                        setProfileLoading(false);
                        return;
                    }
                }
                
                fetchProfile(supabaseId);
            } else if (isLoaded && !isSignedIn) {
                setProfileLoading(false);
                setIsAdmin(false);
            }
        };
        
        syncUser();
    }, [isLoaded, isSignedIn, user]);

    const fetchProfile = async (userId: string) => {
        setProfileLoading(true);
        try {
            const { data: adminRow } = await supabase.from('admins').select('user_id, role').eq('user_id', userId).maybeSingle();
            if (adminRow) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        } catch (e) {
            console.error('Profile fetch failed', e);
        } finally {
            setProfileLoading(false);
        }
    };

    if (!isLoaded || profileLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))' }}>
                <Loader2 className="spin" size={32} color="hsl(var(--p))" />
            </div>
        );
    }

    // 1. Not Logged In -> Show Login Screen
    if (!isSignedIn) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))', padding: '2rem' }}>
                <SignIn routing="hash" />
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
                        onClick={async () => { await signOut(); window.location.href = '/'; }}
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px' }}
                    >
                        Return to Client Portal
                    </button>
                </div>
            </div>
        );
    }

    // 3. Logged in, Is Admin -> Show Dashboard
    return (
        <AdminPanel 
            adminEmail={user?.primaryEmailAddress?.emailAddress!}
            onLogout={async () => { await signOut(); window.location.href = '/employee/'; }} 
            onSwitchToUser={() => { window.location.href = '/'; }}
            onImpersonate={() => { window.location.href = '/'; }}
        />
    );
}
