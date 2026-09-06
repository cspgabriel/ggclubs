import { CalendarClock, Check, Clock3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Chamfer } from '@/components/ui/chamfer';
import { ClubCrest } from '@/components/club/club-crest';
import type { RegistrationCard, TournamentRecord } from '@/lib/api';
import { formatMatchTime } from '@/lib/tournament-format';
import { cn } from '@/lib/utils';

/** A orientação antes da chave também aparece dentro do painel de inscrição. */
export function DrawGuidance({
  tournament,
  className,
}: {
  tournament: TournamentRecord;
  className?: string;
}) {
  const { t } = useTranslation();
  if (tournament.status !== 'open' && tournament.status !== 'closed') return null;
  const overdue = new Date(tournament.drawAt).getTime() <= Date.now();
  return (
    <div
      data-draw-guidance
      className={cn('mt-3 flex items-start gap-2 text-sm text-muted-foreground', className)}
    >
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          {overdue
            ? t('tournament.participation.waitingDraw')
            : t('tournament.participation.drawDate', { when: formatMatchTime(tournament.drawAt) })}
          {!overdue && (
            <span className="ml-1 font-normal text-muted-foreground">
              · {t('tournament.timeZone')}
            </span>
          )}
        </p>
        <p className="mt-1">{t('tournament.participation.drawBody')}</p>
      </div>
    </div>
  );
}

export function ParticipationNotice({
  tournament,
  registration,
  canManage,
  href,
  className,
}: {
  tournament: TournamentRecord;
  registration: RegistrationCard;
  canManage: boolean;
  href: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const reserved = registration.status === 'reserved';
  const Icon = reserved ? Clock3 : Check;
  return (
    <Chamfer
      data-participation={registration.status}
      border="bg-border hover:bg-primary/50"
      innerClassName="bg-card p-4"
      className={className}
    >
      <Link
        to={href}
        className="grid items-center gap-x-6 gap-y-3 focus-visible:outline-2 focus-visible:outline-primary md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
      >
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {tournament.name}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <ClubCrest
              tag={registration.club.tag}
              crestUrl={registration.club.crestUrl}
              className="h-8 w-8 shrink-0 text-[10px]"
            />
            <p className="min-w-0 break-words font-semibold">
              {t(reserved ? 'tournament.participation.reservedTitle' : 'tournament.joinedTitle', {
                club: registration.club.name,
              })}
            </p>
            <Icon
              className={
                reserved
                  ? 'h-4 w-4 shrink-0 text-muted-foreground'
                  : 'h-4 w-4 shrink-0 text-primary'
              }
              aria-hidden
            />
          </div>
        </div>
        <div className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">
          {reserved ? (
            <div className="text-sm text-muted-foreground">
              <p>
                {t(
                  canManage
                    ? 'tournament.participation.reservedBody'
                    : 'tournament.participation.reservedMember',
                )}
              </p>
              {registration.reservedUntil && (
                <p className="mt-1 text-xs">
                  {t('tournament.participation.reservedUntil', {
                    when: formatMatchTime(registration.reservedUntil),
                  })}
                </p>
              )}
            </div>
          ) : (
            <DrawGuidance tournament={tournament} className="mt-0" />
          )}
        </div>
        <p className="text-sm font-semibold text-primary md:col-start-1">
          {t(
            reserved && canManage
              ? 'tournament.participation.paymentAction'
              : 'tournament.liveBarOpen',
          )}{' '}
          <span aria-hidden>→</span>
        </p>
      </Link>
    </Chamfer>
  );
}
