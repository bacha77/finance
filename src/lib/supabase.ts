import type { SupabaseClient } from '@supabase/supabase-js';
import { firebaseClient } from './firebaseAdapter';

// Allow dynamically setting the token fetcher from Clerk
let getClerkToken: (() => Promise<string | null>) | null = null;
export const setClerkTokenFetcher = (fetcher: () => Promise<string | null>) => {
    getClerkToken = fetcher;
};
export const getClerkTokenFetcher = () => getClerkToken;

// Route all database, auth & storage operations directly to Firebase (Firestore / Firebase Storage)
export const supabase: SupabaseClient<any, any, any> = firebaseClient as unknown as SupabaseClient<any, any, any>;

export { firebaseClient };
export * from './firebase';

