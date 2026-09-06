import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * **A caixa cresce com o texto, e `rows` deixa de valer onde isso acontece.**
 *
 * `field-sizing: content` é do Chromium (medido no Edge 151 desta máquina) e
 * **ignora o `rows`**: sem `min-h` a caixa nasce com uma linha, 38px. Por isso
 * o mínimo é altura, e não linha · o `rows` que os chamadores passam continua
 * sendo o piso de quem **não** suporta a propriedade, e é de graça mantê-lo.
 *
 * O teto existe pelo motivo oposto: sem ele, colar dez linhas empurra o resto
 * do formulário pra fora da tela. Passando dele, a caixa rola por dentro.
 *
 * **E rolar por dentro pede `overscroll-contain`** (28/08/2026) · sem ele,
 * chegar ao fim do texto **rola a página atrás**, e num diálogo isso move a
 * tela debaixo de quem está escrevendo. É a mesma regra do `DialogSurface`, e
 * ela veio junto: o campo de escrever da sala era o único container do diálogo
 * que ainda vazava · ver `docs/design.md`.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex max-h-64 min-h-[80px] w-full field-sizing-content overscroll-contain rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
