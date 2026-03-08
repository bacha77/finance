import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FundAccounting from './components/FundAccounting';
import MemberPortal from './components/MemberPortal';
import SmartGiving from './components/SmartGiving';
import Payroll from './components/Payroll';
import Reports from './components/Reports';
import Departments from './components/Departments';
import Expenses from './components/Expenses';
import Budget from './components/Budget';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Pricing from './components/Pricing';
import { supabase } from './lib/supabase';
import { getTrialStatus, TRIAL_CONFIG } from './lib/trialConfig';
import { Search, Moon, Sun, Zap, ArrowRight, User, Shield, PieChart, LogOut, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfileLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setProfileLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, retries = 0) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, churches(*)')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // If RLS blocks the join, try without the join
        const { data: simpleData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (simpleData) {
          // Fetch church separately
          if (simpleData.church_id) {
            const { data: churchData } = await supabase
              .from('churches')
              .select('*')
              .eq('id', simpleData.church_id)
              .maybeSingle();
            setProfile({ ...simpleData, churches: churchData });
          } else {
            setProfile(simpleData);
          }
          setProfileLoading(false);
          return;
        }
      }

      if (!data && retries < 5) {
        // Retry with exponential backoff — DB write may not be visible yet
        setTimeout(() => fetchProfile(userId, retries + 1), 500 * (retries + 1));
        return;
      }

      setProfile(data);
    } catch {
      if (retries < 5) {
        setTimeout(() => fetchProfile(userId, retries + 1), 500 * (retries + 1));
        return;
      }
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Shortcut for Command Center
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandCenter(prev => !prev);
      }
      if (e.key === 'Escape') setShowCommandCenter(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const church = profile?.churches;
  const trialStatus = church ? getTrialStatus(church) : null;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'accounting':
        return <FundAccounting />;
      case 'departments':
        return <Departments />;
      case 'members':
        return <MemberPortal memberLimit={church?.plan === 'trial' ? TRIAL_CONFIG.TRIAL_MEMBER_LIMIT : null} />;
      case 'giving':
        return <SmartGiving />;
      case 'payroll':
        return <Payroll />;
      case 'expenses':
        return <Expenses setActiveTab={setActiveTab} />;
      case 'reports':
        return <Reports />;
      case 'budget':
        return <Budget setActiveTab={setActiveTab} />;
      case 'pricing':
        return <Pricing currentPlan={church?.plan || 'trial'} onSelectPlan={(plan) => console.log('Upgrade to:', plan)} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  // Trial banner shown when on trial plan
  const renderTrialBanner = () => {
    if (!trialStatus || !church || church.plan !== 'trial') return null;
    const { daysRemaining, isExpired } = trialStatus;
    if (isExpired) {
      return (
        <div style={{
          position: 'sticky', top: 0, zIndex: 500,
          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
          padding: '0.65rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', fontSize: '0.875rem', fontWeight: 700 }}>
            <AlertTriangle size={16} />
            Your free trial has expired. Upgrade to continue using Storehouse Finance.
          </div>
          <button
            onClick={() => setActiveTab('pricing')}
            style={{ background: 'white', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '6px 16px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
          >
            View Plans
          </button>
        </div>
      );
    }
    if (daysRemaining <= 7) {
      return (
        <div style={{
          position: 'sticky', top: 0, zIndex: 500,
          background: 'linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))',
          backdropFilter: 'blur(10px)',
          padding: '0.65rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', fontSize: '0.875rem', fontWeight: 700 }}>
            <Clock size={16} />
            {daysRemaining === 1 ? '1 day remaining' : `${daysRemaining} days remaining`} in your free trial.
          </div>
          <button
            onClick={() => setActiveTab('pricing')}
            style={{ background: 'white', color: '#b45309', border: 'none', borderRadius: '8px', padding: '6px 16px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
          >
            Upgrade Now
          </button>
        </div>
      );
    }
    // Show normal trial info bar
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 500,
        background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(124,58,237,0.1))',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        padding: '0.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
          <Clock size={14} style={{ color: 'var(--primary-light)' }} />
          Free trial · <strong style={{ color: 'var(--primary-light)' }}>{daysRemaining} days remaining</strong> · Up to {TRIAL_CONFIG.TRIAL_MEMBER_LIMIT} members
        </div>
        <button
          onClick={() => setActiveTab('pricing')}
          style={{ background: 'none', border: '1px solid rgba(99,102,241,0.4)', color: 'var(--primary-light)', borderRadius: '8px', padding: '4px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}
        >
          See Plans
        </button>
      </div>
    );
  };

  if (!session) return <Auth />;

  if (profileLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--text-muted)', fontSize: '1rem' }}>
        Loading your workspace...
      </div>
    );
  }

  if (!profile) {
    return (
      <Onboarding
        userId={session.user.id}
        userEmail={session.user.email || ''}
        onComplete={() => fetchProfile(session.user.id)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-dark)' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      <main style={{
        marginLeft: '280px',
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        position: 'relative',
        backgroundColor: 'var(--bg-main)'
      }}>
        {/* Trial Status Banner */}
        {renderTrialBanner()}

        {/* Ambient background glows */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.05), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
          {renderContent()}
        </div>

        {/* Floating Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100
          }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Command Center Overlay */}
        <AnimatePresence>
          {showCommandCenter && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '15vh'
              }}
              onClick={() => setShowCommandCenter(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -20 }}
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  background: 'var(--bg-card)',
                  borderRadius: '1.5rem',
                  border: '1px solid var(--border-strong)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <Search size={20} color="var(--text-muted)" />
                  <input
                    autoFocus
                    placeholder="Search apps, members, or commands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.125rem', outline: 'none' }}
                  />
                  <div style={{ padding: '4px 8px', background: 'var(--glass-light)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>ESC</div>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 0.5rem 0.5rem', textTransform: 'uppercase' }}>Rapid Navigation</p>
                    {[
                      { id: 'dashboard', label: 'Go to Dashboard', icon: Zap },
                      { id: 'members', label: 'Search Members', icon: User },
                      { id: 'budget', label: 'Fiscal Planning', icon: PieChart },
                      { id: 'accounting', label: 'Fund Accounting', icon: Shield },
                    ].map(cmd => (
                      <button
                        key={cmd.id}
                        onClick={() => { setActiveTab(cmd.id); setShowCommandCenter(false); }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '12px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--glass-light)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <cmd.icon size={18} color="var(--primary-light)" />
                        <span style={{ flex: 1 }}>{cmd.label}</span>
                        <ArrowRight size={14} color="var(--text-muted)" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
