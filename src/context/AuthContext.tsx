import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
﻿import {
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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let ownerCheckId = 0;
    let authEventReceived = false;

    const deepLinkListener = App.addListener('appUrlOpen', async ({ url }) => {
      try {
        const callback = new URL(url);

        if (
          callback.protocol !== 'com.belucih.app:' ||
          callback.hostname !== 'login-callback'
        ) return;

        const callbackError =
          callback.searchParams.get('error_description') ||
          callback.searchParams.get('error');

        if (callbackError) {
          console.error('Google OAuth ditolak:', callbackError);
          await Browser.close().catch(() => undefined);
          return;
        }

        const code = callback.searchParams.get('code');

        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;
          if (!data.session) {
            throw new Error('Supabase tidak mengembalikan sesi setelah pertukaran kode.');
          }

          console.info('Google OAuth berhasil: sesi Supabase dibuat.');
          await Browser.close().catch(() => undefined);
          window.location.replace('/');
          return;
        }

        const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
        const accessToken = fragment.get('access_token');
        const refreshToken = fragment.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
          if (!data.session) {
            throw new Error('Supabase tidak mengembalikan sesi setelah callback token.');
          }

          console.info('Google OAuth berhasil: sesi Supabase dibuat.');
          await Browser.close().catch(() => undefined);
          window.location.replace('/');
          return;
        }

        console.error('Callback Google diterima, tetapi tidak berisi kode atau sesi.');
      } catch (error) {
        console.error(
          'Gagal memproses callback Google:',
          error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
        );
        await Browser.close().catch(() => undefined);
      }
    });



    const checkOwnerStatus = async (uid: string | null) => {
      const checkId = ++ownerCheckId;
      if (!uid) {
        if (mounted && checkId === ownerCheckId) setIsOwner(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_owner_check');
        if (mounted && checkId === ownerCheckId) setIsOwner(!error && data === true);
      } catch {
        if (mounted && checkId === ownerCheckId) setIsOwner(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      authEventReceived = true;
      if (!mounted) return;
      setSession(newSession);
      setLoading(false);
      void checkOwnerStatus(newSession?.user?.id ?? null);
    });

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        if (!authEventReceived) {
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
      void deepLinkListener.then((handle) => handle.remove());
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !error && !data.session,
    };
  };

  const signInWithGoogle = async () => {
    const native = Capacitor.isNativePlatform();
    const redirectTo = native
      ? 'com.belucih.app://login-callback'
      : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: native,
      },
    });

    if (error) return { error: error.message };

    if (native && data.url) {
      try {
        await Browser.open({ url: data.url });
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : 'Tidak dapat membuka browser Google.',
        };
      }
    }

    return { error: null };
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
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
