import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: 'default' | 'brand' | 'muted';
  hint?: string;
};

const TONES = {
  default: 'bg-secondary text-foreground',
  brand: 'bg-primary/10 text-primary',
  muted: 'bg-secondary text-muted-foreground',
} as const;

export function StatCard({ label, value, icon: Icon, tone = 'default', hint }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-2 font-display text-4xl tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
