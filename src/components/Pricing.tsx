import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Star, Crown, Gift } from 'lucide-react';
import { PLANS, type Plan } from '../lib/trialConfig';

const PLAN_ICONS: Record<string, React.ReactNode> = {
    trial: <Gift size={22} />,
    starter: <Zap size={22} />,
    growth: <Star size={22} />,
    enterprise: <Crown size={22} />,
};

interface PricingProps {
    currentPlan?: string;
    onSelectPlan?: (planId: string) => void;
}

const PricingCard: React.FC<{ plan: Plan; current: boolean; onSelect?: () => void; index: number }> = ({
    plan, current, onSelect, index
}) => {
    const isPopular = plan.badge === 'Most Popular';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
                position: 'relative',
                borderRadius: '24px',
                padding: isPopular ? '2.5rem' : '2rem',
                border: `1px solid ${isPopular ? plan.color : 'var(--border)'}`,
                background: isPopular
                    ? `linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(99,102,241,0.08) 100%)`
                    : 'var(--bg-card)',
                boxShadow: isPopular ? `0 0 40px ${plan.color}22` : 'none',
                transform: isPopular ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
            }}
            whileHover={{ y: -4 }}
        >
            {/* Popular Badge */}
            {plan.badge && (
                <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(90deg, ${plan.color}, #6366f1)`,
                    color: 'white', fontSize: '0.7rem', fontWeight: 800,
                    padding: '5px 18px', borderRadius: '100px', letterSpacing: '0.08em',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                    boxShadow: `0 4px 12px ${plan.color}55`,
                }}>
                    ⭐ {plan.badge}
                </div>
            )}

            {/* Current Plan Badge */}
            {current && (
                <div style={{
                    position: 'absolute', top: '-14px', right: '1.5rem',
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                    color: '#34d399', fontSize: '0.65rem', fontWeight: 800,
                    padding: '4px 12px', borderRadius: '100px', letterSpacing: '0.08em',
                }}>
                    CURRENT PLAN
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '14px',
                        background: `${plan.color}22`, color: plan.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem',
                    }}>
                        {PLAN_ICONS[plan.id]}
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {plan.name}
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {plan.description}
                    </p>
                </div>
            </div>

            {/* Price */}
            <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: plan.color, lineHeight: 1 }}>
                        {plan.priceLabel}
                    </span>
                    {plan.price !== null && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            /{plan.period === 'per month' ? 'mo' : plan.period}
                        </span>
                    )}
                </div>
                {plan.id === 'trial' && (
                    <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px', fontWeight: 600 }}>
                        No credit card required
                    </p>
                )}
                {plan.memberLimit !== null ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                        Up to <strong style={{ color: plan.color }}>{plan.memberLimit}</strong> members
                    </p>
                ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                        <strong style={{ color: plan.color }}>Unlimited</strong> members
                    </p>
                )}
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {plan.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <div style={{
                            width: '20px', height: '20px', borderRadius: '6px',
                            background: `${plan.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Check size={12} color={plan.color} strokeWidth={3} />
                        </div>
                        {f}
                    </li>
                ))}
            </ul>

            {/* CTA Button */}
            <button
                onClick={onSelect}
                disabled={current}
                style={{
                    width: '100%', padding: '0.875rem', borderRadius: '14px',
                    border: current ? '1px solid var(--border)' : `1px solid ${plan.color}`,
                    background: current
                        ? 'transparent'
                        : isPopular
                            ? `linear-gradient(135deg, ${plan.color}, #6366f1)`
                            : `${plan.color}18`,
                    color: current ? 'var(--text-muted)' : isPopular ? 'white' : plan.color,
                    fontWeight: 800, fontSize: '0.9rem', cursor: current ? 'default' : 'pointer',
                    transition: 'all 0.2s', fontFamily: 'inherit',
                    boxShadow: isPopular && !current ? `0 4px 20px ${plan.color}44` : 'none',
                }}
            >
                {current ? 'Active Plan' : plan.id === 'trial' ? 'Start Free Trial' : `Upgrade to ${plan.name}`}
            </button>
        </motion.div>
    );
};

const Pricing: React.FC<PricingProps> = ({ currentPlan = 'trial', onSelectPlan }) => {
    return (
        <div style={{ padding: '3rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        display: 'inline-block', padding: '6px 18px', borderRadius: '100px',
                        background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
                        color: 'var(--primary-light)', fontSize: '0.75rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem',
                    }}
                >
                    Transparent Pricing
                </motion.div>
                <h1 style={{
                    fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em',
                    marginBottom: '1rem', lineHeight: 1.1,
                }}>
                    Plans for Every{' '}
                    <span style={{
                        background: 'linear-gradient(135deg, #a78bfa, #06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Congregation
                    </span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                    Start free, grow at your own pace. No hidden fees, cancel anytime.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                maxWidth: '1100px',
                margin: '0 auto',
                alignItems: 'center',
            }}>
                {PLANS.map((plan, i) => (
                    <PricingCard
                        key={plan.id}
                        plan={plan}
                        index={i}
                        current={plan.id === currentPlan}
                        onSelect={() => onSelectPlan?.(plan.id)}
                    />
                ))}
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '3rem', fontWeight: 500 }}>
                All plans include a 30-day free trial. Need a custom quote?{' '}
                <a href="mailto:support@storehousefinance.com" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 700 }}>
                    Contact us
                </a>
            </p>
        </div>
    );
};

export default Pricing;
