import type { MatchCard } from '@ggclubs/schemas';

export type BracketSlot = {
  number: number;
  match: MatchCard | null;
  home: string | null;
  away: string | null;
  sources: [number, number] | null;
};

export type BracketRound = { round: number; teams: number; slots: BracketSlot[] };

export function bracketWinner(match: MatchCard | null): 'home' | 'away' | null {
  if (!match?.score || !['played', 'walkover'].includes(match.status)) return null;
  if (match.score.home !== match.score.away) {
    return match.score.home > match.score.away ? 'home' : 'away';
  }
  if (!match.penalties || match.penalties.home === match.penalties.away) return null;
  return match.penalties.home > match.penalties.away ? 'home' : 'away';
}

function advancingTag(slot: BracketSlot | undefined): string | null {
  const winner = bracketWinner(slot?.match ?? null);
  return slot && winner ? slot[winner] : null;
}

export function knockoutTree(matches: MatchCard[]): BracketRound[] {
  const tree = matches.filter((match) => match.phase === 'knockout' && !match.thirdPlace);
  const firstCount = tree.filter((match) => match.round === 1).length;
  if (!firstCount) return [];
  const rounds: BracketRound[] = [];
  let number = 0;
  for (let index = 0; index < Math.ceil(Math.log2(firstCount * 2)); index++) {
    // Mesma ordem do advanceKnockout: mudar aqui ligaria os confrontos errados.
    const played = tree
      .filter((match) => match.round === index + 1)
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime() ||
          a._id.localeCompare(b._id),
      );
    const slots = Array.from({ length: Math.ceil(firstCount / 2 ** index) }, (_, position) => {
      const match = played[position] ?? null;
      const previous = rounds[index - 1]?.slots;
      const homeSource = previous?.[position * 2];
      const awaySource = previous?.[position * 2 + 1];
      return {
        number: ++number,
        match,
        home: match?.homeTag ?? advancingTag(homeSource),
        away: match?.awayTag ?? advancingTag(awaySource),
        sources:
          homeSource && awaySource
            ? ([homeSource.number, awaySource.number] as [number, number])
            : null,
      };
    });
    rounds.push({ round: index + 1, teams: slots.length * 2, slots });
  }
  return rounds;
}
