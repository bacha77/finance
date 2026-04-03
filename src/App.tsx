import { useState, useEffect } from 'react';
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
import UpdatePassword from './components/UpdatePassword';
import SupportModal from './components/SupportModal';
import CookieConsent from './components/CookieConsent';
import { supabase } from './lib/supabase';
import { getSubscriptionStatus } from './lib/subscriptionConfig';
import { runMigrations } from './lib/migrations';
import type { SubscriptionStatus } from './lib/subscriptionConfig';
import { 
  Search, Bell, ChevronDown, CheckCircle2, Command as CmdIcon,
  User, Settings as SettingsIcon, LogOut, BellRing, LayoutDashboard, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from './contexts/LanguageContext';
import React from 'react';

const profileMenuBtnStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
  display: 'flex', alignItems: 'center', gap: '0.75rem',
  background: 'none', border: 'none', color: 'hsl(var(--text-secondary))',
  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
  textAlign: 'left', transition: 'all 0.2s',
};

function App() {
  const { t } = useLanguage();

  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [showSignupSuccess, setShowSignupSuccess] = React.useState(false);
  const [showCommandCenter, setShowCommandCenter] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [settingsSection, setSettingsSection] = React.useState<any>('grid');
  const [isRecovery, setIsRecovery] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = React.useState(false);

  const [activeTab, setActiveTabState] = React.useState(() => {
    return localStorage.getItem('sanctuary_active_tab') || 'dashboard';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem('sanctuary_active_tab', tab);
  };
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    runMigrations();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfileLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setProfileLoading(false); }
    });

    if (window.location.hash.includes('type=signup')) {
      setShowSignupSuccess(true);
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(() => setShowSignupSuccess(false), 8000);
    }

    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
      window.history.replaceState(null, '', window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, [t]);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (adminRow) { setIsAdmin(true); setProfileLoading(false); return; }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, churches(*)')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        if (data.churches) {
          const status = getSubscriptionStatus(data.churches);
          setSubStatus(status);
        }
      }
    } catch (e) {
      console.error('Profile fetch failed', e);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBypass = () => {
    // Force clean state by removing cached mock data
    localStorage.removeItem('sanctuary_funds');
    localStorage.removeItem('sanctuary_ledger');
    localStorage.removeItem('sanctuary_members');
    localStorage.removeItem('sanctuary_departments');
    localStorage.removeItem('sanctuary_payroll_staff');
    localStorage.removeItem('sanctuary_budgets');
    localStorage.removeItem('sanctuary_expense_categories');

    setSession({ user: { id: '00000000-0000-0000-0000-000000000000', email: 'dev@storehouse.org' } });
    setProfile({
      id: '00000000-0000-0000-0000-000000000000',
      full_name: 'Administrator',
      churches: {
        id: '11111111-1111-1111-1111-111111111111', // Valid UUID for Dev Church
        name: 'New Church Workspace',
        plan: 'enterprise',
        city: 'City',
        state: 'ST'
      }
    });
    setProfileLoading(false);
  };

  const church = profile?.churches;

  const handleUpdateChurch = async (newData: any) => {
    try {
      if (!church?.id) return;
      const { error } = await supabase
        .from('churches')
        .update({
          name: newData.name,
          address: newData.address,
          website: newData.website,
          tax_id: newData.taxId,
          currency: newData.currency,
          fiscal_year_start: newData.fiscalYearStart,
          logo_url: newData.logo_url,
          cancel_at_period_end: newData.cancel_at_period_end,
          cancellation_reason: newData.cancellation_reason
        })
        .eq('id', church.id);

      if (error) throw error;

      // Update local state without reload
      setProfile({
        ...profile,
        churches: {
          ...church,
          ...newData,
          // Map snake_case from DB back to the camelCase local if needed, 
          // or just ensure church object reflects standard naming
          logo_url: newData.logo_url 
        }
      });
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to save changes to database.');
    }
  };

  // ── KEYBOARD SHORTCUTS ──
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandCenter(prev => !prev);
      }
      if (e.key === 'Escape') setShowCommandCenter(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isRecovery) {
    return <UpdatePassword onComplete={() => setIsRecovery(false)} />;
  }

  if (!session) return <Auth onBypass={handleBypass} />;

  if (isAdmin) {
    return <AdminPanel adminEmail={session.user.email || 'admin'} onLogout={async () => { await supabase.auth.signOut(); setIsAdmin(false); }} />;
  }

  if (profileLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1rem', width: '100%', background: 'hsl(var(--bg-main))' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-center" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          <div className="spin" style={{ width: '40px', height: '40px', border: '3px solid hsla(var(--p)/0.2)', borderTopColor: 'hsl(var(--p))', borderRadius: '50%' }} />
          <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Synchronizing Shard...</div>
        </motion.div>
      </div>
    );
  }

  if (!profile || !profile.churches) {
    return (
      <Onboarding
        userId={session.user.id}
        userEmail={session.user.email || ''}
        initialName={session.user.user_metadata?.full_name || ''}
        onComplete={() => fetchProfile(session.user.id)}
        onLogout={async () => {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
        }}
      />
    );
  }

  if (subStatus?.isBlocked && church) {
    return <PaymentWall churchId={church.id} churchName={church.name} subStatus={subStatus} onPaymentSuccess={() => fetchProfile(session.user.id)} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-main))', color: 'hsl(var(--text-main))', overflow: 'hidden' }}>
      
      {/* ── AMBIENT DECOR ── */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'hsla(var(--p)/0.05)', filter: 'blur(120px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'hsla(var(--s)/0.05)', filter: 'blur(120px)', borderRadius: '50%' }} />
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        open={sidebarOpen} 
        setOpen={setSidebarOpen} 
        isMobile={isMobile}
        church={church}
        onLogout={async () => {
          await supabase.auth.signOut();
          setProfile(null);
          setSession(null);
        }}
        onOpenSupport={() => setSupportModalOpen(true)}
      />
      
      <SupportModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
      <CookieConsent />

      <main style={{ 
        flex: 1, 
        marginLeft: !isMobile && sidebarOpen ? 'var(--sidebar-width)' : '0',
        transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1,
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {subStatus?.isCancelled && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ 
              background: 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)', 
              color: 'white', padding: '0.6rem 2rem', fontSize: '0.8rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
              zIndex: 60, position: 'sticky', top: 0
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={14} fill="white" />
              Subscription Cancellation Pending — Ends on {subStatus.subscriptionEndDate?.toLocaleDateString()}
            </span>
            <button 
              onClick={() => {
                setActiveTab('settings');
                setSettingsSection('billing');
              }}
              style={{ 
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', 
                padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 800
              }}
            >
              Manage / Undo
            </button>
          </motion.div>
        )}

        {/* ── TOP NAV BAR ── */}
        <header className="glass" style={{ 
          position: 'sticky', top: 0, zIndex: 50, padding: isMobile ? '0.75rem 1rem' : '0.75rem 2rem', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid hsla(var(--text-main)/0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <CmdIcon size={20} />
              </button>
            )}
            <div 
              onClick={() => setActiveTab('dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-muted))' }}>{church?.name}</span>
              <span style={{ color: 'hsla(var(--text-main)/0.1)' }}>/</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', textTransform: 'capitalize' }}>{activeTab}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div 
              onClick={() => setShowCommandCenter(true)}
              className="glass-input" 
              style={{ 
                width: isMobile ? '40px' : '320px', 
                height: '36px',
                padding: isMobile ? '0' : '0.5rem 1rem', 
                display: 'flex', alignItems: 'center', 
                justifyContent: isMobile ? 'center' : 'flex-start',
                gap: '10px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', cursor: 'pointer',
                borderRadius: '10px', border: '1px solid hsla(var(--text-main)/0.1)'
              }}
            >
              <Search size={14} />
              {!isMobile && <span>Search workspace...</span>}
              {!isMobile && (
                <div style={{ marginLeft: 'auto', padding: '2px 5px', background: 'hsla(var(--text-main)/0.05)', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900 }}>⌘K</div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileMenuOpen(false);
                  }}
                  className="flex-center" 
                  style={{ 
                    width: '36px', height: '36px', borderRadius: '10px', 
                    background: notificationsOpen ? 'hsla(var(--p)/0.2)' : 'hsla(var(--text-main)/0.03)', 
                    border: 'none', color: notificationsOpen ? 'hsl(var(--p))' : 'white', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Bell size={18} />
                  <span style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '8px', height: '8px', background: 'hsl(var(--p))',
                    borderRadius: '50%', border: '2px solid hsl(var(--bg-main))'
                  }}></span>
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                        width: '280px', background: 'hsl(var(--bg-card))',
                        border: '1px solid hsla(var(--text-main)/0.1)', borderRadius: '16px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)', zIndex: 100,
                        padding: '1rem', backdropFilter: 'blur(20px)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                        <BellRing size={16} color="hsl(var(--p))" />
                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t('header_notifications')}</span>
                      </div>
                      
                      {subStatus?.isCancelled && (
                        <div 
                          onClick={() => {
                            setActiveTab('settings');
                            setSettingsSection('billing');
                            setNotificationsOpen(false);
                          }}
                          style={{ 
                            padding: '1rem', background: 'hsla(var(--error)/0.1)', border: '1px solid hsla(var(--error)/0.2)',
                            borderRadius: '12px', marginBottom: '1rem', cursor: 'pointer', display: 'flex', gap: '12px'
                          }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--error))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Shield size={16} color="white" />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>Reactivate Subscription</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Avoid service interruption on {subStatus.subscriptionEndDate?.toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                      <div style={{ 
                        padding: '2rem 1rem', textAlign: 'center', 
                        background: 'hsla(var(--text-main)/0.02)', borderRadius: '12px',
                        border: '1px dashed hsla(var(--text-main)/0.1)'
                      }}>
                        <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>{t('header_no_notifications')}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={{ height: '20px', width: '1px', background: 'hsla(var(--text-main)/0.1)' }} />
              
              {/* Profile */}
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => {
                    setProfileMenuOpen(!profileMenuOpen);
                    setNotificationsOpen(false);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                >
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontWeight: 900, fontSize: '0.75rem', color: 'white'
                  }}>
                    {profile.full_name?.charAt(0) || 'U'}
                  </div>
                  {!isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{profile.full_name}</span>
                      <ChevronDown size={14} color="hsl(var(--text-muted))" />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 14px)', right: 0,
                        width: '240px', background: 'hsl(var(--bg-card))',
                        border: '1px solid hsla(var(--text-main)/0.1)', borderRadius: '16px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)', zIndex: 100,
                        padding: '0.75rem', backdropFilter: 'blur(20px)'
                      }}
                    >
                      <div 
                        onClick={() => { setActiveTab('dashboard'); setProfileMenuOpen(false); }}
                        style={{ padding: '0.5rem 0.5rem 0.75rem', marginBottom: '0.5rem', borderBottom: '1px solid hsla(var(--text-main)/0.05)', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>{profile.full_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{session.user.email}</div>
                      </div>
                      
                      <button 
                        onClick={() => { setActiveTab('dashboard'); setProfileMenuOpen(false); }}
                        style={profileMenuBtnStyle}
                      >
                        <LayoutDashboard size={16} />
                        <span>Homepage / Dashboard</span>
                      </button>

                      <button 
                        onClick={() => { 
                          setSettingsSection('user_profile');
                          setActiveTab('settings'); 
                          setProfileMenuOpen(false); 
                        }}
                        style={profileMenuBtnStyle}
                      >
                        <User size={16} />
                        <span>{t('header_profile')}</span>
                      </button>
                      
                      <button 
                        onClick={() => { 
                          setSettingsSection('grid');
                          setActiveTab('settings'); 
                          setProfileMenuOpen(false); 
                        }}
                        style={profileMenuBtnStyle}
                      >
                        <SettingsIcon size={16} />
                        <span>{t('header_preferences')}</span>
                      </button>

                      <div style={{ height: '1px', background: 'hsla(var(--text-main)/0.05)', margin: '0.5rem 0' }} />

                      <button 
                         onClick={async () => {
                          await supabase.auth.signOut();
                          setProfile(null);
                          setSession(null);
                        }}
                        style={{ ...profileMenuBtnStyle, color: '#ef4444' }}
                      >
                        <LogOut size={16} />
                        <span>{t('header_signout')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* ── CONTENT AREA ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} churchId={church.id} />}
              {activeTab === 'accounting' && <FundAccounting churchId={church.id} />}
              {activeTab === 'members' && <MemberPortal churchId={church.id} />}
              {activeTab === 'payroll' && <Payroll churchId={church.id} />}
              {activeTab === 'reports' && <Reports churchId={church.id} />}
              {activeTab === 'departments' && <Departments setActiveTab={setActiveTab} churchId={church.id} />}
              {activeTab === 'expenses' && <Expenses setActiveTab={setActiveTab} churchId={church.id} />}
              {activeTab === 'budget' && <Budget setActiveTab={setActiveTab} churchId={church.id} />}
              {activeTab === 'tax' && <TaxCompliance churchId={church.id} churchName={church.name} />}
              {activeTab === 'settings' && <Settings churchData={church} onUpdateChurch={handleUpdateChurch} initialSection={settingsSection} profile={profile} />}
              {activeTab === 'pricing' && <Pricing currentPlan={church.plan} churchId={church.id} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── SIGNUP SUCCESS TOAST ── */}
        <AnimatePresence>
          {showSignupSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass"
              style={{
                position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
                padding: '1.25rem 2rem', borderRadius: '18px', border: '1px solid hsl(var(--success))',
                background: 'hsla(var(--success)/0.1)', display: 'flex', alignItems: 'center', gap: '1rem'
              }}
            >
              <div style={{ padding: '8px', background: 'hsl(var(--success))', borderRadius: '50%', display: 'flex' }}>
                <CheckCircle2 size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Welcome to Storehouse!</div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Your account is verified. Ready to grow?</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COMMAND CENTER MODAL ── */}
        <AnimatePresence>
          {showCommandCenter && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCommandCenter(false)}
              style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(8px)', zIndex: 1000, padding: '20vh 1rem'
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -20 }}
                onClick={e => e.stopPropagation()}
                className="glass-card"
                style={{
                  maxWidth: '640px', margin: '0 auto', padding: '0', borderRadius: '20px',
                  overflow: 'hidden', border: '1px solid hsla(var(--text-main)/0.15)'
                }}
              >
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsla(var(--text-main)/0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Search size={22} color="var(--primary)" />
                  <input 
                    autoFocus 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search modules or settings..." 
                    style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.1rem', width: '100%', outline: 'none' }}
                  />
                  <div style={{ padding: '4px 8px', background: 'hsla(var(--text-main)/0.05)', borderRadius: '6px', fontSize: '0.6rem', color: 'var(--text-muted)' }}>ESC</div>
                </div>
                <div style={{ padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', padding: '0 0.5rem' }}>Jump to Module</div>
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: CmdIcon },
                    { id: 'accounting', label: 'Accounting', icon: CmdIcon },
                    { id: 'members', label: 'Members', icon: CmdIcon },
                    { id: 'payroll', label: 'Payroll', icon: CmdIcon },
                    { id: 'reports', label: 'Reports', icon: CmdIcon },
                    { id: 'expenses', label: 'Expenses', icon: CmdIcon },
                    { id: 'budget', label: 'Budget', icon: CmdIcon },
                    { id: 'settings', label: 'Settings', icon: CmdIcon }
                  ].filter(m => m.label.toLowerCase().includes(searchQuery.toLowerCase())).map(mod => (
                    <div 
                      key={mod.id} 
                      className="btn-ghost" 
                      onClick={() => { setActiveTab(mod.id); setShowCommandCenter(false); }}
                      style={{ 
                        width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', 
                        border: 'none', borderRadius: '10px', cursor: 'pointer', gap: '12px',
                        background: 'transparent'
                      }}
                    >
                      <mod.icon size={16} color="var(--primary-light)" /> {mod.label}
                    </div>
                  ))}
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
