import React, { useState, useCallback } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer, FUNDING } from '@paypal/react-paypal-js';
import { supabase } from '../lib/supabase';
import { PLANS } from '../lib/trialConfig';
import { PAYPAL_CLIENT_ID, getNextBillingDate } from '../lib/subscriptionConfig';
import { useLanguage } from '../contexts/LanguageContext';
import type { SubscriptionStatus } from '../lib/subscriptionConfig';
import { Shield, Check, Star, Zap, Crown, CreditCard, Lock, LogOut, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentWallProps {
  churchId: string;
  churchName: string;
  subStatus: SubscriptionStatus;
  onPaymentSuccess: () => void;
  onLogout?: () => void;
  onOpenSupport?: () => void;
}

const PAID_PLANS = PLANS.filter(p => p.id !== 'trial');

const PLAN_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  growth: Star,
  enterprise: Crown,
};

// ── PayPal Buttons Wrapper ─────────────────────────────────────────────────
function PayPalButtonsWrapper({
  plan,
  churchId,
  isAnnual,
  useSubscriptionSdk,
  onSuccess,
  onError,
}: {
  plan: typeof PAID_PLANS[0];
  churchId: string;
  isAnnual: boolean;
  useSubscriptionSdk: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [{ isPending }] = usePayPalScriptReducer();

  const totalAmount = isAnnual ? (plan.price! * 12 * 0.8).toFixed(2) : plan.price!.toFixed(2);
  const periodLabel = isAnnual ? '1 Year (Annual - 20% Off)' : '30 days';

  const createOrder = useCallback(
    (_data: unknown, actions: any) => {
      return actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: `Storehouse Finance — ${plan.name} Plan (${periodLabel})`,
            custom_id: JSON.stringify({ churchId, planId: plan.id, isAnnual }),
            amount: {
              currency_code: 'USD',
              value: totalAmount,
            },
          },
        ],
      });
    },
    [plan.name, plan.id, churchId, isAnnual, periodLabel, totalAmount]
  );

  const onApprove = useCallback(
    async (_data: unknown, actions: any) => {
      try {
        const order = await actions.order.capture();
        const orderId = order.id;
        const nextBilling = getNextBillingDate(isAnnual);
        const paymentMethod = `PayPal (${isAnnual ? 'Annual' : 'Monthly'})`;
        const paymentNotes = `${plan.name} Plan — Order #${orderId}`;

        const { error: rpcError } = await supabase.rpc('record_subscription_payment', {
          p_church_id: churchId,
          p_plan: plan.id,
          p_end_date: nextBilling,
          p_order_id: orderId,
          p_amount: parseFloat(totalAmount),
          p_method: paymentMethod,
          p_notes: paymentNotes,
        });

        if (rpcError) {
          const { error } = await supabase
            .from('churches')
            .update({
              plan: plan.id,
              subscription_end_date: nextBilling,
              paypal_order_id: orderId,
              cancel_at_period_end: false,
            })
            .eq('id', churchId);

          if (error) throw new Error(error.message);

          try {
            await supabase.from('admin_payments').insert({
              church_id: churchId,
              amount: parseFloat(totalAmount),
              payment_method: paymentMethod,
              notes: paymentNotes,
            });
          } catch {
            // Non-blocking if RLS restricts client insert
          }
        }

        onSuccess();
      } catch (err: any) {
        onError(err.message || 'Payment failed. Please try again.');
      }
    },
    [plan, churchId, isAnnual, totalAmount, onSuccess, onError]
  );

  if (isPending) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Loading payment options...
      </div>
    );
  }

  return useSubscriptionSdk ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PayPalButtons
        fundingSource={FUNDING.CARD}
        style={{ layout: 'vertical', color: 'black', shape: 'rect', label: 'subscribe', height: 45 }}
        createSubscription={(_data, actions) => {
          return actions.subscription.create({
            plan_id: plan.paypalPlanId!,
            custom_id: JSON.stringify({ churchId, planId: plan.id, isAnnual: false }),
          });
        }}
        onApprove={async (data, _actions) => {
          try {
            const subscriptionId = data.subscriptionID;
            const nextBilling = getNextBillingDate(isAnnual);
            const { error } = await supabase
              .from('churches')
              .update({
                plan: plan.id,
                subscription_end_date: nextBilling,
                paypal_order_id: `sub_${subscriptionId}`,
                cancel_at_period_end: false,
              })
              .eq('id', churchId);
            if (error) throw new Error(error.message);
            onSuccess();
          } catch (err: any) {
            onError(err.message || 'Payment failed. Please try again.');
          }
        }}
        onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
        forceReRender={[plan.id, useSubscriptionSdk, isAnnual]}
      />
      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe', height: 45 }}
        createSubscription={(_data, actions) => {
          return actions.subscription.create({
            plan_id: plan.paypalPlanId!,
            custom_id: JSON.stringify({ churchId, planId: plan.id, isAnnual: false }),
          });
        }}
        onApprove={async (data, _actions) => {
          try {
            const subscriptionId = data.subscriptionID;
            const nextBilling = getNextBillingDate(isAnnual);
            const { error } = await supabase
              .from('churches')
              .update({
                plan: plan.id,
                subscription_end_date: nextBilling,
                paypal_order_id: `sub_${subscriptionId}`,
                cancel_at_period_end: false,
              })
              .eq('id', churchId);
            if (error) throw new Error(error.message);
            onSuccess();
          } catch (err: any) {
            onError(err.message || 'Payment failed. Please try again.');
          }
        }}
        onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
        forceReRender={[plan.id, useSubscriptionSdk, isAnnual]}
      />
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PayPalButtons
        fundingSource={FUNDING.CARD}
        style={{ layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 45 }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
        forceReRender={[plan.id, useSubscriptionSdk, isAnnual, totalAmount]}
      />
      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
        forceReRender={[plan.id, useSubscriptionSdk, isAnnual, totalAmount]}
      />
      <PayPalButtons
        fundingSource={FUNDING.VENMO}
        style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 45 }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
        forceReRender={[plan.id, useSubscriptionSdk, isAnnual, totalAmount]}
      />
      <PayPalButtons
        fundingSource={FUNDING.PAYLATER}
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
        forceReRender={[plan.id, useSubscriptionSdk, isAnnual, totalAmount]}
      />
    </div>
  );
}

