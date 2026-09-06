import { canDeclareMatch } from '@/lib/match-declaration';
import { useTranslation } from 'react-i18next';
import { useState, type ReactNode } from 'react';
import { SelectField } from '@/components/ui/select-field';
import { TournamentScore } from './tournament-score';
import { bracketWinner } from '@/lib/knockout-tree';
import { TournamentSections } from './tournament-sections';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
  knockoutRoundKey,
  qualificationOf,
  thirdsRace,
  type BracketSize,
  type MatchCard,
  type MatchPhase,
  type QualifyZone,
  type TournamentClubCard,
  type TournamentStatus,
} from '@ggclubs/schemas';
import { Check, ChevronDown, Flag, Handshake, Image as ImageIcon, Timer, X } from 'lucide-react';
import { ClubCrest } from '@/components/club/club-crest';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chamfer } from '@/components/ui/chamfer';
import { ImageViewer, useImageViewer } from '@/components/ui/image-viewer';
import { KnockoutBracket } from '@/components/tournament/knockout-bracket';
import { SectionTitle } from '@/components/ui/section-title';
import type { RegistrationCard } from '@/lib/api';
import { formatMatchTime } from '@/lib/tournament-format';
import { relativeTime } from '@/lib/relative-time';
import { cn } from '@/lib/utils';
import { GroupCard, ThirdsRace, ZoneLegend } from './tournament-standings.js';
import { ChatButton, MyMatch } from './tournament-my-match.js';
import { directoryOf, groupLetter, groupStandings, groupsOf } from './tournament-shared.js';
import { ClubLink } from './club-link.js';
import type { ClubDirectory, MatchChatting, MatchReporting } from './tournament-shared.js';

/**
 * A chave. · **A chave · as rodadas, as linhas de confronto e os dois lados.**
 *
 *
 *
 * > **Era um arquivo de 4.118 linhas até 01/09/2026** · o corte é a fase 2 do
 * > [arquitetura.md](../../../../docs/arquitetura.md), e o motivo dele está escrito
 * > lá: arquivo que ninguém lê inteiro é arquivo onde a exceção se esconde.
 */

/**
 * A chave · **e ela é a tela mais importante do produto no dia do sorteio.**
 *
 * O desenho responde **duas** perguntas na ordem em que elas aparecem, e a ordem
 * é a decisão: *"com quem eu caí"* (a lista do grupo, que vira a classificação
 * quando houver placar) e *"quando eu jogo"* (as rodadas, com horário). A
 * primeira versão desta tela só respondia a segunda, e o Eduardo apontou · **a
 * área de campeonato tinha herdado o desenho das telas de club, que são de
 * consulta, e campeonato é evento.**
 *
 * **Ela não desenha nada antes do sorteio**, e a ausência é a mesma regra da
 * escalação na página aberta do club: doze grupos vazios não informam nada e
 * fazem a edição parecer abandonada.
 *
 * **O que muda pra quem está logado é o destaque, e não o conteúdo** · a página
 * aberta mostra a chave inteira igual, porque ela é o cartaz da edição. Quem tem
 * club dentro ganha a linha acesa e a faixa do próximo jogo · é o que o rival
 * não consegue ter, porque lá não existe player.
 */
