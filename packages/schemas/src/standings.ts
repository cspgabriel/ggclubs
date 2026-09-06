import { z } from 'zod';

/**
 * A tabela de um grupo · **calculada, e nunca gravada.**
 *
 * É a regra do "valor derivado não vira campo" no caso mais tentador dela: um
 * contador de pontos no documento do club seria rápido de ler e **inevitavelmente
 * divergiria** do que as partidas dizem no dia em que o admin corrigir um placar
 * numa disputa. Aqui a fonte é uma só · as partidas fechadas.
 *
 * **O custo é conhecido e pequeno:** o maior grupo da casa tem 4 clubs e 6
 * partidas, e o maior degrau tem 12 grupos · são 72 documentos que a página já
 * busca inteiros pra desenhar a chave.
 */
export const standingRow = z.object({
  tag: z.string(),
  played: z.number().int().nonnegative(),
  won: z.number().int().nonnegative(),
  drawn: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  /** Saldo · derivado, mas vai na linha porque a tabela mostra a coluna. */
  goalDiff: z.number().int(),
  points: z.number().int().nonnegative(),
});
export type StandingRow = z.infer<typeof standingRow>;

/** Vitória vale 3, empate 1 · regra padrão de futebol, decidida em 10/08/2026. */
export const POINTS_WIN = 3;
export const POINTS_DRAW = 1;

/** O placar de uma partida fechada, na perspectiva mandante × visitante. */
export type PlayedMatch = {
  homeTag: string;
  awayTag: string;
  homeGoals: number;
  awayGoals: number;
};

/**
 * A classificação de um grupo · **a ordem é a da FIFA, e ela foi escolhida.**
 *
 * O Eduardo pediu os dois regulamentos de verdade em 10/08/2026 e o padrão nasce
 * **por tipo de fase**: grupos e copa com a ordem da FIFA (saldo antes de
 * vitórias), pontos corridos com a da CBF (vitórias antes de saldo). Num grupo
 * de três partidas a diferença troca classificado com frequência, então ela não
 * é detalhe.
 *
 * | | |
 * |---|---|
 * | 1 | pontos |
 * | 2 | saldo de gols |
 * | 3 | gols marcados |
 * | 4 | **o confronto entre as empatadas** · pontos, saldo e gols só entre elas |
 * | 5 | **a ordem do sorteio** |
 *
 * **O último critério é o sorteio, e ele já aconteceu** · a FIFA usa fair play
 * ali, e os critérios de cartão saíram por falta de dado (o placar é declarado,
 * ninguém registra amarelo). Em vez de sortear na hora — o que faria a tabela
 * mudar a cada leitura — vale **a ordem em que o sorteio cego pôs os clubs no
 * grupo**, que é literalmente um sorteio já realizado e é estável.
 */
export function standingsOf(tags: readonly string[], matches: readonly PlayedMatch[]): StandingRow[] {
  const order = new Map(tags.map((tag, index) => [tag, index]));
  const byOrder = (a: StandingRow, b: StandingRow) =>
    (order.get(a.tag) ?? 0) - (order.get(b.tag) ?? 0);

  const overall = buildRows(tags, matches).sort((a, b) => compareOverall(a, b) || byOrder(a, b));

  /**
   * **O desempate roda em BLOCO, e não par a par** · e isso não é refinamento:
   * comparar dois de cada vez produz **ordem indefinida** no caso clássico de
   * três empatados em ciclo (A ganha de B, B de C, C de A). O `sort` receberia
   * "A vem antes de B", "B antes de C" e "C antes de A" ao mesmo tempo, e o
   * resultado passaria a depender da implementação dele.
   *
   * A FIFA resolve do jeito certo: monta uma **mini-tabela só entre as
   * empatadas**, com as partidas entre elas, e aplica pontos, saldo e gols ali
   * dentro. Quem continuar empatado depois disso cai na ordem do sorteio.
   */
  const out: StandingRow[] = [];
  for (let i = 0; i < overall.length; ) {
    let j = i + 1;
    while (j < overall.length && compareOverall(overall[i]!, overall[j]!) === 0) j += 1;

    const tied = overall.slice(i, j);
    out.push(...(tied.length > 1 ? breakTie(tied, matches, byOrder) : tied));
    i = j;
  }
  return out;
}

/**
 * Ordena as empatadas pela mini-tabela do confronto entre elas.
 *
 * **Usa `buildRows`, nunca o `standingsOf`** · chamar a função de cima daqui
 * faria o desempate chamar a si mesmo com o mesmo bloco, pra sempre.
 */
function breakTie(
  tied: StandingRow[],
  matches: readonly PlayedMatch[],
  byOrder: (a: StandingRow, b: StandingRow) => number,
): StandingRow[] {
  const tags = tied.map((r) => r.tag);
  const between = matches.filter((m) => tags.includes(m.homeTag) && tags.includes(m.awayTag));
  if (between.length === 0) return tied;

  const mini = new Map(buildRows(tags, between).map((r) => [r.tag, r]));
  return [...tied].sort((a, b) => {
    const rowA = mini.get(a.tag);
    const rowB = mini.get(b.tag);
    if (!rowA || !rowB) return byOrder(a, b);
    return compareOverall(rowA, rowB) || byOrder(a, b);
  });
}

