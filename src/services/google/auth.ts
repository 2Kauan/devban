import { supabase } from '@/lib/supabase';

/**
 * Gets the Google OAuth Access Token from current session or localStorage cache.
 */
export const getGoogleToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      localStorage.setItem('devban_gcal_token', session.provider_token);
      return session.provider_token;
    }
    const cachedToken = localStorage.getItem('devban_gcal_token');
    if (cachedToken) return cachedToken;
  } catch (err) {
    console.error('Error fetching Google token:', err);
  }
  return null;
};
