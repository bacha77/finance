
export const RESEND_API_KEY = 're_ir63AG7B_axpVnUBgCg72XyrPJkdvcDab';

export const sendResendEmail = async (to: string, subject: string, html: string, fromName: string = 'Storehouse Finance') => {
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `${fromName} <onboarding@resend.dev>`,
                to: [to],
                subject: subject,
                html: html
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to send email');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Resend Error:', error);
        throw error;
    }
};
