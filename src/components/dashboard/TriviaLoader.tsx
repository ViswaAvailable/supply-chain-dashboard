'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { getNextTrivia, type Trivia } from '@/lib/supply-chain-trivia';

interface TriviaLoaderProps {
  variant?: 'fullpage' | 'inline';
  message?: string;
}

export function TriviaLoader({ variant = 'fullpage', message }: TriviaLoaderProps) {
  const [trivia] = useState<Trivia>(() => getNextTrivia());

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-6 max-w-md w-full px-6">
          {/* Bouncing dots loader */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--lemon-500)] animate-bounce-sequence" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[var(--lemon-500)] animate-bounce-sequence" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[var(--lemon-500)] animate-bounce-sequence" style={{ animationDelay: '300ms' }} />
          </div>

          <p className="text-muted-foreground text-sm font-medium animate-fade-in">
            {message || 'Loading forecast data...'}
          </p>

          {/* Trivia Card */}
          <div className="w-full opacity-0 animate-slide-up stagger-1">
            <TriviaCard trivia={trivia} compact />
          </div>
        </div>
      </div>
    );
  }

  // Full-page variant
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh relative overflow-hidden">
      {/* Floating ambient dots */}
      <FloatingDots />

      <div className="flex flex-col items-center gap-10 max-w-[420px] w-full px-6 relative z-10">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <Image
              src="/lemondots-logo.png"
              alt="LemonDots"
              width={52}
              height={52}
              className="h-13 w-auto relative z-10"
              priority
            />
            <div className="absolute -inset-4 bg-[var(--lemon-500)]/12 rounded-3xl blur-2xl animate-pulse-subtle" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-semibold text-foreground tracking-tight font-[family-name:var(--font-display)]">
              LemonDots
            </span>
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[var(--lemon-600)] flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              AI Forecasting
            </span>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-4 w-full opacity-0 animate-fade-in stagger-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--lemon-500)] animate-bounce-sequence" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[var(--lemon-500)] animate-bounce-sequence" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[var(--lemon-500)] animate-bounce-sequence" style={{ animationDelay: '300ms' }} />
          </div>
          <div className="w-48 h-[2px] bg-[var(--charcoal-200)] rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-[var(--lemon-400)] to-[var(--lemon-500)] rounded-full animate-progress-indeterminate" />
          </div>
        </div>

        {/* Trivia Card */}
        <div className="w-full opacity-0 animate-slide-up stagger-2">
          <TriviaCard trivia={trivia} />
        </div>

        {/* Loading text */}
        <p className="text-muted-foreground text-xs font-medium tracking-wide opacity-0 animate-fade-in stagger-3">
          {message || 'Preparing your dashboard...'}
        </p>
      </div>
    </div>
  );
}

function TriviaCard({ trivia, compact = false }: { trivia: Trivia; compact?: boolean }) {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-card border border-[var(--charcoal-200)] shadow-md">
      {/* Animated accent bar */}
      <div
        className="h-[3px] animate-gradient"
        style={{
          background: 'linear-gradient(90deg, var(--lemon-400), var(--lemon-500), var(--lemon-400))',
          backgroundSize: '200% 100%',
        }}
      />

      <div className={compact ? 'p-5' : 'px-6 pt-5 pb-6'}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-[2px] bg-[var(--lemon-500)] rounded-full" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              Did you know?
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--lemon-50)] border border-[var(--lemon-200)]/60">
            <span className="text-sm leading-none">{trivia.emoji}</span>
            <span className="text-[10px] font-semibold text-[var(--lemon-700)] uppercase tracking-wider">
              {trivia.category}
            </span>
          </div>
        </div>

        {/* Fact */}
        <p className={`text-foreground/85 leading-relaxed ${compact ? 'text-sm' : 'text-[15px]'}`}>
          {trivia.fact}
        </p>
      </div>
    </div>
  );
}

function FloatingDots() {
  const dots: Array<{
    top?: string; left?: string; right?: string; bottom?: string;
    w: number; opacity: number; delay: string; duration: string;
  }> = [
    { top: '12%', left: '8%', w: 8, opacity: 0.2, delay: '0s', duration: '8s' },
    { top: '22%', right: '12%', w: 12, opacity: 0.12, delay: '2s', duration: '10s' },
    { bottom: '28%', left: '18%', w: 6, opacity: 0.25, delay: '4s', duration: '7s' },
    { top: '55%', right: '22%', w: 10, opacity: 0.1, delay: '1s', duration: '9s' },
    { bottom: '15%', right: '8%', w: 8, opacity: 0.15, delay: '3s', duration: '11s' },
    { top: '40%', left: '5%', w: 4, opacity: 0.2, delay: '5s', duration: '6s' },
    { bottom: '40%', right: '35%', w: 6, opacity: 0.1, delay: '2.5s', duration: '12s' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            top: dot.top,
            left: dot.left,
            right: dot.right,
            bottom: dot.bottom,
            width: dot.w,
            height: dot.w,
            backgroundColor: `rgba(234, 179, 8, ${dot.opacity})`,
            animationDelay: dot.delay,
            animationDuration: dot.duration,
          }}
        />
      ))}
    </div>
  );
}
