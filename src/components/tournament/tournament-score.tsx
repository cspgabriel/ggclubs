import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import './tournament-score.css';

export function TournamentScore({
  goals,
  penalties = null,
  won = false,
  champion = false,
  compact = false,
}: {
  goals: number | null;
  penalties?: number | null;
  won?: boolean;
  champion?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'tournament-score',
        compact && 'tournament-score-compact',
        penalties !== null && 'tournament-score-penalties',
        won && 'text-primary',
        won && champion && 'text-amber-300',
      )}
    >
      <span aria-hidden={penalties !== null || undefined}>
        {goals ?? <span className="text-muted-foreground/35">·</span>}
      </span>
      {penalties !== null && (
        <>
          <span className="tournament-penalties" aria-hidden>
            ({penalties})
          </span>
          <span className="sr-only">
            {t('tournament.bracketScoreWithPenalties', {
              goals: goals ?? t('tournament.bracketPending'),
              penalties,
            })}
          </span>
        </>
      )}
      {won && <span className="sr-only">{t('tournament.bracketWinner')}</span>}
    </span>
  );
}
