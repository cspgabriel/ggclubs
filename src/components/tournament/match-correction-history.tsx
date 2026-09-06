import type { MatchCard } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { TournamentScore } from './tournament-score';

export function MatchCorrectionHistory({ entries = [] }: { entries?: MatchCard['corrections'] }) {
  const { t, i18n } = useTranslation();
  if (!entries.length) return null;
  return (
    <details className="mt-3 border-t border-border/60 pt-2">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        {t('correction.history')} · {entries.length}
      </summary>
      <ol className="mt-2 space-y-3">
        {[...entries].reverse().map((entry, index) => (
          <li key={index} className="rounded-md border border-border/60 p-3 text-xs">
            <p className="text-muted-foreground">
              {new Date(entry.at).toLocaleString(i18n.language, {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: 'America/Sao_Paulo',
              })}{' '}
              · {t('chat.brasiliaTime')}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(['before', 'after'] as const).map((side) => (
                <div key={side}>
                  <p className="mb-1 text-muted-foreground">
                    {side === 'before' ? t('correction.before') : t('correction.after')}
                  </p>
                  {entry[side].score ? (
                    <p className="flex items-center gap-1 font-semibold">
                      <TournamentScore
                        goals={entry[side].score.home}
                        penalties={entry[side].penalties?.home}
                        compact
                      />{' '}
                      ×{' '}
                      <TournamentScore
                        goals={entry[side].score.away}
                        penalties={entry[side].penalties?.away}
                        compact
                      />
                      {entry[side].status === 'walkover' && <span>{t('chat.walkoverShort')}</span>}
                    </p>
                  ) : (
                    <span>{t('correction.noOfficial')}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 break-words">{entry.reason}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
