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
        price: 99.99,
        priceLabel: '$99.99',
        period: 'per month',
        memberLimit: 100,
        description: 'Perfect for small congregations.',
        color: '#6366f1',
        features: [
            'Up to 100 members',
            'Fund Accounting',
            'Smart Giving & Payroll',
            'Email & Chat support',
            'Monthly reports',
        ],
    },
    {
        id: 'growth',
        name: 'Growth',
        price: 149.99,
        priceLabel: '$149.99',
        period: 'per month',
        memberLimit: 500,
        description: 'For growing mid-size churches.',
        badge: 'Most Popular',
        color: '#a855f7',
        features: [
            'Up to 500 members',
            'Everything in Starter',
            'Advanced Analytics',
            'Priority support',
            'Custom departments',
            'Bulk statements',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 300,
        priceLabel: '$300',
        period: 'per month',
        memberLimit: null,
        description: 'For large & mega churches.',
        color: '#f59e0b',
        features: [
            'Unlimited members',
            'Everything in Growth',
            'Dedicated account manager',
            'Custom integrations',
            'On-site training',
            'SLA guarantee',
        ],
    },
];

/**
 * Given a church record with plan + created_at, return whether the trial
 * is still active and how many days remain.
 */
export function getTrialStatus(church: { plan: PlanId; created_at: string }) {
    if (church.plan !== 'trial') return { isTrialActive: false, daysRemaining: 0, isExpired: false };

    const created = new Date(church.created_at);
    const now = new Date();
    const msElapsed = now.getTime() - created.getTime();
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, TRIAL_CONFIG.TRIAL_DAYS - daysElapsed);
    const isExpired = daysRemaining === 0;
    return { isTrialActive: !isExpired, daysRemaining, isExpired };
}

/**
 * Returns whether the church can add more members based on plan limits.
 */
export function canAddMember(plan: PlanId, currentMemberCount: number): boolean {
    const planConfig = PLANS.find(p => p.id === plan);
    if (!planConfig || planConfig.memberLimit === null) return true;
    return currentMemberCount < planConfig.memberLimit;
}
