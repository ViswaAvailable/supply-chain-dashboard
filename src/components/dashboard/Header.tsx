'use client';

import Image from 'next/image';
import Link from 'next/link';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 shadow-md" style={{ backgroundColor: '#1e293b' }}>
      <div className="h-full px-6 flex items-center">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/lemondots-logo.png"
            alt="LemonDots Logo"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
          <h1 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
            LemonDots <span style={{ color: '#fbbf24' }}>AI</span>
          </h1>
        </Link>
      </div>
    </header>
  );
}

