import * as React from 'react';
import {
  MessageScroller as MessageScrollerPrimitive,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from '@shadcn/react/message-scroller';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * **A rolagem de uma conversa** · e ela é o motivo de a lib existir.
 *
 * O que este arquivo embrulha é o `message-scroller` do Shadcn (variante
 * Radix), e o comportamento mora no `@shadcn/react` · 55 KB, **zero
 * dependências próprias**, decisão do Eduardo em 27/08/2026.
 *
 * **O que ele entrega, e que a gente escreveria errado:** grudar na base
 * enquanto chega mensagem nova, **soltar quando a pessoa rola pra cima**, e
 * **preservar a posição ao carregar histórico** · esse último é o que faz a
 * lista pular quando é escrito à mão, e o defeito só aparece com conversa
 * longa, que é justamente quando ninguém está olhando pro código.
 *
 * **A ressalva está escrita porque ela é real:** a lib está na 0.3.0. Ela vive
 * neste arquivo e em nenhum outro · trocar por hooks nossos é ~60 linhas, e a
 * superfície é esta lista de peças.
 *
 * As classes exóticas do original (`scroll-fade-b`, `scrollbar-thin`,
 * `contain-intrinsic-size`) **saíram** · três delas não existem na nossa build
 * do Tailwind, e classe que não existe não pinta nada e passa nos checks.
 */
export function MessageScrollerProvider(
  props: React.ComponentProps<typeof MessageScrollerPrimitive.Provider>,
) {
  return <MessageScrollerPrimitive.Provider {...props} />;
}

export function MessageScroller({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Root>) {
  return (
    <MessageScrollerPrimitive.Root
      className={cn('relative flex size-full min-h-0 flex-col overflow-hidden', className)}
      {...props}
    />
  );
}

export function MessageScrollerViewport({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Viewport>) {
  return (
    <MessageScrollerPrimitive.Viewport
      className={cn('size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain', className)}
      {...props}
    />
  );
}

export function MessageScrollerContent({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Content>) {
  return (
    <MessageScrollerPrimitive.Content
      className={cn('flex h-max min-h-full flex-col justify-end gap-3', className)}
      {...props}
    />
  );
}

export function MessageScrollerItem({
  className,
  scrollAnchor = false,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      scrollAnchor={scrollAnchor}
      className={cn('min-w-0 shrink-0', className)}
      {...props}
    />
  );
}

/** O botão de voltar pro fim · só aparece quando a pessoa saiu da base. */
export function MessageScrollerButton({
  direction = 'end',
  className,
  label,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Button> & { label: string }) {
  return (
    <MessageScrollerPrimitive.Button
      data-direction={direction}
      direction={direction}
      className={cn(
        'absolute bottom-3 left-1/2 -translate-x-1/2 transition-opacity',
        'data-[active=false]:pointer-events-none data-[active=false]:opacity-0',
        className,
      )}
      render={<Button variant="secondary" size="sm" />}
      {...props}
    >
      <ArrowDown className="h-4 w-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </MessageScrollerPrimitive.Button>
  );
}

export { useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility };
