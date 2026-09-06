import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronUp, Clock3, Crown, Search, Shirt, Trophy } from 'lucide-react';
import { ClubCrest } from '@/components/club/club-crest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionTitle } from '@/components/ui/section-title';
import type { RegistrationCard } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TournamentChoice } from './tournament-choice';

const PREVIEW_COUNT = 8;
const searchable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function RegisteredGrid({
  className,
  registrations,
  clubHref,
  mine,
  responds,
  open,
  drawn,
  capacity,
}: {
  className?: string;
  registrations: RegistrationCard[];
  clubHref: (tag: string) => string;
  mine: Set<string>;
  responds: Set<string>;
  open: boolean;
  drawn: boolean;
  capacity?: number;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'reserved'>('all');
  // Depois do sorteio, os mesmos clubs são apresentados na chave.
  if (drawn || (registrations.length === 0 && !open)) return null;

  const confirmed = registrations.filter((row) => row.status === 'confirmed').length;
  const reserved = registrations.filter((row) => row.status === 'reserved').length;
  const ordered = [...registrations].sort(
    (a, b) => Number(mine.has(b.club.tag)) - Number(mine.has(a.club.tag)),
  );
  const matches = ordered.filter(
    (row) =>
      (filter === 'all' || row.status === filter) &&
      searchable(`${row.club.name} ${row.club.tag}`).includes(searchable(query.trim())),
  );
  const visible = expanded ? matches : ordered.slice(0, PREVIEW_COUNT);
  const canExpand = registrations.length > PREVIEW_COUNT;

  return (
    <section className={className} data-registered-section>
      <SectionTitle
        meta={capacity ? t('tournament.registeredCapacity', { count: capacity }) : undefined}
      >
        {t('tournament.registeredTitle')}
      </SectionTitle>

      {registrations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Trophy className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('tournament.registeredEmpty')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card/50">
          <div className="flex flex-col gap-2 border-b border-border px-3 py-3 sm:px-4">
            <dl className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-baseline gap-1">
                <dt className="order-2 text-[11px] text-muted-foreground">
                  {t(
                    confirmed === 1
                      ? 'tournament.registeredConfirmedClub'
                      : 'tournament.registeredConfirmed',
                  )}
                </dt>
                <dd className="text-sm font-bold tabular-nums text-primary">{confirmed}</dd>
              </div>
              <div className="flex items-baseline gap-1">
                <dt className="order-2 text-[11px] text-muted-foreground">
                  {t(
                    reserved === 1
                      ? 'tournament.registeredReservation'
                      : 'tournament.registeredReserved',
                  )}
                </dt>
                <dd className="text-sm font-bold tabular-nums text-foreground">{reserved}</dd>
              </div>
              {capacity !== undefined && (
                <div className="flex items-baseline gap-1">
                  <dt className="order-2 text-[11px] text-muted-foreground">
                    {t('tournament.registeredAvailable', {
                      count: Math.max(0, capacity - registrations.length),
                    })}
                  </dt>
                  <dd className="text-sm font-bold tabular-nums text-foreground">
                    {Math.max(0, capacity - registrations.length)}
                  </dd>
                </div>
              )}
            </dl>
            {reserved > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('tournament.registeredReservationHint')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {expanded && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  />
                  <Input
                    type="search"
                    className="pl-9"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label={t('tournament.registeredSearch')}
                    placeholder={t('tournament.registeredSearch')}
                  />
                </div>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-label={t('tournament.registeredFilter')}
                >
                  {(['all', 'confirmed', 'reserved'] as const).map((value) => (
                    <TournamentChoice
                      key={value}
                      selected={filter === value}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {t(
                        value === 'all'
                          ? 'tournament.registeredAll'
                          : value === 'confirmed'
                            ? 'tournament.registeredConfirmed'
                            : 'tournament.registeredReserved',
                      )}
                    </TournamentChoice>
                  ))}
                </div>
              </div>
            )}
            <div id={id}>
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
                {visible.map((row) => (
                  <li key={row._id} className="min-w-0">
                    <Link
                      to={clubHref(row.club.tag)}
                      data-registered-club={row.club.tag}
                      className={cn(
                        'flex h-full min-w-0 flex-col rounded-lg border bg-background/50 p-2 transition-colors sm:p-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',
                        mine.has(row.club.tag)
                          ? 'border-primary/50 hover:border-primary hover:bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-primary/5',
                      )}
                    >
                      <span className="flex min-w-0 items-start gap-1.5 sm:gap-2">
                        <ClubCrest
                          tag={row.club.tag}
                          crestUrl={row.club.crestUrl}
                          className="h-7 w-7 text-[10px] sm:h-8 sm:w-8"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-xs font-semibold leading-4 text-foreground">
                            {row.club.name}
                          </span>
                          <span className="mt-1 block break-all text-[9px] uppercase tracking-wide text-muted-foreground">
                            {row.club.tag}
                          </span>
                        </span>
                      </span>
                      {mine.has(row.club.tag) && (
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary">
                          {responds.has(row.club.tag) ? (
                            <Crown className="h-3 w-3 shrink-0" aria-hidden />
                          ) : (
                            <Shirt className="h-3 w-3 shrink-0" aria-hidden />
                          )}
                          {t(
                            responds.has(row.club.tag)
                              ? 'tournament.youRespond'
                              : 'tournament.youPlay',
                          )}
                        </span>
                      )}
                      <span className="mt-auto flex min-h-[30px] items-end pt-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
                          {row.status === 'reserved' ? (
                            <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
                          ) : (
                            <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                          )}
                          {t(
                            row.status === 'reserved'
                              ? 'tournament.registrationReserved'
                              : 'tournament.registeredConfirmedClub',
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p role="status" className="text-xs text-muted-foreground">
              {expanded && matches.length === 0
                ? t('tournament.registeredNoResults')
                : t('tournament.registeredResults', {
                    count: visible.length,
                    total: registrations.length,
                  })}
            </p>
            {canExpand && (
              <Button
                variant="ctaOutline"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                aria-expanded={expanded}
                aria-controls={id}
                onClick={() => {
                  setExpanded(!expanded);
                  setQuery('');
                  setFilter('all');
                }}
              >
                {expanded
                  ? t('tournament.registeredPreview')
                  : t('tournament.registeredShowAll', { count: registrations.length })}
                {expanded ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
