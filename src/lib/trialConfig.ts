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

/**
 * Given a church record with plan + created_at, return whether the trial
 * is still active and how many days remain.
 */
export function getTrialStatus(church: { plan?: PlanId; created_at: string }) {
    // Treat as trial if explicitly labeled 'trial' OR if plan is missing (legacy support)
    const isTrialCandidate = !church.plan || church.plan === 'trial';
    
    const created = new Date(church.created_at);
    const now = new Date();
    const msElapsed = now.getTime() - created.getTime();
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, TRIAL_CONFIG.TRIAL_DAYS - daysElapsed);
    const isExpired = daysRemaining === 0;

    // Only show trial status if they are actually a trial candidate and not expired (or just expired)
    return { 
        isTrialActive: isTrialCandidate && !isExpired, 
        daysRemaining, 
        isExpired: isTrialCandidate && isExpired,
        isTrialMember: isTrialCandidate 
    };
}

/**
 * Returns whether the church can add more members based on plan limits.
 */
export function canAddMember(plan: PlanId, currentMemberCount: number): boolean {
    const planConfig = PLANS.find(p => p.id === plan);
    if (!planConfig || planConfig.memberLimit === null) return true;
    return currentMemberCount < planConfig.memberLimit;
}
