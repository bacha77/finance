import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Please check your .env file.');
}

// Allow dynamically setting the token fetcher from Clerk
let getClerkToken: (() => Promise<string | null>) | null = null;
export const setClerkTokenFetcher = (fetcher: () => Promise<string | null>) => {
    getClerkToken = fetcher;
};

export const supabase = createClient(
    supabaseUrl || 'https://your-project.supabase.co',
    supabaseAnonKey || 'your-anon-key',
    {
        global: {
            fetch: async (url, options = {}) => {
                const clerkToken = getClerkToken ? await getClerkToken() : null;
                const headers = new Headers(options?.headers);
                if (clerkToken) {
                    headers.set('Authorization', `Bearer ${clerkToken}`);
                }
                return fetch(url, { ...options, headers });
            }
        }
    }
);
