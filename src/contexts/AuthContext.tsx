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
  // Inicialização síncrona a partir do localStorage para funcionamento OFFLINE instantâneo
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const cached = localStorage.getItem('devban_cached_session');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('devban_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('devban_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Auxiliar para atualizar cache local
  const saveAuthCache = (newSession: Session | null, newUser: User | null, newProfile?: Profile | null) => {
    try {
      if (newSession) localStorage.setItem('devban_cached_session', JSON.stringify(newSession));
      if (newUser) localStorage.setItem('devban_cached_user', JSON.stringify(newUser));
      if (newProfile !== undefined) {
        if (newProfile) localStorage.setItem('devban_cached_profile', JSON.stringify(newProfile));
        else localStorage.removeItem('devban_cached_profile');
      }
    } catch (e) {
      console.warn('Falha ao salvar cache de autenticação:', e);
    }
  };

  const clearAuthCache = () => {
    try {
      localStorage.removeItem('devban_cached_session');
      localStorage.removeItem('devban_cached_user');
      localStorage.removeItem('devban_cached_profile');
    } catch (e) {
      console.warn('Falha ao limpar cache de autenticação:', e);
    }
  };

  useEffect(() => {
    // 1. Obtém sessão inicial
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      if (activeSession) {
        setSession(activeSession);
        setUser(activeSession.user);
        saveAuthCache(activeSession, activeSession.user);
        fetchProfile(activeSession.user.id);
      } else {
        // Se estiver OFFLINE e já tínhamos um usuário no cache, MANTÉM a sessão local para não jogar pro login
        const isOffline = !navigator.onLine;
        const cachedUser = localStorage.getItem('devban_cached_user');
        
        if (isOffline && cachedUser) {
          console.log('[AuthContext] Modo Offline: Mantendo usuário logado no cache local.');
          setIsLoading(false);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          clearAuthCache();
          setIsLoading(false);
        }
      }
    }).catch(err => {
      console.warn('[AuthContext] Erro ao buscar sessão (provavelmente offline):', err);
      setIsLoading(false);
    });

    // 2. Escuta mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, activeSession) => {
      if (activeSession) {
        setSession(activeSession);
        setUser(activeSession.user);
        saveAuthCache(activeSession, activeSession.user);
        fetchProfile(activeSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        clearAuthCache();
        setIsLoading(false);
      } else {
        // Se a sessão expirou ou perdeu rede sem ser deslogado explicitamente
        if (!navigator.onLine && user) {
          console.log('[AuthContext] Perda de rede detectada. Mantendo sessão offline.');
        } else {
          setIsLoading(false);
        }
      }
    });

    // 3. Suporte para Deep Link no Capacitor Native
    let appUrlListener: any;
    if (isNative) {
      appUrlListener = App.addListener('appUrlOpen', async (data: any) => {
        const parts = data.url.split('#');
        if (parts.length > 1) {
          const hash = parts[1];
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
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
              console.error('Erro ao definir sessão pelo deep link:', error);
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
        console.warn('Não foi possível buscar perfil (provavelmente offline):', error);
      } else if (data) {
        setProfile(data);
        saveAuthCache(session, user, data);
      }
    } catch (err) {
      console.warn('Erro na busca do perfil:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    clearAuthCache();
    setSession(null);
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro no signOut do Supabase:', e);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const newProfile = profile ? { ...profile, ...updates } : null;
    setProfile(newProfile);
    saveAuthCache(session, user, newProfile);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