/**
 * As linhas somadas, **sem ordenar** · e a separação não é estilo.
 *
 * O desempate por confronto direto precisa montar a tabela do mini-grupo das
 * empatadas. Se ele chamasse o `standingsOf`, o `sort` de lá chamaria o
 * desempate de novo, com o mesmo par · **laço infinito**. Somar e ordenar viram
 * duas funções pra que a segunda possa usar só a primeira.
 */
function buildRows(tags: readonly string[], matches: readonly PlayedMatch[]): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    tags.map((tag) => [
      tag,
      {
        tag,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      },
    ]),
  );

  for (const match of matches) {
    const home = rows.get(match.homeTag);
    const away = rows.get(match.awayTag);
    // Partida de club que não está no grupo não entra · é o caso do dado velho,
    // e somá-lo criaria uma linha que a tabela não sabe desenhar.
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;

    if (match.homeGoals > match.awayGoals) {
      home.won += 1;
      away.lost += 1;
      home.points += POINTS_WIN;
    } else if (match.homeGoals < match.awayGoals) {
      away.won += 1;
      home.lost += 1;
      away.points += POINTS_WIN;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += POINTS_DRAW;
      away.points += POINTS_DRAW;
    }
  }

  for (const row of rows.values()) row.goalDiff = row.goalsFor - row.goalsAgainst;

  return [...rows.values()];
}

/**
 * Em que **zona** uma linha da tabela está.
 *
 * `null` é o caso comum: a maioria das linhas não está em zona nenhuma.
 */
export type QualifyZone =
  /** Passou pela porta da frente · a posição do grupo já basta. */
  | 'direct'
  /** Está entre os melhores da primeira posição que não passa direto. */
  | 'bestNext'
  /** Está nessa posição e **não** está entre os melhores dela · é a briga. */
  | 'chasing';

/**
 * A zona de cada club, **comparando os grupos entre si.**
 *
 * ---
 *
 * **Por que isto existe como abstração, e não como um `if` de melhores
 * terceiros** · pergunta do Eduardo em 19/08/2026, e ela tem duas metades.
 *
 * A primeira: **o melhor terceiro não cabe no card de um grupo.** O terceiro do
 * grupo A só sabe se passou depois de comparar com o terceiro do B e do C, e o
 * card do grupo não enxerga os outros. Quem responde é quem tem a chave
 * inteira, e o resultado desce pronto.
 *
 * A segunda é a que decide o desenho: *"pensar não só nas regras deste camp, mas
 * prever as variações"*. **Não dá pra prever as regras, e tentar seria inventar
 * requisito** · o que dá é parar de **nomear** a regra. A tabela não desenha
 * "melhor terceiro": ela desenha **uma zona**, e o nome da zona é a única coisa
 * que muda quando a regra mudar. Regra nova vira uma entrada nova aqui e uma
 * frase no catálogo · a tabela não é tocada.
 *
 * Por isso os parâmetros são **números e não `BracketSize`**: com `bestThirds`
 * na assinatura, a função só serviria pro formato de hoje. `bestOfNext` é a
 * mesma regra dita de um jeito que sobrevive a passar 1 de cada grupo (aí a
 * briga é de "melhores segundos") ou 3.
 *
 * ---
 *
 * **A comparação entre grupos não tem confronto direto**, e nem poderia: os
 * terceiros de grupos diferentes não jogaram entre si. Sobram pontos, saldo e
 * gols · exatamente o `compareOverall`, que é o critério da FIFA menos a etapa
 * que não se aplica.
 *
 * **O empate que sobrar mantém a ordem do grupo**, que é a ordem do sorteio ·
 * mesma escolha do desempate de dentro do grupo, e pelo mesmo motivo: sortear
 * na hora faria a tabela mudar a cada leitura.
 *
 * **Grupo com menos jogos não é comparável, e isso é problema conhecido do
 * mundo real** · a FIFA resolve descartando os jogos contra o último colocado
 * quando os grupos têm tamanhos diferentes. Aqui todo grupo tem o mesmo
 * tamanho por `isPlayableBracket`, então o caso não existe · o dia em que
 * existir, é aqui que ele entra.
 */
export function qualificationOf(
  groups: readonly (readonly StandingRow[])[],
  rule: {
    /** Quantos passam direto por grupo. */
    directPerGroup: number;
    /** Quantos passam repescados da primeira posição que não passa direto. */
    bestOfNext: number;
  },
): Map<string, QualifyZone> {
  const zones = new Map<string, QualifyZone>();
  if (rule.directPerGroup <= 0) return zones;

  for (const rows of groups) {
    for (let i = 0; i < Math.min(rule.directPerGroup, rows.length); i += 1) {
      zones.set(rows[i]!.tag, 'direct');
    }
  }

  if (rule.bestOfNext <= 0) return zones;

  // A posição da repescagem é a primeira que não passa direto · dizer "terceiro"
  // aqui amarraria a função ao formato de hoje.
  const pool = groups
    .map((rows) => rows[rule.directPerGroup])
    .filter((row): row is StandingRow => row !== undefined);

  const ranked = [...pool].sort((a, b) => compareOverall(a, b));
  ranked.forEach((row, i) => {
    zones.set(row.tag, i < rule.bestOfNext ? 'bestNext' : 'chasing');
  });

  return zones;
}

function compareOverall(a: StandingRow, b: StandingRow): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDiff !== b.goalDiff) return b.goalDiff - a.goalDiff;
  return b.goalsFor - a.goalsFor;
}

