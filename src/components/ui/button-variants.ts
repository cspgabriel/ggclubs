import { cva } from 'class-variance-authority';

// Mora fora do button.tsx pra não quebrar o fast refresh do Vite · arquivo de
// componente só pode exportar componente.
export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Legado do shadcn. Não usar em tela nova · é verde sólido igual ao
        // `cta`, e duas variantes com o mesmo peso destroem a hierarquia.
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        // CTA da marca · verde chapado, texto quase preto, caixa alta.
        // Sem sombra: a referência não tem, e verde saturado sobre preto já
        // parece emitir luz sozinho. Halo por cima vira borrão.
        // O hover NÃO mexe na cor · clarear verde neon lava a saturação, que é
        // a marca. Em vez disso acende um anel nítido, como holofote travando.
        cta: 'bg-primary text-primary-foreground font-bold uppercase tracking-wide transition-all hover:ring-2 hover:ring-brand/60 hover:ring-offset-4 hover:ring-offset-background active:scale-[0.98]',
        // Ação da marca em segundo plano · mesma família do CTA, menos peso.
        // Hover preenche sólido: é o inverso natural, e não clareia o verde.
        ctaOutline:
          'border-2 border-primary bg-transparent text-primary font-bold uppercase tracking-wide transition-colors hover:bg-primary hover:text-primary-foreground active:scale-[0.98]',
        // Neutro · pra ação que NÃO deve vestir a marca, tipo login com Google.
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        /**
         * **O hover ESCURECE** · `bg-destructive/90` deixava passar o fundo
         * escuro por baixo, então o botão **desbotava** ao passar o ponteiro,
         * que é o contrário do que o gesto promete.
         */
        destructive:
          'bg-destructive text-destructive-foreground transition hover:bg-destructive hover:brightness-90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-sm',
        lg: 'h-12 rounded-md px-8 text-base',
        // Raio generoso mas não pílula · é o formato da referência de marca.
        hero: 'h-14 rounded-2xl px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
