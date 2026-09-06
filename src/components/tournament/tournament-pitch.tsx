import type { TournamentProofTotals } from '@ggclubs/schemas';
import { featuredEdition, orderedShowcaseEditions, tournamentShelfOf } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { TournamentCard } from './tournament-card';
import { TournamentSummary } from './tournament-summary';
import { TournamentHow } from './tournament-how';
import { TournamentProof } from './tournament-proof';
import { SkeletonBar } from '@/components/ui/skeleton';
import type { TournamentRecord } from '@/lib/api';
import { tournamentPath } from '@/lib/paths';

export function TournamentPitch({
  tournaments,
  failed = false,
  proof,
}: {
  tournaments: TournamentRecord[] | null;
  failed?: boolean;
  proof?: TournamentProofTotals | undefined;
}) {
  const { t } = useTranslation();
  const { edition, stage } = featuredEdition(tournaments);
  if ((failed && tournaments === null) || (tournaments !== null && !edition)) return null;
  const opportunity = stage === 'signup' || stage === 'soon';
  const ordered = orderedShowcaseEditions(tournaments ?? []);
  const playing = ordered.find((one) => tournamentShelfOf(one) === 'playing' && one !== edition);
  const past =
    stage === 'past'
      ? undefined
      : ordered.find((one) => tournamentShelfOf(one) === 'past' && one !== edition);
  const supporting = (playing || past) && (
    <div className="grid items-start gap-3 sm:grid-cols-2 lg:gap-8">
      {playing && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground sm:hidden">
            {t('tournament.groupRunning')}
          </p>
          <TournamentSummary tournament={playing} href={tournamentPath(playing.slug)} />
        </div>
      )}
      {past && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground sm:hidden">
            {t('landing.tournamentsOverlinePast')}
          </p>
          <TournamentSummary tournament={past} href={tournamentPath(past.slug)} />
        </div>
      )}
    </div>
  );
  return (
    <section id="campeonatos" className="border-t border-border/60 bg-card/30">
      <div className="container py-10 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl uppercase leading-tight sm:text-3xl">
            {t(
              !edition
                ? 'nav.tournaments'
                : opportunity
                  ? 'landing.nextEditionTitle'
                  : stage === 'playing'
                    ? 'tournament.groupRunning'
                    : stage === 'waiting'
                      ? 'tournament.groupWaiting'
                      : 'tournament.historyTitle',
            )}
          </h2>
          <Link to="/campeonatos" className="text-xs font-semibold text-primary hover:underline">
            {t('landing.tournamentsCta')}
          </Link>
        </div>
        {tournaments === null ? (
          <SkeletonBar className="h-56 rounded-xl" />
        ) : (
          edition && (
            <div
              className={
                opportunity ? 'grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8' : undefined
              }
            >
              <div className="self-start">
                <TournamentCard
                  tournament={edition}
                  href={tournamentPath(edition.slug)}
                  featured={opportunity}
                />
              </div>
              {opportunity && (
                <div className="flex min-w-0 flex-col justify-between gap-4 lg:self-stretch lg:py-6">
                  <div className="lg:flex lg:flex-1 lg:flex-col">
                    <h3 className="mb-4 font-display text-lg uppercase">
                      {t('landing.tournamentsHowTitle')}
                    </h3>
                    <TournamentHow
                      compact
                      className="lg:flex lg:flex-1 lg:flex-col lg:justify-between"
                    />
                    <p className="mt-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                      {t('landing.howPlayer')}
                    </p>
                  </div>
                  <TournamentProof totals={proof} tournaments={tournaments} failed={failed} compact />
                </div>
              )}
            </div>
          )
        )}
        {supporting && <div className="mt-6">{supporting}</div>}
        {!opportunity && (
          <TournamentProof totals={proof} className="mt-6" tournaments={tournaments} failed={failed} compact />
        )}
      </div>
    </section>
  );
}
