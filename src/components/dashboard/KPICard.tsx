'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  change?: {
    value: string;
    type: 'up' | 'down' | 'neutral' | 'warning';
    label?: string;
  };
  className?: string;
}

export function KPICard({ label, value, change, className }: KPICardProps) {
  return (
    <Card className={cn('transition-all hover:shadow-md hover:-translate-y-0.5', className)}>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground mb-1">
          {value}
        </p>
        {change && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-sm font-semibold',
              change.type === 'up' && 'text-green-600',
              change.type === 'down' && 'text-red-600',
              change.type === 'neutral' && 'text-muted-foreground',
              change.type === 'warning' && 'text-amber-600'
            )}
          >
            {change.type === 'up' && <TrendingUp className="h-4 w-4" />}
            {change.type === 'down' && <TrendingDown className="h-4 w-4" />}
            {change.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
            <span>{change.value}</span>
            {change.label && (
              <span className="text-muted-foreground font-normal">{change.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


