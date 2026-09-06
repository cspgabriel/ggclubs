import { Bell } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Um aviso de exemplo, como ele chega · **a peça que o card do app do hero
 * desenhava, extraída no dia em que ganhou o segundo chamador.**
 *
 * Ela nasceu dentro do `HeroAppCard` (02/09/2026) e virou componente em
 * 03/09/2026, quando a landing passou a mostrá-la na seção do produto e a
 * página de download na capa · duas cópias do mesmo desenho é o que o
 * `CLAUDE.md` manda extrair no trabalho em que a segunda aparece.
 *
 * **O texto é de exemplo e o `alt` diz isso** · sem ele o leitor de tela
 * anunciaria um jogo que não existe como se fosse aviso de verdade. Quem chama
 * escreve o rótulo, porque o mesmo desenho ilustra coisas diferentes: na capa
 * do download é *o aviso do app no Windows*, na landing é *o aviso do
 * campeonato*, que chega também no sininho e no e-mail.
 */
export function AppNotice({
  title,
  body,
  alt,
  className,
}: {
  title: ReactNode;
  body: ReactNode;
  /** A descrição pra quem não vê · e ela precisa dizer que é exemplo. */
  alt: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-primary/30 bg-background/80 p-3',
        className,
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Bell className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{body}</span>
      </span>
    </div>
  );
}
