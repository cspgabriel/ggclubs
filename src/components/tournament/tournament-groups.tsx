import { orderedShowcaseEditions, tournamentShelfOf } from '@ggclubs/schemas';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TournamentCard } from './tournament-card';
import { TournamentSummary } from './tournament-summary';
import { SectionTitle } from '@/components/ui/section-title';
import { Button } from '@/components/ui/button';
import type { TournamentRecord } from '@/lib/api';

export function TournamentGroups({
  tournaments,
  href,
  hasMore = false,
  loadingMore = false,
  failed = false,
  loadMore,
}: {
  tournaments: TournamentRecord[];
  href: (slug: string) => string;
  hasMore?: boolean;
  loadingMore?: boolean;
  failed?: boolean;
  loadMore?: () => void;
}) {
  const { t } = useTranslation();
  const [historyCount, setHistoryCount] = useState(3);
  const ordered = orderedShowcaseEditions(tournaments);
  const groups = [
    ['signup', 'groupOpen'],
    ['soon', 'groupSoon'],
    ['playing', 'groupRunning'],
    ['waiting', 'groupWaiting'],
  ] as const;
  const history = ordered.filter((edition) => tournamentShelfOf(edition) === 'past');
  const hasHistory = history.length > 0;
  const firstOpportunity = ordered.find((edition) =>
    ['signup', 'soon'].includes(tournamentShelfOf(edition) ?? ''),
  );
  return (
    <div className="flex flex-col gap-8">
      {groups.map(([shelf, key]) => {
        const list = ordered.filter((edition) => tournamentShelfOf(edition) === shelf);
        if (!list.length) return null;
        return (
          <section key={shelf}>
            {/* **O número só aparece quando ele é o total** · com página por
                carregar, `list` é o que chegou até aqui e não o que existe, e o
                título anunciava o tamanho da página como se fosse a contagem da
                prateleira. É a mesma guarda que o histórico logo abaixo já
                fazia, e a assimetria entre os dois era o defeito. */}
            <SectionTitle>
              {t(`tournament.${key}`)}{' '}
              {!hasMore && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {list.length}
                </span>
              )}
            </SectionTitle>
            <ul className="grid gap-4 sm:grid-cols-2">
              {list.map((edition) => {
                const featured = edition === firstOpportunity;
                return (
                  <li
                    key={edition._id ?? edition.slug}
                    className={featured ? 'sm:col-span-2' : undefined}
                  >
                    <TournamentCard
                      tournament={edition}
                      href={href(edition.slug)}
                      featured={featured}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {hasHistory && (
        <section className="border-t border-border pt-6">
          <SectionTitle>
            {t('tournament.historyTitle')}{' '}
            {!hasMore && <span className="ml-2 text-xs font-normal text-muted-foreground">{history.length}</span>}
          </SectionTitle>
          <ul className="grid gap-2 sm:grid-cols-2">
            {history.slice(0, historyCount).map((edition) => (
              <li key={edition._id ?? edition.slug}>
                <TournamentSummary tournament={edition} href={href(edition.slug)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {(historyCount < history.length || hasMore || failed) && (
        <div>
          {failed && <p role="alert" className="mb-3 text-sm text-muted-foreground">{t('tournament.listFailureBody')}</p>}
          <Button variant="ghost" size="sm" disabled={loadingMore} onClick={() => {
            if (failed) { loadMore?.(); return; }
            setHistoryCount((count) => count + 12);
            if (historyCount >= history.length) loadMore?.();
          }}>
            {t(failed ? 'tournament.retry' : 'tournament.moreEditions')}
          </Button>
        </div>
      )}
    </div>
  );
}
