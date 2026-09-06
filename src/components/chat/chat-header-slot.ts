import { createContext, useContext } from 'react';

/**
 * **Onde a sala pendura os controles da organização** · o cabeçalho do
 * diálogo, e não a faixa acima do campo de escrever.
 *
 * O estado da sala (quem olha, se está trancada) mora no corpo do chat, e o
 * cabeçalho mora no diálogo · sem isto, travar viraria um botão de largura
 * inteira entre a conversa e o campo, que é exatamente o que o Eduardo apontou
 * em 27/08/2026 ("não gostei de onde ele está e o espaço que ocupa").
 *
 * É um nó de DOM e um `createPortal`, e não mais uma propriedade: quem
 * compõe a sala não precisa saber quais ações ela tem hoje.
 */
export const ChatHeaderSlotContext = createContext<HTMLElement | null>(null);

export function useChatHeaderSlot(): HTMLElement | null {
  return useContext(ChatHeaderSlotContext);
}
