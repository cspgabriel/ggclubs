import { USER_EVENT, userTopic } from '@ggclubs/schemas';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type ClubRecord } from './api.js';
import { leadsClub, MAX_CLUBS_PER_PLAYER } from './clubs.js';
import { MyClubsContext, type MyClubsStatus, type MyClubsValue } from './my-clubs-context.js';
import { useRealtimeRefresh } from './realtime/use-realtime-refresh.js';
import { useAuth } from './use-auth.js';

/**
 * **`GET /me/clubs` é dado de sessão, e por isso mora aqui.**
 *
 * Cinco telas o buscavam por conta própria, cada uma com `AbortController`,
 * contador de recarga e assinatura de `user.membership` próprios · a de clubs
 * (a lista), a de criar club (a contagem, pro teto), a da conta (a contagem, pro
 * aviso da chave "procurando club"), a do club (o favorito) e a de um jogador (as
 * tags, pro selo "em comum"). Quatro derivações do mesmo documento, buscado
 * quatro vezes a mais do que precisava.
 *
 * **Era a pendência 39, e o gatilho escrito nela foi o que disparou:** ela
 * recusou levar a contagem pra sessão em 05/08/2026 enquanto o número aparecesse
 * numa tela só, e mandou reabrir no dia em que aparecesse numa segunda. Ele
 * apareceu em 08/08, na tela da conta, e ninguém voltou lá.
 *
 * **O que derrubou a objeção original foi o canal.** A recusa era por disciplina
 * de invalidação: seis ações mexem nesse número, e esquecer uma deixa o contador
 * mentindo. Hoje existe **um** evento que significa "seus vínculos mudaram", e
 * ele é ouvido **aqui**, uma vez, em vez de cinco vezes nas telas.
 *
 * **Só existe dentro do `/app`**, e isso não é detalhe: pendurado no
 * `AuthProvider` ele buscaria os seus clubs na página **aberta** do club e na do
 * jogador, que é a tela de aquisição, pra ninguém usar.
 */
export function MyClubsProvider({ children }: { children: ReactNode }) {
  const { account, accountStatus } = useAuth();
  // O `_id` é a conta no nosso banco · o `uid` do Firebase existe antes dela, no
  // onboarding, e ali não há vínculo nenhum pra buscar.
  const accountId = accountStatus === 'ready' ? (account?._id ?? null) : null;

  const [clubs, setClubs] = useState<ClubRecord[] | null>(null);
  const [status, setStatus] = useState<MyClubsStatus>('idle');
  const [reloadCount, setReloadCount] = useState(0);
  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  useEffect(() => {
    if (!accountId) {
      // Sessão que acabou não deixa lista na mão · deixá-la aqui daria os clubs
      // da conta anterior pra próxima que entrar na mesma guia.
      setClubs(null);
      setStatus('idle');
      return;
    }

    const ctrl = new AbortController();
    // **Recarga não zera o que está na tela.** O `loading` é pra quem ainda não
    // tem lista; sem esta guarda, cada `user.membership` faria os cards
    // sumirem e voltarem · é a mesma distinção que o `AuthProvider` faz entre
    // primeira carga e recarga.
    setStatus((prev) => (prev === 'ready' ? prev : 'loading'));
    api
      .listMyClubs({ signal: ctrl.signal })
      .then((r) => {
        setClubs(r.clubs);
        setStatus('ready');
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        // **A lista velha não sobrevive a uma falha**, senão a tela seguiria
        // afirmando um vínculo que pode ter deixado de existir · e é o `null`
        // que faz a de criar club deixar passar em vez de bloquear.
        setClubs(null);
        setStatus('error');
      });
    return () => ctrl.abort();
    // `accountId` muda quando se troca de conta na mesma guia · o cleanup
    // cancela a busca da que saiu antes de a nova começar.
  }, [accountId, reloadCount]);

  /**
   * **`user.membership` é o único evento que muda esta lista**, e ouvi-lo aqui é
   * o que apaga as cinco assinaturas que as telas mantinham pra isso.
   *
   * O `user:{id}` toda conexão já assina sozinha, pela identidade do bilhete ·
   * isto não pede tópico novo.
   */
  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.membership], reload);

  const value = useMemo<MyClubsValue>(() => {
    const count = clubs === null ? null : clubs.length;
    return {
      clubs,
      status,
      count,
      // **Não saber não é estar no teto.** Quem decide de verdade é o servidor,
      // e bloquear por ausência de resposta trancaria quem tem vaga · a mentira
      // cara é essa, porque a pessoa não tem como saber que é defeito.
      atCap: count !== null && count >= MAX_CLUBS_PER_PLAYER,
      /**
       * **O club que a pessoa LIDERA** · dono ou gerente, e `null` cobre
       * "nenhum" e "ainda não sei", pela mesma régua do `atCap`.
       *
       * **Chamava-se `ownedClub` e olhava só o dono até 03/09/2026** · com a
       * trava de liderança (uma conta lidera um club só), quem barra a criação
       * de outro club deixou de ser a posse e passou a ser a **liderança**. O
       * nome mudou junto porque ele decide quatro portas de "criar um club", e
       * um nome que diz "dono" fazendo o papel de "lidera" é o tipo de coisa que
       * a próxima pessoa conserta pro lado errado.
       */
      ledClub: clubs?.find((club) => leadsClub(club.role)) ?? null,
      reload,
    };
  }, [clubs, status, reload]);

  return <MyClubsContext.Provider value={value}>{children}</MyClubsContext.Provider>;
}
