import {
  featuredEdition,
  orderedShowcaseEditions,
  tournamentShelfOf,
  TOURNAMENT_EVENT,
  tournamentTopic,
} from '@ggclubs/schemas';
import { ArrowRight, Plus, Shield, Trophy, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ClubCrest } from '@/components/club/club-crest';
import { TournamentCard } from '@/components/tournament/tournament-card';
import { TournamentSummary } from '@/components/tournament/tournament-summary';
import { MyTournament } from '@/components/tournament/my-tournament';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageStack } from '@/components/ui/page-stack';
import { SectionTitle } from '@/components/ui/section-title';
import { SkeletonBar, SkeletonCard, SkeletonGroup } from '@/components/ui/skeleton';
import { entryBlockerFor, MAX_CLUBS_PER_PLAYER, ROLE_KEY } from '@/lib/clubs';
import { appClubPath, appPlayerPath, appTournamentPath } from '@/lib/paths';
import { useAuth } from '@/lib/use-auth';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useTournamentList } from '@/lib/use-tournament';
import { cn } from '@/lib/utils';

/** O jogo pessoal vem antes da descoberta; a coluna de clubs orienta a primeira visita. */
export function AppHomePage() {
  const { t } = useTranslation();
  const { account } = useAuth();
  const { clubs, status, reload, ledClub, atCap } = useMyClubs();
  const { tournaments, failed, refresh } = useTournamentList();
  useDocumentTitle(t('home.title'));
  const { edition: featured, stage } = featuredEdition(tournaments);
  const opportunity = stage === 'signup' || stage === 'soon';
  const others = orderedShowcaseEditions(tournaments ?? [])
    .filter(
      (one) =>
        one._id !== featured?._id &&
        ['signup', 'soon', 'playing', 'waiting'].includes(tournamentShelfOf(one) ?? ''),
    )
    .slice(0, 2);
  const blocker = entryBlockerFor(clubs);
  const noClubs = clubs !== null && clubs.length === 0;
  // **Quem pode criar um club é o provider quem diz** · esta é a quinta porta
  // de criar club do produto, e redescobrir a regra aqui (liderança mais teto)
  // era a cópia que ficaria pra trás na próxima vez que ela mudasse, como em
  // 03/09 quando o gerente passou a contar como líder.
  const canCreate = ledClub === null && !atCap;
  const needsLeader = blocker === 'not-lead' && stage === 'signup';
  /**
   * **Declara os tipos, e não ouve "algo mudou"** · regra do
   * `docs/tempo-real.md`, e esta era a única tela que a furava. O card em
   * destaque é o único do produto que ouve, porque o argumento dele é a vaga
   * que sobra · o dia em que a edição publicar um terceiro tipo, quem ouve
   * "tudo" passa a rebuscar a lista por ele sem ninguém decidir isso.
   */
  useRealtimeRefresh(
    featured ? tournamentTopic(featured._id) : null,
    [TOURNAMENT_EVENT.registrations, TOURNAMENT_EVENT.status],
    refresh,
  );

  const showcase = (
    <section className="min-w-0">
      <SectionTitle
        aside={
          // Só com edição pra listar · no esqueleto, na lista vazia e na falha
          // o link levaria pra mesma origem que acabou de não responder.
          (tournaments?.length ?? 0) > 0 && (
            <Link
              to="/app/campeonatos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              {t('home.allTournaments')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )
        }
      >
        {t(
          !featured || opportunity
            ? 'home.nextTournament'
            : stage === 'playing'
              ? 'tournament.groupRunning'
              : stage === 'waiting'
                ? 'tournament.groupWaiting'
                : 'tournament.historyTitle',
        )}
      </SectionTitle>
      {tournaments === null && !failed && <SkeletonCard className="h-80 w-full" size="1.25rem" />}
      {tournaments === null && failed && (
        <EmptyState
          icon={Trophy}
          title={t('tournament.failureTitle')}
          description={t('tournament.listFailureBody')}
          action={{ onClick: refresh, label: t('tournament.retry') }}
        />
      )}
      {tournaments !== null && !featured && (
        <div className="rounded-xl border border-dashed border-border p-6">
          <Trophy className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">{t('home.noTournament')}</p>
        </div>
      )}
      {featured && (
        <TournamentCard
          tournament={featured}
          href={appTournamentPath(featured.slug)}
          featured={opportunity}
        />
      )}
      {needsLeader && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          {/* No teto sem cargo nenhum não há botão possível · a frase tem que
              dizer a saída, senão manda clicar num botão que não existe. */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {atCap
              ? t('home.needOwnClubAtCap', { max: MAX_CLUBS_PER_PLAYER })
              : t('home.needOwnClub')}
          </p>
          {canCreate && (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/app/clubs/novo">{t('tournament.createClub')}</Link>
            </Button>
          )}
        </div>
      )}
      {others.length > 0 && (
        <ul className="mt-3 space-y-3">
          {others.map((tournament) => (
            <li key={tournament._id}>
              <TournamentSummary
                tournament={tournament}
                href={appTournamentPath(tournament.slug)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
  const clubPanel = (
    // **Uma ordem só no DOM** · sem elenco, o painel vem primeiro no celular e
    // continua à direita no desktop. Trocar os filhos no JSX fazia o React
    // desmontar as duas colunas no instante em que `clubs` resolvia de `null`
    // pra `[]`, e as classes de grade existiam só pra desfazer a troca.
    <div className={cn('min-w-0 space-y-6', noClubs && 'max-lg:order-first')}>
      <section>
        <SectionTitle>{t(noClubs ? 'home.getStarted' : 'home.yourClubs')}</SectionTitle>
        {clubs === null && status !== 'error' && (
          <SkeletonGroup className="space-y-3">
            <SkeletonBar className="h-20 rounded-xl" />
            <SkeletonBar className="h-20 rounded-xl" />
          </SkeletonGroup>
        )}
        {clubs === null && status === 'error' && (
          <EmptyState
            icon={Shield}
            title={t('home.clubsError')}
            action={{ onClick: reload, label: t('tournament.retry') }}
          />
        )}
        {noClubs && (
          <div className="rounded-xl border border-border bg-card p-5">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="font-display text-lg uppercase text-foreground">
              {t('home.findYourTeam')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('home.needClub')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="cta" size="sm">
                <Link to="/app/clubs/novo">
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                  {t('home.newClub')}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/clubs">{t('home.findClub')}</Link>
              </Button>
            </div>
            <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              {t('home.playerHint')}
            </p>
          </div>
        )}
        {clubs && !noClubs && (
          <ul className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
            {clubs.map((club) => (
              <li key={club._id}>
                <Link
                  to={appClubPath(club.tag)}
                  className="group flex min-w-0 items-center gap-3 p-4 transition-colors hover:bg-secondary/40"
                >
                  <ClubCrest
                    tag={club.tag}
                    crestUrl={club.crestUrl}
                    className="h-11 w-11 shrink-0 text-xs"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
                      {club.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t(ROLE_KEY[club.role])}
                    </span>
                  </span>
                  {club.isPrimary && (
                    <Badge variant="default" size="sm">
                      {t('home.primary')}
                    </Badge>
                  )}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
            {!atCap && (
              <li>
                <Link
                  to={canCreate && !needsLeader ? '/app/clubs/novo' : '/app/clubs'}
                  className="flex items-center gap-2.5 p-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {t(canCreate && !needsLeader ? 'home.newClub' : 'home.joinAnotherClub')}
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>
      {!noClubs && (
        <section>
          <SectionTitle>{t('home.explore')}</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
            <Shortcut
              to="/app/clubs"
              icon={Shield}
              title={t('nav.clubs')}
              body={t('home.discoverClubs')}
            />
            <Shortcut
              to="/app/players"
              icon={Users}
              title={t('nav.players')}
              body={t('home.discoverPlayers')}
            />
          </div>
        </section>
      )}
    </div>
  );

  return (
    <PageStack>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl uppercase leading-tight text-foreground sm:text-3xl">
            {t('home.greeting', { name: firstName(account?.displayName) })}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(noClubs ? 'home.welcomeSubtitle' : 'home.subtitle')}
          </p>
        </div>
        {account?.handle && (
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to={appPlayerPath(account.handle)}>
              {t('home.viewProfile')}
              <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        )}
      </header>
      <MyTournament />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
        {showcase}
        {clubPanel}
      </div>
    </PageStack>
  );
}

function Shortcut({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof Shield;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 p-4 transition-colors hover:bg-secondary/40"
    >
      <Icon
        className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary"
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{body}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}

function firstName(displayName: string | undefined): string {
  return (displayName ?? '').trim().split(/\s+/)[0] ?? '';
}
