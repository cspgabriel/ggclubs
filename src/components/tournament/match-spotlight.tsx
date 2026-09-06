import type { MatchCard } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ClubCrest } from '@/components/club/club-crest';
import { Chamfer } from '@/components/ui/chamfer';
import { matchMoment } from '@/lib/match-moment';
import { formatMatchTime } from '@/lib/tournament-format';
import { relativeTime } from '@/lib/relative-time';
import { cn } from '@/lib/utils';
import { ClubLink } from './club-link';
import type { ClubDirectory } from './tournament-shared';

/** Uma apresentação da partida nas três telas, com a próxima ação e o estado da declaração. */
export function MatchSpotlight({
  match,
  myTag,
  clubs,
  canReport,
  clubHref,
  edition,
  action,
  roundLabel,
  className,
}: {
  match: MatchCard;
  myTag: string;
  clubs: ClubDirectory;
  canReport: boolean;
  clubHref: (tag: string) => string;
  edition?: { name: string; href: string };
  action?: React.ReactNode;
  roundLabel: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const moment = matchMoment({ match, myTag, canReport });
  const calling = moment === 'toReport';
  const myClaim = myTag === match.homeTag ? match.homeClaim : match.awayClaim;
  const rivalClaim = myTag === match.homeTag ? match.awayClaim : match.homeClaim;
  const claim = myClaim ?? rivalClaim;

  return (
    <Chamfer
      data-next-match
      data-match-moment={moment}
      border={cn(calling ? 'bg-primary/50' : 'bg-border', edition && 'hover:bg-primary/50')}
      innerClassName="flex flex-wrap items-center gap-x-4 gap-y-3 bg-card p-4"
      className={cn('relative block', className)}
    >
      <div className="min-w-0 flex-1 basis-60">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-widest">
          <span className={calling ? 'text-primary' : 'text-muted-foreground'}>
            {t(`tournament.moment.${moment}`)}
          </span>
          {edition && (
            <Link
              to={edition.href}
              className="text-foreground after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {edition.name}
            </Link>
          )}
        </div>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <Side tag={match.homeTag} mine={myTag} clubs={clubs} clubHref={clubHref} />
          <span className="flex min-w-0 items-center gap-x-3">
            <span aria-hidden className="shrink-0 text-sm text-muted-foreground">
              ×
            </span>
            <Side tag={match.awayTag} mine={myTag} clubs={clubs} clubHref={clubHref} />
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {roundLabel}
          {match.groupIndex !== null &&
            ` · ${t('tournament.groupName', { name: String.fromCharCode(65 + match.groupIndex) })}`}
          {' · '}
          {formatMatchTime(match.scheduledAt)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t(`tournament.progress.${moment}`)}</p>
        {claim && moment !== 'disputed' && moment !== 'done' && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {t(myClaim ? 'tournament.progress.clubScore' : 'tournament.progress.rivalScore', {
                home: claim.homeGoals,
                away: claim.awayGoals,
              })}
              {claim.penalties &&
                ` · ${t('tournament.progress.penalties', { home: claim.penalties.home, away: claim.penalties.away })}`}
            </span>
            {match.deadline && (
              <span className="mt-1 block">
                {t('tournament.reportCountsIn', { when: relativeTime(match.deadline) })}
              </span>
            )}
          </p>
        )}
      </div>
      {action && <div className="relative z-10 flex flex-wrap items-center gap-3">{action}</div>}
    </Chamfer>
  );
}

function Side({
  tag,
  mine,
  clubs,
  clubHref,
}: {
  tag: string;
  mine: string;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
}) {
  const club = clubs.get(tag);
  return (
    <ClubLink
      tag={tag}
      clubs={clubs}
      clubHref={clubHref}
      className="relative z-10 flex min-w-0 items-center gap-2"
    >
      <ClubCrest
        tag={tag}
        crestUrl={club?.crestUrl ?? null}
        className="h-7 w-7 shrink-0 text-[9px]"
      />
      <span
        className={cn(
          'break-words font-display text-base uppercase leading-tight sm:text-lg',
          tag === mine ? 'text-primary' : 'text-foreground hover:text-primary',
        )}
      >
        {club?.name ?? tag.toUpperCase()}
      </span>
    </ClubLink>
  );
}
