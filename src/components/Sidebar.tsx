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
  Languages
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';


interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  isOpen: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, isOpen, isMobile, onToggle }) => {
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

  return (
    <div className="sidebar" style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1.25rem',
      position: isMobile ? 'fixed' : 'fixed',
      left: 0,
      top: 0,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      overflowY: 'auto',
      borderRight: '1px solid var(--border)',
      background: 'linear-gradient(180deg, var(--bg-sidebar) 0%, rgba(15, 23, 42, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      zIndex: 100,
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div className="logo" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        padding: '0 0.5rem'
      }}>
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Storehouse Finance"
          style={{
            width: isMobile ? '120px' : '100%',
            maxWidth: '160px',
            height: 'auto',
            filter: 'drop-shadow(0 4px 16px rgba(124,58,237,0.4))',
          }}
        />
        {isMobile && (
          <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={activeTab === item.id ? "active-tab" : ""}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 18px',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: activeTab === item.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: activeTab === item.id ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              marginBottom: '8px',
              textAlign: 'left',
              boxShadow: activeTab === item.id ? 'inset 0 0 0 1px rgba(99, 102, 241, 0.2)' : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {activeTab === item.id && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: '25%',
                height: '50%',
                width: '4px',
                background: 'var(--primary)',
                borderRadius: '0 4px 4px 0'
              }} />
            )}
            <item.icon
              size={20}
              color={activeTab === item.id ? 'var(--primary-light)' : 'currentColor'}
              strokeWidth={activeTab === item.id ? 2.5 : 2}
            />
            <span style={{
              flex: 1,
              fontWeight: activeTab === item.id ? 700 : 500,
              fontSize: '0.925rem'
            }}>
              {item.label}
            </span>
            {activeTab === item.id && <ChevronRight size={16} color="var(--primary-light)" />}
          </button>
        ))}
      </nav>

      <div className="footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('settings')}
          className={activeTab === 'settings' ? "active-tab" : ""}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: activeTab === 'settings' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            color: activeTab === 'settings' ? 'var(--text-main)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.25s'
          }}
        >
          <SettingsIcon size={20} color={activeTab === 'settings' ? 'var(--primary-light)' : 'currentColor'} />
          <span style={{ fontWeight: activeTab === 'settings' ? 700 : 500 }}>{t('settings')}</span>
        </button>

        {/* Language Switcher */}
        <div style={{ marginTop: '0.75rem', padding: '0 0.5rem', marginBottom: '0.75rem' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {(['en', 'es'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: language === lang ? 'var(--primary)' : 'transparent',
                  color: language === lang ? 'white' : 'var(--text-muted)',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                {lang === language && <Languages size={10} />}
                {lang}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onLogout} style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'transparent',
          color: '#ef4444',
          cursor: 'pointer'
        }}>
          <LogOut size={20} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
