import type { MatchCard } from '@ggclubs/schemas';

export function canDeclareMatch(
  match: Pick<MatchCard, 'status' | 'homeTag' | 'awayTag' | 'homeClaim' | 'awayClaim'>,
  tag: string,
): boolean {
  if (match.status !== 'scheduled') return false;
  if (tag === match.homeTag) return !match.homeClaim;
  if (tag === match.awayTag) return !match.awayClaim;
  return false;
}
