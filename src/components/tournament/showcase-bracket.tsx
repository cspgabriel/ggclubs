import { useId, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SHOWCASE_BRACKET, showcaseMatchCard, showcaseTag, showcaseWinner } from '@/lib/showcase';
import { cn } from '@/lib/utils';
import { BracketMatch, Champion } from './knockout-bracket';
import { TournamentChoice } from './tournament-choice';
import './showcase-bracket.css';

/** Recorte encerrado, com as mesmas partidas e campeão do core. A navegação é só local. */
export function ShowcaseBracket({ className }: { className?: string }) {
  const { t } = useTranslation();
  const id = useId();
  const [phase, setPhase] = useState<'semi' | 'final'>('final');
  const rounds = SHOWCASE_BRACKET.filter((round) => round.key !== 'quarter');
  const clubs = new Map(
    Array.from({ length: 8 }, (_, i) => {
      const tag = showcaseTag(i + 1);
      return [tag, { tag, name: t('landing.showcaseTeam', { n: i + 1 }), crestUrl: null }];
    }),
  );
  const context = { clubs, mine: new Set<string>(), responds: new Set<string>() };
  const final = rounds.find((round) => round.key === 'final')!.matches[0]!;
  const champion = showcaseTag(final[showcaseWinner(final)].team);

  return (
    <section
      aria-label={t('landing.showcaseBracketAlt')}
      className={cn('showcase-bracket', className)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <span className="font-display text-xs uppercase">{t('landing.showcaseEdition')}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('landing.showcaseExample')}
        </span>
      </div>
      <nav className="showcase-phase-nav" aria-label={t('tournament.bracketRounds')}>
        {rounds.map((round) => (
          <TournamentChoice
            key={round.key}
            selected={phase === round.key}
            aria-pressed={phase === round.key}
            aria-controls={`${id}-${round.key}`}
            onClick={() => setPhase(round.key as 'semi' | 'final')}
          >
            {t(`tournament.round.${round.key}`)}
          </TournamentChoice>
        ))}
      </nav>
      <div className="showcase-tree">
        {rounds.map((round, roundIndex) => (
          <div
            key={round.key}
            id={`${id}-${round.key}`}
            className="showcase-round"
            data-selected={phase === round.key}
            data-final={round.key === 'final'}
          >
            <h3
              className={cn(
                'mb-3 flex items-center gap-2 text-xs font-semibold uppercase',
                round.key === 'final' ? 'text-amber-300' : 'text-muted-foreground',
              )}
            >
              {round.key === 'final' && <Trophy className="h-3.5 w-3.5" aria-hidden />}
              {t(`tournament.round.${round.key}`)}
            </h3>
            <div className="showcase-matches">
              {round.matches.map((match, index) => {
                const number = roundIndex === 0 ? index + 5 : 7;
                const card = showcaseMatchCard(match, number);
                return (
                  <div key={number} className="showcase-node">
                    <BracketMatch
                      compact
                      final={round.key === 'final'}
                      {...context}
                      slot={{
                        number,
                        match: card,
                        home: card.homeTag,
                        away: card.awayTag,
                        sources: null,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="showcase-winner" data-visible={phase === 'final'}>
          <Champion compact tag={champion} clubs={clubs} />
        </div>
      </div>
    </section>
  );
}
