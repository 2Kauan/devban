import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { App } from '@capacitor/app';
import { isNative } from '@/lib/capacitor';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    let appUrlListener: any;
    if (isNative) {
      appUrlListener = App.addListener('appUrlOpen', async (data: any) => {
        const parts = data.url.split('#');
        if (parts.length > 1) {
          const hash = parts[1];
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          // Captura os tokens do provedor Google se existirem no redirecionamento do Deep Link
          const providerToken = params.get('provider_token');
          if (providerToken) {
            localStorage.setItem('devban_gcal_token', providerToken);
          }
          const providerRefreshToken = params.get('provider_refresh_token');
          if (providerRefreshToken) {
            localStorage.setItem('devban_gcal_refresh_token', providerRefreshToken);
          }
          
          if (accessToken && refreshToken) {
            setIsLoading(true);
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              console.error('Error setting session from deep link:', error);
              setIsLoading(false);
            }
          }
        }
      });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlListener) {
        appUrlListener.then((listener: any) => listener.remove());
      }
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      fetchProfile(user.id); // Revert on error
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
