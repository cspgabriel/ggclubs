import { useTranslation } from 'react-i18next';
import { isGoals, onlyGoals, shootoutDecided } from '@/lib/goals';

export function PenaltiesFields({
  idPrefix,
  home,
  away,
  homePens,
  awayPens,
  onHome,
  onAway,
  disabled,
}: {
  idPrefix: string;
  home: string;
  away: string;
  homePens: string;
  awayPens: string;
  onHome: (v: string) => void;
  onAway: (v: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-2 w-full rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-xs text-foreground">{t('tournament.reportPenaltiesHint')}</p>
      <div className="flex flex-wrap items-end gap-3">
        <GoalsInput
          id={`${idPrefix}-home-pens`}
          label={`${t('tournament.reportHomePenalties')} · ${home}`}
          value={homePens}
          onChange={onHome}
          disabled={disabled}
        />
        <GoalsInput
          id={`${idPrefix}-away-pens`}
          label={`${t('tournament.reportAwayPenalties')} · ${away}`}
          value={awayPens}
          onChange={onAway}
          disabled={disabled}
        />
      </div>
      {isGoals(homePens) && isGoals(awayPens) && !shootoutDecided(homePens, awayPens) && (
        <p className="mt-2 text-xs text-amber-400">{t('tournament.reportPenaltiesTied')}</p>
      )}
    </div>
  );
}

export function GoalsInput({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1 block max-w-28 truncate text-[11px] text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(onlyGoals(e.target.value))}
        className="h-10 w-16 rounded-md border border-input bg-background px-2 text-center font-display ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
