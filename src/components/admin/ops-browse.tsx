import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/ui/search-field';
import { SelectField } from '@/components/ui/select-field';

export function OpsBrowse<T>({
  rows,
  nameOf,
  stateOf,
  options,
  allLabel,
  totals,
  note,
  children,
  stackTotals = false,
}: {
  rows: T[];
  nameOf: (row: T) => string;
  stateOf: (row: T) => string;
  options: { value: string; label: string }[];
  allLabel: string;
  totals: { label: string; value: string | number }[];
  note?: string;
  stackTotals?: boolean;
  children: (rows: T[]) => ReactNode;
}) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [state, setState] = useState('');
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const shown = rows.filter(
    (row) => (!state || stateOf(row) === state) && normalize(nameOf(row)).includes(normalize(term)),
  );
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {t('competitionUx.editionTotals')}
      </p>
      <dl
        className={
          stackTotals
            ? 'mt-2 grid grid-cols-1 divide-y rounded-lg border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0'
            : 'mt-2 grid grid-cols-3 divide-x rounded-lg border bg-card'
        }
      >
        {totals.map(({ label, value }) => (
          <div
            key={label}
            className={
              stackTotals
                ? 'flex min-w-0 items-center justify-between gap-3 px-3 py-2.5 sm:block'
                : 'min-w-0 px-3 py-3'
            }
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd
              className={
                stackTotals
                  ? 'shrink-0 font-display text-base tabular-nums sm:mt-1 sm:text-lg'
                  : 'mt-1 break-words font-display text-lg tabular-nums'
              }
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
        <SearchField
          label={t('competitionUx.searchClub')}
          placeholder={t('competitionUx.searchClub')}
          value={term}
          onChange={setTerm}
        />
        <SelectField
          label={allLabel}
          allLabel={allLabel}
          value={state}
          onChange={setState}
          options={options}
        />
      </div>
      <p className="my-2 text-xs text-muted-foreground" aria-live="polite">
        {t('competitionUx.filteredCount', { shown: shown.length, total: rows.length })}
      </p>
      {shown.length ? (
        children(shown)
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          {t('competitionUx.noMatches')}
        </p>
      )}
    </div>
  );
}
