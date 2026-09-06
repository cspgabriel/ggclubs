import type { MatchCard } from '@ggclubs/schemas';
import { knockoutTree } from './knockout-tree';

export function competitionProgress(matches: MatchCard[]) {
  const settled = (match: MatchCard | null | undefined) =>
    match?.status === 'played' || match?.status === 'walkover';
  const groups = matches.filter((match) => match.phase === 'group');
  const confirmed = groups.filter(settled).length;
  const knockout = matches.filter((match) => match.phase === 'knockout');
  const final = knockoutTree(knockout).at(-1)?.slots[0]?.match;
  const third = knockout.find((match) => match.thirdPlace);
  return {
    groupTotal: groups.length,
    groupConfirmed: confirmed,
    groupsReady: groups.length > 0 && confirmed === groups.length,
    thirdPending:
      settled(final) &&
      Boolean(third && (third.status === 'scheduled' || third.status === 'disputed')),
  };
}
