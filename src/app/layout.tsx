// src/app/layout.tsx

import './globals.css';
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';

// Import providers
import SupabaseProvider from '@/components/SupabaseProvider';
import { AuthProvider } from '@/lib/supabase/useAuth';
import { QueryProvider } from '@/components/QueryProvider';

// Display font for headings - geometric sans-serif with distinctive character
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

// Body font - technical heritage with excellent readability
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

// Data font - for numbers, currencies, percentages
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
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
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className="font-body antialiased">
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
