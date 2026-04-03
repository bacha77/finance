// ─── Subscription & Payment Configuration ─────────────────────────────────
// Complete access-control logic for trial + paid subscriptions.

import type { PlanId } from './trialConfig';
import { PLANS, TRIAL_CONFIG } from './trialConfig';

// ── PayPal ────────────────────────────────────────────────────────────────
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';

// ── Full Church Type ───────────────────────────────────────────────────────
export interface ChurchRecord {
  id: string;
  name: string;
  plan: PlanId;
  created_at: string;
  subscription_end_date?: string | null;
  paypal_order_id?: string | null;
  cancel_at_period_end?: boolean;
}

// ── Access Status ──────────────────────────────────────────────────────────
export type AccessStatus =
  | 'active_trial'        // In free trial (< 30 days)
  | 'trial_warning'       // Trial ending within 7 days
  | 'trial_expired'       // Trial over, not yet paid
  | 'paid_active'         // Paid subscription active
  | 'paid_expiring'       // Paid subscription ending within 7 days
  | 'paid_expired';       // Paid subscription expired → block access

export interface SubscriptionStatus {
  accessStatus: AccessStatus;
  isBlocked: boolean;           // Must pay to continue
  daysRemaining: number;        // Days until trial/sub expires
  subscriptionEndDate: Date | null;
  canAddMembers: boolean;
  memberLimit: number | null;
  currentPlan: PlanId;
  isCancelled: boolean;
}

/**
 * Master function — determines full subscription status and access rights.
 * Call this on every app load and re-check at midnight.
 */
export function getSubscriptionStatus(church: ChurchRecord): SubscriptionStatus {
  const now = new Date();
  const plan = church.plan as PlanId;

  // ── PAID SUBSCRIPTION ──────────────────────────────────────────────────
  if (plan !== 'trial' && church.subscription_end_date) {
    const endDate = new Date(church.subscription_end_date);
    const msRemaining = endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = now > endDate;
    const isExpiring = !isExpired && daysRemaining <= 7;

    const planConfig = PLANS.find(p => p.id === plan);
    const memberLimit = planConfig?.memberLimit ?? null;

    return {
      accessStatus: isExpired ? 'paid_expired' : isExpiring ? 'paid_expiring' : 'paid_active',
      isBlocked: isExpired,
      daysRemaining,
      subscriptionEndDate: endDate,
      canAddMembers: true,
      memberLimit,
      currentPlan: plan,
      isCancelled: !!church.cancel_at_period_end,
    };
  }

  // ── FREE TRIAL ─────────────────────────────────────────────────────────
  const created = new Date(church.created_at);
  const msElapsed = now.getTime() - created.getTime();
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, TRIAL_CONFIG.TRIAL_DAYS - daysElapsed);
  const isExpired = daysRemaining === 0;
  const isWarning = !isExpired && daysRemaining <= 7;

  const trialEndDate = new Date(created.getTime() + TRIAL_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return {
    accessStatus: isExpired ? 'trial_expired' : isWarning ? 'trial_warning' : 'active_trial',
    isBlocked: isExpired,
    daysRemaining,
    subscriptionEndDate: trialEndDate,
    canAddMembers: true,
    memberLimit: TRIAL_CONFIG.TRIAL_MEMBER_LIMIT,
    currentPlan: 'trial',
    isCancelled: false,
  };
}

/**
 * Calculates the next subscription end date (30 days from now).
 */
export function getNextBillingDate(): string {
  const now = new Date();
  const next = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  // Set to midnight UTC
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

/**
 * Returns ms until next midnight (local time) — use for scheduling the access check.
 */
export function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
