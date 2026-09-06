import { USER_EVENT, userTopic } from '@ggclubs/schemas';
import { useRef } from 'react';
import { useAuth } from '@/lib/use-auth';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useResource } from '@/lib/use-resource';

/**
 * "Existe uma oferta esperando por mim **neste** club?", com o canal ligado.
 *
 * ## Por que ele existe, e não é só faxina
 *
 * As duas caixas da página do club · a de **posse** e a de **gerência** ·
 * perguntavam isso cada uma por conta própria, e **nenhuma das duas escutava o
 * canal**. As listas equivalentes em `/app/clubs` escutavam desde sempre
 * (`ClubOfferList`), então as duas metades do mesmo recurso divergiam sem
 * ninguém ver.
 *
 * **O desfecho era o silêncio:** você está na página do club, o dono te oferece
 * a gerência, o aviso chega no sininho · e o sininho aponta **pra esta mesma
 * página**. Clicar não remonta a rota em que você já está, então a caixa só
 * aparecia depois de um F5 que ninguém tem motivo pra dar.
 *
 * **O evento é o `user.membership` no tópico da própria pessoa**, e não o do
 * club: quem recebe oferta pode não ter vínculo nenhum ainda, e o `user:{id}` é
 * o único canal que não depende disso.
 *
 * @param list a rota que lista as ofertas abertas da pessoa
 * @param clubId o club da página · é ele que decide se alguma delas é esta
 */
export function useOfferForClub(
  list: (signal: AbortSignal) => Promise<{ offers: readonly { clubId: string }[] }>,
  clubId: string,
): { offered: boolean | null; setOffered: (value: boolean) => void } {
  const accountId = useAuth().account?._id ?? null;
  /**
   * **A rota entra por referência e a comparação mora aqui** · o
   * `react-hooks/exhaustive-deps` não analisa função que chega por parâmetro, e
   * o aviso dele reprova a bateria. A `ref` guarda sempre a última versão da
   * rota, e o que sobra na busca é o que de fato muda: **o club**.
   *
   * A comparação subiu junto de propósito · ela era a mesma linha nas duas
   * caixas, e era o pedaço que decidia se a oferta listada é a desta página.
   */
  const listRef = useRef(list);
  listRef.current = list;
  const { data, error, setData, reload } = useResource(
    (signal) => listRef.current(signal).then((r) => r.offers.some((o) => o.clubId === clubId)),
    [clubId],
  );

  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.membership], () =>
    reload(),
  );

  /**
   * **Falhar vale `false`** · não conseguir perguntar não é razão pra desenhar
   * uma oferta que talvez não exista. O `error` é lido de propósito, e era esta
   * a linha repetida nas duas caixas.
   */
  return { offered: error ? false : data, setOffered: setData };
}
