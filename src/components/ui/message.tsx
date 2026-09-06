import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * **A linha de uma mensagem** · avatar, conteúdo, e de que lado ela fica.
 *
 * Vem do `message` do Shadcn (27/08/2026), trazido pelo CLI numa pasta
 * descartável e portado à mão · o original é React e Tailwind puros, sem
 * dependência nenhuma, e o que mudou aqui foi só o dialeto: `data-slot`
 * continua onde o CSS depende dele, e saiu de onde era enfeite.
 *
 * **O `align` é a única decisão de layout** · `end` é quem fala pelo meu club,
 * `start` é o adversário e a organização. Ele inverte a linha inteira, então o
 * avatar acompanha sem regra extra.
 */
export function MessageGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex min-w-0 flex-col gap-2', className)} {...props} />;
}

export function Message({
  className,
  align = 'start',
  ...props
}: React.ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-align={align}
      className={cn(
        'group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse',
        className,
      )}
      {...props}
    />
  );
}

export function MessageAvatar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-1 group-data-[align=end]/message:items-end',
        className,
      )}
      {...props}
    />
  );
}

/** Quem falou e quando · acima da bolha. */
export function MessageHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex max-w-full min-w-0 items-center gap-1.5 px-1 text-[11px] uppercase tracking-widest text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function MessageFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex max-w-full min-w-0 items-center px-1 text-xs text-muted-foreground group-data-[align=end]/message:justify-end',
        className,
      )}
      {...props}
    />
  );
}
