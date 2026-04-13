import React, { useState } from 'react';
import { 
  Building2, 
  DollarSign, 
  Lock, 
  CreditCard, 
  Palette, 
  Bell, 
  ShieldCheck, 
  ArrowRight,
  Globe,
  Settings as SettingsIcon,
  Save,
  ChevronLeft,
  Upload,
  Loader2,
  User,
  Mail,
  Camera,
  Clock,
  Trash2,
  AlertTriangle,
  RotateCcw,
  FileJson,
  History
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { getSubscriptionStatus } from '../lib/subscriptionConfig';
import { PLANS } from '../lib/trialConfig';
import Pricing from './Pricing';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsProps {
  churchData?: any;
  onUpdateChurch?: (data: any) => Promise<void>;
  initialSection?: 'grid' | 'user_profile' | 'identity' | 'financial' | 'billing' | 'security' | 'appearance' | 'notifications' | 'pricing';
  profile?: any;
}

const Settings: React.FC<SettingsProps> = ({ churchData, onUpdateChurch, initialSection = 'grid', profile }) => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<any>(initialSection);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetCountdown, setResetCountdown] = useState(0);

  React.useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Mock data for initial UI
  const [formData, setFormData] = useState({
    name: churchData?.name || 'My Church',
    address: churchData?.address || '',
    website: churchData?.website || '',
    currency: churchData?.currency || 'USD',
    taxId: churchData?.tax_id || '',
    fiscalYearStart: churchData?.fiscal_year_start || 'January',
    logo_url: churchData?.logo_url || '',
    theme: 'Dark',
    brandColor: '#6366f1',
    density: 'Compact',
    mfaEnabled: false,
    taxExempt: true,
    autoReceipts: false,
    notifications: {
      budget: true,
      payroll: true,
      security: true,
      giving: false,
      announcements: true
    }
  });

  const [isUploading, setIsUploading] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Sanitize filename: remove spaces and special characters
      const cleanFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const fileName = `logo_${churchData?.id || Date.now()}_${cleanFileName}`;
      
      // Try 'logos' bucket first
      let { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      // Fallback to 'receipts' bucket if 'logos' fails
      if (error) {
        console.warn('Logos bucket failed, trying receipts bucket...', error);
        const retry = await supabase.storage
          .from('receipts')
          .upload(fileName, file);
        data = retry.data;
        error = retry.error;
      }

      if (error) {
         // Show specific error from Supabase
         throw new Error(error.message || 'Unknown storage error');
      }

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from(data.path.startsWith('receipts/') ? 'receipts' : 'logos')
          .getPublicUrl(data.path);

        setFormData({ ...formData, logo_url: publicUrl });
      }
    } catch (err: any) {
      console.error('Final upload error:', err);
      // SHOW ACTUAL ERROR to help debug
      alert(`Upload failed: ${err.message || err}. Ensure your bucket policies allow Authenticated uploads.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setShowCancelModal(true);
  };

  const confirmCancellation = async () => {
    if (!onUpdateChurch || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      await onUpdateChurch({ 
        cancel_at_period_end: true, 
        cancellation_reason: cancelReason 
      });
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleHardReset = async () => {
    if (!churchData?.id || resetConfirmText !== churchData.name) return;
    setIsResetting(true);
    try {
        const cid = churchData.id;
        
        // Helper to ignore "column/table missing" errors
        const safeReset = async (promise: Promise<any>, description: string) => {
            const { error } = await promise;
            if (error) {
                console.warn(`Safe Reset: Component "${description}" failed. This is often normal if the component is not in use or the schema is simplified.`, error);
            }
            return error;
        };

        console.info("Initiating Deep Reset for Church ID:", cid);

        // Core Financials (Critical)
        const errLedger = await safeReset(supabase.from('ledger').delete().eq('church_id', cid), "Ledger History");
        const errFunds = await safeReset(supabase.from('funds').update({ balance: 0 }).eq('church_id', cid), "Fund Balances");
        
        // Extended Data
        await safeReset(supabase.from('payroll').delete().eq('church_id', cid), "Payroll History");
        await safeReset(supabase.from('departments').update({ spent_so_far: 0 }).eq('church_id', cid), "Department Spending");
        await safeReset(supabase.from('goals').update({ current_amount: 0 }).eq('church_id', cid), "Strategic Goals");
        await safeReset(supabase.from('budgets').delete().eq('church_id', cid), "Annual Budgets");
        await safeReset(supabase.from('documents').delete().eq('church_id', cid), "Vault Documents");
        
        // Members & Staff
        await safeReset(supabase.from('members').update({ tithe_total: 0 }).eq('church_id', cid), "Member Tithing");
        await safeReset(supabase.from('staff').update({ 
            status: 'Pending', 
            last_paid: 'Never' 
        }).eq('church_id', cid), "Staff Status");
        
        if (errLedger || errFunds) {
            console.error('Critical reset components failed:', { errLedger, errFunds });
            throw new Error("Hard Reset failed for core financial components. Please check your administrative permissions.");
        }
        
        // Purge Local Storage to prevent stale data hydration
        const keysToPurge = [
            'sanctuary_funds',
            'sanctuary_ledger',
            'sanctuary_members',
            'sanctuary_departments',
            'sanctuary_payroll_staff',
            'sanctuary_budgets',
            'sanctuary_expense_categories',
            'sanctuary_sidebar_collapsed',
            'stardust_ui_state'
        ];
        keysToPurge.forEach(key => localStorage.removeItem(key));
        
        alert("Board Cleared Successfully. The workspace has been reset to its Day One state.");
        setActiveSection('grid');
        setShowResetConfirm(false);
        
        // Force full application synchronization
        window.location.reload();
    } catch (err: any) {
        console.error('Reset system error:', err);
        alert(err.message || "Failed to reset data. Ensure you have owner-level permissions.");
    } finally {
        setIsResetting(false);
    }
  };

  const handleUndoCancellation = async () => {
    if (!onUpdateChurch) return;
    try {
      await onUpdateChurch({ cancel_at_period_end: false });
    } catch (err) {
      console.error('Undo cancel error:', err);
    }
  };

  const settingsCards = [
    {
      id: 'user_profile',
      title: t('header_profile'),
      desc: 'Manage your personal account details and public name.',
      icon: User,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.1)'
    },
    {
      id: 'identity',
      title: t('churchIdentity'),
      desc: t('churchIdentityDesc'),
      icon: Building2,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.1)'
    },
    {
      id: 'financial',
      title: t('financialControls'),
      desc: t('financialControlsDesc'),
      icon: DollarSign,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)'
    },
    {
      id: 'billing',
      title: t('billing'),
      desc: t('billingDesc'),
      icon: CreditCard,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)'
    },
    {
      id: 'security',
      title: t('security'),
      desc: t('securityDesc'),
      icon: Lock,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)'
    },
    {
      id: 'appearance',
      title: t('appearance'),
      desc: t('appearanceDesc'),
      icon: Palette,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.1)'
    },
    {
      id: 'notifications',
      title: t('notifications'),
      desc: t('notificationsDesc'),
      icon: Bell,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.1)'
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      desc: 'System diagnostics and congregational data reset.',
      icon: RotateCcw,
      color: '#64748b',
      bg: 'rgba(100, 116, 139, 0.1)'
    }
  ];

  const renderGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {settingsCards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ y: -5, borderColor: card.color + '66', boxShadow: `0 10px 30px -10px ${card.color}33` }}
          onClick={() => setActiveSection(card.id as any)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '1.25rem',
            padding: '1.75rem',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: card.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            color: card.color
          }}>
            <card.icon size={26} strokeWidth={2} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{card.title}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>{card.desc}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: card.color, fontSize: '0.8rem', fontWeight: 700 }}>
            {t('configure')} <ArrowRight size={14} />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderSectionHeader = (title: string, desc: string) => (
    <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
      <div>
        <button 
          onClick={() => setActiveSection('grid')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', 
            background: 'none', border: 'none', color: 'var(--text-muted)', 
            cursor: 'pointer', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 
          }}
        >
          <ChevronLeft size={16} /> {t('backToSettings')}
        </button>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em' }}>{title}</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{desc}</p>
      </div>
      <button 
        className="btn btn-primary"
        style={{ padding: '0.75rem 1.75rem' }}
        onClick={async () => {
            if (onUpdateChurch) await onUpdateChurch(formData);
            alert(t('success'));
            setActiveSection('grid');
        }}
      >
        <Save size={18} /> {t('saveChanges')}
      </button>
    </div>
  );

  const renderIdentity = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {renderSectionHeader(t('churchIdentity'), t('manageChurchAppearance'))}
      
      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: isMobile ? '1.25rem' : '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{t('churchName')}</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: '0.75rem', color: 'white', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{t('website')}</label>
              <div style={{ position: 'relative' }}>
                <Globe size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://church.org"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem 0.875rem 0.875rem 2.5rem', borderRadius: '0.75rem', color: 'white', outline: 'none' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{t('taxIdEin')}</label>
              <input 
                type="text" 
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="00-0000000"
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: '0.75rem', color: 'white', outline: 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{t('physicalAddress')}</label>
            <textarea 
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Church St, City, State, ZIP"
              rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: '0.75rem', color: 'white', outline: 'none', resize: 'none' }}
            />
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Organization Branding</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div 
              onClick={() => !isUploading && logoInputRef.current?.click()}
              style={{ 
                width: '100px', height: '100px', borderRadius: '16px', 
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer', position: 'relative'
              }}
            >
              {isUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                   <Loader2 className="spin" size={24} color="var(--primary-light)" />
                </div>
              )}
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Upload size={24} color="var(--text-muted)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>UPLOAD</div>
                </div>
              )}
              <input 
                type="file" 
                ref={logoInputRef} 
                onChange={handleLogoUpload} 
                style={{ display: 'none' }} 
                accept="image/*" 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>LOGO URL</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: '0.75rem', color: 'white', outline: 'none' }}
                />
                <button 
                  onClick={() => logoInputRef.current?.click()}
                  className="btn btn-ghost" 
                  style={{ padding: '0 1.5rem' }}
                  disabled={isUploading}
                >
                  <Upload size={18} />
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Recommended: PNG or SVG with transparent background.</p>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ShieldCheck size={24} color="#10b981" />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{t('verifiedStatus')}</div>
            <div style={{ color: 'rgba(16, 185, 129, 0.8)', fontSize: '0.8rem' }}>{t('verifiedStatusDesc')}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderSecurity = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {renderSectionHeader(t('security'), t('securityDesc'))}
      
      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('adminAccess')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>PA</div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{t('primaryAdmin')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{churchData?.contact_email || 'admin@church.org'}</div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>Owner</span>
            </div>
            <button 
              className="btn btn-ghost" 
              style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
              onClick={() => {
                const email = prompt('Enter email:');
                if (email) alert(t('success'));
              }}
            >
              + {t('inviteTeamMember')}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('securityProtocols')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{t('mfa')}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('mfaDesc')}</div>
            </div>
            <div 
              onClick={() => setFormData({ ...formData, mfaEnabled: !formData.mfaEnabled })}
              style={{ 
                width: '44px', height: '24px', 
                background: formData.mfaEnabled ? 'var(--primary)' : 'var(--border)', 
                borderRadius: '100px', position: 'relative', cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
               <motion.div 
                 animate={{ x: formData.mfaEnabled ? 24 : 4 }}
                 transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                 style={{ position: 'absolute', top: '4px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} 
               />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderBilling = () => {
    const subStatus = churchData ? getSubscriptionStatus(churchData) : null;
    const currentPlan = PLANS.find(p => p.id === (subStatus?.currentPlan || 'trial'));

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        {renderSectionHeader(t('billing'), t('billingDesc'))}
        
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {subStatus?.isBlocked && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={20} color="#ef4444" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>Subscription Expired</div>
                <div style={{ color: 'rgba(239, 68, 68, 0.8)', fontSize: '0.85rem' }}>Your trial has ended. Please upgrade to a paid plan to regain full access to all features.</div>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ background: '#ef4444', boxShadow: '0 8px 24px -6px rgba(239, 68, 68, 0.5)' }}
                onClick={() => setActiveSection('pricing')}
              >
                {t('upgradeNow')}
              </button>
            </div>
          )}

          {subStatus?.isCancelled && (
            <div style={{ background: 'hsla(var(--p)/0.1)', border: '1px solid hsla(var(--p)/0.2)', padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsla(var(--p)/0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="hsl(var(--p))" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>Cancellation Pending</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Your subscription will remain active until <strong>{subStatus.subscriptionEndDate?.toLocaleDateString()}</strong>. After this date, your account will be downgraded to the free plan.
                </div>
              </div>
              <button 
                onClick={handleUndoCancellation}
                className="btn btn-ghost" 
                style={{ background: 'white', color: 'black', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800 }}
              >
                Undo Cancellation
              </button>
            </div>
          )}

          <div style={{ 
            background: `linear-gradient(135deg, ${currentPlan?.color}26 0%, rgba(15, 23, 42, 0.6) 100%)`, 
            padding: '2rem', borderRadius: '1.5rem', border: `1px solid ${currentPlan?.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: currentPlan?.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Current Plan</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textTransform: 'capitalize' }}>{currentPlan?.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {subStatus?.accessStatus === 'active_trial' || subStatus?.accessStatus === 'trial_warning' 
                  ? `Free trial ends in ${subStatus.daysRemaining} days (${subStatus.subscriptionEndDate?.toLocaleDateString()})`
                  : subStatus?.accessStatus === 'paid_active'
                  ? `Subscription active — Renews on ${subStatus.subscriptionEndDate?.toLocaleDateString()}`
                  : `Subscription ${subStatus?.accessStatus.replace('_', ' ')}`}
              </div>
            </div>
            {!subStatus?.isBlocked && (
              <button 
                className="btn btn-primary" 
                style={{ background: currentPlan?.color, boxShadow: `0 8px 24px -6px ${currentPlan?.color}80` }}
                onClick={() => setActiveSection('pricing')}
              >
                Upgrade Plan
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
               <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>{t('paymentMethod')}</h4>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '24px', background: '#003087', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span style={{ fontSize: '0.6rem', color: 'white', fontWeight: 900 }}>PayPal</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>Connected (Default)</div>
               </div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
               <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>{t('usageHistory')}</h4>
                <button 
                  onClick={() => alert(t('success'))}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  {t('viewAllInvoices')} →
                </button>
            </div>
          </div>

          {!subStatus?.isCancelled && (
            <div style={{ marginTop: '0.5rem', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid hsla(var(--error)/0.1)', background: 'hsla(var(--error)/0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>Cancel Subscription</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stop automatic renewal at the end of your billing cycle.</div>
              </div>
              <button 
                onClick={handleCancelSubscription}
                className="btn btn-ghost" 
                style={{ color: 'hsl(var(--error))', fontWeight: 700 }}
              >
                {t('cancelSubscription') || 'Cancel Subscription'}
              </button>
            </div>
          )}

          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.25rem' }}>{t('planLimits')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Member Limit</span>
                <span style={{ color: 'white', fontWeight: 700 }}>{currentPlan?.memberLimit ? `${currentPlan.memberLimit} members` : 'Unlimited'}</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '15%', height: '100%', background: currentPlan?.color, borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                You are currently using 15 of {currentPlan?.memberLimit || '∞'} allowed members.
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    );
  };

  const renderPricing = () => (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveSection('billing')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', 
            background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'white', 
            cursor: 'pointer', padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700 
          }}
        >
          <ChevronLeft size={16} /> {t('backToBilling')}
        </button>
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: '2rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <Pricing 
          currentPlan={churchData?.plan} 
          churchId={churchData?.id} 
          onUpgradeSuccess={() => {
            alert('Congratulations! Your church has been upgraded successfully.');
            window.location.reload(); // Refresh to update all session states
          }} 
        />
      </div>
    </motion.div>
  );

  const renderAppearance = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {renderSectionHeader(t('appearance'), t('appearanceDesc'))}
      
      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('themeMode')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {['Light', 'Dark', 'System'].map(mode => (
              <button 
                key={mode} 
                onClick={() => setFormData({ ...formData, theme: mode })}
                style={{
                  padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)',
                  background: formData.theme === mode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                  color: formData.theme === mode ? 'var(--primary-light)' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', 
                  borderColor: formData.theme === mode ? 'var(--primary-light)' : 'var(--border)',
                  transition: 'all 0.2s'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('brandColor')}</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'].map(color => (
              <div 
                key={color} 
                onClick={() => setFormData({ ...formData, brandColor: color })}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', background: color,
                  cursor: 'pointer', border: formData.brandColor === color ? '3px solid white' : '2px solid transparent',
                  boxShadow: formData.brandColor === color ? `0 0 15px ${color}` : 'none',
                  transition: 'all 0.2s'
                }} 
              />
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('displayDensity')}</h3>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {['Compact', 'Spacious'].map(d => (
              <label 
                key={d}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', 
                  color: formData.density === d ? 'white' : 'var(--text-muted)', 
                  fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600
                }}
              >
                <input 
                  type="radio" 
                  name="density" 
                  checked={formData.density === d} 
                  onChange={() => setFormData({ ...formData, density: d })}
                  style={{ accentColor: 'var(--primary)' }}
                /> {d}
              </label>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderUserProfile = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {renderSectionHeader(t('header_profile'), 'Manage your personal account information and appearance.')}
      
      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
             <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>
                {profile?.full_name?.charAt(0) || 'U'}
             </div>
             <button style={{ position: 'absolute', bottom: 0, right: 0, width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                <Camera size={14} />
             </button>
          </div>
          <div>
             <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>{profile?.full_name}</h3>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{profile?.role || 'Organization Member'}</p>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  defaultValue={profile?.full_name}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem 0.875rem 0.875rem 2.5rem', borderRadius: '0.75rem', color: 'white', outline: 'none' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  disabled
                  defaultValue={profile?.email || 'user@example.com'}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '0.875rem 0.875rem 0.875rem 2.5rem', borderRadius: '0.75rem', color: 'var(--text-muted)', outline: 'none', cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '1rem' }}>
           <h4 style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Account Security</h4>
           <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>To change your password or update sensitive account information, please visit the security section.</p>
           <button 
             onClick={() => setActiveSection('security')}
             className="btn btn-ghost" 
             style={{ fontSize: '0.75rem', color: '#ef4444' }}
           >
              Update Security Settings →
           </button>
        </div>
      </div>
    </motion.div>
  );

  const renderNotifications = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {renderSectionHeader(t('notifications'), t('notificationsDesc'))}
      
      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('emailAlerts')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { id: 'budget', label: 'Budget Thresholds', desc: 'Notify when a department exceeds 80% of its monthly budget.' },
              { id: 'payroll', label: 'Payroll Reminders', desc: 'Receive alerts 2 days before scheduled payroll processing.' },
              { id: 'security', label: 'Security Events', desc: 'Alert for new admin logins or permission changes.' },
              { id: 'giving', label: 'Giving Reports', desc: 'Weekly summary of tithes and smart giving activity.' }
            ].map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
                <div 
                  onClick={() => setFormData({ 
                    ...formData, 
                    notifications: { ...formData.notifications, [item.id]: !((formData.notifications as any)[item.id]) } 
                  })}
                  style={{ 
                    width: '44px', height: '24px', 
                    background: (formData.notifications as any)[item.id] ? 'var(--primary)' : 'var(--border)', 
                    borderRadius: '100px', position: 'relative', cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                   <motion.div 
                     animate={{ x: (formData.notifications as any)[item.id] ? 24 : 4 }}
                     transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                     style={{ position: 'absolute', top: '4px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} 
                   />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('systemAnnouncements')}</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
             <input 
               type="checkbox" 
               checked={formData.notifications.announcements} 
               onChange={() => setFormData({ 
                 ...formData, 
                 notifications: { ...formData.notifications, announcements: !formData.notifications.announcements } 
               })}
               style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} 
             />
             <div style={{ fontSize: '0.9rem', color: 'white' }}>Receive updates about new platform features and maintenance.</div>
          </label>
        </div>
      </div>
    </motion.div>
  );

  const renderFinancial = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {renderSectionHeader(t('financialControls'), t('fiscalSettings'))}
      
      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('regionalCurrency')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{t('baseCurrency')}</label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: '0.75rem', color: 'white', outline: 'none', appearance: 'none' }}
              >
                <option value="USD" style={{ background: '#0f172a' }}>USD - US Dollar ($)</option>
                <option value="EUR" style={{ background: '#0f172a' }}>EUR - Euro (€)</option>
                <option value="GBP" style={{ background: '#0f172a' }}>GBP - British Pound (£)</option>
                <option value="CAD" style={{ background: '#0f172a' }}>CAD - Canadian Dollar ($)</option>
                <option value="AUD" style={{ background: '#0f172a' }}>AUD - Australian Dollar ($)</option>
                <option value="NGN" style={{ background: '#0f172a' }}>NGN - Nigerian Naira (₦)</option>
                <option value="KES" style={{ background: '#0f172a' }}>KES - Kenyan Shilling (KSh)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{t('fiscalYearStart')}</label>
              <select 
                value={formData.fiscalYearStart}
                onChange={(e) => setFormData({ ...formData, fiscalYearStart: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: '0.75rem', color: 'white', outline: 'none', appearance: 'none' }}
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                  <option key={month} value={month} style={{ background: '#0f172a' }}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>{t('taxCompliance')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{t('taxExemptStatus')}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('taxExemptDesc')}</div>
              </div>
              <div 
                onClick={() => setFormData({ ...formData, taxExempt: !formData.taxExempt })}
                style={{ 
                  width: '44px', height: '24px', 
                  background: formData.taxExempt ? 'var(--primary)' : 'var(--border)', 
                  borderRadius: '100px', position: 'relative', cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                 <motion.div 
                   animate={{ x: formData.taxExempt ? 24 : 4 }}
                   transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                   style={{ position: 'absolute', top: '4px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} 
                 />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{t('autoTaxReceipts')}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('autoTaxReceiptsDesc')}</div>
              </div>
              <div 
                onClick={() => setFormData({ ...formData, autoReceipts: !formData.autoReceipts })}
                style={{ 
                  width: '44px', height: '24px', 
                  background: formData.autoReceipts ? 'var(--primary)' : 'var(--border)', 
                  borderRadius: '100px', position: 'relative', cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                 <motion.div 
                   animate={{ x: formData.autoReceipts ? 24 : 4 }}
                   transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                   style={{ position: 'absolute', top: '4px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} 
                 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <AnimatePresence mode="wait">
        {activeSection === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <SettingsIcon size={20} color="var(--primary-light)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('systemConfiguration')}</span>
              </div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>{t('workspaceSettings')}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.4rem' }}>{t('manageOrgDetails')}</p>
            </div>
            {renderGrid()}
          </motion.div>
        ) : activeSection === 'user_profile' ? (
          renderUserProfile()
        ) : activeSection === 'identity' ? (
          renderIdentity()
        ) : activeSection === 'financial' ? (
          renderFinancial()
        ) : activeSection === 'security' ? (
          renderSecurity()
        ) : activeSection === 'billing' ? (
          renderBilling()
        ) : activeSection === 'appearance' ? (
          renderAppearance()
        ) : activeSection === 'notifications' ? (
          renderNotifications()
        ) : activeSection === 'pricing' ? (
          renderPricing()
        ) : activeSection === 'maintenance' ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {renderSectionHeader('Maintenance', 'Manage system health and data lifecycle.')}
            <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', color: 'var(--primary-light)' }}>
                  <ShieldCheck size={24} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Data Safeguard & Backups</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Your church data is double-protected. In addition to Supabase's automatic 7-day point-in-time recovery, you can download a complete manual backup of your congregational records at any time.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button 
                      onClick={async () => {
                        if (!churchData?.id) return;
                        setIsBackingUp(true);
                        try {
                            const cid = churchData.id;
                            const [{ data: ledger }, { data: funds }, { data: members }, { data: depts }] = await Promise.all([
                                supabase.from('ledger').select('*').eq('church_id', cid),
                                supabase.from('funds').select('*').eq('church_id', cid),
                                supabase.from('members').select('*').eq('church_id', cid).select('name, contact'),
                                supabase.from('departments').select('*').eq('church_id', cid)
                            ]);

                            const backup = {
                                organization: churchData.name,
                                timestamp: new Date().toISOString(),
                                schema_version: 'v8',
                                data: { ledger, funds, members, depts }
                            };

                            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `Storehouse_Backup_${churchData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } catch (err) {
                            console.error('Manual backup failed:', err);
                            alert("Backup failed. Please check your connection.");
                        } finally {
                            setIsBackingUp(false);
                        }
                      }}
                      className="btn btn-primary"
                      style={{ height: '56px', fontSize: '0.9rem', fontWeight: 800 }}
                      disabled={isBackingUp}
                    >
                      {isBackingUp ? <Loader2 className="spin" size={20} /> : <FileJson size={20} />} 
                      {isBackingUp ? 'Generating Archive...' : 'Download Manual Backup (.json)'}
                    </button>

                    <button 
                      onClick={() => alert("Point-In-Time-Recovery (PITR) is active for this tenant. Daily snapshots are stored for 7 days. Contact support for emergency database rolling.")}
                      className="btn btn-ghost"
                      style={{ height: '56px', fontSize: '0.9rem', fontWeight: 800, background: 'rgba(255,255,255,0.03)' }}
                    >
                      <History size={20} /> View Recovery Logs
                    </button>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.03)', padding: '2rem', borderRadius: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', color: '#ef4444' }}>
                  <AlertTriangle size={24} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Danger Zone: Congregational Hard Reset</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Clicking the button below will permanently delete all transaction history (ledger), clear all payroll records, and reset all fund balances to zero for <strong>{churchData?.name}</strong>. This action is <strong>irreversible</strong> and will affect all staff members.
                </p>
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="btn btn-primary"
                  style={{ background: '#ef4444', border: 'none', padding: '0.875rem 2rem', fontWeight: 800, color: 'white' }}
                >
                  <Trash2 size={18} /> Hard Reset Church Data
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {/* Cancellation Reason Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                width: '100%', maxWidth: '400px', background: 'var(--bg-card)',
                borderRadius: '1.5rem', border: '1px solid var(--border)', padding: '2rem'
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>Cancel Subscription</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                We're sorry to see you go! Please let us know why you're cancelling so we can improve our service.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Reason (Mandatory)</label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us what influenced your decision..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: '0.75rem', color: 'white', outline: 'none', resize: 'none', height: '100px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ flex: 1 }}
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Subscription
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, background: '#ef4444' }}
                  disabled={!cancelReason.trim() || isCancelling}
                  onClick={confirmCancellation}
                >
                  {isCancelling ? <Loader2 className="spin" size={18} /> : 'Confirm Cancellation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hard Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2000, padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onViewportEnter={() => {
                setResetCountdown(5);
                const timer = setInterval(() => {
                  setResetCountdown(prev => {
                    if (prev <= 1) {
                      clearInterval(timer);
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 1000);
              }}
              style={{
                width: '100%', maxWidth: '480px', background: 'var(--bg-card)',
                borderRadius: '2rem', border: '1px solid #ef4444', padding: '3.5rem',
                textAlign: 'center'
              }}
            >
              <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: '#ef4444' }}>
                <AlertTriangle size={40} />
              </div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', color: 'white', letterSpacing: '-0.02em' }}>Final Institutional Warning</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                This will physically purge all ledger history, payroll logs, and reset all fund balances to zero for **{churchData?.name}**. This action cannot be undone.
              </p>

              <div style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                  TYPE NAME OF CHURCH TO AUTHORIZE:
                </label>
                <input 
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder={churchData?.name}
                  style={{ 
                    width: '100%', 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    border: '2px solid rgba(239, 68, 68, 0.2)', 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    color: 'white', 
                    fontWeight: 700,
                    fontSize: '1rem',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                  Verification: <span style={{ color: resetConfirmText === churchData?.name ? '#10b981' : 'var(--text-muted)', fontWeight: 700 }}>
                    {resetConfirmText === churchData?.name ? 'Identity Confirmed' : 'Awaiting Match'}
                  </span>
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ 
                    background: resetConfirmText === churchData?.name && resetCountdown === 0 ? '#ef4444' : 'rgba(255,255,255,0.05)', 
                    color: resetConfirmText === churchData?.name && resetCountdown === 0 ? 'white' : 'rgba(255,255,255,0.2)',
                    height: '60px', 
                    fontSize: '1rem', 
                    fontWeight: 900,
                    border: 'none',
                    cursor: resetConfirmText === churchData?.name && resetCountdown === 0 ? 'pointer' : 'not-allowed'
                  }}
                  disabled={isResetting || resetConfirmText !== churchData?.name || resetCountdown > 0}
                  onClick={handleHardReset}
                >
                  {isResetting ? <Loader2 className="spin" size={24} /> : resetCountdown > 0 ? `LOCKED (${resetCountdown}s)` : 'YES, PERMANENTLY WIPE ALL DATA'}
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ height: '52px', fontSize: '1rem', fontWeight: 800 }}
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetConfirmText('');
                  }}
                >
                  ABORT RESET
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
