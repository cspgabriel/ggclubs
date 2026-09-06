import { MatchCorrectionHistory } from '@/components/tournament/match-correction-history';
import type { TournamentChatRow } from '@ggclubs/schemas';
import { Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { matchStateText } from '@/components/chat/chat-format';
import { TournamentScore } from '@/components/tournament/tournament-score';
import './match-chat-summary.css';

export function MatchChatSummary({
  status,
  result,
  claims = [],
  homeTag,
  awayTag,
  onShot,
}: {
  status: string;
  result?: TournamentChatRow['result'];
  claims?: TournamentChatRow['claims'];
  homeTag: string;
  awayTag: string;
  onShot: (url: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const final = status === 'played' || status === 'walkover';
  const official = final && result?.score;
  return (
    <div data-chat-summary className="mt-3 rounded-lg border bg-background/40 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-foreground">
          {official ? t('chat.officialResult') : matchStateText(t, status)}
        </span>
        {official && (
          <span className="chat-official-score flex items-center gap-2 font-display text-lg tabular-nums">
            {result.walkoverAgainst === 'both' ? (
              <span className="font-sans text-xs">{t('tournament.walkoverBoth')}</span>
            ) : (
              <>
                <TournamentScore goals={official.home} penalties={result.penalties?.home} compact />
                <span className="font-sans text-xs text-muted-foreground" aria-hidden>
                  ×
                </span>
                <TournamentScore goals={official.away} penalties={result.penalties?.away} compact />
                {status === 'walkover' && (
                  <span className="font-sans text-xs">{t('chat.walkoverShort')}</span>
                )}
              </>
            )}
          </span>
        )}
      </div>
      {status === 'disputed' && (
        <p className="mt-1 text-xs text-muted-foreground">{t('chat.disputeGuidance')}</p>
      )}
      {official && result.settledBy && (
        <p className="mt-1 text-xs text-muted-foreground">
          {result.settledBy === 'agreement'
            ? t('chat.agreedResult')
            : result.settledBy === 'timeout'
              ? t('tournament.settledTimeout')
              : t('tournament.settledAdmin')}
          {result.settledByInvolved && <> · {t('tournament.settledByInvolved')}</>}
        </p>
      )}
      {official && result.settledReason && (
        <p className="mt-1 break-words text-xs text-muted-foreground">{result.settledReason}</p>
      )}
      {official && result.settledAt && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {new Date(result.settledAt).toLocaleString(i18n.language, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          })}{' '}
          · {t('chat.brasiliaTime')}
        </p>
      )}
      <MatchCorrectionHistory entries={result?.corrections} />
      {claims.length > 0 && (
        <details key={status} open={!final} className="mt-2 border-t border-border/60 pt-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            {t('chat.declarations')}
          </summary>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('chat.scoreOrder', { home: homeTag.toUpperCase(), away: awayTag.toUpperCase() })}
          </p>
          <div className="mt-1 divide-y divide-border/40">
            {[homeTag, awayTag].map((tag) => {
              const claim = claims.find((one) => one.tag === tag);
              return (
                <div
                  key={tag}
                  className="flex min-h-8 items-center justify-between gap-2 py-1 text-xs"
                >
                  <span className="min-w-0 break-all font-semibold uppercase">{tag}</span>
                  {claim ? (
                    <div className="flex shrink-0 items-center gap-2">
                      {claim.noShow ? (
                        <span className="max-w-40 text-right text-muted-foreground">
                          {t('chat.reportedAbsence', {
                            club: (claim.noShow === 'home' ? homeTag : awayTag).toUpperCase(),
                          })}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <TournamentScore
                            goals={claim.homeGoals}
                            penalties={claim.penalties?.home}
                            compact
                          />
                          <span className="text-muted-foreground" aria-hidden>
                            ×
                          </span>
                          <TournamentScore
                            goals={claim.awayGoals}
                            penalties={claim.penalties?.away}
                            compact
                          />
                        </span>
                      )}
                      {claim.shotUrl && (
                        <button
                          type="button"
                          onClick={() => onShot(claim.shotUrl!)}
                          aria-label={t('chat.reportedShot', { club: tag.toUpperCase() })}
                          className="touch-target flex items-center gap-1 rounded px-1 text-muted-foreground hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t('chat.notReported')}</span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
