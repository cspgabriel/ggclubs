import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';

/**
 * A grade de uma vitrine · entrada por card, esmaecido durante a busca,
 * silhueta da página nova, sentinela e a saída de teclado.
 *
 * **A saída de teclado é o que estava faltando na vitrine de players**, e não
 * por decisão: a de clubs já registrava que *rolagem infinita sem saída de
 * teclado é armadilha de acessibilidade*, e a cópia levou a sentinela sem o
 * botão. Aqui as duas coisas nascem juntas.
 *
 * **Sem escalonar a entrada**, e a razão é da vitrine de clubs: numa grade de
 * três colunas o olho lê a fila inteira de uma vez, então cards chegando em
 * sequência competem entre si em vez de acompanharem a leitura. A entrada é uma
 * só, curta, e **por card** · ao carregar mais página os que já estão na tela
 * não reanimam, porque o React mantém o nó e a animação de CSS não reinicia.
 */
export function ShowcaseList<T>({
  items,
  keyOf,
  renderItem,
  pending,
  loadingMore,
  cursor,
  sentinel,
  onLoadMore,
  nextPageSkeleton,
  loadMoreLabel,
}: {
  items: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  pending: boolean;
  loadingMore: boolean;
  cursor: string | null;
  /**
   * `RefObject<T | null>` e não o `MutableRefObject` · o React 19 depreciou o
   * segundo, e no 19 é isto que o `useRef<T>(null)` devolve. Trocado em
   * 27/08/2026, na varredura do que os majors deixaram para trás.
   */
  sentinel: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  nextPageSkeleton: ReactNode;
  /** Cada vitrine nomeia o que ela lista · "Ver mais clubs", "Ver mais players". */
  loadMoreLabel: string;
}) {
  return (
    <>
      {items.length > 0 && (
        <ul
          className={cn(
            'grid grid-cols-[minmax(0,1fr)] gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3',
            // A lista esmaece enquanto a busca vai e volta · o resultado velho
            // ainda é a melhor coisa a mostrar enquanto o novo não chega.
            pending && 'opacity-50',
          )}
        >
          {items.map((item) => (
            <li key={keyOf(item)} className="animate-rise motion-reduce:animate-none">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}

      {loadingMore && nextPageSkeleton}

      {/* A sentinela é o gatilho automático; o botão é a saída de teclado. Ela
          fica sempre no DOM porque o observador se liga a um nó, e um nó que só
          existe quando há cursor obriga o efeito a esperar um render a mais. */}
      <div ref={sentinel} aria-hidden className="h-px" />

      {cursor && !loadingMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {loadMoreLabel}
          </button>
        </div>
      )}
    </>
  );
}
