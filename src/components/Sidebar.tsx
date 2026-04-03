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
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';

const NavItem = ({ id, item, isActive, setActiveTab, isMobile, setOpen }: any) => {
  const controls = useDragControls();
  if (!item) return null;
  
  return (
    <Reorder.Item
      key={id}
      value={id}
      dragListener={false}
      dragControls={controls}
      style={{ 
        position: 'relative', 
        listStyle: 'none', 
        display: 'flex', 
        alignItems: 'center',
        background: isActive ? 'transparent' : 'transparent',
        userSelect: 'none'
      }}
    >
      {/* ── HIGH-HIT REORDER HANDLE ── */}
      <div 
        onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
        }}
        style={{ 
            opacity: 0.3, cursor: 'grab', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '44px',
            position: 'relative', zIndex: 10,
            transition: 'opacity 0.2s'
        }} 
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.6'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.3'}
        className="drag-handle"
      >
        <GripVertical size={16} />
      </div>

      <motion.button
        whileHover={{ x: 4, backgroundColor: 'hsla(var(--text-main)/0.03)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setActiveTab(id);
          if (isMobile) setOpen(false);
        }}
        className="btn-ghost"
        style={{
          flex: 1,
          justifyContent: 'flex-start',
          padding: '0.85rem 0.75rem',
          border: 'none',
          borderRadius: '12px',
          background: 'transparent',
          color: isActive ? 'white' : 'hsl(var(--text-secondary))',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'color 0.2s',
          textAlign: 'left'
        }}
      >
        {/* ── ACTIVE INDICATOR ── */}
        {isActive && (
          <motion.div 
            layoutId="active-nav"
            style={{ 
              position: 'absolute', inset: 0, 
              background: 'hsla(var(--p)/0.1)', 
              borderRadius: '12px', zIndex: 0,
              borderLeft: '3px solid hsl(var(--p))'
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}

        <item.icon 
          size={18} 
          strokeWidth={isActive ? 2.5 : 2} 
          style={{ color: isActive ? 'hsl(var(--p))' : 'inherit', position: 'relative', zIndex: 1 }} 
        />
        <span style={{ fontWeight: isActive ? 800 : 600, fontSize: '0.875rem', position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
        {isActive && (
          <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ marginLeft: 'auto', position: 'relative', zIndex: 1 }}>
            <ChevronRight size={14} color="hsla(var(--text-main)/0.3)" />
          </motion.div>
        )}
      </motion.button>
    </Reorder.Item>
  );
};

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  church?: any;
  onOpenSupport?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, onLogout, open, setOpen, isMobile, church, onOpenSupport
}) => {
  const { language, setLanguage, t } = useLanguage();

  const [orderedItems, setOrderedItems] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar_menu_order');
    if (saved) return JSON.parse(saved);
    return ['dashboard', 'accounting', 'departments', 'expenses', 'members', 'payroll', 'budget', 'reports', 'pricing'];
  });

  React.useEffect(() => {
    localStorage.setItem('sidebar_menu_order', JSON.stringify(orderedItems));
  }, [orderedItems]);

  const menuItemsMap: Record<string, any> = {
    dashboard: { icon: LayoutDashboard, label: t('dashboard') },
    accounting: { icon: Wallet, label: t('accounting') },
    departments: { icon: LayoutGrid, label: t('departments') },
    expenses: { icon: CreditCard, label: t('expenses') },
    members: { icon: Users, label: t('members') },
    payroll: { icon: CreditCard, label: t('payroll') },
    budget: { icon: PieChart, label: t('budget') },
    reports: { icon: FileText, label: t('reports') },
    pricing: { icon: Zap, label: t('plansPricing') },
  };

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
      overflowY: 'auto'
    }}>
      {/* ── LOGO & HEADER ── */}
      <div style={{ padding: '0 0.75rem', marginBottom: '2.5rem' }}>
        <div 
          onClick={() => { setActiveTab('dashboard'); if (isMobile) setOpen(false); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', cursor: 'pointer' }}
        >
          {church?.logo_url ? (
            <img
              src={church.logo_url}
              alt={church.name}
              style={{ maxHeight: '42px', maxWidth: '160px', width: 'auto', height: 'auto', objectFit: 'contain' }}
            />
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Storehouse Finance"
              style={{ width: '130px', height: 'auto', filter: 'brightness(0) invert(1)' }}
            />
          )}
          {isMobile && (
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}>
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

        {/* ── QUICK ACTION HUB ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', padding: '0 0.25rem', marginTop: '1.5rem' }}>
          <button 
            onClick={() => setActiveTab('accounting')}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 0.5rem', borderRadius: '16px', background: 'hsla(var(--p)/0.08)',
              border: '1px solid hsla(var(--p)/0.2)', color: 'hsl(var(--p))', cursor: 'pointer'
            }}
          >
            <Wallet size={18} />
            <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>+ Giving</span>
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 0.5rem', borderRadius: '16px', background: 'hsla(var(--success)/0.08)',
              border: '1px solid hsla(var(--success)/0.2)', color: 'hsl(var(--success))', cursor: 'pointer'
            }}
          >
            <Users size={18} />
            <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>+ Member</span>
          </button>
        </div>
      </div>

      {/* ── NAVIGATION ── */}
      <Reorder.Group 
        axis="y" 
        values={orderedItems} 
        onReorder={setOrderedItems}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: 0, margin: 0, listStyle: 'none' }}
      >
        {orderedItems.map((id) => (
          <NavItem 
            key={id} 
            id={id} 
            item={menuItemsMap[id]} 
            isActive={activeTab === id} 
            setActiveTab={setActiveTab}
            isMobile={isMobile}
            setOpen={setOpen}
          />
        ))}
      </Reorder.Group>

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

        <button 
          onClick={onOpenSupport}
          className="btn-ghost"
          style={{ 
            width: '100%', justifyContent: 'flex-start', border: 'none', 
            background: 'transparent',
            color: 'inherit'
          }}
        >
          <HelpCircle size={18} />
          <span style={{ fontWeight: 600 }}>Help & Support</span>
        </button>

        {/* Language & Action row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, background: 'hsla(var(--text-main)/0.03)', borderRadius: '12px', padding: '4px', display: 'flex', gap: '4px', border: '1px solid hsla(var(--text-main)/0.05)' }}>
            {(['en', 'es'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className="flex-center"
                style={{
                  flex: 1, height: '32px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: language === lang ? 'hsl(var(--p))' : 'transparent',
                  color: language === lang ? 'white' : 'hsl(var(--text-muted))',
                  fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', transition: 'all 0.2s',
                  fontFamily: 'inherit'
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
