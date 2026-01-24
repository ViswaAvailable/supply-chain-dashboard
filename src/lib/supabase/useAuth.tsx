"use client";

import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  orgId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = useSupabase();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoized function to fetch org_id
  const fetchOrgId = useCallback(async (userId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', userId)
        .single();
      return userData?.org_id ?? null;
    } catch {
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        // Add timeout to prevent infinite loading (reduced from 5s to 3s)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );

        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>;

        if (!isMounted) return;

        setUser(session?.user ?? null);

        // Fetch org_id if user is authenticated - wait for it since dashboard needs it
        if (session?.user) {
          const orgIdResult = await fetchOrgId(session.user.id);
          if (isMounted) {
            setOrgId(orgIdResult);
            setLoading(false);
          }
        } else {
          setOrgId(null);
          if (isMounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
        // Still set user to null on error so app can proceed
        if (isMounted) {
          setUser(null);
          setOrgId(null);
          setLoading(false);
        }
      }
    };

    // Start session check immediately
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setUser(session?.user ?? null);

        // Fetch org_id when auth state changes
        if (session?.user) {
          const orgIdResult = await fetchOrgId(session.user.id);
          if (isMounted) {
            setOrgId(orgIdResult);
            setLoading(false);
          }
        } else {
          setOrgId(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, supabase.auth, fetchOrgId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const value = {
    user,
    orgId,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
