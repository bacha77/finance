import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FundAccounting from './components/FundAccounting';
import MemberPortal from './components/MemberPortal';
import Payroll from './components/Payroll';
import Reports from './components/Reports';
import Departments from './components/Departments';
import Expenses from './components/Expenses';
import Budget from './components/Budget';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Pricing from './components/Pricing';
import PaymentWall from './components/PaymentWall';
import AdminPanel from './components/AdminPanel';
import TaxCompliance from './components/TaxCompliance';
import Settings from './components/Settings';
import { supabase } from './lib/supabase';
import { TRIAL_CONFIG } from './lib/trialConfig';
import { getSubscriptionStatus, getMsUntilMidnight } from './lib/subscriptionConfig';
import type { SubscriptionStatus } from './lib/subscriptionConfig';
import { Search, Moon, Sun, Zap, ArrowRight, User, Shield, PieChart, LogOut, Clock, Database, CreditCard, Users as UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from './contexts/LanguageContext';

function App() {
  const { t, language } = useLanguage();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{members: any[], ledger: any[], funds: any[]}>({ members: [], ledger: [], funds: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    // Check admin table first
    const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (adminRow) { setIsAdmin(true); setProfileLoading(false); return; }
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
    setProfile(null);
    setSubStatus(null);
    if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
  };

  // ── Subscription Status & Midnight Timer ─────────────────────────────────
  // Recalculate subscription status whenever the profile/church changes.
  // Also schedule a precise timer to fire at midnight so access is revoked
  // automatically when a subscription expires, without needing a page reload.
  useEffect(() => {
    const church = profile?.churches;
    if (!church) { setSubStatus(null); return; }

    const status = getSubscriptionStatus(church);
    setSubStatus(status);

    // Clear any existing midnight timer before scheduling a new one
    if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);

    // Schedule a re-check at next midnight (cascades — each midnight schedules the next)
    const scheduleMidnightCheck = () => {
      const msUntilMidnight = getMsUntilMidnight();
      midnightTimerRef.current = setTimeout(() => {
        // Re-fetch the church record fresh from DB (in case renewal happened)
        if (session?.user?.id) fetchProfile(session.user.id);
        scheduleMidnightCheck(); // Schedule the next midnight
      }, msUntilMidnight);
    };
    scheduleMidnightCheck();

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
  }, [profile]);

  // Shortcut for Command Center
  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ members: [], ledger: [], funds: [] });
        return;
      }
      setIsSearching(true);
      try {
        const [mReq, lReq, fReq] = await Promise.all([
          supabase.from('members').select('*').ilike('name', `%${searchQuery}%`).limit(3),
          supabase.from('ledger').select('*').ilike('description', `%${searchQuery}%`).limit(3),
          supabase.from('funds').select('*').ilike('name', `%${searchQuery}%`).limit(3)
        ]);
        setSearchResults({
          members: mReq.data || [],
          ledger: lReq.data || [],
          funds: fReq.data || []
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleUpdateChurch = async (updates: any) => {
    if (!profile?.churches?.id) return;
    
    // In a real app, we'd sync this to the database. 
    // For now, we update local state to reflect the "Save" immediately.
    const { error } = await supabase
      .from('churches')
      .update({
        name: updates.name,
        website: updates.website,
        tax_id: updates.taxId,
        currency: updates.currency,
        fiscal_year_start: updates.fiscalYearStart,
        address: updates.address
      })
      .eq('id', profile.churches.id);

    if (!error) {
      await fetchProfile(session.user.id);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'accounting':
        return <FundAccounting />;
      case 'departments':
        return <Departments setActiveTab={setActiveTab} />;
      case 'members':
        return <MemberPortal memberLimit={church?.plan === 'trial' ? TRIAL_CONFIG.TRIAL_MEMBER_LIMIT : null} />;
      case 'payroll':
        return <Payroll />;
      case 'expenses':
        return <Expenses setActiveTab={setActiveTab} />;
      case 'reports':
        return <Reports />;
      case 'budget':
        return <Budget setActiveTab={setActiveTab} />;
      case 'pricing':
        return <Pricing
          currentPlan={church?.plan || 'trial'}
          churchId={church?.id}
          onUpgradeSuccess={() => fetchProfile(session.user.id)}
        />;
      case 'compliance':
        return <TaxCompliance
          onBack={() => setActiveTab('payroll')}
          churchName={church?.name}
          churchId={church?.id}
        />;
      case 'settings':
        return <Settings churchData={church} onUpdateChurch={handleUpdateChurch} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  // Trial/subscription status banner (shown when active — not when blocked)
  const renderStatusBanner = () => {
    if (!subStatus || !church || subStatus.isBlocked) return null;
    const { accessStatus, daysRemaining } = subStatus;

    if (accessStatus === 'trial_warning') {
      return (
        <div style={{
          position: 'sticky', top: 0, zIndex: 500,
          background: 'linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))',
          padding: '0.65rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', fontSize: '0.875rem', fontWeight: 700 }}>
            <Clock size={16} />
            ⚠️ {t('trialEnding')} <strong>{daysRemaining} {daysRemaining === 1 ? t('day') : t('days')}</strong> {language === 'es' ? '— agregue un método de pago para conservar sus datos.' : '— add a payment method to keep your data.'}
          </div>
          <button onClick={() => setActiveTab('pricing')}
            style={{ background: 'white', color: '#b45309', border: 'none', borderRadius: '8px', padding: '6px 16px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}>
            {t('upgradeNow')}
          </button>
        </div>
      );
    }
    if (accessStatus === 'paid_expiring') {
      return (
        <div style={{
          position: 'sticky', top: 0, zIndex: 500,
          background: 'linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))',
          padding: '0.65rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', fontSize: '0.875rem', fontWeight: 700 }}>
            <Clock size={16} />
            {t('renewsIn')} <strong>{daysRemaining} {daysRemaining === 1 ? t('day') : t('days')}</strong>.
          </div>
        </div>
      );
    }
    if (accessStatus === 'active_trial') {
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
            {t('activeTrial')} · <strong style={{ color: 'var(--primary-light)' }}>{daysRemaining} {t('days')} {t('remaining')}</strong> · {language === 'es' ? 'Hasta' : 'Up to'} {TRIAL_CONFIG.TRIAL_MEMBER_LIMIT} {t('members')}
          </div>
          <button onClick={() => setActiveTab('pricing')}
            style={{ background: 'none', border: '1px solid rgba(99,102,241,0.4)', color: 'var(--primary-light)', borderRadius: '8px', padding: '4px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>
            {t('seePlans')}
          </button>
        </div>
      );
    }
    return null;
  };

  const handleBypass = () => {
    const mockUser = { id: '00000000-0000-0000-0000-000000000000', email: 'dev@storehouse.finance' };
    setSession({ user: mockUser });
    setProfile({
      id: mockUser.id,
      first_name: 'Storehouse',
      last_name: 'Developer',
      churches: {
        id: 'mock-dev-church',
        name: 'Development Workspace',
        plan: 'enterprise',
        currency: 'USD',
        created_at: new Date().toISOString()
      }
    });
    setProfileLoading(false);
  };

  if (!session) return <Auth onBypass={handleBypass} />;

  // ── Admin gate — shown BEFORE normal app ──────────────────────────────
  if (isAdmin) {
    return <AdminPanel
      adminEmail={session.user.email || 'admin'}
      onLogout={async () => { await supabase.auth.signOut(); setIsAdmin(false); }}
    />;
  }

  if (profileLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--text-muted)', fontSize: '1rem' }}>
        {t('loadingWorkspace')}
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

  // ── PAYMENT WALL — blocks all access when subscription is expired ─────────
  if (subStatus?.isBlocked && church) {
    return (
      <PaymentWall
        churchId={church.id}
        churchName={church.name}
        subStatus={subStatus}
        onPaymentSuccess={() => fetchProfile(session.user.id)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-dark)', position: 'relative' }}>
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 90
            }}
          />
        )}
      </AnimatePresence>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); if (isMobile) setSidebarOpen(false); }} 
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main style={{
        marginLeft: isMobile ? '0' : (sidebarOpen ? '280px' : '0'),
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        position: 'relative',
        backgroundColor: 'var(--bg-main)',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingTop: isMobile ? '4rem' : '0'
      }}>
        {isMobile && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '4rem',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            zIndex: 80,
            justifyContent: 'space-between'
          }}>
            <button 
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}
            >
              <Zap size={24} color="var(--primary-light)" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" style={{ height: '24px' }} />
            </div>
            <button 
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
        {/* Status Banner (trial countdown / renewal warning) */}
        {renderStatusBanner()}

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
          {!isMobile && (
            <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleLogout}
                className="btn btn-ghost"
                style={{ color: 'var(--text-muted)' }}
              >
                <LogOut size={18} /> {language === 'es' ? 'Cerrar Sesión' : 'Logout'}
              </button>
            </div>
          )}
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

                <div style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {isSearching ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                         <Zap size={24} color="var(--primary-light)" />
                      </motion.div>
                      <p style={{ marginTop: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>{t('querying')}</p>
                    </div>
                  ) : searchQuery === '' ? (
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 0.5rem 0.5rem', textTransform: 'uppercase' }}>{t('rapidNavigation')}</p>
                      {[
                        { id: 'dashboard', label: t('goToDashboard'), icon: Zap },
                        { id: 'members', label: t('searchMembers'), icon: User },
                        { id: 'budget', label: t('fiscalPlanning'), icon: PieChart },
                        { id: 'accounting', label: t('fundAccounting'), icon: Shield },
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
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {searchResults.members.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 0.5rem 0.5rem', textTransform: 'uppercase' }}>Profiles Found</p>
                          {searchResults.members.map(m => (
                            <button key={m.id} onClick={() => { setActiveTab('members'); setShowCommandCenter(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UsersIcon size={16} color="var(--primary-light)" />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{m.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.email || 'Member Profile'}</div>
                              </div>
                              <ArrowRight size={14} color="var(--text-muted)" />
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.funds.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 0.5rem 0.5rem', textTransform: 'uppercase' }}>Financial Funds</p>
                          {searchResults.funds.map(f => (
                            <button key={f.id} onClick={() => { setActiveTab('accounting'); setShowCommandCenter(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Database size={16} color="#10b981" />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{f.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Church Fund</div>
                              </div>
                              <ArrowRight size={14} color="var(--text-muted)" />
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.ledger.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 0.5rem 0.5rem', textTransform: 'uppercase' }}>Transactions</p>
                          {searchResults.ledger.map(l => (
                            <button key={l.id} onClick={() => { setActiveTab('accounting'); setShowCommandCenter(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CreditCard size={16} color="#ef4444" />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{l.description}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.date} • ${l.amount}</div>
                              </div>
                              <ArrowRight size={14} color="var(--text-muted)" />
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.members.length === 0 && searchResults.funds.length === 0 && searchResults.ledger.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Database size={32} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                          <p style={{ fontSize: '0.85rem' }}>No results found in Neural Index for "{searchQuery}"</p>
                        </div>
                      )}
                    </div>
                  )}
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
