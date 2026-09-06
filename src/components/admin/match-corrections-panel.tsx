import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MatchCard } from '@ggclubs/schemas';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { MatchCorrectionDialog } from './match-correction-dialog';
import { roundNamer } from '@/lib/round-name';

export function MatchCorrectionsPanel({
  matches,
  reload,
}: {
  matches: MatchCard[];
  reload: () => void;
}) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const nameOf = roundNamer(matches, t);
  const rows = matches.filter(
    (match) =>
      match.status !== 'cancelled' &&
      `${match.homeTag} ${match.awayTag} ${nameOf(match)}`
        .toLocaleLowerCase()
        .includes(term.toLocaleLowerCase()),
  );
  const current = matches.find((match) => match._id === selected);
  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">{t('correction.list')}</summary>
      <p className="my-3 text-xs text-muted-foreground">{t('correction.listHelp')}</p>
      <SearchField
        value={term}
        onChange={setTerm}
        label={t('correction.list')}
        placeholder={t('correction.list')}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        {t('competitionUx.filteredCount', {
          shown: rows.length,
          total: matches.filter((match) => match.status !== 'cancelled').length,
        })}
      </p>
      {rows.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{t('competitionUx.noMatches')}</p>
      )}
      <ul className="mt-3 max-h-80 divide-y overflow-y-auto">
        {rows.map((match) => (
          <li key={match._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0 text-xs">
              <p className="break-words font-semibold">
                {match.homeTag} × {match.awayTag}
              </p>
              <p className="text-muted-foreground">{nameOf(match)}</p>
            </div>
            <Button size="sm" variant="ctaOutline" onClick={() => setSelected(match._id)}>
              {t('correction.action')}
            </Button>
          </li>
        ))}
      </ul>
      {current && (
        <MatchCorrectionDialog
          matchId={current._id}
          roundLabel={nameOf(current)}
          onClose={() => setSelected(null)}
          onResolved={reload}
        />
      )}
    </details>
  );
}
