import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Mede o espaço que sobrou de fato após a barra de título e os avisos de
 * altura variável, e o publica em `--app-viewport-h` pra quem gruda no topo.
 *
 * **Escreve só quando a medida mudou.** A propriedade é herdada e lida em
 * `calc()` pelos descendentes, então cada escrita suja a subárvore inteira · e
 * o nó rola, então conteúdo que liga uma barra horizontal muda o `clientHeight`
 * e reentra no observador. Guardar o último valor corta os dois.
 */
export function DesktopContent({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;
    let last = '';
    const measure = () => {
      const next = `${node.clientHeight}px`;
      if (next === last) return;
      last = next;
      node.style.setProperty('--app-viewport-h', next);
    };
    measure();
    // A suíte renderiza o `App` sem `ResizeObserver` · a medida da montagem
    // vale, e a pilha de um estouro aqui apontaria pra casca em vez do teste.
    if (typeof ResizeObserver === 'undefined') {
      return () => node.style.removeProperty('--app-viewport-h');
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
      node.style.removeProperty('--app-viewport-h');
    };
  }, [enabled]);

  return (
    <div
      ref={ref}
      data-app-viewport={enabled ? '' : undefined}
      className={enabled ? 'min-h-0 flex-1 overflow-y-auto' : undefined}
    >
      {children}
    </div>
  );
}
