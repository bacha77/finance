import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, Star, Crown, Gift, X, CreditCard, Shield, Loader } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { supabase } from '../lib/supabase';
import { PLANS, type Plan } from '../lib/trialConfig';
import { PAYPAL_CLIENT_ID, getNextBillingDate } from '../lib/subscriptionConfig';

// ── Plan Icon Map ──────────────────────────────────────────────────────────
const PLAN_ICONS: Record<string, React.ReactNode> = {
    trial: <Gift size={22} />,
    starter: <Zap size={22} />,
    growth: <Star size={22} />,
    enterprise: <Crown size={22} />,
};

interface PricingProps {
    currentPlan?: string;
    churchId?: string;
    onUpgradeSuccess?: () => void;
}

// ── PayPal Checkout Buttons (inside Provider) ──────────────────────────────
function CheckoutButtons({
    plan,
    churchId,
    onSuccess,
    onError,
}: {
    plan: Plan;
    churchId: string;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [{ isPending }] = usePayPalScriptReducer();

    const createOrder = useCallback(
        (_data: unknown, actions: any) =>
            actions.order.create({
                intent: 'CAPTURE',
                purchase_units: [{
                    description: `Storehouse Finance — ${plan.name} Plan (30 days)`,
                    amount: { currency_code: 'USD', value: plan.price!.toFixed(2) },
                }],
            }),
        [plan]
    );

    const onApprove = useCallback(
        async (_data: unknown, actions: any) => {
            try {
                const order = await actions.order.capture();
                await supabase.from('churches').update({
                    plan: plan.id,
                    subscription_end_date: getNextBillingDate(),
                    paypal_order_id: order.id,
                }).eq('id', churchId);
                onSuccess();
            } catch (err: any) {
                onError(err.message || 'Payment capture failed. Please try again.');
            }
        },
        [plan, churchId, onSuccess, onError]
    );

    if (isPending) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Loader size={16} className="spin" /> Loading payment options...
            </div>
        );
    }

    return (
        <PayPalButtons
            style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 }}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={(err: any) => onError(err?.message || 'PayPal error. Please try again.')}
            forceReRender={[plan.id]}
        />
    );
}

// ── Checkout Modal ─────────────────────────────────────────────────────────
function CheckoutModal({
    plan,
    churchId,
    onClose,
    onSuccess,
}: {
    plan: Plan;
    churchId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [succeeded, setSucceeded] = useState(false);

    const handleSuccess = () => {
        setSucceeded(true);
        setTimeout(() => { onClose(); onSuccess(); }, 2000);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${plan.color}44`,
                    borderRadius: '24px',
                    padding: '2rem',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: `0 0 60px ${plan.color}22`,
                }}
            >
                {succeeded ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(16,185,129,0.12)', border: '2px solid #10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1rem',
                        }}>
                            <Check size={32} color="#10b981" />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: '0.4rem' }}>
                            Payment Successful! 🎉
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Welcome to the {plan.name} plan. Your account is being upgraded...
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: `${plan.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: plan.color,
                                }}>
                                    {PLAN_ICONS[plan.id]}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>
                                        {plan.name} Plan
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        ${plan.price!.toFixed(2)} / month · billed every 30 days
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} style={{
                                background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px',
                                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-muted)',
                            }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* What's included */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                            padding: '1rem', marginBottom: '1.5rem',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                                What's included
                            </div>
                            {plan.features.slice(0, 4).map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    <Check size={12} color={plan.color} strokeWidth={3} style={{ flexShrink: 0 }} />
                                    {f}
                                </div>
                            ))}
                        </div>

                        {/* Payment label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <CreditCard size={16} color="var(--primary-light)" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                Pay with PayPal, Credit Card, or Debit Card
                            </span>
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '10px', padding: '0.65rem 0.9rem', marginBottom: '1rem',
                                color: '#ef4444', fontSize: '0.8rem',
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <PayPalScriptProvider options={{
                            clientId: PAYPAL_CLIENT_ID,
                            currency: 'USD',
                            intent: 'capture',
                            components: 'buttons',
                            enableFunding: 'card,venmo',
                        }}>
                            <CheckoutButtons
                                plan={plan}
                                churchId={churchId}
                                onSuccess={handleSuccess}
                                onError={setError}
                            />
                        </PayPalScriptProvider>

                        {/* Trust row */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                            {['🔒 SSL Encrypted', '🛡️ PayPal Secured', '↩️ Cancel anytime'].map(t => (
                                <span key={t} style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t}</span>
                            ))}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

