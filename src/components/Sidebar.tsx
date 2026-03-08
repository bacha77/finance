import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  HeartHandshake,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  LayoutGrid,
  PieChart
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'accounting', icon: Wallet, label: 'Fund Accounting' },
    { id: 'departments', icon: LayoutGrid, label: 'Departments' },
    { id: 'expenses', icon: CreditCard, label: 'Expenses' },
    { id: 'members', icon: Users, label: 'Member Portal' },
    { id: 'giving', icon: HeartHandshake, label: 'Smart Giving' },
    { id: 'payroll', icon: CreditCard, label: 'Payroll' },
    { id: 'budget', icon: PieChart, label: 'Budget Configuration' },
    { id: 'reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <div className="sidebar" style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '2.5rem 1.25rem',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid var(--border)',
      background: 'linear-gradient(180deg, var(--bg-sidebar) 0%, rgba(15, 23, 42, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      zIndex: 100
    }}>
      <div className="logo" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '4rem',
        padding: '0 0.5rem'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 8px 16px -4px var(--primary-glow)'
        }}>
          <HeartHandshake size={26} />
        </div>
        <h1 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Sanctuary
        </h1>
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
        <button style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer'
        }}>
          <Settings size={20} />
          <span>Settings</span>
        </button>
        <button style={{
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
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
