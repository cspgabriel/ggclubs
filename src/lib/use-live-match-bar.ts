import type { MatchCard } from '@ggclubs/schemas';
import { useLocation } from 'react-router';
import type { RegistrationCard, TournamentRecord } from '@/lib/api';
import type { MatchMoment } from '@/lib/match-moment';
import { useRunningMatch } from '@/lib/running-match-context';

/** O que a faixa precisa pra desenhar · só existe quando ela desenha mesmo. */
export type LiveMatchBarData = {
  tournament: TournamentRecord;
  match: MatchCard;
  myTag: string;
  moment: MatchMoment;
  clubs: Map<string, RegistrationCard['club']>;
};

/**
 * **A faixa do jogo está no ar?** · e a resposta é uma só, porque **dois**
 * lugares dependem dela: a própria `LiveMatchBar`, pra desenhar, e a casca do
 * `/app`, pra descontar a altura da faixa de quem gruda abaixo dela.
 *
 * A casca não tem como perguntar de outro jeito · variável de CSS desce na
 * árvore e nunca sobe, então a faixa não pode avisar a coluna de prévia lá
 * embaixo que ocupou uma linha. E se a pergunta virasse duas cópias, a primeira
 * mudança numa delas devolveria a sobreposição de 9px que ela existe pra
 * evitar: em 20/08/2026 a faixa cobria o rótulo da prévia no `/app/conta`.
 *
 * Ele mora aqui, e não ao lado do componente, porque arquivo que exporta
 * componente **e** hook derruba o fast refresh do Vite.
 */
export function useLiveMatchBar(): LiveMatchBarData | null {
  const { pathname } = useLocation();
  const { tournament, match, myTag, moment, clubs, onBar } = useRunningMatch();

  /**
   * **Ela não aparece na página da própria edição** · lá a mesma partida já
   * está no `MatchSpotlight`, com mais informação e a ação de lançar. A faixa
   * seria um segundo caminho pro mesmo lugar · e, com duas edições em
   * andamento, ela podia apontar pra **outra** que não a da tela. Achado pelo
   * `revisor` em 19/08/2026.
   */
  const onThisEdition = tournament !== null && pathname.includes(`/campeonatos/${tournament.slug}`);

  if (!onBar || onThisEdition || !tournament || !match || !myTag || !moment) return null;
  return { tournament, match, myTag, moment, clubs };
}
