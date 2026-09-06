import { capacityOf, displayStatusOf, effectiveSize, tournamentShelfOf } from '@ggclubs/schemas';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandWatermark } from '@/components/brand';
import { Chamfer } from '@/components/ui/chamfer';
import { Badge } from '@/components/ui/badge';
import type { TournamentRecord } from '@/lib/api';
import { POOL_KEY } from '@/lib/clubs';
import { formatPrice } from '@/lib/format';
import { formatMatchTime } from '@/lib/tournament-format';
import { cn } from '@/lib/utils';
import { TournamentSummary } from './tournament-summary';

/** Oportunidades têm ação e preço; resultados e acompanhamento usam uma linha compacta. */
export function TournamentCard({
  tournament,
  href,
  featured = false,
}: {
  tournament: TournamentRecord;
  href: string;
  featured?: boolean;
}) {
  const { t } = useTranslation();
  const shelf = tournamentShelfOf(tournament);
  if (shelf === 'past' || shelf === 'waiting' || shelf === 'playing') {
    return <TournamentSummary tournament={tournament} href={href} />;
  }
  const signup = shelf === 'signup';
  const notYetOpen = displayStatusOf(tournament) === 'notYetOpen';
  const available = signup || notYetOpen;
  const total = capacityOf(tournament);
  const remaining = Math.max(0, total - tournament.registeredCount);
  const prize = effectiveSize(tournament)?.prize.first ?? 0;
  const hasPrize = prize > 0;
  return (
    <Chamfer
      as={Link}
      to={href}
      data-tournament-card
      border={signup ? 'bg-primary/40 hover:bg-primary' : 'bg-border hover:bg-primary/50'}
      size={featured ? '1.25rem' : '0.9rem'}
      className="group block h-full transition-colors focus-visible:bg-primary"
      innerClassName="relative flex h-full flex-col gap-5 bg-card p-5 sm:p-6"
    >
      <BrandWatermark tile="bg-[length:3rem_3rem]" />
      <div className="relative flex flex-wrap items-center gap-2">
        <Badge variant={signup ? 'success' : 'default'}>
          {t(signup ? 'tournament.groupOpen' : 'tournament.groupSoon')}
        </Badge>
        <Badge variant="strong">{t(POOL_KEY[tournament.pool])}</Badge>
      </div>
      <div className="relative flex items-center gap-3">
        {tournament.crestUrl && (
          <img
            src={tournament.crestUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        )}
        <h3
          className={cn(
            'min-w-0 break-words font-display uppercase leading-tight',
            featured ? 'text-2xl sm:text-3xl' : 'text-xl',
          )}
        >
          {tournament.name}
        </h3>
      </div>
      <div className="relative flex flex-wrap gap-x-8 gap-y-4">
        {available && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('tournament.entryPerClub')}
            </p>
            <p className="mt-1 font-display text-2xl text-primary">
              {tournament.priceCents ? formatPrice(tournament.priceCents) : t('tournament.free')}
            </p>
          </div>
        )}
        {hasPrize && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('tournament.prizeFirst')}
            </p>
            <p className="mt-1 font-display text-2xl text-foreground">{formatPrice(prize)}</p>
          </div>
        )}
      </div>
      <div className="relative space-y-2 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t('tournament.startsOn')} {formatMatchTime(tournament.startsAt)} ·{' '}
            {t('tournament.timeZone')}
          </span>
        </p>
        {available && (
          <p>
            {t(signup ? 'tournament.registrationCloses' : 'tournament.signupOpens')}{' '}
            {formatMatchTime(
              signup ? tournament.registrationClosesAt : tournament.registrationOpensAt,
            )}
          </p>
        )}
        {!available && <p>{t('tournament.signupClosed')}</p>}
      </div>
      {signup && (
        <div className="relative">
          <p className="mb-2 text-xs font-semibold text-foreground">
            {t('tournament.availableSpots', { count: remaining, total })}
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, (tournament.registeredCount / Math.max(1, total)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
      <span className="relative mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-sm font-bold text-primary">
        {t(signup ? 'tournament.viewSignup' : 'tournament.viewEdition')}
        <ArrowRight
          className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
          aria-hidden
        />
      </span>
    </Chamfer>
  );
}