// ── Single Plan Card ───────────────────────────────────────────────────────
const PricingCard: React.FC<{
    plan: Plan;
    current: boolean;
    onSelect: () => void;
    index: number;
    hasChurchId: boolean;
    isAnnual: boolean;
}> = ({ plan, current, onSelect, index, hasChurchId, isAnnual }) => {
    const isPopular = plan.badge === 'Most Popular';
    const isFree = plan.price === null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
                position: 'relative', borderRadius: '24px',
                padding: isPopular ? '2.5rem' : '2rem',
                border: `1px solid ${isPopular ? plan.color : 'var(--border)'}`,
                background: isPopular
                    ? `linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(99,102,241,0.08) 100%)`
                    : 'var(--bg-card)',
                boxShadow: isPopular ? `0 0 40px ${plan.color}22` : 'none',
                transform: isPopular ? 'scale(1.04)' : 'scale(1)',
                display: 'flex', flexDirection: 'column', gap: '1.5rem',
            }}
            whileHover={{ y: -4 }}
        >
            {plan.badge && (
                <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(90deg, ${plan.color}, #6366f1)`,
                    color: 'white', fontSize: '0.7rem', fontWeight: 800,
                    padding: '5px 18px', borderRadius: '100px', letterSpacing: '0.08em',
                    textTransform: 'uppercase', whiteSpace: 'nowrap', boxShadow: `0 4px 12px ${plan.color}55`,
                }}>⭐ {plan.badge}</div>
            )}
            {current && (
                <div style={{
                    position: 'absolute', top: '-14px', right: '1.5rem',
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                    color: '#34d399', fontSize: '0.65rem', fontWeight: 800,
                    padding: '4px 12px', borderRadius: '100px', letterSpacing: '0.08em',
                }}>✓ CURRENT PLAN</div>
            )}

            <div>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '14px',
                    background: `${plan.color}22`, color: plan.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                }}>
                    {PLAN_ICONS[plan.id]}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{plan.name}</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>{plan.description}</p>
            </div>

            <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: plan.color, lineHeight: 1 }}>
                        ${(plan.price ? (isAnnual ? (plan.price * 0.8) : plan.price) : 0).toLocaleString(undefined, { minimumFractionDigits: isFree ? 0 : 2 })}
                    </span>
                    {plan.price !== null && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                    )}
                </div>
                {isAnnual && plan.price && (
                    <p style={{ fontSize: '0.65rem', color: 'var(--primary-light)', marginTop: '4px', fontWeight: 800 }}>Billed ${(plan.price * 12 * 0.8).toFixed(2)} yearly</p>
                )}
                {isFree && <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px', fontWeight: 600 }}>No credit card required</p>}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                    {plan.memberLimit !== null
                        ? <>Up to <strong style={{ color: plan.color }}>{plan.memberLimit}</strong> members</>
                        : <><strong style={{ color: plan.color }}>Unlimited</strong> members</>
                    }
                </p>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {plan.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: `${plan.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={12} color={plan.color} strokeWidth={3} />
                        </div>
                        {f}
                    </li>
                ))}
            </ul>

            <button
                onClick={isFree || current ? undefined : onSelect}
                disabled={current || isFree}
                style={{
                    width: '100%', padding: '0.875rem', borderRadius: '14px',
                    border: (current || isFree) ? '1px solid var(--border)' : `1px solid ${plan.color}`,
                    background: (current || isFree)
                        ? 'transparent'
                        : isPopular
                            ? `linear-gradient(135deg, ${plan.color}, #6366f1)`
                            : `${plan.color}18`,
                    color: (current || isFree) ? 'var(--text-muted)' : isPopular ? 'white' : plan.color,
                    fontWeight: 800, fontSize: '0.9rem',
                    cursor: (current || isFree || !hasChurchId) ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                    boxShadow: isPopular && !current && !isFree ? `0 4px 20px ${plan.color}44` : 'none',
                }}
            >
                {current
                    ? '✓ Active Plan'
                    : isFree
                        ? 'Current Free Trial'
                        : `⚡ Upgrade to ${plan.name}`
                }
            </button>
        </motion.div>
    );
};

