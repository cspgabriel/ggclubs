import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * O selo do produto inteiro.
 *
 * **A forma é `rounded-md`, e não `rounded-full`** · decisão do Eduardo em
 * 08/08/2026, olhando o card de club: ele gosta da identidade de lá, que **não é
 * totalmente redonda**. O produto tinha ido pro `rounded-full` em quase todo
 * lugar, e o card de club era a exceção que ele preferia · quem cedeu foi a
 * maioria.
 *
 * **A altura é fixa por tamanho, e é isso que conserta o alinhamento** · o selo
 * de plataforma parecia mais alto que os vizinhos porque o `PlatformMark` traz a
 * própria caixa de 22px. Com a altura no selo e o glifo dentro, os dois passam a
 * medir a mesma coisa. Foi o Eduardo quem viu.
 *
 * **Verde carrega significado, então selo neutro não pode vesti-lo** · a linha
 * já estava aqui e continua valendo. Um card com três verdes não destaca
 * nenhum, e isso já aconteceu duas vezes em 08/08.
 */
const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1.5 rounded-md font-semibold uppercase tracking-widest ring-1 ring-inset transition-colors',
  {
    variants: {
      variant: {
        // Neutro · o fato que a tela mostra sem pedir atenção.
        default: 'bg-secondary text-muted-foreground ring-border',
        // O que a tela existe pra responder · **um por card**.
        success: 'bg-primary/15 text-primary ring-primary/25',
        danger: 'bg-destructive/10 text-destructive ring-destructive/25',
        outline: 'bg-transparent text-foreground ring-border',
        /**
         * Verde **contornado**, e não preenchido · é o peso do meio.
         *
         * Existe porque o papel no card de club (dono, gerente, membro) tinha
         * exatamente este tratamento e eu o rebaixei pra cinza ao padronizar ·
         * o Eduardo apontou que ele ficou sem destaque. Contornado ele destaca
         * **sem** virar um segundo bloco verde ao lado da tag, que é a regra do
         * verde em tudo matar o destaque.
         */
        brand: 'bg-transparent text-primary ring-primary/40',
        muted: 'bg-muted text-muted-foreground ring-border',
        /**
         * **O fato confirmado** · mesma superfície do neutro, texto em branco
         * cheio. É o degrau entre `default` (fato solto) e `success` (a resposta
         * da tela), e ele existe porque o Eduardo pediu destaque pra "mesma
         * geração" **sem ser verde** · verde ali seria o acento na maioria dos
         * cards, que é a regra do design.md.
         *
         * **Branco é o par do verde nesta identidade** ("verde marca, branco
         * sustenta"), então ele destaca sem abrir um segundo acento · e abrir um
         * seria a decisão que matou o `emerald` em 28/07.
         */
        strong: 'bg-secondary text-foreground ring-border',
        /** Ressalva · informa sem competir, e sem virar erro. */
        warning: 'bg-amber-400/10 text-amber-400 ring-amber-400/25',
        onDark: 'bg-white/10 text-white ring-white/20 backdrop-blur',
      },
      size: {
        /** Rodapé de card · a altura casa com o glifo do `PlatformMark`. */
        sm: 'h-[22px] px-2 text-[10px]',
        md: 'h-7 px-2.5 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    /**
     * Ícone à esquerda do rótulo.
     *
     * **Ele encurta o rótulo, não substitui.** Pedido do Eduardo em 09/08/2026,
     * e a ressalva é dele também: precisa continuar entendível. Ícone sozinho só
     * funciona quando o símbolo é convenção · "procura club" não tem uma, e num
     * card de estranhos ninguém para pra decifrar desenho. O par ícone + palavra
     * curta lê de relance **e** sobrevive ao celular, onde não há hover pra
     * explicar nada.
     */
    icon?: React.ComponentType<{ className?: string }>;
  };

const ICON_SIZE = { sm: 'h-3 w-3', md: 'h-3.5 w-3.5' } as const;

export function Badge({ className, variant, size, icon: Icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {Icon && <Icon className={cn('shrink-0', ICON_SIZE[size ?? 'md'])} />}
      {children}
    </span>
  );
}
