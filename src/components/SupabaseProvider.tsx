"use client";

import { createContext, useContext, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client'; // Your modern client helper

type SupabaseContextType = {
  supabase: SupabaseClient;
};

// Create the context with a default undefined value
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Define the provider component
export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Memoize the Supabase client instance to prevent re-creation on every render
  const supabase = useMemo(() => createClient(), []);

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Define a custom hook to easily access the context
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context.supabase;
};
