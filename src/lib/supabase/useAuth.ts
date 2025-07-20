"use client"; // Custom hooks that use other hooks should be client components

import { useEffect, useState, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { createClient } from "./client"; // CHANGE 1: Import the function

export function useAuth() {
  // CHANGE 2: Create the client instance inside the hook
  const supabase = createClient(); 
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // The getSession call is now handled by onAuthStateChange automatically
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [supabase.auth]); // CHANGE 3: Add dependency to be correct

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase.auth]); // CHANGE 4: Add dependency to be correct

  const user = session?.user ?? null;
  const email = user?.email ?? null;

  return { session, user, email, loading, signOut };
}
