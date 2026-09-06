import type { MatchPhase } from './match.js';
import type { BracketSize } from './tournament.js';
import type { StandingRow } from './standings.js';

/**
 * **Quem passa da fase de grupos, e contra quem joga** · tudo função pura.
 *
 * Ela mora nos schemas, e não na API, pelo mesmo motivo do `standingsOf`: **a
 * página precisa desenhar a linha de corte antes de a chave existir**, e a
 * regra que decide quem está passando tem de ser a mesma que gera o
 * chaveamento. Duas implementações da mesma pergunta é a divergência que
 * ninguém vê até alguém ficar de fora achando que passou.
 *
 * As três decisões do Eduardo em 19/08/2026 estão aqui dentro:
 *
 * | | |
 * |---|---|
 * | **quem gera** | o admin, com trava · não é decidido neste arquivo, mas é o que faz o chaveamento sair **uma vez** |
 * | **como cruza** | **ranking geral**, 1º contra o último · ver `rankQualified` |
 * | **quem empata** | pênaltis no placar declarado · ver `matchSchema` |
 */

/**
 * Um classificado, com de onde ele veio.
 *
 * **O `seed` é a posição no ranking geral**, e é ele que decide o cruzamento ·
 * `1` é a melhor campanha de todas.
 */
export type Qualified = {
  tag: string;
  seed: number;
  /** O grupo de onde saiu · índice, como no documento da partida. */
  groupIndex: number;
  /** A posição **dentro do grupo** · 1 é o líder. */
  place: number;
  /** Passou direto ou foi repescado entre os melhores terceiros. */
  via: 'direct' | 'best-third';
};

/**
 * Compara duas campanhas **de grupos diferentes**.
 *
 * **O confronto direto não existe aqui**, e é a diferença pro `standingsOf`:
 * dois clubs de grupos diferentes nunca se enfrentaram, então a régua para em
 * pontos, saldo e gols marcados.
 *
 * **O último critério é o índice do grupo**, e ele é o mesmo do `standingsOf`:
 * um sorteio que já aconteceu, e por isso estável · sortear na hora faria a
 * linha de corte mudar a cada leitura da página.
 */
function compareCampaigns(
  a: { row: StandingRow; groupIndex: number },
  b: { row: StandingRow; groupIndex: number },
): number {
  return (
    b.row.points - a.row.points ||
    b.row.goalDiff - a.row.goalDiff ||
    b.row.goalsFor - a.row.goalsFor ||
    a.groupIndex - b.groupIndex
  );
}

/**
 * **O ranking geral dos classificados** · a decisão do Eduardo em 19/08/2026.
 *
 * Ele premia quem foi melhor na fase de grupos: o `seed` 1 pega o pior
 * classificado, e os dois melhores só se encontram na final. A alternativa
 * (matriz fixa tipo Copa do Mundo) foi recusada porque a tabela de cruzamento
 * dos melhores terceiros **muda conforme quais grupos classificam**, e é
 * justamente ela que gera discussão.
 *
 * **A ordem interna respeita a posição no grupo antes da campanha**, e isso é
 * de propósito: todo 1º lugar vem antes de qualquer 2º, mesmo que a campanha do
 * 2º de um grupo forte seja melhor. **Ser líder do grupo tem de valer alguma
 * coisa** · sem isso, a última rodada da fase de grupos perde a tensão, que é o
 * mesmo argumento que derrubou o sorteio novo.
 *
 * @param groups a tabela **já ordenada** de cada grupo, na ordem dos grupos
 */
export function rankQualified(
  groups: readonly (readonly StandingRow[])[],
  size: BracketSize,
): Qualified[] {
  const direct: { row: StandingRow; groupIndex: number; place: number }[] = [];
  const thirds: { row: StandingRow; groupIndex: number; place: number }[] = [];

  groups.forEach((rows, groupIndex) => {
    rows.forEach((row, index) => {
      const place = index + 1;
      if (place <= size.qualifiersPerGroup) {
        direct.push({ row, groupIndex, place });
        return;
      }
      // **Só a primeira sobra de cada grupo disputa a repescagem** · com
      // `qualifiersPerGroup` 2, quem briga é o 3º. O 4º não entra nem com
      // campanha melhor: ele ficou atrás de alguém do próprio grupo que
      // também ficou de fora.
      if (place === size.qualifiersPerGroup + 1) thirds.push({ row, groupIndex, place });
    });
  });

  const repescados = [...thirds]
    .sort(compareCampaigns)
    .slice(0, Math.max(0, size.bestThirds));

  /**
   * **Primeiro por posição no grupo, e só então por campanha** · todos os 1º
   * antes de todos os 2º. Os repescados entram por último, sempre, porque
   * passar por repescagem é passar em último caso.
   */
  const ordenados = [
    ...direct.sort((a, b) => a.place - b.place || compareCampaigns(a, b)),
    ...repescados,
  ];

  return ordenados.map((item, index) => ({
    tag: item.row.tag,
    seed: index + 1,
    groupIndex: item.groupIndex,
    place: item.place,
    via: item.place <= size.qualifiersPerGroup ? ('direct' as const) : ('best-third' as const),
  }));
}