// ── Main Pricing Component ─────────────────────────────────────────────────
const Pricing: React.FC<PricingProps> = ({ currentPlan = 'trial', churchId, onUpgradeSuccess }) => {
    const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);

    const handleSelect = (plan: Plan) => {
        if (!plan.price || !churchId) return;
        setCheckoutPlan(plan);
    };

    const handleSuccess = () => {
        setCheckoutPlan(null);
        onUpgradeSuccess?.();
    };

    return (
        <div style={{ padding: '3rem 2rem' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                        display: 'inline-block', padding: '6px 18px', borderRadius: '100px',
                        background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
                        color: 'var(--primary-light)', fontSize: '0.75rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem',
                    }}
                >
                    Transparent Pricing
                </motion.div>
                <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1rem', lineHeight: 1.1 }}>
                    Plans for Every{' '}
                    <span style={{ background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Congregation
                    </span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                    Start free, grow at your own pace. No hidden fees, cancel anytime.
                </p>

                {/* Toggle Group */}
                <div style={{ 
                    marginTop: '2.5rem', display: 'inline-flex', alignItems: 'center', 
                    gap: '12px', background: 'rgba(255,255,255,0.03)', 
                    padding: '6px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' 
                }}>
                    <button 
                        onClick={() => setIsAnnual(false)}
                        style={{ 
                            padding: '8px 24px', borderRadius: '100px', border: 'none', 
                            background: !isAnnual ? 'white' : 'transparent',
                            color: !isAnnual ? 'black' : 'white', fontWeight: 800, 
                            fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.3s'
                        }}
                    >
                        Monthly
                    </button>
                    <button 
                        onClick={() => setIsAnnual(true)}
                        style={{ 
                            padding: '8px 24px', borderRadius: '100px', border: 'none', 
                            background: isAnnual ? 'var(--primary)' : 'transparent',
                            color: 'white', fontWeight: 800, fontSize: '0.75rem', 
                            cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                        }}
                    >
                        Yearly
                        {isAnnual && (
                             <div style={{ 
                                position: 'absolute', top: '-12px', right: '-12px', 
                                background: '#34d399', color: 'black', padding: '2px 8px', 
                                borderRadius: '6px', fontSize: '0.6rem', fontWeight: 900 
                            }}>
                                SAVE 20%
                            </div>
                        )}
                    </button>
                </div>
                
                {!churchId && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.75rem', fontWeight: 600 }}>
                        ⚠️ Complete onboarding first to enable plan upgrades.
                    </p>
                )}
            </div>

            {/* Cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem', maxWidth: '1100px', margin: '0 auto', alignItems: 'center',
            }}>
                {PLANS.map((plan, i) => (
                    <PricingCard
                        key={plan.id}
                        plan={plan}
                        index={i}
                        current={plan.id === currentPlan}
                        onSelect={() => handleSelect(plan)}
                        hasChurchId={!!churchId}
                        isAnnual={isAnnual}
                    />
                ))}
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '3rem', fontWeight: 500 }}>
                <Shield size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                All payments secured by PayPal · All plans billed monthly ·{' '}
                <a href="mailto:support@storehousefinance.com" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 700 }}>
                    Contact support
                </a>
            </p>

            {/* Checkout Modal */}
            <AnimatePresence>
                {checkoutPlan && churchId && (
                    <CheckoutModal
                        plan={checkoutPlan}
                        churchId={churchId}
                        onClose={() => setCheckoutPlan(null)}
                        onSuccess={handleSuccess}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Pricing;
