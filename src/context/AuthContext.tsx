import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isOwner: boolean;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const authEventReceived = { current: false };

    const checkOwnerStatus = async (uid: string | null) => {
      if (!uid) {
        if (mounted) setIsOwner(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_owner_check');

        if (mounted) {
          setIsOwner(!error && data === true);
        }
      } catch {
        if (mounted) setIsOwner(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        authEventReceived.current = true;
        setSession(newSession);
        setLoading(false);

        void checkOwnerStatus(newSession?.user?.id ?? null);
      }
    );

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        if (!authEventReceived.current) {
          setSession(data.session);
          await checkOwnerStatus(data.session?.user?.id ?? null);
        }
      } catch (error) {
        console.error('Gagal memulihkan sesi autentikasi:', error);

        if (mounted) {
          setSession(null);
          setIsOwner(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setSession(null);
    setIsOwner(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isOwner,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
