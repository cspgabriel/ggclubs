import { createContext } from 'react';
import type { MyChatsView } from '@ggclubs/schemas';

export type MyChatsValue = {
  chats: MyChatsView;
  /** Refaz a busca agora · quem fecha uma sala usa pra o número não ficar velho. */
  reload: () => void;
};

/**
 * **Onde alguém falou comigo** · de todas as edições, com o não lido.
 *
 * Ela mora num provider porque **dois lugares da casca precisam do mesmo
 * dado**: a bandeja do header e a faixa do jogo. Cada um buscando por conta
 * própria seria a mesma consulta duas vezes a cada tique · é a regra do
 * `useMyClubs`, e o defeito que ela evita já aconteceu aqui (o `/me` pedido
 * três vezes por carregamento).
 */
export const MyChatsContext = createContext<MyChatsValue>({
  chats: { total: 0, rooms: [] },
  reload: () => {},
});
