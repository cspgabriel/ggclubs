import { createContext } from 'react';
import type { RealtimeClient, RealtimeState } from './client.js';

/**
 * O contexto do canal · **um cliente pro aplicativo inteiro.**
 *
 * Ele mora em arquivo próprio pelo mesmo motivo do `auth-context.ts`: o Fast
 * Refresh do Vite exige que arquivo de componente exporte **só** componentes.
 *
 * **O cliente pode ser `null`**, e isso é o estado normal de quem não tem
 * sessão · a landing e a página aberta do club montam a árvore sem canal
 * nenhum, e quem tentar assinar ali simplesmente não assina.
 */
export type RealtimeContextValue = {
  client: RealtimeClient | null;
  state: RealtimeState;
};

export const RealtimeContext = createContext<RealtimeContextValue>({
  client: null,
  state: 'closed',
});
