import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Silhueta do `ClubCard`, na grade dele.
 *
 * Repete a **geometria** do card · escudo quadrado à esquerda, duas linhas à
 * direita · e não um retângulo genérico. Mora aqui, e não dentro da vitrine,
 * porque "meus clubs" espera exatamente o mesmo formato: com uma cópia em cada
 * tela, a segunda diverge da primeira no dia em que o card mudar.
 *
 * A grade é a mesma das duas listas, `minmax(0,1fr)` incluído · sem isso a
 * trilha cresce até o min-content do item e a silhueta não ocupa o lugar que o
 * conteúdo vai ocupar, que é a única coisa que ela precisa acertar.
 */
export function ClubCardSkeletonGrid({ count, className }: { count: number; className?: string }) {
  return (
    <ul
      aria-hidden
      className={cn(
        'grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          {/* O escudo segue a largura DO CARD, como no `ClubCard` desde
              27/08/2026 · silhueta com escudo de 64px onde o conteúdo desenha
              48 faz a lista pular quando o dado chega. */}
          <SkeletonGroup className="@container flex items-center gap-4 rounded-xl border bg-card p-4">
            <SkeletonBar className="h-12 w-12 shrink-0 rounded-md @min-[22rem]:h-16 @min-[22rem]:w-16" />
            <span className="min-w-0 flex-1 space-y-2">
              <SkeletonBar className="h-4 w-2/3" />
              <SkeletonBar className="h-3 w-1/2 bg-secondary/70" />
            </span>
          </SkeletonGroup>
        </li>
      ))}
    </ul>
  );
}
