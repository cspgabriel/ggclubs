import { SelectField } from '@/components/ui/select-field';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { knockoutRoundKey, type MatchCard } from '@ggclubs/schemas';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Medal,
  Shirt,
  Trophy,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ClubCrest } from '@/components/club/club-crest';
import type { RegistrationCard } from '@/lib/api';
import { bracketWinner, knockoutTree, type BracketSlot } from '@/lib/knockout-tree';
import { formatMatchTime } from '@/lib/tournament-format';
import { cn } from '@/lib/utils';
import './knockout-bracket.css';
import { TournamentScore } from './tournament-score';
import { TournamentChoice } from './tournament-choice';

type Clubs = Map<string, RegistrationCard['club']>;
interface Context {
  clubs: Clubs;
  mine: Set<string>;
  responds: Set<string>;
}

export function KnockoutBracket({ matches, ...context }: Context & { matches: MatchCard[] }) {
  const { t } = useTranslation();
  const headingId = useId();
  const [chosenRound, setChosenRound] = useState<number | null>(null);
  const [path, setPath] = useState('');
  const myTags = [...context.mine].filter((tag) =>
    matches.some((match) => match.homeTag === tag || match.awayTag === tag),
  );
  const selectedPath = myTags.includes(path) ? path : '';
  const rounds = knockoutTree(matches);
  if (!rounds.length) return null;

  const final = rounds.at(-1)!;
  const finalSlot = final.slots[0]!;
  const winner = bracketWinner(finalSlot.match);
  const champion = winner ? finalSlot[winner] : null;
  const thirdPlace = matches.find((match) => match.thirdPlace) ?? null;
  const current =
    rounds.find((round) => round.slots.some((slot) => !bracketWinner(slot.match))) ?? final;
  const selected = rounds.find((round) => round.round === chosenRound) ?? current;
  const nameOfRound = (teams: number) => t(`tournament.round.${knockoutRoundKey(teams)}`);
  const firstCount = rounds[0]!.slots.length;
  const boardStyle = {
    '--bracket-rounds': rounds.length,
    '--bracket-rows': firstCount * 2,
  } as CSSProperties;

  const third = thirdPlace && (
    <section className="bracket-third" aria-label={t('tournament.round.thirdPlace')}>
      <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-amber-500">
        <Medal className="h-4 w-4" aria-hidden />
        {t('tournament.round.thirdPlace')}
      </h4>
      <BracketMatch
        slot={{
          number: 0,
          match: thirdPlace,
          home: thirdPlace.homeTag,
          away: thirdPlace.awayTag,
          sources: null,
        }}
        {...context}
        medal
      />
    </section>
  );

  return (
    <section data-knockout className="knockout-stage" aria-labelledby={headingId}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
            <Trophy className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3
              id={headingId}
              className="font-display text-base uppercase tracking-tight sm:text-lg"
            >
              {t('tournament.bracketTitle')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('tournament.bracketSummary', { clubs: firstCount * 2, count: rounds.length })}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'flex items-center gap-1.5 text-xs',
            champion ? 'text-amber-300' : 'text-muted-foreground',
          )}
        >
          {champion && <Check className="h-3.5 w-3.5" aria-hidden />}
          {champion ? t('tournament.bracketComplete') : nameOfRound(current.teams)}
        </span>
      </header>

      {myTags.length > 0 && (
        <div className="border-b px-4 py-3 sm:px-5">
          <SelectField
            label={t('competitionUx.choosePath')}
            value={selectedPath}
            onChange={setPath}
            allLabel={t('competitionUx.fullBracket')}
            options={myTags.map((tag) => ({
              value: tag,
              label: `${t('competitionUx.myPath')} · ${context.clubs.get(tag)?.name ?? tag}`,
            }))}
          />
        </div>
      )}
      {selectedPath ? (
        <div className="p-4 sm:p-5">
          <p className="mb-4 text-xs text-muted-foreground">{t('competitionUx.pathHelp')}</p>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rounds.flatMap((round) =>
              round.slots
                .filter(
                  (slot) =>
                    slot.match && (slot.home === selectedPath || slot.away === selectedPath),
                )
                .map((slot) => (
                  <li key={slot.match!._id}>
                    <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                      {nameOfRound(round.teams)}
                    </h4>
                    <BracketMatch slot={slot} {...context} final={round.teams === 2} />
                  </li>
                )),
            )}
            {thirdPlace &&
              (thirdPlace.homeTag === selectedPath || thirdPlace.awayTag === selectedPath) && (
                <li>{third}</li>
              )}
          </ol>
        </div>
      ) : (
        <>
          <div className="bracket-overview">
            <BracketScroll>
              <div className="bracket-board" style={boardStyle}>
                {rounds.map(({ round, teams, slots }, index) => (
                  <div
                    key={round}
                    className="bracket-column"
                    data-first={index === 0 || undefined}
                    data-last={teams === 2 || undefined}
                  >
                    {slots.map((slot, position) => (
                      <div
                        key={slot.number}
                        className={cn(
                          'bracket-node',
                          teams === 2 && third && 'bracket-node-with-third',
                        )}
                        data-odd={position % 2 === 1 || undefined}
                        style={{
                          gridRow: `${position * 2 ** (index + 1) + 1} / span ${2 ** (index + 1)}`,
                        }}
                      >
                        <div className="relative w-full">
                          {position === 0 && (
                            <h4
                              className={cn('bracket-round-label', teams === 2 && 'text-amber-300')}
                            >
                              <span className="font-display text-muted-foreground/60">
                                {String(round).padStart(2, '0')}
                              </span>
                              {nameOfRound(teams)}
                              {teams === 2 && <Trophy className="h-3.5 w-3.5" aria-hidden />}
                            </h4>
                          )}
                          <BracketMatch slot={slot} {...context} final={teams === 2} />
                        </div>
                        {teams === 2 && third && (
                          <div className="bracket-third-position">{third}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="bracket-destination">
                  <Champion tag={champion} clubs={context.clubs} />
                </div>
              </div>
            </BracketScroll>
          </div>

          <div className="bracket-mobile">
            <nav className="bracket-round-nav" aria-label={t('tournament.bracketRounds')}>
              {rounds.map((round) => (
                <TournamentChoice
                  key={round.round}
                  selected={selected.round === round.round}
                  compact
                  aria-pressed={selected.round === round.round}
                  aria-label={nameOfRound(round.teams)}
                  onClick={() => setChosenRound(round.round)}
                >
                  <span className="bracket-step" aria-hidden>
                    {round.slots.every((slot) => bracketWinner(slot.match)) ? (
                      <Check className="h-3 w-3.5" />
                    ) : (
                      String(round.round).padStart(2, '0')
                    )}
                  </span>
                  <span>{t(`tournament.bracketShortRound.${knockoutRoundKey(round.teams)}`)}</span>
                </TournamentChoice>
              ))}
            </nav>
            <div className="p-3 sm:p-5" aria-live="polite">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4
                    className={cn(
                      'font-display text-lg uppercase',
                      selected.teams === 2 && 'text-amber-300',
                    )}
                  >
                    {nameOfRound(selected.teams)}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('tournament.roundMatches', { count: selected.slots.length })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="bracket-round-arrow"
                    aria-label={t('tournament.bracketPrevious')}
                    disabled={selected.round === 1}
                    onClick={() => setChosenRound(selected.round - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="bracket-round-arrow"
                    aria-label={t('tournament.bracketNext')}
                    disabled={selected.round === final.round}
                    onClick={() => setChosenRound(selected.round + 1)}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div
                className={cn('grid grid-cols-1 gap-3', selected.teams > 2 && 'sm:grid-cols-2')}
                data-bracket-mobile-round={selected.round}
              >
                {selected.slots.map((slot) => (
                  <BracketMatch
                    key={slot.number}
                    slot={slot}
                    {...context}
                    final={selected.teams === 2}
                  />
                ))}
              </div>
              {selected.teams === 2 ? (
                <div className="mt-5 flex flex-col gap-5">
                  {third}
                  <Champion tag={champion} clubs={context.clubs} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setChosenRound(selected.round + 1)}
                  className="mt-4 flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-left text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  <span>
                    {t('tournament.bracketNextStage', {
                      round: nameOfRound(rounds[selected.round]!.teams),
                    })}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function BracketScroll({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = () => {
    const node = ref.current;
    if (node)
      setEdges({
        left: node.scrollLeft > 1,
        right: node.scrollLeft + node.clientWidth < node.scrollWidth - 1,
      });
  };
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, []);
  const move = (direction: -1 | 1, end = false) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({
      left: direction * (end ? node.scrollWidth : node.clientWidth * 0.75),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };
  return (
    <>
      {(edges.left || edges.right) && (
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-2">
          <p className="text-xs text-muted-foreground">{t('tournament.bracketExplore')}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(1, true)}
              className="mr-2 text-xs text-primary"
              disabled={!edges.right}
            >
              {t('tournament.bracketSeeFinal')}
            </button>
            <button
              type="button"
              className="bracket-round-arrow"
              aria-label={t('tournament.bracketScrollBack')}
              disabled={!edges.left}
              onClick={() => move(-1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="bracket-round-arrow"
              aria-label={t('tournament.bracketScrollForward')}
              disabled={!edges.right}
              onClick={() => move(1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
      <div
        ref={ref}
        onScroll={measure}
        className="bracket-scroll"
        tabIndex={0}
        role="region"
        aria-label={t('tournament.bracketOverview')}
      >
        {children}
      </div>
    </>
  );
}

export function BracketMatch({
  slot,
  final = false,
  medal = false,
  compact = false,
  ...context
}: Context & { slot: BracketSlot; final?: boolean; medal?: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  const { match } = slot;
  const winner = bracketWinner(match);
  const involvesMe = [slot.home, slot.away].some((tag) => tag && context.mine.has(tag));
  const status = !match
    ? t('tournament.bracketWaiting')
    : match.status === 'disputed'
      ? t('tournament.reportDisputed')
      : match.status === 'cancelled'
        ? t('tournament.bracketCancelled')
        : winner
          ? t('tournament.bracketSettled')
          : formatMatchTime(match.scheduledAt);

  return (
    <article
      data-bracket-match={match?._id}
      data-bracket-slot={slot.number}
      className={cn(
        'bracket-match',
        !match && 'bracket-match-pending',
        final && 'bracket-match-final',
        medal && 'bracket-match-third',
        involvesMe && 'bracket-match-mine',
      )}
    >
      <div className="flex min-h-6 items-center justify-between gap-2 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>
          {medal ? (
            <Medal className="h-3 w-3 text-amber-500" aria-hidden />
          ) : (
            t('tournament.bracketGame', { number: String(slot.number).padStart(2, '0') })
          )}
        </span>
        <span className={cn('text-right', match?.status === 'disputed' && 'text-amber-400')}>
          {status}
          {match?.penalties && <> · {t('tournament.bracketPenalties')}</>}
        </span>
      </div>
      {(['home', 'away'] as const).map((side, index) => (
        <BracketSide
          key={side}
          tag={slot[side]}
          source={slot.sources?.[index]}
          {...context}
          goals={match?.score?.[side] ?? null}
          penalties={match?.penalties?.[side] ?? null}
          won={winner === side}
          decided={winner !== null}
          final={final}
          compact={compact}
        />
      ))}
      {(match?.walkoverAgainst || (!match && (slot.home || slot.away))) && (
        <div className="flex min-h-5 items-center justify-end gap-2 border-t border-border/30 px-3 py-1 text-[9px] text-muted-foreground">
          {match?.walkoverAgainst && (
            <span className="text-amber-400">
              {t(
                match.walkoverAgainst === 'both'
                  ? 'tournament.walkoverBoth'
                  : 'tournament.walkoverBadge',
              )}
            </span>
          )}
          {!match && (slot.home || slot.away) && t('tournament.bracketQualifiedWaiting')}
        </div>
      )}
    </article>
  );
}

function BracketSide({
  tag,
  source,
  clubs,
  mine,
  responds,
  goals,
  penalties,
  won,
  decided,
  final,
  compact,
}: Context & {
  tag: string | null;
  source?: number;
  goals: number | null;
  penalties: number | null;
  won: boolean;
  decided: boolean;
  final: boolean;
  compact: boolean;
}) {
  const { t } = useTranslation();
  const club = tag ? clubs.get(tag) : undefined;
  const isMine = tag !== null && mine.has(tag);
  return (
    <div
      data-bracket-side={tag ?? undefined}
      className={cn(
        'bracket-side',
        won && 'bracket-side-winner',
        won && final && 'bracket-side-champion',
      )}
    >
      {tag ? (
        <ClubCrest
          tag={tag}
          crestUrl={club?.crestUrl}
          className={cn('text-[8px]', compact ? 'h-5 w-5' : 'h-7 w-7')}
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed border-border text-muted-foreground/50">
          <Shirt className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
      <span
        className={cn(
          'min-w-0 flex-1 break-words text-xs leading-4',
          tag ? 'font-semibold' : 'text-[11px] text-muted-foreground',
          decided && !won && 'text-muted-foreground',
        )}
      >
        {tag
          ? (club?.name ?? tag.toUpperCase())
          : source
            ? t('tournament.bracketWinnerOf', { number: String(source).padStart(2, '0') })
            : t('tournament.bracketPending')}
      </span>
      {isMine && (
        <span title={t('tournament.bracketYourClub')}>
          {responds.has(tag) ? (
            <Crown className="h-3 w-3 text-primary" aria-hidden />
          ) : (
            <Shirt className="h-3 w-3 text-primary" aria-hidden />
          )}
          <span className="sr-only">{t('tournament.bracketYourClub')}</span>
        </span>
      )}
      <TournamentScore
        goals={goals}
        penalties={penalties}
        won={won}
        champion={final}
        compact={compact}
      />
    </div>
  );
}

export function Champion({
  tag,
  clubs,
  compact = false,
}: {
  tag: string | null;
  clubs: Clubs;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section
      className={cn(
        'bracket-champion',
        tag && 'bracket-champion-decided',
        compact && 'bracket-champion-compact',
      )}
      aria-label={t('tournament.podiumFirst')}
    >
      <Trophy className="bracket-trophy-backdrop" aria-hidden />
      <p className="relative flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
        <Trophy className="h-3.5 w-3.5" aria-hidden />
        {t('tournament.podiumFirst')}
      </p>
      {tag ? (
        <>
          <ClubCrest
            tag={tag}
            crestUrl={clubs.get(tag)?.crestUrl}
            className={cn(
              'relative mx-auto',
              compact ? 'h-10 w-10 text-xs' : 'my-4 h-16 w-16 text-base',
            )}
          />
          <p
            className={cn(
              'relative break-words font-display uppercase leading-tight',
              compact ? 'text-sm' : 'text-lg',
            )}
          >
            {clubs.get(tag)?.name ?? tag.toUpperCase()}
          </p>
        </>
      ) : (
        <p className="relative mt-5 text-sm leading-relaxed text-muted-foreground">
          {t('tournament.bracketTrophyWaiting')}
        </p>
      )}
    </section>
  );
}
