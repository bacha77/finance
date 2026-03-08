import React, { useState, useCallback } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { supabase } from '../lib/supabase';
import { PLANS } from '../lib/trialConfig';
import { PAYPAL_CLIENT_ID, getNextBillingDate } from '../lib/subscriptionConfig';
import type { SubscriptionStatus } from '../lib/subscriptionConfig';
import { Shield, Check, Star, Zap, Crown, CreditCard, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentWallProps {
  churchId: string;
  churchName: string;
  subStatus: SubscriptionStatus;
  onPaymentSuccess: () => void;
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
  onSuccess,
  onError,
}: {
  plan: typeof PAID_PLANS[0];
  churchId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [{ isPending }] = usePayPalScriptReducer();

  const createOrder = useCallback(
    (_data: unknown, actions: any) => {
      return actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: `Storehouse Finance — ${plan.name} Plan (30 days)`,
            amount: {
              currency_code: 'USD',
              value: plan.price!.toFixed(2),
            },
          },
        ],
      });
    },
    [plan]
  );

  const onApprove = useCallback(
    async (_data: unknown, actions: any) => {
      try {
        const order = await actions.order.capture();
        const orderId = order.id;
        const nextBilling = getNextBillingDate();

        // Update church record in Supabase
        const { error } = await supabase
          .from('churches')
          .update({
            plan: plan.id,
            subscription_end_date: nextBilling,
            paypal_order_id: orderId,
          })
          .eq('id', churchId);

        if (error) throw new Error(error.message);
        onSuccess();
      } catch (err: any) {
        onError(err.message || 'Payment failed. Please try again.');
      }
    },
    [plan, churchId, onSuccess, onError]
  );

  if (isPending) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Loading payment options...
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
        height: 45,
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
      forceReRender={[plan.id]}
    />
  );
}

// ── Main PaymentWall ───────────────────────────────────────────────────────
const PaymentWall: React.FC<PaymentWallProps> = ({
  churchId,
  churchName,
  subStatus,
  onPaymentSuccess,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('growth');
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const selectedPlan = PAID_PLANS.find(p => p.id === selectedPlanId)!;

  const isTrialExpired = subStatus.accessStatus === 'trial_expired';

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
          style={{ textAlign: 'center' }}
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
            Payment Successful! 🎉
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome to the {selectedPlan.name} plan. Loading your workspace...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency: 'USD',
        intent: 'capture',
        components: 'buttons',
        disableFunding: '',
        enableFunding: 'card',
      }}
    >
      <div style={wallStyle}>
        {/* Background ambient glow */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.2) 0%, transparent 70%)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: '900px', position: 'relative', zIndex: 1 }}
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
                {isTrialExpired ? 'Free Trial Ended' : 'Subscription Expired'}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: 'white', marginBottom: '0.75rem' }}>
              {isTrialExpired
                ? 'Your 30-Day Free Trial Has Ended'
                : 'Your Subscription Has Expired'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
              {churchName} — choose a plan below to restore access. All your data is safe and waiting.
            </p>
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

              return (
                <motion.button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
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
                      ⭐ Most Popular
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

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                      ${plan.price! % 1 === 0 ? plan.price : plan.price!.toFixed(2).replace('.', '.')}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>/mo</span>
                  </div>

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
                  Pay with PayPal, Credit Card, or Debit Card
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Secure checkout · {selectedPlan.name} Plan · ${selectedPlan.price!.toFixed(2)}/month · Billed every 30 days
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
                key={selectedPlanId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PayPalButtonsWrapper
                  plan={selectedPlan}
                  churchId={churchId}
                  onSuccess={handleSuccess}
                  onError={setPayError}
                />
              </motion.div>
            </AnimatePresence>

            {/* Trust badges */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap',
            }}>
              {[
                { icon: '🔒', text: '256-bit SSL Encrypted' },
                { icon: '🛡️', text: 'Secured by PayPal' },
                { icon: '↩️', text: 'Cancel anytime' },
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
              Your data is safe. All {churchName} records are preserved and will be available immediately after payment.
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  overflowY: 'auto',
};

export default PaymentWall;
