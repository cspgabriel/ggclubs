import type { MatchCard } from '@ggclubs/schemas';

/**
 * **Em que momento a sua partida está** · e ela não é o `status` dela.
 *
 * O `status` é do documento (`scheduled`, `disputed`, `played`) e responde ao
 * sistema. Isto responde **a você**: o que essa partida quer de você agora, ou
 * o que ela está esperando de outra pessoa. As duas perguntas divergem no caso
 * que mais importa · uma partida `scheduled` com o horário já passado e o seu
 * placar por lançar continua "agendada" pro banco e é **a sua vez** pra você.
 *
 * **Existe como função pura porque quatro lugares fazem a mesma conta** · a
 * página da edição, a tela inicial, a aba de campeonatos e a faixa fixa da
 * casca (que não é tela). Elas mostram a partida com
 * molduras diferentes (dentro da edição o nome dela é redundante; fora, é o
 * dado que falta), e a moldura ser diferente não é motivo pra a **regra** ser
 * calculada três vezes.
 */
export type MatchMoment =
  /** Ainda vai acontecer · o que importa é quando. */
  | 'soon'
  /** A hora chegou e o placar não entrou · é a sua vez. */
  | 'toReport'
  /** Você lançou; o adversário não. */
  | 'waitingRival'
  /** A hora chegou, e quem declara não é você (não manda no club). */
  | 'live'
  /** Os dois lançaram e discordaram · a organização decide. */
  | 'disputed'
  /** Fechada. */
  | 'done';

/**
 * O mínimo de uma partida pra estas duas contas.
 *
 * **`scheduledAt` aceita `Date` ou string de propósito** · o schema declara
 * `Date` e o que chega pelo fio é string (o `WireDates` do cliente). Escrever
 * `Pick<MatchCard, ...>` aqui seria a função afirmando um tipo que o dado real
 * não tem, e obrigaria todo teste a mentir com um `as`.
 */
export type MatchLike = {
  status: MatchCard['status'];
  scheduledAt: Date | string;
  homeTag: string;
  awayTag: string;
  /**
   * **A declaração inteira, e não mais um booleano** · 19/08/2026, quando ela
   * passou a ser pública. O que estas duas contas perguntam continua sendo *"já
   * declarou?"*, e a resposta é a presença.
   */
  homeClaim: object | null;
  awayClaim: object | null;
};

export function matchMoment({
  match,
  myTag,
  canReport,
  now = new Date(),
}: {
  match: MatchLike;
  /** O seu club nessa partida. */
  myTag: string;
  /**
   * Você responde por esse club · desde 18/08/2026 é **só o dono**, e a tela
   * não repete essa regra: ela recebe a resposta pronta de quem já a aplicou.
   */
  canReport: boolean;
  now?: Date;
}): MatchMoment {
  if (match.status === 'disputed') return 'disputed';
  if (match.status !== 'scheduled') return 'done';

  if (new Date(match.scheduledAt).getTime() > now.getTime()) return 'soon';

  // Daqui pra baixo o horário já passou, e o que muda é de quem é a vez.
  const iReported = (myTag === match.homeTag ? match.homeClaim : match.awayClaim) !== null;
  if (iReported) return 'waitingRival';
  if (!canReport) return 'live';
  return 'toReport';
}

/**
 * **A partida que a pessoa quer ver**, entre todas as dela.
 *
 * Não é simplesmente a primeira agendada: **partida cuja hora já passou vem
 * antes**, porque ela é a que pede alguma coisa. Com a ordem só por horário, a
 * tela apontava pro jogo de amanhã enquanto o de ontem esperava o placar.
 *
 * **E o club por que você RESPONDE ganha do club em que você só joga** · essa
 * distinção nasceu em 18/08/2026: sem ela, a faixa destacava a partida de um
 * club onde a pessoa é membro enquanto o botão de lançar aparecia em outro
 * grupo, no club de que ela é dona. A tela apontava pra um jogo e a ação
 * estava noutro.
 */
export function pickMyMatch<T extends MatchLike>({
  matches,
  mine,
  priority,
  now = new Date(),
}: {
  matches: T[];
  /** Todos os meus clubs na edição. */
  mine: Set<string>;
  /** Os clubs por que eu respondo · subconjunto de `mine`. */
  priority: Set<string>;
  now?: Date;
}): T | null {
  const involves = (m: T, tags: Set<string>) => tags.has(m.homeTag) || tags.has(m.awayTag);
  const open = matches.filter((m) => m.status === 'scheduled' || m.status === 'disputed');

  /**
   * **Falta a minha declaração nessa partida?**
   *
   * Só faz sentido pra club por que eu respondo · quem só joga não declara
   * nada, e a resposta ali é sempre "não falta".
   */
  const waitsOnMe = (m: T) => {
    if (!involves(m, priority)) return false;
    return (priority.has(m.homeTag) ? m.homeClaim : m.awayClaim) === null;
  };

  const rank = (m: T) => {
    const late = new Date(m.scheduledAt).getTime() <= now.getTime();
    const responds = involves(m, priority);
    /**
     * Menor é melhor · a vez chegou **e ela é minha**, depois a vez chegou, e
     * por fim o que ainda vai acontecer, com o club que eu respondo na frente.
     *
     * **A partida que eu já declarei desce**, e isso é conserto de 19/08/2026,
     * achado medindo a faixa do topo contra a Copa Demo: com a rodada 2
     * declarada por mim e a rodada 3 esperando placar, todas as peças da sua
     * partida (a faixa, a tela inicial, a aba e a página da edição) apontavam
     * pra **rodada 2** · a mais antiga entre duas de rank igual.
     *
     * O desfecho é a tela dizendo "esperando o adversário" e **nunca** levando
     * a pessoa ao jogo em que a vez é dela · o placar que ela precisa lançar
     * ficava escondido atrás de um que não pede nada. É a mesma régua do
     * `matchMoment`: o que vale é o que a partida quer **de você**.
     */
    if (late && responds && waitsOnMe(m)) return 0;
    if (late) return 1;
    if (responds) return 2;
    return 3;
  };

  const candidates = open.filter((m) => involves(m, mine));
  if (candidates.length === 0) return null;

  return [...candidates].sort(
    (a, b) =>
      rank(a) - rank(b) || new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )[0]!;
}
