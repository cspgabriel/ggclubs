import { useRunningMatch } from '@/lib/running-match-context';
import { appClubPath, appTournamentPath } from '@/lib/paths';
import { MyMatch } from './tournament-my-match';
import { ParticipationNotice } from './tournament-participation';

/** Home e catálogo usam o mesmo snapshot da faixa, sem consultas próprias. */
export function MyTournament({ className }: { className?: string }) {
  const { tournament, registrations, matches, clubs, myTags, reportableTags, onBar } =
    useRunningMatch();
  if (!tournament || onBar) return null;
  const href = appTournamentPath(tournament.slug);
  if (matches.length > 0) {
    return (
      <MyMatch
        matches={matches}
        clubs={clubs}
        mine={new Set(myTags)}
        priorityTags={reportableTags}
        status={tournament.status}
        thirdPlaceMatch={tournament.format.thirdPlaceMatch}
        clubHref={appClubPath}
        edition={{ name: tournament.name, href }}
        className={className ?? ''}
      />
    );
  }
  if (tournament.status !== 'open' && tournament.status !== 'closed') return null;
  const own = registrations.filter(
    (row) =>
      myTags.includes(row.club.tag) &&
      (row.status === 'confirmed' ||
        (row.status === 'reserved' &&
          row.reservedUntil !== null &&
          new Date(row.reservedUntil).getTime() > Date.now())),
  );
  // A reserva que a pessoa pode concluir vem antes de uma inscrição já confirmada.
  own.sort(
    (a, b) =>
      Number(b.status === 'reserved' && reportableTags.includes(b.club.tag)) -
      Number(a.status === 'reserved' && reportableTags.includes(a.club.tag)),
  );
  const registration = own[0];
  if (!registration) return null;
  return (
    <ParticipationNotice
      tournament={tournament}
      registration={registration}
      canManage={reportableTags.includes(registration.club.tag)}
      href={href}
      className={className}
    />
  );
}
