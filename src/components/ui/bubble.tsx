import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * **A bolha de uma mensagem.**
 *
 * A API é a do `bubble` do Shadcn (grupo, bolha, conteúdo, `variant`, `align`),
 * com **duas divergências deliberadas**:
 *
 * **1 · As variantes vivem no conteúdo, e não no pai.** O original pinta por
 * seletor descendente (`*:data-[slot=bubble-content]:bg-primary`), e aqui isso
 * produzia strings gigantes que o `pnpm scan:strings` leu como texto de tela ·
 * ele estava certo no cheiro: a bolha sabe a própria cor, e um seletor de pai
 * pra isso é indireção sem ganho.
 *
 * **2 · As cores são os nossos tokens.** O Shadcn novo assume que o token **é**
 * uma cor e escreve `oklch(from var(--primary) …)`; aqui o token é uma **tripla
 * HSL crua** (`--primary: 145 94% 49%`), consumida como `hsl(var(--primary))`
 * pela ponte do Tailwind. `from var(--primary)` não recebe cor, o navegador
 * descarta a declaração inteira, e o desfecho seria **bolha transparente com os
 * doze checks verdes** · o `scan:tailwind` confere se a classe existe, e essas
 * existem.
 */
const bubbleVariants = cva(
  'w-fit min-w-0 max-w-full overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed [overflow-wrap:anywhere]',
  {
    variants: {
      variant: {
        /**
         * O meu lado · **verde tingido, e não chapado.**
         *
         * O chapado é do CTA, e numa conversa toda mensagem minha viraria um
         * botão · três seguidas na captura de 390 e a tela inteira pedia clique.
         * É a regra da casa aplicada onde ela costuma ser esquecida: **verde
         * marca, branco sustenta.**
         */
        mine: 'border-primary/40 bg-primary/15 text-foreground',
        /** O adversário. */
        theirs: 'bg-secondary text-foreground',
        /** A organização · borda em vez de preenchimento, pra não competir. */
        admin: 'border-primary/40 bg-card text-foreground',
        muted: 'bg-muted text-foreground',
      },
    },
    defaultVariants: { variant: 'theirs' },
  },
);

export type BubbleVariant = NonNullable<VariantProps<typeof bubbleVariants>['variant']>;

export function BubbleGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex min-w-0 flex-col gap-2', className)} {...props} />;
}

export function Bubble({
  align = 'start',
  className,
  ...props
}: React.ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-align={align}
      className={cn('flex min-w-0 flex-col gap-1 data-[align=end]:items-end', className)}
      {...props}
    />
  );
}

export function BubbleContent({
  variant = 'theirs',
  className,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof bubbleVariants>) {
  return <div className={cn(bubbleVariants({ variant }), className)} {...props} />;
}
