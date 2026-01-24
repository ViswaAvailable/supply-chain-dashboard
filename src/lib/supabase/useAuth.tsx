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
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );

        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>;

        if (!isMounted) return;

        setUser(session?.user ?? null);

        // Only fetch org_id if user is authenticated - don't block on this
        if (session?.user) {
          // Fetch org_id in background, don't block loading
          fetchOrgId(session.user.id).then(orgIdResult => {
            if (isMounted) {
              setOrgId(orgIdResult);
            }
          }).catch(() => {
            // Silently fail - user can still use the app
            console.warn('Could not fetch org_id');
          });
        } else {
          setOrgId(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        // Still set user to null on error so app can proceed
        if (isMounted) {
          setUser(null);
          setOrgId(null);
        }
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

        // Fetch org_id when auth state changes - don't block
        if (session?.user) {
          fetchOrgId(session.user.id).then(orgIdResult => {
            if (isMounted) {
              setOrgId(orgIdResult);
            }
          }).catch(() => {
            console.warn('Could not fetch org_id on auth change');
          });
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
