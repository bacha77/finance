import { getTrialStatus } from './trialConfig';
import { sendResendEmail } from './resend';

/**
 * Checks if the church is at a critical trial threshold and fires a reminder email.
 * This should be called on Dashboard mount for trial members.
 */
export async function checkAndSendTrialReminder(church: any, adminEmail: string) {
    if (!church || church.plan !== 'trial' || !adminEmail) return;

    const status = getTrialStatus(church);
    
    // Thresholds: 7 days, 3 days, 1 day
    const criticalDays = [7, 3, 1];
    
    if (criticalDays.includes(status.daysRemaining)) {
        // Check if we've already sent a reminder for this 'daysRemaining' count today
        // We use localStorage as a simple 'debounce' to avoid multiple emails on the same day
        const lastNotifiedKey = `last_trial_notification_${church.id}`;
        const lastNotifiedValue = localStorage.getItem(lastNotifiedKey);
        
        if (lastNotifiedValue === status.daysRemaining.toString()) {
            return; // Already notified today
        }

        try {
            const subject = `⚠️ ACTION REQUIRED: ${status.daysRemaining} Days Remaining in your Storehouse Trial`;
            const html = `
                <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h2 style="color: #2563eb;">Institutional Trial Countdown</h2>
                    <p>Greetings from the Storehouse Finance Team,</p>
                    <p>Your institutional stewardship trial for <strong>${church.name}</strong> is approaching its conclusion.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <span style="font-size: 24px; font-weight: 900; color: #2563eb;">${status.daysRemaining} Days Remaining</span>
                    </div>
                    <p>To ensure uninterrupted access to your ledger, bank reconciliation hub, and AI forecasting, please consider selecting a production plan before your trial expires.</p>
                    <p>If you have any questions or need a trial extension for your board review, simply reply to this email.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    <p style="font-size: 0.8rem; color: #64748b;">
                        Storehouse Finance Shard: US-E1<br>
                        Church ID: ${church.id}
                    </p>
                </div>
            `;

            await sendResendEmail(adminEmail, subject, html);
            
            // Mark as notified for this day count
            localStorage.setItem(lastNotifiedKey, status.daysRemaining.toString());
            console.log(`Trial reminder sent for ${status.daysRemaining} days remaining.`);
        } catch (err) {
            console.error('Failed to send trial reminder:', err);
        }
    }
}
