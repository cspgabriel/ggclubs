import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * **A conversa aberta mora na URL** · `?conversa=<matchId>`.
 *
 * Pedido do Eduardo em 27/08/2026 · *"é legal o chat aberto ficar vinculado a
 * um param no link, pra dar pra abrir diretamente"*. Ele está certo, e o ganho
 * é maior que a comodidade: **a sala passa a ter endereço**. É o que faz o
 * aviso do sininho levar direto pra conversa em vez de pra página da edição, o
 * que faz a mesa da organização abrir numa aba nova, e o que faz o F5 no meio
 * de uma disputa voltar pra onde a pessoa estava.
 *
 * **Parâmetro de busca, e não rota** · a sala é um diálogo sobre a página da
 * edição, e uma rota faria a página inteira desmontar ao fechar.
 *
 * **Substitui o histórico ao abrir**, e não empilha: sem isso, abrir e fechar
 * três conversas põe três paradas no botão de voltar do navegador.
 */
export const CHAT_PARAM = 'conversa';

export function useChatParam(): {
  openMatchId: string | null;
  openChat: (matchId: string) => void;
  closeChat: () => void;
} {
  const [params, setParams] = useSearchParams();
  const openMatchId = params.get(CHAT_PARAM);

  const openChat = useCallback(
    (matchId: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set(CHAT_PARAM, matchId);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const closeChat = useCallback(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(CHAT_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  return useMemo(() => ({ openMatchId, openChat, closeChat }), [openMatchId, openChat, closeChat]);
}