/**
 * A ordem dos confrontos numa chave de `teams` times · **a árvore, e não a
 * lista.**
 *
 * Cruzar na ordem ingênua (1×8, 2×7, 3×6, 4×5, nessa sequência) põe o 1 e o 2
 * **na mesma semifinal** · o chaveamento existe justamente pra isso não
 * acontecer. A sequência certa se constrói dobrando: cada posição `s` de uma
 * chave de `n` vira o par `s` e `2n+1-s` na chave de `2n`.
 *
 * Pra 8: `1×8, 4×5, 2×7, 3×6` · os vencedores prováveis (1 e 4) e (2 e 3) se
 * encontram nas semis, e **1 e 2 só na final**.
 */
export function bracketOrder(teams: number): number[] {
  let order = [1];
  while (order.length < teams) {
    const size = order.length * 2;
    order = order.flatMap((seed) => [seed, size + 1 - seed]);
  }
  return order;
}

/**
 * **A chave fecha?** · potência de dois, e pelo menos dois times.
 *
 * Sem esta pergunta, uma chave de **3** não é recusada e produz uma partida
 * entre o 2º e o 3º colocados · **deixando o líder de fora**, em silêncio. O
 * `bracketOrder` arredonda pra cima (é o que ele tem de fazer), e o par que
 * sobra sem adversário some no filtro.
 *
 * Achado pelo teste de banco do próprio bloco, com `qualifiersPerGroup: 3` num
 * grupo só · a escada rígida evita isso no formato, e este é o cinto pro caso
 * de a realidade não bater com ela.
 */
export function bracketCloses(teams: number): boolean {
  return teams >= 2 && (teams & (teams - 1)) === 0;
}

/** Um confronto da primeira rodada do mata-mata. */
export type KnockoutPair = { home: Qualified; away: Qualified };

/**
 * Os confrontos da **primeira** rodada · o `seed` 1 recebe, sempre.
 *
 * **Quem tem o melhor seed é o mandante**, e isso não é detalhe cosmético: o
 * documento da partida grava mandante e visitante, e é essa ordem que a chave
 * inteira usa pra ler o placar. Dar a casa a quem fez a melhor campanha é a
 * vantagem que sobra num jogo onde não existe campo de verdade.
 */
export function knockoutPairs(ranked: readonly Qualified[]): KnockoutPair[] {
  const order = bracketOrder(ranked.length);
  const bySeed = new Map(ranked.map((one) => [one.seed, one]));

  const pairs: KnockoutPair[] = [];
  for (let i = 0; i < order.length; i += 2) {
    const home = bySeed.get(order[i] ?? 0);
    const away = bySeed.get(order[i + 1] ?? 0);
    // Chave incompleta não vira confronto meio desenhado · quem valida o número
    // de classificados é quem manda gerar.
    if (home && away) pairs.push({ home, away });
  }
  return pairs;
}

/**
 * Quantos times a chave de mata-mata comporta, a partir do formato.
 *
 * **Ela precisa ser potência de dois**, e é a escada rígida que garante isso ·
 * o `isPlayableBracket` já recusa degrau que não fecha.
 */
export function knockoutSize(size: BracketSize): number {
  return size.qualifiersPerGroup * (size.slots / size.groupSize) + size.bestThirds;
}

/**
 * O nome da rodada, a partir de **quantos times ainda estão nela**.
 *
 * É chave de i18n, e não frase · quem escreve "Semifinal" é o catálogo. A conta
 * é por número de times porque é isso que a rodada é: 4 times é semifinal em
 * qualquer campeonato do mundo.
 *
 * **A chave diz quantos TIMES, e a frase diz quantos JOGOS** · `round32` é a
 * rodada de 32 times, e o nome dela em português é **16 avos de final**, porque
 * são dezesseis confrontos. Confundir os dois foi o que produziu um "trinta e
 * dois avos" na primeira captura de uma chave grande.
 *
 * **O retorno é união literal, e não `string`** · o catálogo do front é tipado
 * contra si mesmo, e uma chave genérica não compila ali · é o mesmo mecanismo
 * que impede uma frase de sumir sem ninguém ver.
 */
export type KnockoutRoundKey = 'final' | 'semi' | 'quarter' | 'round16' | 'round32';

export function knockoutRoundKey(teamsInRound: number): KnockoutRoundKey {
  if (teamsInRound <= 2) return 'final';
  if (teamsInRound <= 4) return 'semi';
  if (teamsInRound <= 8) return 'quarter';
  if (teamsInRound <= 16) return 'round16';
  return 'round32';
}

/** Um time na disputa da repescagem · a corrida dos melhores terceiros. */
export type ThirdInRace = {
  tag: string;
  groupIndex: number;
  row: StandingRow;
  /** Está dentro do corte agora · muda a cada rodada que fecha. */
  qualifying: boolean;
};

