'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  formatFn = (v) => v.toLocaleString('en-IN'),
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startValue = useRef(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) {
        startTime.current = timestamp;
      }

      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-expo)
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);

      const currentValue = startValue.current + (value - startValue.current) * easeOutExpo;
      setDisplayValue(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={cn('tabular-nums font-mono', className)}>
      {formatFn(Math.round(displayValue))}
    </span>
  );
}

interface AnimatedPercentageProps {
  value: number;
  duration?: number;
  showSign?: boolean;
  className?: string;
}

export function AnimatedPercentage({
  value,
  duration = 1000,
  showSign = true,
  className,
}: AnimatedPercentageProps) {
  const formatFn = (v: number) => {
    const sign = showSign && v > 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}%`;
  };

  return (
    <AnimatedNumber
      value={value}
      duration={duration}
      formatFn={formatFn}
      className={className}
    />
  );
}

interface AnimatedCurrencyProps {
  value: number;
  duration?: number;
  currency?: string;
  className?: string;
}

export function AnimatedCurrency({
  value,
  duration = 1000,
  currency = '₹',
  className,
}: AnimatedCurrencyProps) {
  const formatFn = (v: number) => {
    return `${currency}${v.toLocaleString('en-IN')}`;
  };

  return (
    <AnimatedNumber
      value={value}
      duration={duration}
      formatFn={formatFn}
      className={className}
    />
  );
}
