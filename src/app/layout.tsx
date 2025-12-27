// src/app/layout.tsx

import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';

// Import providers
import SupabaseProvider from '@/components/SupabaseProvider';
import { AuthProvider } from '@/lib/supabase/useAuth';
import { QueryProvider } from '@/components/QueryProvider';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata = {
  title: 'LemonDots AI - Demand Planning Platform',
  description: 'ML-powered demand forecasting for food manufacturing companies',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={inter.className}>
        <SupabaseProvider>
          <AuthProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
