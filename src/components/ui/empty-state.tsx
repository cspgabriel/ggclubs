import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from './button';
import { ExternalLink } from './external-link';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Primary action · either internal link (`to`) or external (`href`) or onClick. */
  action?:
    | { label: string; to: string; onClick?: never; href?: never }
    | { label: string; onClick: () => void; to?: never; href?: never }
    | { label: string; href: string; to?: never; onClick?: never };
  /** Optional secondary action (rendered as ghost). */
  secondaryAction?: { label: string; to?: string; onClick?: () => void };
  /** Visual treatment of the icon halo. */
  tone?: 'default' | 'error' | 'brand';
  /** Padding and max-width preset. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const TONES = {
  default: 'bg-secondary text-muted-foreground',
  error: 'bg-destructive/10 text-destructive',
  brand: 'bg-primary/10 text-primary',
} as const;

// O espaçamento interno anda junto do tamanho. Antes era fixo, então o preset
// `sm` encolhia só o ícone e mantinha os vãos de uma tela inteira · num bloco
// dentro de uma lista isso ocupa mais altura que o conteúdo que ele explica.
const SIZES = {
  sm: {
    wrapper: 'py-8',
    icon: 'h-12 w-12',
    iconSize: 'h-6 w-6',
    title: 'mt-3 text-lg md:text-xl',
    desc: 'mt-1.5 text-sm',
    action: 'mt-4',
  },
  md: {
    wrapper: 'py-16',
    icon: 'h-16 w-16',
    iconSize: 'h-8 w-8',
    title: 'mt-5 text-xl md:text-2xl',
    desc: 'mt-2 text-sm md:text-base',
    action: 'mt-6',
  },
  lg: {
    wrapper: 'py-24 md:py-32',
    icon: 'h-20 w-20',
    iconSize: 'h-10 w-10',
    title: 'mt-5 text-xl md:text-2xl',
    desc: 'mt-2 text-sm md:text-base',
    action: 'mt-6',
  },
} as const;

/**
 * Visual placeholder for 404s, empty lists, errors, and "nothing here yet"
 * states. One look-and-feel across the whole app.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tone = 'default',
  size = 'md',
  className,
}: EmptyStateProps) {
  const sz = SIZES[size];
  return (
    <div className={cn('flex flex-col items-center text-center', sz.wrapper, className)}>
      <div className={cn('flex items-center justify-center rounded-full', sz.icon, TONES[tone])}>
        <Icon className={sz.iconSize} strokeWidth={2} />
      </div>

      <h2 className={cn('text-balance font-display uppercase tracking-tight', sz.title)}>
        {title}
      </h2>

      {description && (
        <div className={cn('max-w-md text-balance text-muted-foreground', sz.desc)}>
          {description}
        </div>
      )}

      {(action || secondaryAction) && (
        <div className={cn('flex flex-wrap items-center justify-center gap-2', sz.action)}>
          {action && <PrimaryAction action={action} />}
          {secondaryAction && (
            <Button
              asChild={!!secondaryAction.to}
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.to ? (
                <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
              ) : (
                <span>{secondaryAction.label}</span>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function PrimaryAction({ action }: { action: NonNullable<EmptyStateProps['action']> }) {
  if (action.to) {
    return (
      <Button asChild variant="ctaOutline">
        <Link to={action.to}>{action.label}</Link>
      </Button>
    );
  }
  if (action.href) {
    return (
      // No app instalado uma âncora `target="_blank"` não abre nada · quem sabe
      // disso é o `ExternalLink`, e não cada tela que oferece um link.
      <Button asChild variant="ctaOutline">
        <ExternalLink href={action.href}>{action.label}</ExternalLink>
      </Button>
    );
  }
  return (
    <Button variant="ctaOutline" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}