export function BracketPanel({
  matches,
  directory,
  registrations,
  clubHref,
  myClubTags,
  report,
  chat,
  size,
  status,
  thirdPlaceMatch,
  information,
}: {
  matches: MatchCard[];
  information?: ReactNode;
  directory: TournamentClubCard[];
  registrations: RegistrationCard[];
  clubHref: (tag: string) => string;
  myClubTags: string[];
  report?: MatchReporting;
  chat?: MatchChatting;
  status: TournamentStatus;
  thirdPlaceMatch: boolean;
  size: BracketSize | null;
}) {
  const { t } = useTranslation();
  const [groupFilter, setGroupFilter] = useState('');
  if (matches.length === 0) return null;
  const clubs = directoryOf(registrations, directory);
  const mine = new Set(myClubTags);
  const responds = new Set(report?.tags ?? []);
  const byPhase = new Map<MatchPhase, MatchCard[]>();
  for (const match of matches) {
    byPhase.set(match.phase, [...(byPhase.get(match.phase) ?? []), match]);
  }
  const phases = [...byPhase.entries()].sort(([a], [b]) =>
    a === 'group' ? -1 : b === 'group' ? 1 : 0,
  );
  const manyPhases = phases.length > 1;
  const qualified = new Set(
    matches.filter((m) => m.phase === 'knockout').flatMap((m) => [m.homeTag, m.awayTag]),
  );
  const repechage = new Set(
    qualified.size > 0 && size
      ? thirdsRace(
          groupsOf(matches.filter((m) => m.phase === 'group')).map(
            ([, list]) => groupStandings(list).table,
          ),
          size,
        )
          .filter((one) => one.qualifying)
          .map((one) => one.tag)
      : [],
  );
  const livePhase =
    status === 'cancelled' || status === 'finished'
      ? null
      : (phases.find(([, list]) =>
          list.some((m) => m.status === 'scheduled' || m.status === 'disputed'),
        )?.[0] ?? null);
  return (
    <section data-bracket>
      <MyMatch
        matches={matches}
        clubs={clubs}
        mine={mine}
        report={report}
        chat={chat}
        clubHref={clubHref}
        status={status}
        thirdPlaceMatch={thirdPlaceMatch}
      />
      <TournamentSections
        current={phases.at(-1)![0]}
        sections={[
          ...phases.map(([phase, phaseMatches]) => {
            const groups = groupsOf(phaseMatches);
            const tables = groups.map(([, groupMatches]) => groupStandings(groupMatches));
            const zones =
              phase === 'group' && size !== null && tables.some((x) => x.anyPlayed)
                ? qualificationOf(
                    tables.map((x) => x.table),
                    { directPerGroup: size.qualifiersPerGroup, bestOfNext: size.bestThirds },
                  )
                : new Map<string, QualifyZone>();
            const race =
              phase === 'group' &&
              size !== null &&
              size.bestThirds > 0 &&
              tables.some((x) => x.anyPlayed)
                ? thirdsRace(
                    tables.map((x) => x.table),
                    size,
                  )
                : [];
            return {
              key: phase,
              label: t(phase === 'group' ? 'tournament.groupsTitle' : 'tournament.phaseKnockout'),
              content: (
                <div key={phase} className={manyPhases ? 'mt-8 first:mt-0' : undefined}>
                  {manyPhases && (
                    <div className="mb-5 flex items-center gap-2">
                      <span aria-hidden className="h-6 w-1 rounded-full bg-primary" />
                      <h3 className="font-display text-lg uppercase tracking-tight text-foreground sm:text-xl">
                        {t(
                          phase === 'group' ? 'tournament.phaseGroup' : 'tournament.phaseKnockout',
                        )}
                      </h3>
                      {phase === livePhase && (
                        <Badge
                          variant="outline"
                          size="sm"
                          className="border-primary/40 text-primary"
                        >
                          {t('tournament.phaseLive')}
                        </Badge>
                      )}
                    </div>
                  )}
                  {phase === 'group' && (
                    <>
                      {groupFilter !== 'thirds' && (manyPhases ? (
                        <div className="mb-4">
                          <ZoneLegend zones={zones} />
                        </div>
                      ) : (
                        <SectionTitle aside={<ZoneLegend zones={zones} />}>
                          {t('tournament.standingsTitle')}
                        </SectionTitle>
                      ))}
                      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
                        <SelectField
                          className="min-w-0 flex-1 sm:max-w-xs"
                          label={t('competitionUx.chooseGroup')}
                          value={groupFilter}
                          onChange={setGroupFilter}
                          allLabel={t('competitionUx.allGroups')}
                          options={[
                            ...groups.map(([index]) => ({
                              value: String(index),
                              label: t('tournament.groupName', { name: groupLetter(index) }),
                            })),
                            ...(race.length
                              ? [{ value: 'thirds', label: t('competitionUx.bestThirds') }]
                              : []),
                          ]}
                        />
                        {groups
                          .filter(([, list]) =>
                            list.some(
                              (match) => mine.has(match.homeTag) || mine.has(match.awayTag),
                            ),
                          )
                          .map(([index]) => (
                            <Button
                              key={index}
                              size="sm"
                              variant={groupFilter === String(index) ? 'cta' : 'ctaOutline'}
                              onClick={() => setGroupFilter(String(index))}
                            >
                              {t('competitionUx.myGroup')} · {groupLetter(index)}
                            </Button>
                          ))}
                        {race.length > 0 && (
                          <Button
                            size="sm"
                            variant={groupFilter === 'thirds' ? 'cta' : 'ghost'}
                            onClick={() => setGroupFilter('thirds')}
                          >
                            {t('competitionUx.bestThirds')}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                  <div
                    className={cn(
                      'grid grid-cols-1 gap-4',
                      !groupFilter && 'xl:grid-cols-2',
                      (phase !== 'group' || groupFilter === 'thirds') && 'hidden',
                    )}
                  >
                    {groups.map(
                      ([groupIndex], i) =>
                        (!groupFilter || groupFilter === String(groupIndex)) && (
                          <GroupCard
                            key={groupIndex}
                            groupIndex={groupIndex}
                            clubs={clubs}
                            clubHref={clubHref}
                            mine={mine}
                            responds={responds}
                            qualified={qualified}
                            repechage={repechage}
                            standings={tables[i]!}
                            zones={zones}
                          />
                        ),
                    )}
                  </div>
                  {race.length > 0 && (!groupFilter || groupFilter === 'thirds') && (
                    <ThirdsRace
                      race={race}
                      clubs={clubs}
                      mine={mine}
                      responds={responds}
                      bestThirds={size?.bestThirds ?? 0}
                      decided={phaseMatches.every((m) => m.score !== null)}
                    />
                  )}
                  {phase === 'knockout' ? (
                    <section className="mt-4">
                      <KnockoutBracket
                        matches={phaseMatches}
                        clubs={clubs}
                        mine={mine}
                        responds={responds}
                      />
                    </section>
                  ) : (
                    <RoundList
                      matches={phaseMatches.filter(
                        (match) => !groupFilter || String(match.groupIndex) === groupFilter,
                      )}
                      clubs={clubs}
                      clubHref={clubHref}
                      mine={mine}
                      qualified={qualified}
                      repechage={repechage}
                      report={report}
                      chat={chat}
                      showGroup={groups.length > 1}
                    />
                  )}
                </div>
              ),
            };
          }),
          ...(information
            ? [{ key: 'information', label: t('tournament.informationTab'), content: information }]
            : []),
        ]}
      />
    </section>
  );
}
function RoundList({
  matches,
  clubs,
  clubHref,
  mine,
  qualified,
  repechage,
  report,
  chat,
  showGroup,
}: {
  matches: MatchCard[];
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
  mine: Set<string>;
  qualified?: Set<string>;
  repechage?: Set<string>;
  report?: MatchReporting;
  chat?: MatchChatting;
  showGroup: boolean;
}) {
  const { t } = useTranslation();
  const rounds = new Map<number, MatchCard[]>();
  for (const match of matches) {
    rounds.set(match.round, [...(rounds.get(match.round) ?? []), match]);
  }
  const ordered = [...rounds.entries()].sort(([a], [b]) => a - b);
  if (ordered.length === 0) return null;
  const liveRound =
    ordered.find(([, list]) =>
      list.some((m) => m.status === 'scheduled' || m.status === 'disputed'),
    )?.[0] ?? ordered[ordered.length - 1]?.[0];
  return (
    <section className="mt-8">
      <SectionTitle>{t('tournament.matchesTitle')}</SectionTitle>
      <Chamfer border="bg-border" innerClassName="bg-card">
        <AccordionPrimitive.Root
          type="single"
          collapsible
          defaultValue={liveRound !== undefined ? String(liveRound) : undefined}
        >
          {ordered.map(([round, roundMatches]) => (
            <AccordionPrimitive.Item key={round} value={String(round)}>
              <AccordionPrimitive.Header asChild>
                <p className="flex">
                  <AccordionPrimitive.Trigger className="flex w-full items-baseline gap-2 bg-background/40 px-4 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground [&[data-state=open]_svg]:rotate-180">
                    <span className="font-display text-xs text-foreground">
                      {roundMatches[0]?.phase === 'knockout'
                        ? t(`tournament.round.${knockoutRoundKey(roundMatches.length * 2)}`)
                        : t('tournament.roundName', { round })}
                    </span>
                    {formatMatchTime(roundMatches[0]!.scheduledAt)}
                    <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal">
                      {t('tournament.roundMatches', { count: roundMatches.length })}
                      <ChevronDown
                        aria-hidden
                        className="h-3.5 w-3.5 transition-transform duration-200"
                      />
                    </span>
                  </AccordionPrimitive.Trigger>
                </p>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down motion-reduce:animate-none">
                <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                  {roundMatches.map((match) => (
                    <li key={match._id} className="min-w-0">
                      <MatchRow
                        match={match}
                        clubs={clubs}
                        clubHref={clubHref}
                        mine={mine}
                        qualified={qualified}
                        repechage={repechage}
                        report={report}
                        chat={chat}
                        groupIndex={showGroup ? match.groupIndex : null}
                      />
                    </li>
                  ))}
                </ul>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </Chamfer>
    </section>
  );
}
function MatchRow({
  match,
  clubs,
  clubHref,
  mine,
  qualified,
  repechage,
  report,
  chat,
  groupIndex = null,
}: {
  match: MatchCard;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
  mine: Set<string>;
  qualified?: Set<string>;
  repechage?: Set<string>;
  report?: MatchReporting;
  chat?: MatchChatting;
  groupIndex?: number | null;
}) {
  const { t } = useTranslation();
  const myTag = mine.has(match.homeTag)
    ? match.homeTag
    : mine.has(match.awayTag)
      ? match.awayTag
      : null;
  const involvesMe = myTag !== null;
  const iReported = (myTag === match.homeTag ? match.homeClaim : match.awayClaim) !== null;
  const mineClaim = myTag === match.homeTag ? match.homeClaim : match.awayClaim;
  const viewer = useImageViewer();
  const nameOf = (tag: string) => clubs.get(tag)?.name ?? tag.toUpperCase();
  const walkoverText =
    match.walkoverAgainst === 'both'
      ? t('tournament.walkoverBothHint')
      : t('tournament.walkoverBadge');
  const walkover = match.walkoverAgainst ? (
    <span
      title={walkoverText}
      className="font-sans text-[10px] font-normal uppercase leading-none tracking-wide text-amber-400"
    >
      {t('tournament.walkoverBadge')}
      <span className="sr-only"> · {walkoverText}</span>
    </span>
  ) : null;
  const claims = (
    [
      ['home', match.homeClaim],
      ['away', match.awayClaim],
    ] as const
  ).flatMap(([side, claim]) => {
    if (!claim?.shotUrl) return [];
    const tag = side === 'home' ? match.homeTag : match.awayTag;
    return [
      {
        side,
        tag,
        url: claim.shotUrl,
        caption: t('tournament.shotOf', { club: nameOf(tag) }),
        detail: t('tournament.shotScore', {
          home: claim.homeGoals,
          away: claim.awayGoals,
          homeClub: nameOf(match.homeTag),
          awayClub: nameOf(match.awayTag),
        }),
      },
    ];
  });
  const reportFor =
    match.status === 'scheduled'
      ? ([match.homeTag, match.awayTag] as const).find(
          (tag) => (report?.tags.includes(tag) ?? false) && canDeclareMatch(match, tag),
        )
      : undefined;
  const hasChat = myTag !== null && (chat?.tags.includes(myTag) ?? false);
  const winner = bracketWinner(match);
  return (
    <div
      data-match-row
      className={cn(
        'overflow-hidden rounded-lg border bg-card',
        involvesMe ? 'border-primary/50' : 'border-border',
      )}
    >
      <div className="grid min-h-7 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>
          {groupIndex !== null
            ? t('tournament.groupName', { name: groupLetter(groupIndex) })
            : t('tournament.roundName', { round: match.round })}
        </span>
        <span className="text-center">
          {walkover ??
            (match.status === 'cancelled'
              ? t('tournament.bracketCancelled')
              : match.status === 'played'
                ? t('tournament.bracketSettled')
                : formatMatchTime(match.scheduledAt))}
        </span>
        {match.settledBy && (
          <span
            className={cn(
              'inline-flex items-center justify-self-end gap-0.5',
              match.settledBy === 'agreement' ? 'text-muted-foreground' : 'text-amber-400',
            )}
            title={[
              match.settledReason
                ? `${t('tournament.settledClosed')} · ${match.settledReason}`
                : t(
                    match.settledBy === 'agreement'
                      ? 'tournament.settledAgreement'
                      : match.settledBy === 'timeout'
                        ? 'tournament.settledTimeout'
                        : 'tournament.settledAdmin',
                  ),
              match.settledByInvolved ? t('tournament.settledByInvolved') : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          >
            {match.settledBy === 'agreement' ? (
              <Handshake className="h-3.5 w-3.5" aria-hidden />
            ) : match.settledBy === 'timeout' ? (
              <Timer className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Flag className="h-3.5 w-3.5" aria-hidden />
            )}
            {match.settledByInvolved && (
              <span className="text-amber-400" aria-hidden>
                *
              </span>
            )}
            <span className="sr-only">
              {t(
                match.settledBy === 'agreement'
                  ? 'tournament.settledAgreement'
                  : match.settledBy === 'timeout'
                    ? 'tournament.settledTimeout'
                    : match.settledReason
                      ? 'tournament.settledClosed'
                      : 'tournament.settledAdmin',
              )}
              {match.settledByInvolved ? ` · ${t('tournament.settledByInvolved')}` : ''}
            </span>
          </span>
        )}
      </div>
      {(['home', 'away'] as const).map((side) => (
        <MatchSide
          key={side}
          tag={side === 'home' ? match.homeTag : match.awayTag}
          clubs={clubs}
          clubHref={clubHref}
          mine={mine}
          qualified={qualified}
          repechage={repechage}
          goals={match.score?.[side] ?? null}
          penalties={match.penalties?.[side] ?? null}
          won={winner === side}
        />
      ))}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/40 px-3 py-2 empty:hidden">
        {reportFor && (
          <Button
            data-report-match
            size="sm"
            variant="ctaOutline"
            onClick={() => report?.open(match, reportFor)}
          >
            {t('tournament.reportAction')}
          </Button>
        )}
        {hasChat && <ChatButton match={match} chat={chat} iconOnly />}
        {!reportFor && involvesMe && iReported && match.status === 'scheduled' && (
          <span className="text-right text-[11px] leading-tight text-muted-foreground">
            {mineClaim ? (
              <>
                <span className="text-foreground">
                  {t('tournament.reportYours', {
                    home: mineClaim.homeGoals,
                    away: mineClaim.awayGoals,
                  })}
                </span>
                {match.deadline && (
                  <span className="block">
                    {t('tournament.reportCountsIn', {
                      when: relativeTime(match.deadline),
                    })}
                  </span>
                )}
              </>
            ) : (
              t('tournament.reportWaiting')
            )}
          </span>
        )}
        {match.status === 'disputed' && (
          <Badge variant="warning" size="sm">
            {t('tournament.reportDisputed')}
          </Badge>
        )}
        {claims.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              viewer.open(0);
            }}
            title={
              claims.length > 1
                ? t('tournament.shotsCount', { count: claims.length })
                : claims[0]?.caption
            }
            className={cn(
              'flex shrink-0 items-center gap-1 rounded border border-border/60 px-1.5 py-0.5',
              'text-[10px] font-semibold text-muted-foreground',
              'transition-colors hover:border-primary/40 hover:text-primary',
            )}
          >
            <ImageIcon className="h-3 w-3" aria-hidden />
            {claims.length > 1 && claims.length}
            <span className="sr-only">
              {claims.length > 1
                ? t('tournament.shotsCount', { count: claims.length })
                : (claims[0]?.caption ?? '')}
            </span>
          </button>
        )}
      </div>
      <ImageViewer
        images={claims}
        index={viewer.index}
        onIndexChange={viewer.move}
        onClose={viewer.close}
      />
    </div>
  );
}
function MatchSide({
  tag,
  qualified,
  repechage,
  clubs,
  clubHref,
  mine,
  goals,
  penalties,
  won,
}: {
  tag: string;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
  mine: Set<string>;
  qualified?: Set<string>;
  repechage?: Set<string>;
  goals?: number | null;
  penalties: number | null;
  won: boolean;
}) {
  const { t } = useTranslation();
  const club = clubs.get(tag);
  return (
    <ClubLink
      tag={tag}
      clubs={clubs}
      clubHref={clubHref}
      className={cn(
        'flex min-h-10 min-w-0 items-center gap-2 border-l-2 border-t border-t-border/30 pl-3 transition-colors hover:bg-secondary',
        won ? 'border-l-primary bg-primary/5' : 'border-l-transparent',
        mine.has(tag) && 'font-semibold text-primary',
      )}
    >
      <ClubCrest
        tag={tag}
        crestUrl={club?.crestUrl ?? null}
        className="h-7 w-7 shrink-0 text-[8px]"
      />
      <span className="min-w-0 flex-1 break-words py-2 text-xs font-semibold leading-4">
        {club?.name ?? tag.toUpperCase()}
      </span>
      {qualified &&
        qualified.size > 0 &&
        (qualified.has(tag) ? (
          <Check
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              repechage?.has(tag) ? 'text-amber-400' : 'text-primary',
            )}
            aria-label={t(
              repechage?.has(tag) ? 'tournament.qualifiedThird' : 'tournament.qualifiedTag',
            )}
          />
        ) : (
          <X
            className="h-3.5 w-3.5 shrink-0 text-destructive"
            aria-label={t('tournament.eliminatedTag')}
          />
        ))}
      <TournamentScore goals={goals ?? null} penalties={penalties} won={won} />
    </ClubLink>
  );
}
