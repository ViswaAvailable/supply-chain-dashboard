'use client';

import { useAuth } from '@/lib/supabase/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getNextTrivia, type Trivia } from '@/lib/supply-chain-trivia';
import { useSupabase } from '@/components/SupabaseProvider';
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
  const [trivia] = useState<Trivia>(() => getNextTrivia());

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
        <div className="flex flex-col items-center gap-6 animate-fade-in max-w-sm w-full px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[var(--charcoal-900)] flex items-center justify-center shadow-xl">
                <div className="w-8 h-8 border-3 border-[var(--lemon-500)] border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="absolute -inset-2 bg-[var(--lemon-500)]/10 rounded-3xl blur-xl animate-pulse-subtle" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Loading your dashboard...</p>
          </div>
          <div className="w-full rounded-2xl overflow-hidden border border-[var(--lemon-500)]/20 bg-[var(--charcoal-900)]/70 backdrop-blur-sm">
            <div className="h-[3px] bg-gradient-to-r from-[var(--lemon-500)]/0 via-[var(--lemon-500)] to-[var(--lemon-500)]/0" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Did you know?</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--lemon-500)]/10 border border-[var(--lemon-500)]/20">
                  <span className="text-xs leading-none">{trivia.emoji}</span>
                  <span className="text-[10px] font-semibold text-[var(--lemon-500)] uppercase tracking-wider">{trivia.category}</span>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{trivia.fact}</p>
            </div>
          </div>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh p-4">
        <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md text-center animate-scale-in border border-border">
          <div className="w-16 h-16 rounded-2xl bg-[var(--lemon-100)] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[var(--lemon-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3 text-foreground">
            Waiting for Access
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Your account has been created but is not yet linked to an organization.
            Please wait for your admin to assign you access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Top Accent Line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--lemon-500)] via-[var(--lemon-400)] to-[var(--lemon-500)] z-[60]" />

      {/* Floating Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="ml-[calc(256px+32px)] min-h-screen pt-6 pr-6 pb-6">
        <div className="animate-slide-up">
          {children}
        </div>
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
