'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Minus } from 'lucide-react';
import { AnimatedNumber, AnimatedCurrency, AnimatedPercentage } from '@/components/ui/animated-number';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number;
  format?: 'number' | 'currency' | 'percentage';
  change?: {
    value: number;
    type: 'up' | 'down' | 'neutral' | 'warning';
    label?: string;
  };
  icon?: LucideIcon;
  className?: string;
}

export function KPICard({
  label,
  value,
  format = 'number',
  change,
  icon: Icon,
  className
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    switch (change.type) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5" />;
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5" />;
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5" />;
      default:
        return <Minus className="h-3.5 w-3.5" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return '';
    switch (change.type) {
      case 'up':
        return 'text-[var(--success)] bg-[var(--success)]/10';
      case 'down':
        return 'text-[var(--destructive)] bg-[var(--destructive)]/10';
      case 'warning':
        return 'text-[var(--warning)] bg-[var(--warning)]/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const renderValue = () => {
    switch (format) {
      case 'currency':
        return <AnimatedCurrency value={value} className="text-3xl font-bold tracking-tight" />;
      case 'percentage':
        return <AnimatedPercentage value={value} showSign={false} className="text-3xl font-bold tracking-tight" />;
      default:
        return <AnimatedNumber value={value} className="text-3xl font-bold tracking-tight" />;
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-card rounded-2xl border border-border/50 p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
        className
      )}
    >
      {/* Accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[var(--lemon-500)] to-[var(--lemon-600)] opacity-80" />

      <div className="flex items-start justify-between gap-4 pl-4">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {label}
          </p>

          {/* Value */}
          <div className="text-foreground mb-3">
            {renderValue()}
          </div>

          {/* Change indicator */}
          {change && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                  getTrendColor()
                )}
              >
                {getTrendIcon()}
                <AnimatedPercentage
                  value={change.value}
                  showSign={true}
                  className="text-xs font-semibold"
                />
              </span>
              {change.label && (
                <span className="text-xs text-muted-foreground">
                  {change.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[var(--charcoal-100)] flex items-center justify-center transition-all duration-200 group-hover:bg-[var(--lemon-100)] group-hover:scale-105">
            <Icon className="h-5 w-5 text-[var(--charcoal-600)] transition-colors group-hover:text-[var(--lemon-700)]" />
          </div>
        )}
      </div>
    </div>
  );
}

// Simple version for string values (backwards compatibility)
interface SimpleKPICardProps {
  label: string;
  value: string;
  change?: {
    value: string;
    type: 'up' | 'down' | 'neutral' | 'warning';
    label?: string;
  };
  icon?: LucideIcon;
  className?: string;
}

export function SimpleKPICard({
  label,
  value,
  change,
  icon: Icon,
  className
}: SimpleKPICardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    switch (change.type) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5" />;
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5" />;
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5" />;
      default:
        return <Minus className="h-3.5 w-3.5" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return '';
    switch (change.type) {
      case 'up':
        return 'text-[var(--success)] bg-[var(--success)]/10';
      case 'down':
        return 'text-[var(--destructive)] bg-[var(--destructive)]/10';
      case 'warning':
        return 'text-[var(--warning)] bg-[var(--warning)]/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-card rounded-2xl border border-border/50 p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
        className
      )}
    >
      {/* Accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[var(--lemon-500)] to-[var(--lemon-600)] opacity-80" />

      <div className="flex items-start justify-between gap-4 pl-4">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {label}
          </p>

          {/* Value */}
          <p className="text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-3">
            {value}
          </p>

          {/* Change indicator */}
          {change && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                  getTrendColor()
                )}
              >
                {getTrendIcon()}
                {change.value}
              </span>
              {change.label && (
                <span className="text-xs text-muted-foreground">
                  {change.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[var(--charcoal-100)] flex items-center justify-center transition-all duration-200 group-hover:bg-[var(--lemon-100)] group-hover:scale-105">
            <Icon className="h-5 w-5 text-[var(--charcoal-600)] transition-colors group-hover:text-[var(--lemon-700)]" />
          </div>
        )}
      </div>
    </div>
  );
}
