import { supabase } from './supabase';

export const sendResendEmail = async (to: string, subject: string, html: string, fromName: string = 'Storehouse Finance') => {
    try {
        // 🚀 SECURE RELAY DISPATCH
        // Calling the Supabase Edge Function to avoid CORS and hide the API Key
        const { data, error } = await supabase.functions.invoke('send-invoice-relay', {
            body: {
                to: [to],
                subject: subject,
                html: html,
                fromName: fromName
            }
        });
        
        if (error) {
            throw new Error(error.message || 'Failed to send email via Relay');
        }
        
        return data;
    } catch (error) {
        console.error('Relay Error:', error);
        throw error;
    }
};
