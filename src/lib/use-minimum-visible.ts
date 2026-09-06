import { useEffect, useState } from 'react';

/** Se apareceu, fica no mínimo isto · abrir e sumir em 30ms lê como defeito. */
const MIN_VISIBLE_MS = 320;

/**
 * Segura um estado ligado por um tempo mínimo depois que ele desliga. Mora fora
 * do componente porque arquivo de componente só pode exportar componente, senão
 * o fast refresh do Vite para de funcionar.
 */
export function useMinimumVisible(active: boolean): boolean {
  const [held, setHeld] = useState(active);

  useEffect(() => {
    if (active) {
      setHeld(true);
      return;
    }
    const timer = setTimeout(() => setHeld(false), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return held;
}
