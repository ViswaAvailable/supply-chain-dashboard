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
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        setUser(session?.user ?? null);

        // Only fetch org_id if user is authenticated
        if (session?.user) {
          const orgIdResult = await fetchOrgId(session.user.id);
          if (isMounted) {
            setOrgId(orgIdResult);
          }
        } else {
          setOrgId(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (isMounted) {
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
          }
        } else {
          setOrgId(null);
        }

        setLoading(false);
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
