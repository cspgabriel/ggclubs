import { useEffect, useState } from 'react';

/**
 * O valor **depois que a digitação parou** · e ele existe pra a busca não virar
 * uma consulta por tecla.
 *
 * **Ele não substitui o `useShowcase`**, e a distinção importa: aquele é o motor
 * das vitrines (cursor, rolagem infinita, filtro, e a lista que **esmaece** em
 * vez de sumir), com o atraso embutido. Este é só o atraso, pra uma lista que
 * não tem nada daquilo · fundir os dois traria paginação por cursor pra uma
 * tabela que pagina por `limit`.
 *
 * Nasce em 19/08/2026, com a busca da tela de contas do painel.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
