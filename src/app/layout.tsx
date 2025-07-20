// src/app/layout.tsx

import './globals.css';
import { Inter } from 'next/font/google';

// 1. Import your providers
import SupabaseProvider from '@/components/SupabaseProvider';
import { AuthProvider } from '@/lib/supabase/useAuth'; // Note the .tsx extension may not be needed in the import path

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Your App Title',
  description: 'Your App Description',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 2. Wrap your children with the providers */}
        {/* SupabaseProvider must be on the outside because AuthProvider uses it */}
        <SupabaseProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
