import { tournamentShelfOf, teamsInEdition, capacityOf } from '@ggclubs/schemas';
import { ArrowRight, Trophy } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { TournamentRecord } from '@/lib/api';
import { formatShortDate } from '@/lib/tournament-format';

export function TournamentSummary({
  tournament,
  href,
}: {
  tournament: TournamentRecord;
  href: string;
}) {
  const { t } = useTranslation();
  const shelf = tournamentShelfOf(tournament);
  const count = teamsInEdition(tournament);
  const detail =
    shelf === 'waiting'
      ? t(tournament.registeredCount >= capacityOf(tournament) ? 'tournament.fullAwaitingDraw' : 'tournament.groupWaiting')
      : shelf === 'soon'
      ? t('tournament.groupSoon')
      : shelf === 'signup'
        ? t('tournament.groupOpen')
        : count
          ? t('tournament.summaryTeams', { count })
          : null;
  const action =
    shelf === 'past'
      ? 'tournament.viewResults'
      : shelf === 'playing'
        ? 'tournament.followEdition'
        : 'tournament.viewEdition';
  return (
    <Link
      to={href}
      data-tournament-summary
      className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Trophy
        className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-sm font-semibold text-foreground">{tournament.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatShortDate(tournament.startsAt, true)}
          {detail && <> · {detail}</>}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-primary">
        <span className="hidden sm:inline">{t(action)}</span>
        <ArrowRight className="h-4 w-4" aria-hidden />
        <span className="sr-only sm:hidden">{t(action)}</span>
      </span>
    </Link>
  );
}