// ── Main PaymentWall ───────────────────────────────────────────────────────
const PaymentWall: React.FC<PaymentWallProps> = ({
  churchId,
  churchName,
  subStatus,
  onPaymentSuccess,
  onLogout,
  onOpenSupport,
}) => {
  const { t } = useLanguage();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    subStatus.currentPlan !== 'trial' && PAID_PLANS.some(p => p.id === subStatus.currentPlan)
      ? subStatus.currentPlan
      : 'growth'
  );
  const [isAnnual, setIsAnnual] = useState<boolean>(false);
  const [isAutoPay, setIsAutoPay] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const selectedPlan = PAID_PLANS.find(p => p.id === selectedPlanId) || PAID_PLANS[0];
  const hasPaypalPlanId = Boolean(selectedPlan.paypalPlanId);
  const useSubscriptionSdk = isAutoPay && hasPaypalPlanId && !isAnnual;

  const isTrialExpired = subStatus.accessStatus === 'trial_expired';
  const displayMonthlyPrice = isAnnual ? (selectedPlan.price! * 0.8) : selectedPlan.price!;
  const checkoutTotal = isAnnual ? (selectedPlan.price! * 12 * 0.8).toFixed(2) : selectedPlan.price!.toFixed(2);

  const handleSuccess = () => {
    setPaySuccess(true);
    setTimeout(onPaymentSuccess, 2000);
  };

  // ── Success Screen ───────────────────────────────────────────────────────
  if (paySuccess) {
    return (
      <div style={wallStyle}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ textAlign: 'center', marginTop: '15vh' }}
        >
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Check size={40} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>
            {t('paymentSuccessful')}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {t('welcomeToPlan').replace('{plan}', selectedPlan.name)}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      key={useSubscriptionSdk ? 'paypal-sub' : 'paypal-capture'}
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency: 'USD',
        intent: useSubscriptionSdk ? 'subscription' : 'capture',
        vault: useSubscriptionSdk,
        components: 'buttons',
        enableFunding: 'card,venmo,paylater',
      }}
    >
      <div style={wallStyle}>
        {/* Background ambient glow */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.2) 0%, transparent 70%)',
        }} />

        {/* Top Bar for Account & Support Access */}
        <div style={{
          maxWidth: '900px', margin: '0 auto 2rem', position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.4rem 0.9rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.8rem', fontWeight: 700, color: 'white',
            }}>
              🏛️ {churchName}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {onOpenSupport ? (
              <button
                onClick={onOpenSupport}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '0.5rem 1rem', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                <HelpCircle size={15} /> Billing Support
              </button>
            ) : (
              <a
                href="mailto:sales@storehousefinance.net?subject=Subscription%20Assistance"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '0.5rem 1rem', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
                }}
              >
                <HelpCircle size={15} /> Contact Support
              </a>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '0.5rem 1rem', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: '900px', position: 'relative', zIndex: 1, margin: '0 auto' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 1.25rem', borderRadius: '100px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              marginBottom: '1.5rem',
            }}>
              <Lock size={14} color="#ef4444" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isTrialExpired ? t('trialEnded') : t('subscriptionExpiredWall')}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: 'white', marginBottom: '0.75rem' }}>
              {isTrialExpired
                ? t('trialEnded')
                : t('subscriptionExpiredWall')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '540px', margin: '0 auto' }}>
              {t('choosePlanBelow')}
            </p>

            {/* Billing Cycle & AutoPay Toggles */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.35rem', display: 'inline-flex', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => setIsAnnual(false)}
                  style={{
                    padding: '0.5rem 1.15rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s',
                    background: !isAnnual ? 'white' : 'transparent',
                    color: !isAnnual ? 'black' : '#94a3b8'
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  style={{
                    padding: '0.5rem 1.15rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s',
                    background: isAnnual ? '#6366f1' : 'transparent',
                    color: isAnnual ? 'white' : '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  Yearly
                  <span style={{ background: '#34d399', color: 'black', padding: '1px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 900 }}>
                    SAVE 20%
                  </span>
                </button>
              </div>

              {hasPaypalPlanId && !isAnnual && (
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.35rem', display: 'inline-flex', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => setIsAutoPay(false)}
                    style={{
                      padding: '0.5rem 1.15rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s',
                      background: !isAutoPay ? '#4f46e5' : 'transparent',
                      color: !isAutoPay ? 'white' : '#64748b'
                    }}
                  >
                    One-time Manual
                  </button>
                  <button
                    onClick={() => setIsAutoPay(true)}
                    style={{
                      padding: '0.5rem 1.15rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s',
                      background: isAutoPay ? '#10b981' : 'transparent',
                      color: isAutoPay ? 'white' : '#64748b'
                    }}
                  >
                    Auto-Pay Subscription
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Plan Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}>
            {PAID_PLANS.map((plan) => {
              const PlanIcon = PLAN_ICONS[plan.id] || Zap;
              const isSelected = plan.id === selectedPlanId;
              const isPopular = plan.id === 'growth';
              const cardMonthlyPrice = isAnnual ? (plan.price! * 0.8) : plan.price!;

              return (
                <motion.button
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setPayError(null);
                  }}
                  whileHover={{ translateY: -4 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${plan.color}18, ${plan.color}08)`
                      : 'rgba(15,23,42,0.7)',
                    border: `2px solid ${isSelected ? plan.color : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '20px',
                    padding: '1.75rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s',
                    boxShadow: isSelected ? `0 0 30px ${plan.color}25` : 'none',
                  }}
                >
                  {isPopular && (
                    <div style={{
                      position: 'absolute', top: '-1px', right: '1.25rem',
                      background: `linear-gradient(135deg, ${plan.color}, #d97706)`,
                      color: '#1a0a00', fontSize: '0.65rem', fontWeight: 900,
                      padding: '3px 12px', borderRadius: '0 0 10px 10px',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      {t('mostPopular')}
                    </div>
                  )}

                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: `${plan.color}18`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                  }}>
                    <PlanIcon size={22} color={plan.color} />
                  </div>

                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                    {plan.name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                      ${cardMonthlyPrice.toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>/mo</span>
                  </div>
                  {isAnnual && (
                    <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, marginBottom: '0.5rem' }}>
                      Billed ${(plan.price! * 12 * 0.8).toFixed(2)} yearly
                    </div>
                  )}

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    {plan.description}
                  </p>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <Check size={13} color={plan.color} style={{ flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isSelected && (
                    <div style={{
                      position: 'absolute', bottom: '1rem', right: '1rem',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: plan.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Payment Section */}
          <motion.div
            layout
            style={{
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '2rem',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <CreditCard size={20} color="var(--primary-light)" />
              <div>
                <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>
                  {t('payWithPaypalCard')}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {t('secureCheckoutPlan')
                    .replace('{plan}', selectedPlan.name)
                    .replace('${price}', `$${checkoutTotal}`)
                    .replace('{price}', checkoutTotal)} · {isAnnual ? t('billedAnnually') : `${displayMonthlyPrice.toFixed(2)}/mo · ${t('billedEvery30Days')}`}
                </div>
              </div>
            </div>

            {payError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem',
                color: '#ef4444', fontSize: '0.85rem',
              }}>
                ⚠️ {payError}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedPlanId}-${isAnnual}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PayPalButtonsWrapper 
                  plan={selectedPlan} 
                  churchId={churchId} 
                  isAnnual={isAnnual}
                  useSubscriptionSdk={useSubscriptionSdk}
                  onSuccess={handleSuccess} 
                  onError={(err) => setPayError(err)} 
                />
              </motion.div>
            </AnimatePresence>

            {/* Trust badges */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap',
            }}>
              {[
                { icon: '🔒', text: t('sslEncrypted') },
                { icon: '🛡️', text: t('securedByPaypal') },
                { icon: '↩️', text: t('cancelAnytime') },
              ].map((b) => (
                <span key={b.text} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>{b.icon}</span>{b.text}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Security note */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Shield size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {t('dataSafePreserved').replace('{churchName}', churchName)}
            </span>
          </div>
        </motion.div>
      </div>
    </PayPalScriptProvider>
  );
};

const wallStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: 'var(--bg-dark)',
  padding: '2.5rem 1.5rem 4rem',
  overflowY: 'auto',
  display: 'block',
};

export default PaymentWall;