/**
 * **A corrida dos melhores terceiros** · quem está na briga, na ordem, com a
 * linha de corte.
 *
 * Ela responde a pergunta que a barrinha tracejada da tabela **levanta e não
 * responde**: *"estou na briga pela repescagem · e daí?"*. Foi o Eduardo que
 * apontou isso em 19/08/2026 (*"como é o desfecho? como se prossegue?"*), e a
 * resposta é esta comparação · ela existia só dentro do gerador do mata-mata,
 * onde ninguém vê.
 *
 * **É a mesma ordenação do `rankQualified`**, e tem de continuar sendo · uma
 * tela que diz "você está em 7º entre os terceiros" e um chaveamento que
 * classifica outro time é o pior desfecho possível deste produto.
 *
 * **Num formato sem repescagem ela é vazia**, e a tela não desenha nada.
 */
export function thirdsRace(
  groups: readonly (readonly StandingRow[])[],
  size: BracketSize,
): ThirdInRace[] {
  if (size.bestThirds <= 0) return [];

  const disputing: { row: StandingRow; groupIndex: number }[] = [];
  groups.forEach((rows, groupIndex) => {
    const row = rows[size.qualifiersPerGroup];
    if (row) disputing.push({ row, groupIndex });
  });

  return [...disputing]
    .sort(compareCampaigns)
    .map((item, index) => ({
      tag: item.row.tag,
      groupIndex: item.groupIndex,
      row: item.row,
      qualifying: index < size.bestThirds,
    }));
}


/**
 * O pódio de uma edição · **campeão, vice e terceiro.**
 *
 * Nasce em 20/08/2026, com o pedido do Eduardo de *"fechar o que falta do
 * campeonato, de decretar as premiações"* · até aqui a edição **acabava e não
 * dizia quem ganhou**: a final fechava, a chave ficava desenhada com o placar, e
 * nenhuma tela do produto afirmava o campeão.
 *
 * ---
 *
 * **Ele é DERIVADO, e não gravado**, e essa é a decisão que importa:
 *
 * - o campeão é quem venceu a final, e isso **já está** na partida · gravar de
 *   novo cria duas fontes pra o mesmo fato, e o dia em que a organização
 *   corrigir um placar elas divergem em silêncio;
 * - corrigir placar é **caminho normal** aqui (a rota de resolver disputa
 *   existe justamente pra isso), então a segunda fonte não é hipótese remota;
 * - e derivar custa nada · são duas partidas.
 *
 * **`null` enquanto a final não fechou** · pódio pela metade é pior que pódio
 * nenhum, porque a tela afirmaria um campeão que ainda vai a campo.
 *
 * **O terceiro é opcional de propósito** · edição sem disputa de terceiro
 * (`format.thirdPlaceMatch: false`) tem pódio de dois, e inventar o terceiro a
 * partir de "quem perdeu a semi com melhor campanha" seria o produto decidindo
 * uma coisa que o regulamento não decidiu.
 */
export type Podium = {
  champion: string;
  runnerUp: string;
  /** `null` quando a edição não tem disputa de terceiro, ou ela não fechou. */
  third: string | null;
};

/** O que o pódio precisa saber de uma partida · o mínimo, pra a função ser pura. */
export type PodiumMatch = {
  phase: MatchPhase;
  round: number;
  thirdPlace?: boolean;
  homeTag: string;
  awayTag: string;
  score: { home: number; away: number } | null;
  penalties: { home: number; away: number } | null;
};

/** Quem venceu, pelas mesmas regras do servidor · gols, e pênaltis no empate. */
function decided(match: PodiumMatch): { winner: string; loser: string } | null {
  if (!match.score) return null;
  if (match.score.home !== match.score.away) {
    return match.score.home > match.score.away
      ? { winner: match.homeTag, loser: match.awayTag }
      : { winner: match.awayTag, loser: match.homeTag };
  }
  if (!match.penalties || match.penalties.home === match.penalties.away) return null;
  return match.penalties.home > match.penalties.away
    ? { winner: match.homeTag, loser: match.awayTag }
    : { winner: match.awayTag, loser: match.homeTag };
}

export function podiumOf(matches: readonly PodiumMatch[]): Podium | null {
  const knockout = matches.filter((match) => match.phase === 'knockout');
  if (knockout.length === 0) return null;

  /**
   * **A final é a última rodada da ÁRVORE** · a disputa de terceiro mora na
   * mesma rodada e não é a final, então ela sai da conta antes · é o mesmo
   * filtro que o `advanceKnockout` faz, e pelo mesmo motivo.
   */
  const tree = knockout.filter((match) => !match.thirdPlace);
  if (tree.length === 0) return null;

  const lastRound = Math.max(...tree.map((match) => match.round));
  const finals = tree.filter((match) => match.round === lastRound);
  // Mais de um confronto na última rodada é uma chave que ainda vai andar.
  if (finals.length !== 1) return null;

  const final = finals[0];
  if (!final) return null;
  const result = decided(final);
  if (!result) return null;

  const dispute = knockout.find((match) => match.thirdPlace);
  const third = dispute ? (decided(dispute)?.winner ?? null) : null;

  return { champion: result.winner, runnerUp: result.loser, third };
}
