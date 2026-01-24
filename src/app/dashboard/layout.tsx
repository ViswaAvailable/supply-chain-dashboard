'use client';

import { useAuth } from '@/lib/supabase/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { Header } from '@/components/dashboard/Header';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function checkAccess() {
      if (!user) return;

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', user.id)
          .single();

        if (error || !userData?.org_id) {
          // User doesn't have an organization yet
          setHasAccess(false);
        } else {
          setHasAccess(true);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      checkAccess();
    }
  }, [user, authLoading, router, supabase]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // User not logged in (redirect happening)
  if (!user) {
    return null;
  }

  // User doesn't have organization access
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">
            Waiting for Admin Approval
          </h1>
          <p className="text-muted-foreground">
            Your account has been created but is not yet linked to an organization.
            Please wait for your organization admin to assign you or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}


