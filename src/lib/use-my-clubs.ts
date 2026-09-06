import { useContext, useEffect, useState } from 'react';
import { MyClubsContext, type MyClubsValue } from './my-clubs-context.js';

/**
 * Os seus clubs, uma vez por sessão · **nunca um `GET` da tela**.
 *
 * É a regra de dado de sessão do `CLAUDE.md` aplicada ao `/me/clubs`, que cinco
 * telas buscavam por conta própria. Ver `my-clubs.tsx` pro porquê.
 *
 * **Este é o vivo:** ele anda sozinho quando `user.membership` chega, que é o
 * que a lista de clubs, o aviso de teto da conta, o favorito e o selo "em comum"
 * querem. **Formulário aberto quer o contrário** · ver `useMyClubsSnapshot`.
 */
export function useMyClubs(): MyClubsValue {
  const ctx = useContext(MyClubsContext);
  if (!ctx) throw new Error('useMyClubs must be used inside <MyClubsProvider>');
  return ctx;
}

/**
 * Os seus clubs **como estavam quando esta tela decidiu o que desenhar**.
 *
 * **Existe porque "o formulário de club não ouve" é decisão escrita**
 * (`docs/estado.md`): recarregar debaixo de um formulário aberto é pior que dado
 * velho. Enquanto cada tela fazia o próprio `GET` com dependência vazia, isso
 * acontecia de graça · ler o provider vivo traria o defeito de volta com outra
 * cara, e ele é dos quietos: quem estivesse preenchendo "criar club" e fosse
 * aceito num terceiro club noutra guia veria **o formulário virar tela de
 * bloqueio com o que já digitou dentro**.
 *
 * Congela no primeiro desfecho, `ready` ou `error` · antes disso não há o que
 * congelar, e a tela ainda está esperando.
 *
 * **Quem decide de verdade continua sendo o servidor**, que revalida o teto no
 * envio · isto aqui é o que a tela mostra, e mostrar o de um segundo atrás é
 * exatamente o certo aqui.
 */
export function useMyClubsSnapshot(): MyClubsValue {
  const live = useMyClubs();
  const [frozen, setFrozen] = useState<MyClubsValue | null>(null);

  useEffect(() => {
    if (!frozen && (live.status === 'ready' || live.status === 'error')) setFrozen(live);
  }, [live, frozen]);

  return frozen ?? live;
}
