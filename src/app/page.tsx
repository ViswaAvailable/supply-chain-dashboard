"use client";

import { useAuth } from "@/lib/supabase/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // Timeout fallback - if loading takes more than 3 seconds, redirect to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - redirecting to login');
        setTimedOut(true);
        router.push('/login');
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [loading, router]);

  useEffect(() => {
    if (!loading && !timedOut) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, timedOut, router]);

  // Show loading state while checking authentication
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
