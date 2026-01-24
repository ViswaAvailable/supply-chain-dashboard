"use client";

import { useState, useEffect, useContext, createContext } from 'react';
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

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // Fetch org_id from users table
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', session.user.id)
          .single();
        setOrgId(userData?.org_id ?? null);
      } else {
        setOrgId(null);
      }

      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        // Fetch org_id when auth state changes
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', session.user.id)
            .single();
          setOrgId(userData?.org_id ?? null);
        } else {
          setOrgId(null);
        }

        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, supabase.auth]);

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
