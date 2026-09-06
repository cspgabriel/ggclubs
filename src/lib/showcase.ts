/**
 * O dado de exemplo das peças ilustrativas da vitrine · a chave, a tabela e a
 * súmula que a landing desenha pra **mostrar o produto** em vez de descrevê-lo.
 *
 * **Nenhum nome de club mora aqui, só o número.** A regra é a do
 * `docs/design.md` (02/09/2026): peça de exemplo não usa club real nem nome
 * inventado verossímil · o que entra é *Time N FC*, que se lê como o que é. A
 * frase com o número vem do catálogo, então em espanhol vira *Equipo N FC* sem
 * ninguém tocar aqui.
 *
 * **É dado, e não componente**, porque três peças leem dele e o arquivo de
 * componente só pode exportar componente (senão o Vite perde o Fast Refresh).
 */

import type { MatchCard } from '@ggclubs/schemas';
import { bracketWinner } from './knockout-tree';

export type ShowcaseSide = {
  /** O número do time de exemplo · vira *Time N FC* na tela e *TN* no escudo. */
  team: number;
  goals: number;
  /** Só quando o jogo empatou · desempate na mesma linha dos gols. */
  penalties?: number;
};

export type ShowcaseMatch = { home: ShowcaseSide; away: ShowcaseSide };

export type ShowcaseRoundKey = 'quarter' | 'semi' | 'final';

export type ShowcaseRound = { key: ShowcaseRoundKey; matches: readonly ShowcaseMatch[] };

/**
 * Uma chave de oito, jogada até o fim · **e o campeão é o Time 1**, de propósito.
 *
 * Oito é o tamanho em que a árvore inteira cabe lado a lado (4, 2, 1) sem virar
 * o oceano que a chave de 48 vira · é o mesmo número que o `KnockoutBracket`
 * cita como o caso em que tudo fica à vista. Jogos decididos nos pênaltis nas
 * quartas e na semifinal mostram o desempate, e a final fechada é o que
 * faz o troféu aparecer · a chave ilustra **chegar lá**, e não esperar.
 */
export const SHOWCASE_BRACKET: readonly ShowcaseRound[] = [
  {
    key: 'quarter',
    matches: [
      { home: { team: 1, goals: 2 }, away: { team: 8, goals: 1 } },
      { home: { team: 4, goals: 0, penalties: 4 }, away: { team: 5, goals: 0, penalties: 3 } },
      { home: { team: 2, goals: 3 }, away: { team: 7, goals: 2 } },
      { home: { team: 3, goals: 1 }, away: { team: 6, goals: 0 } },
    ],
  },
  {
    key: 'semi',
    matches: [
      { home: { team: 1, goals: 2 }, away: { team: 4, goals: 0 } },
      { home: { team: 2, goals: 1, penalties: 5 }, away: { team: 3, goals: 1, penalties: 4 } },
    ],
  },
  {
    key: 'final',
    matches: [{ home: { team: 1, goals: 3 }, away: { team: 2, goals: 1 } }],
  },
];

/**
 * Quem venceu · gols, e os pênaltis quando eles empatam. É a mesma pergunta do
 * `winnerSide` da chave de verdade, sobre o dado de exemplo.
 */
export function showcaseWinner(match: ShowcaseMatch): 'home' | 'away' {
  return bracketWinner(showcaseMatchCard(match))!;
}

/** Adapta apenas o dado fictício; renderização e resultado usam o contrato do core. */
export function showcaseMatchCard(match: ShowcaseMatch, number = 1): MatchCard {
  return {
    _id: `example-${number}`,
    phase: 'knockout',
    groupIndex: null,
    round: 1,
    homeTag: showcaseTag(match.home.team),
    awayTag: showcaseTag(match.away.team),
    scheduledAt: new Date('2026-01-01T20:00:00Z'),
    status: 'played',
    score: { home: match.home.goals, away: match.away.goals },
    penalties:
      match.home.penalties !== undefined && match.away.penalties !== undefined
        ? { home: match.home.penalties, away: match.away.penalties }
        : null,
    settledBy: null,
    settledReason: null,
    walkoverAgainst: null,
    homeClaim: null,
    awayClaim: null,
    deadline: null,
  };
}

/** A tag do escudo de exemplo · o `ClubCrest` desenha as três primeiras letras. */
export function showcaseTag(team: number): string {
  return `T${team}`;
}

export type ShowcaseStanding = {
  team: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  /** A zona, com as mesmas cores da tabela de verdade · verde direto, âmbar repescagem. */
  zone: 'direct' | 'bestNext' | null;
};

/**
 * Um grupo de quatro já encerrado, com os dois primeiros classificados.
 * O exemplo não inclui repescagem, para não exigir uma legenda de outro formato.
 */
export const SHOWCASE_TABLE: readonly ShowcaseStanding[] = [
  { team: 1, points: 7, played: 3, won: 2, drawn: 1, lost: 0, goalDiff: 4, zone: 'direct' },
  { team: 2, points: 6, played: 3, won: 2, drawn: 0, lost: 1, goalDiff: 2, zone: 'direct' },
  { team: 3, points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalDiff: -1, zone: null },
  { team: 4, points: 1, played: 3, won: 0, drawn: 1, lost: 2, goalDiff: -5, zone: null },
];

/** A súmula de exemplo · os dois lados lançaram o mesmo placar, e ele fechou. */
export const SHOWCASE_REPORT: ShowcaseMatch = {
  home: { team: 1, goals: 2 },
  away: { team: 2, goals: 1 },
};
