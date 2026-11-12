// ─── Trial & Plan Configuration ────────────────────────────────────────────
// Single source of truth for all membership limits and pricing.

export const TRIAL_CONFIG = {
    /** Number of days the free trial lasts */
    TRIAL_DAYS: 30,
    /** Max members allowed during a free trial */
    TRIAL_MEMBER_LIMIT: 15,
};

export type PlanId = 'trial' | 'starter' | 'growth' | 'enterprise';

export interface Plan {
    id: PlanId;
    name: string;
    price: number | null; // null means free
    priceLabel: string;
    period: string;
    memberLimit: number | null; // null means unlimited
    description: string;
    badge?: string;
    color: string;
    features: string[];
    paypalPlanId?: string;
}

export const PLANS: Plan[] = [
    {
        id: 'trial',
        name: 'Free Trial',
        price: null,
        priceLabel: 'Free',
        period: '30 days',
        memberLimit: TRIAL_CONFIG.TRIAL_MEMBER_LIMIT,
        description: 'Try Storehouse Finance risk-free.',
        color: '#10b981',
        features: [
            `Up to ${TRIAL_CONFIG.TRIAL_MEMBER_LIMIT} members`,
            '30-day free trial',
            'All core modules',
            'Email support',
        ],
    },
    {
        id: 'starter',
        name: 'Starter',
        price: 199.99,
        priceLabel: '$199.99',
        period: 'per month',
        memberLimit: 200,
        description: 'Perfect for small and growing congregations.',
        color: '#6366f1',
        features: [
            'Up to 200 members',
            'Fund Accounting',
            'Smart Giving & Payroll',
            'Email & Chat support',
            'Monthly reports',
        ],
        paypalPlanId: import.meta.env.VITE_PAYPAL_PLAN_STARTER || '',
    },
    {
        id: 'growth',
        name: 'Growth',
        price: 399.99,
        priceLabel: '$399.99',
        period: 'per month',
        memberLimit: null,
        description: 'Unlimited access for large & mega churches.',
        badge: 'Most Popular',
        color: '#a855f7',
        features: [
            'Unlimited members',
            'Everything in Starter',
            'Advanced Analytics',
            'Dedicated account manager',
            'Custom departments',
            'Bulk statements',
        ],
        paypalPlanId: import.meta.env.VITE_PAYPAL_PLAN_GROWTH || '',
    }
];

export const ENTERPRISE_PLAN: Plan = {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399.99,
    priceLabel: '$399.99',
    period: 'per month',
    memberLimit: null,
    description: 'Custom multi-campus & enterprise stewardship suite.',
    badge: 'Enterprise',
    color: '#10b981',
    features: [
        'Unlimited members & campuses',
        'Everything in Growth',
        'Dedicated account manager',
        'Custom integrations & SLA',
        'Priority 24/7 phone support',
    ],
    paypalPlanId: import.meta.env.VITE_PAYPAL_PLAN_ENTERPRISE || import.meta.env.VITE_PAYPAL_PLAN_GROWTH || '',
};

export function getPlanById(planId?: string | null): Plan {
    if (planId === 'enterprise') return ENTERPRISE_PLAN;
    return PLANS.find(p => p.id === planId) || PLANS[0];
}

/**
 * Given a church record with plan + created_at (+ optional subscription_end_date),
 * return whether the trial is still active and how many days remain.
 */
export function getTrialStatus(church: { plan?: PlanId; created_at: string; subscription_end_date?: string | null }) {
    // Treat as trial if explicitly labeled 'trial' OR if plan is missing (legacy support)
    const isTrialCandidate = !church.plan || church.plan === 'trial';

    const created = new Date(church.created_at || Date.now());
    let trialEndDate = new Date(created.getTime() + TRIAL_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Respect manual admin trial extensions via subscription_end_date
    if (church.subscription_end_date) {
        const overrideDate = new Date(church.subscription_end_date);
        if (!isNaN(overrideDate.getTime()) && overrideDate > trialEndDate) {
            trialEndDate = overrideDate;
        }
    }

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const isExpired = now > trialEndDate;

    return {
        isTrialActive: isTrialCandidate && !isExpired,
        daysRemaining,
        isExpired: isTrialCandidate && isExpired,
        isTrialMember: isTrialCandidate,
        trialEndDate,
    };
}

/**
 * Returns whether the church can add more members based on plan limits.
 */
export function canAddMember(plan: PlanId, currentMemberCount: number): boolean {
    const planConfig = getPlanById(plan);
    if (!planConfig || planConfig.memberLimit === null) return true;
    return currentMemberCount < planConfig.memberLimit;
}
