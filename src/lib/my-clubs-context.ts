import { createContext } from 'react';
import type { ClubRecord } from './api.js';

/**
 * `idle` é antes de haver conta pra perguntar · o provider vive dentro do
 * `/app`, mas a sessão pode ainda estar chegando.
 */
export type MyClubsStatus = 'idle' | 'loading' | 'ready' | 'error';

export type MyClubsValue = {
  /**
   * Os clubs em que você tem vínculo ativo · **`null` é "ainda não sei"**, e
   * não "nenhum".
   *
   * A diferença decide comportamento em três telas: com `null`, a de criar
   * club **deixa passar** (quem recusa de verdade é o servidor), a da conta
   * **não** mostra o aviso de teto, e o perfil de jogador não marca club em
   * comum. Lista vazia é resposta; `null` é ausência de resposta.
   */
  clubs: ClubRecord[] | null;
  status: MyClubsStatus;
  /** Quantos clubs ativos, ou `null` enquanto não se sabe. */
  count: number | null;
  /** Você está no teto do jogo? `false` enquanto não se sabe · ver `clubs`. */
  atCap: boolean;
  /**
   * O club de que você é dono · **`null` é "nenhum", e também "ainda não sei".**
   *
   * Ele é **um só** desde 18/08/2026, então isto é um documento e não uma
   * lista. Vem do provider e não de cada tela porque quatro delas fazem a
   * mesma pergunta de jeitos diferentes, e a quarta já tinha esquecido de
   * fazer · o card de criar club da tela inicial ficou ligado levando pra uma
   * tela que recusa.
   *
   * **Fundir os dois casos no `null` é o mesmo desenho do `atCap`:** quem
   * decide de verdade é o servidor, e bloquear por ausência de resposta
   * trancaria quem tem vaga. Quem precisa distinguir olha o `status`.
   *
   * **É um teto diferente do `atCap`, e os dois convivem** · alguém pode estar
   * em um club só (longe do teto de 3) e ainda assim não poder criar nenhum,
   * porque nesse club ele é o dono.
   */
  ledClub: ClubRecord | null;
  reload: () => void;
};

export const MyClubsContext = createContext<MyClubsValue | null>(null);
