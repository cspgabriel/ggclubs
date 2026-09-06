import { AlertTriangle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * **A caixa de ressalva** · a peça única do aviso âmbar do produto.
 *
 * **Ela existe porque o mesmo aviso tinha três desenhos, e o
 * [design.md](../../../../docs/design.md) documentava um quarto** · achado na
 * revisão de 28/08/2026:
 *
 * | onde | o que usava |
 * |---|---|
 * | a mesa do admin (`InvolvedNotice`) e a sala do confronto | `border-amber-400/40 bg-amber-400/10 text-amber-200` |
 * | o aviso de edição na transferência de club | `border-amber-400/25 bg-amber-400/10 text-amber-400` |
 * | o painel de operação da edição | `border-amber-400/40 bg-amber-400/5` |
 * | o `design.md` | *"o padrão da casa é `border-amber-400/40 bg-amber-400/5`"* |
 *
 * É o defeito que o `CLAUDE.md` descreve com todas as letras: **a terceira
 * cópia inventa o quarto jeito**. O remédio é o mesmo do `DecisionCallout` ·
 * uma peça, e o doc passa a apontar pra ela em vez de descrever classes.
 *
 * ---
 *
 * **Por que âmbar, e não verde nem vermelho** · verde é a marca e a ação (o que
 * a tela quer que você faça), vermelho é destrutivo ou acusação. Ressalva é
 * outra coisa: um fato que muda a decisão sem julgá-la. É a mesma cor da linha
 * de corte da chave e do selo de outra geração.
 *
 * **O `tone` destrutivo mora aqui de propósito** · o aviso de transferência
 * troca de cor quando o que ele conta passa a impedir a ação, e separar isso em
 * dois componentes faria a mesma caixa existir duas vezes.
 *
 * **`amber-400` cru, e não um token `warning`** · ele não existe no tema daqui,
 * e `border-warning/40` já viveu um bloco inteiro **sem pintar um pixel**, com
 * os cinco checks verdes. Ver o `scan:tailwind`.
 */
export function WarningNote({
  children,
  icon: Icon = AlertTriangle,
  tone = 'warning',
  className,
}: {
  children: ReactNode;
  /** O ícone da esquerda · `null` tira ele, pro aviso que é só frase. */
  icon?: LucideIcon | null;
  /** `destructive` é pro que **impede**, e não pro que ressalva. */
  tone?: 'warning' | 'destructive';
  className?: string;
}) {
  const destructive = tone === 'destructive';

  return (
    <p
      className={cn(
        'flex items-start gap-1.5 rounded-md border p-2 text-xs',
        destructive
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-400/40 bg-amber-400/10 text-amber-200',
        className,
      )}
    >
      {Icon && (
        <Icon
          className={cn('mt-px h-3.5 w-3.5 shrink-0', destructive ? '' : 'text-amber-400')}
          aria-hidden
        />
      )}
      <span>{children}</span>
    </p>
  );
}
