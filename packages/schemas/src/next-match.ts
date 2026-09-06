import type { MatchCard } from './match.js';
import type { TournamentStatus } from './tournament.js';

/**
 * **Onde o meu club está na edição, agora** · e o que ele está esperando quando
 * não tem jogo marcado.
 *
 * Ela existe porque *"não tenho próximo adversário"* tem **cinco causas
 * diferentes** e a tela precisa dizer qual · levantado em 27/08/2026, quando o
 * Eduardo perguntou o que acontece *"no caso da partida de um ter fechado e a
 * do outro próximo adversário ainda não"*.
 *
 * **A causa mais cara não é a dele.** No mata-mata a rodada seguinte nasce
 * sozinha quando a rodada inteira fecha, então esperar o vizinho é questão de
 * minutos. Já na virada dos grupos pro mata-mata, **quem gera a chave é uma
 * pessoa** (`generateKnockout`, na rota de admin) · ali a espera não tem
 * relógio, e é a hora em que chamar a organização vale mais.
 *
 * **Mora nos schemas porque a mesma pergunta é feita nos dois lados** · a tela
 * desenha o estado, e o servidor do chat decide por ele quando abrir a sala.
 * Duas derivações do mesmo critério é o desenho que já divergiu seis vezes
 * neste repositório.
 */
export type NextMatchState =
  /** Tem jogo marcado · é o caso comum, e o único com partida junto. */
  | { kind: 'next'; match: MatchCard }
  /** Os dois declararam coisas diferentes · a organização decide. */
  | { kind: 'disputed'; match: MatchCard }
  /** A minha rodada de grupos acabou e ainda há jogo de grupo rolando. */
  | { kind: 'waitingGroups' }
  /** Os grupos fecharam e a chave **espera uma pessoa** gerar. */
  | { kind: 'waitingBracket' }
  /**
   * Ganhei, e a rodada ainda não fechou.
   *
   * **`decider` é o ÚNICO jogo que decide o meu adversário**, e `rivalTag` é o
   * adversário quando ele já saiu · a chave pareia os vencedores na ordem da
   * rodada anterior, então dos sete jogos que ainda faltam numa chave de 32,
   * **seis não têm nada a ver comigo**. Listar todos é dizer a verdade de um
   * jeito inútil, e foi o que a primeira versão fez.
   *
   * **`roundOpen` é outra coisa, e as duas convivem** · saber quem é o meu
   * adversário não faz a partida existir: `advanceKnockout` só cria a rodada
   * seguinte quando **todos** os confronto da atual têm vencedor.
   */
  | {
      kind: 'waitingRound';
      decider: MatchCard | null;
      rivalTag: string | null;
      roundOpen: number;
    }
  /**
   * Perdi a semifinal, e a edição tem disputa de terceiro · **não estou
   * eliminado**: o meu jogo nasce junto da final, quando a outra semi fechar.
   */
  | { kind: 'waitingThirdPlace' }
  /** Acabou pra mim. */
  | { kind: 'eliminated' }
  /** Acabou pra todo mundo. */
  | { kind: 'done' };

const CLOSED = new Set(['played', 'walkover']);

function isMine(match: MatchCard, tag: string): boolean {
  return match.homeTag === tag || match.awayTag === tag;
}

/**
 * **Quem ganhou, pela ótica da tela** · o `winnerOf` do servidor lê o documento
 * inteiro, e aqui só existe o cartão.
 *
 * `null` quando não há vencedor: empate de grupo, W.O. duplo, ou partida que
 * não fechou. Empate no mata-mata **sem** pênaltis também é `null`, e isso é o
 * certo · ali ainda não há quem avance.
 */
function winnerTagOf(match: MatchCard): string | null {
  if (!CLOSED.has(match.status) || !match.score) return null;
  if (match.score.home > match.score.away) return match.homeTag;
  if (match.score.away > match.score.home) return match.awayTag;
  const shootout = match.penalties;
  if (!shootout) return null;
  if (shootout.home > shootout.away) return match.homeTag;
  if (shootout.away > shootout.home) return match.awayTag;
  return null;
}

