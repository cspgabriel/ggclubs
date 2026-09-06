import type { ButtonHTMLAttributes } from 'react';
import { Chamfer } from '@/components/ui/chamfer';
import { cn } from '@/lib/utils';

export function TournamentChoice({
  selected,
  compact = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; compact?: boolean }) {
  return (
    <Chamfer
      size="0.5rem"
      border={selected ? 'bg-primary' : 'bg-border'}
      className={cn(
        'group min-w-0 transition-colors focus-within:bg-primary motion-reduce:transition-none',
        !selected && 'hover:bg-primary/60',
        className,
      )}
      innerClassName={selected ? 'bg-primary' : 'bg-card'}
    >
      <button
        {...props}
        type="button"
        className={cn(
          'flex h-full min-h-11 w-full items-center justify-center uppercase transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 motion-reduce:transition-none',
          compact
            ? 'flex-col gap-1.5 whitespace-nowrap px-0.5 py-2 text-[9px] font-bold leading-4'
            : 'px-2 py-3 font-display text-[10px] tracking-tight sm:px-5 sm:text-xs',
          selected
            ? 'text-primary-foreground hover:ring-2 hover:ring-inset hover:ring-primary-foreground/20 focus-visible:outline-primary-foreground'
            : 'text-foreground group-hover:text-primary focus-visible:outline-primary',
        )}
      >
        {children}
      </button>
    </Chamfer>
  );
}
