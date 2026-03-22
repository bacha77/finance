import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  CreditCard,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  LayoutGrid,
  PieChart,
  Zap,
  X,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, onLogout, open, setOpen, isMobile
}) => {
  const { language, setLanguage, t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { id: 'accounting', icon: Wallet, label: t('accounting') },
    { id: 'departments', icon: LayoutGrid, label: t('departments') },
    { id: 'expenses', icon: CreditCard, label: t('expenses') },
    { id: 'members', icon: Users, label: t('members') },
    { id: 'payroll', icon: CreditCard, label: t('payroll') },
    { id: 'budget', icon: PieChart, label: t('budget') },
    { id: 'reports', icon: FileText, label: t('reports') },
    { id: 'pricing', icon: Zap, label: t('plansPricing') },
  ];

  const sidebarContent = (
    <div style={{
      width: 'var(--sidebar-width)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.25rem',
      background: 'hsl(var(--bg-sidebar))',
      borderRight: '1px solid hsl(var(--border))',
      position: 'relative',
      zIndex: 100,
    }}>
      {/* ── LOGO & HEADER ── */}
      <div style={{ padding: '0 0.75rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Storehouse Finance"
            style={{ width: '130px', height: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          {isMobile && (
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--success))' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Production Node: US-E1
          </span>
        </div>
      </div>

      {/* ── NAVIGATION ── */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setOpen(false);
              }}
              className="btn-ghost"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '0.85rem 1.15rem',
                border: 'none',
                borderRadius: '12px',
                background: isActive ? 'hsla(var(--p)/0.1)' : 'transparent',
                color: isActive ? 'white' : 'hsl(var(--text-secondary))',
                position: 'relative',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-indicator"
                  style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px', background: 'hsl(var(--p))', borderRadius: '0 4px 4px 0' }} 
                />
              )}
              <item.icon 
                size={18} 
                strokeWidth={isActive ? 2.5 : 2} 
                style={{ color: isActive ? 'hsl(var(--p))' : 'inherit' }} 
              />
              <span style={{ fontWeight: isActive ? 800 : 600, fontSize: '0.875rem' }}>{item.label}</span>
              {isActive && (
                <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ marginLeft: 'auto' }}>
                  <ChevronRight size={14} color="hsla(var(--text-main)/0.3)" />
                </motion.div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── FOOTER SECTIONS ── */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
        
        <button 
          onClick={() => { setActiveTab('settings'); if (isMobile) setOpen(false); }}
          className="btn-ghost"
          style={{ 
            width: '100%', justifyContent: 'flex-start', border: 'none', 
            background: activeTab === 'settings' ? 'hsla(var(--p)/0.1)' : 'transparent',
            color: activeTab === 'settings' ? 'white' : 'inherit'
          }}
        >
          <SettingsIcon size={18} />
          <span style={{ fontWeight: activeTab === 'settings' ? 800 : 600 }}>{t('settings')}</span>
        </button>

        {/* Language & Action row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ 
            flex: 1, height: '36px', background: 'hsla(var(--text-main)/0.03)', 
            borderRadius: '10px', padding: '3px', display: 'flex', gap: '4px',
            border: '1px solid hsla(var(--text-main)/0.05)'
          }}>
            {(['en', 'es'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  flex: 1, borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: language === lang ? 'hsl(var(--p))' : 'transparent',
                  color: language === lang ? 'white' : 'hsl(var(--text-muted))',
                  fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', transition: 'all 0.2s'
                }}
              >
                {lang}
              </button>
            ))}
          </div>
          <button 
            onClick={onLogout}
            className="flex-center"
            style={{ width: '40px', height: '36px', borderRadius: '10px', background: 'hsla(var(--error)/0.1)', border: 'none', color: 'hsl(var(--error))', cursor: 'pointer' }}
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Shard Status */}
        <div style={{ 
          padding: '1rem', borderRadius: '12px', background: 'hsla(var(--p)/0.03)', 
          border: '1px solid hsla(var(--p)/0.1)', display: 'flex', gap: '12px', alignItems: 'center' 
        }}>
          <ShieldCheck size={18} color="hsl(var(--primary))" />
          <div style={{ fontSize: '0.7rem' }}>
            <div style={{ fontWeight: 800, color: 'white' }}>Shard Active</div>
            <div style={{ color: 'hsl(var(--text-muted))' }}>Encrypted & Verified</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isMobile && open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 90 }}
          />
        )}
      </AnimatePresence>

      <div style={{ 
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
        transform: !isMobile || open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