export function nextMatchStateOf(
  matches: readonly MatchCard[],
  myTag: string,
  tournamentStatus: TournamentStatus,
  /**
   * **A edição tem disputa de terceiro?** · sem isto, quem perde a semi lê
   * "eliminado" e tem jogo. A partida dele nasce **junto da final**, quando a
   * outra semi fechar, e até lá não existe documento nenhum pra apontar.
   */
  options: { thirdPlaceMatch?: boolean } = {},
): NextMatchState {
  if (tournamentStatus === 'finished' || tournamentStatus === 'cancelled') return { kind: 'done' };

  const mine = matches.filter((m) => isMine(m, myTag));
  if (mine.length === 0) return { kind: 'done' };

  // **Marcada ganha de disputada** · quem tem jogo pra jogar precisa ver o jogo,
  // e não a partida que a organização está resolvendo.
  const scheduled = mine
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  if (scheduled[0]) return { kind: 'next', match: scheduled[0] };

  const disputed = mine.find((m) => m.status === 'disputed');
  if (disputed) return { kind: 'disputed', match: disputed };

  const groups = matches.filter((m) => m.phase === 'group');
  const knockout = matches.filter((m) => m.phase === 'knockout');

  // **A fase de grupos ainda está rolando** · as rodadas andam juntas, então
  // sobrar jogo de outro grupo é o normal, não é espera de ninguém.
  if (groups.some((m) => !CLOSED.has(m.status))) return { kind: 'waitingGroups' };

  /**
   * **Grupos fechados e nenhuma chave** · esta é a espera que não tem relógio,
   * porque quem gera é o admin. É o único estado em que a tela deve empurrar
   * pra falar com a organização.
   */
  if (knockout.length === 0) return { kind: 'waitingBracket' };

  const myKnockout = knockout.filter((m) => isMine(m, myTag));
  // Passei pela fase de grupos e não estou na chave · não classifiquei.
  if (myKnockout.length === 0) return { kind: 'eliminated' };

  const lastRound = Math.max(...myKnockout.map((m) => m.round));
  const myLast = myKnockout.filter((m) => m.round === lastRound);
  if (!myLast.some((m) => winnerTagOf(m) === myTag)) {
    /**
     * **Perdi · mas perder a SEMI com disputa de terceiro não é eliminação.**
     *
     * A semifinal é a rodada de dois confrontos (é a mesma leitura do
     * `advanceKnockout`), e o jogo de terceiro nasce **junto da final**, na
     * rodada seguinte. Enquanto a outra semi não fechar não há documento pra
     * apontar, e dizer "acabou" pra quem ainda vai jogar é o pior desfecho.
     */
    const sameRound = knockout.filter((m) => m.round === lastRound && !m.thirdPlace);
    const isSemi = sameRound.length === 2;
    const semiOpen = sameRound.some((m) => !CLOSED.has(m.status));
    if (options.thirdPlaceMatch && isSemi && semiOpen) return { kind: 'waitingThirdPlace' };
    return { kind: 'eliminated' };
  }

  /**
   * **Ganhei a DISPUTA DE TERCEIRO · o meu caminho acabou aqui, e bem.**
   *
   * Sem esta linha o vencedor dela caía no ramo de baixo, que é o de *"passei de
   * fase"* · e como a lista da rodada exclui a disputa de terceiro (é o filtro
   * logo abaixo), ele não se achava nela, ficava sem par, e a tela dizia
   * **"CLASSIFICADO · você passou · ainda falta 1 jogo pra chave andar"**,
   * apontando pra **final de outros dois**.
   *
   * **Aconteceu em produção na Copa de Estreia**, na janela em que a disputa de
   * terceiro fechou antes da final · achado por auditoria em 05/09/2026.
   *
   * O `done` é o mesmo desfecho de quem ganha a final, e é o certo: a diferença
   * entre os dois é o **pódio**, que é outra peça e já sabe disso.
   */
  if (myLast.every((m) => m.thirdPlace)) return { kind: 'done' };

  /**
   * **Ganhei, e a rodada ainda não fechou** · é o caso que o Eduardo levantou.
   * A partida seguinte **não existe** enquanto qualquer confronto desta rodada
   * estiver aberto, porque a chave só anda com a rodada inteira decidida.
   *
   * A disputa de terceiro sai da conta: ela mora na mesma rodada da final e não
   * decide adversário de ninguém.
   */
  /**
   * **A ordem da chave é a da rodada anterior** · o vencedor do primeiro jogo
   * enfrenta o do segundo, e assim por diante (`advanceKnockout`). Dentro de uma
   * rodada o `scheduledAt` é o mesmo pra todos, então quem ordena de fato é o
   * `_id` · reproduzir isso aqui é o que permite nomear o adversário **antes**
   * de a partida existir.
   */
  const round = knockout
    .filter((m) => m.round === lastRound && !m.thirdPlace)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime() ||
        a._id.localeCompare(b._id),
    );
  const roundOpen = round.filter((m) => !CLOSED.has(m.status)).length;
  if (roundOpen === 0) return { kind: 'done' };

  const myIndex = round.findIndex((m) => isMine(m, myTag));
  // O par na ordem da chave · `^1` é o vizinho do meu confronto (0↔1, 2↔3, …).
  const sibling = myIndex >= 0 ? round[myIndex ^ 1] : undefined;
  if (!sibling) return { kind: 'waitingRound', decider: null, rivalTag: null, roundOpen };

  const rivalTag = winnerTagOf(sibling);
  return {
    kind: 'waitingRound',
    decider: rivalTag ? null : sibling,
    rivalTag,
    roundOpen,
  };

  // A rodada fechou e não nasceu jogo novo pra mim · ganhei a última que havia.
  return { kind: 'done' };
}
