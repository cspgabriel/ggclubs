import type { MatchCard } from '@ggclubs/schemas';
import { createContext, useContext } from 'react';
import type { RegistrationCard, TournamentRecord } from '@/lib/api';
import type { MatchMoment } from '@/lib/match-moment';
import type { ClubDirectory } from '@/components/tournament/tournament-shared';

/**
 * **O contrato da sua partida em jogo** · o contexto, o hook que o lê e a regra
 * de quando a faixa cobre.
 *
 * **Isto vivia no `running-match.tsx` até 26/08/2026**, junto do provider, e a
 * separação é de ferramenta e não de desenho: arquivo que exporta componente
 * **e** hook perde o Fast Refresh do Vite, e o
 * `react-refresh/only-export-components` cobra isso. O provider continua sendo
 * o dono do cálculo · o que mora aqui é o que **não** desenha.
 */

export type RunningMatch = {
  tournament: TournamentRecord | null;
  match: MatchCard | null;
  myTag: string | null;
  canReport: boolean;
  moment: MatchMoment | null;
  clubs: ClubDirectory;
  registrations: RegistrationCard[];
  matches: MatchCard[];
  myTags: string[];
  reportableTags: string[];
  /**
   * **A faixa do topo já está mostrando esta partida** · é a pergunta que as
   * telas fazem: *"isto já está sendo mostrado lá em cima?"*. É ele que
   * impede a mesma partida de aparecer duas vezes na mesma tela.
   */
  onBar: boolean;
};

export const EMPTY: RunningMatch = {
  tournament: null,
  match: null,
  myTag: null,
  canReport: false,
  moment: null,
  clubs: new Map(),
  registrations: [],
  matches: [],
  myTags: [],
  reportableTags: [],
  onBar: false,
};

export const RunningMatchContext = createContext<RunningMatch>(EMPTY);

/** Uma hora antes · antes disso a partida não é "agora", é agenda. */
export const LIVE_WINDOW_MS = 60 * 60 * 1000;

/**
 * **A barra cobre o jogo acontecendo e a sua vez de agir** · decisão do Eduardo
 * em 19/08/2026, escolhendo entre isto e "só a janela do jogo".
 *
 * O que fica de fora tem motivo, e nos três casos é o mesmo: **barra permanente
 * vira moldura e para de ser vista**, então ela só existe quando há o que fazer
 * ou o que assistir.
 *
 * | fora | por quê |
 * |---|---|
 * | `soon` além de uma hora | é agenda, e agenda não é urgência |
 * | `waitingRival` | você já fez a sua parte · a espera é do outro |
 * | `disputed` | a organização decide, e **você não pode resolver** · pior, o `pickMyMatch` a rankeia acima do próximo jogo, então ela ainda esconderia o que é acionável |
 * | `done` | acabou |
 */
export function barCovers(
  moment: MatchMoment,
  scheduledAt: Date | string,
  now = new Date(),
): boolean {
  /**
   * **O `toReport` não tem prazo de validade, e o `live` tem** · pendência 178.
   *
   * `toReport` é acionável: enquanto o placar não for lançado, a faixa tem o que
   * pedir. `live` é só *"está rolando"*, e quem não é dono do club **não pode
   * fazer nada com isso** · numa partida que ninguém declarou, a faixa dizia
   * "ACONTECENDO AGORA contra o Pipokets" grudada em **todas** as telas do
   * elenco, sem saída, por dias.
   *
   * A janela é a mesma do `soon`, e do mesmo lado do relógio: uma hora antes ela
   * avisa, uma hora depois ela some. Partida que passou disso não está
   * acontecendo · está parada, e quem resolve isso é a mesa do organizador.
   */
  if (moment === 'toReport') return true;
  const distance = new Date(scheduledAt).getTime() - now.getTime();
  if (moment === 'live') return distance >= -LIVE_WINDOW_MS;
  if (moment !== 'soon') return false;
  return distance <= LIVE_WINDOW_MS;
}

export function useRunningMatch(): RunningMatch {
  return useContext(RunningMatchContext);
}
