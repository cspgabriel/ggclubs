import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { SeoHead } from '@/components/seo-head';
import { DesktopDownloadSection } from '@/components/desktop/download-section';
import { SiteFooter } from '@/components/site-footer';
import { Marquee } from '@/components/ui/marquee';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { TournamentClosing } from '@/components/tournament/tournament-closing';
import { TournamentGroups } from '@/components/tournament/tournament-groups';
import { TournamentHow } from '@/components/tournament/tournament-how';
import { TournamentProof } from '@/components/tournament/tournament-proof';
import { TournamentTerms } from '@/components/tournament/tournament-terms';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { SectionTitle } from '@/components/ui/section-title';
import { SkeletonCard, SkeletonGroup } from '@/components/ui/skeleton';
import { tournamentPath } from '@/lib/paths';
import { useAuth } from '@/lib/use-auth';
import { useTournamentList } from '@/lib/use-tournament';

/**
 * A lista aberta de edições · **ordenada por prazo, e não por novidade.**
 *
 * A ordem é a única que responde a pergunta de quem chega: *em qual ainda dá
 * tempo de entrar?*. Por criação, a edição que fecha amanhã cairia no fim porque
 * foi montada antes.
 *
 * **Quem já entrou não vê esta tela** · vai pra lista de dentro do app, como no
 * club e no player.
 *
 * ---
 *
 * **Ela vende pra quem chega DIRETO**, desde 03/09/2026. O link de
 * `/campeonatos` é o que circula no Discord, então a maior parte de quem abre
 * esta tela nunca viu a landing · e até aqui ela era só a lista: quem descia
 * até o último card ficava sem saber quanto custa, o que acontece se não
 * encher, nem o que fazer em seguida. As três respostas moram embaixo da
 * lista (a lista continua vindo primeiro, porque é o produto de verdade), e o
 * fecho é o mesmo da landing.
 */
export function PublicTournamentsPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { tournaments, proof, failed, refresh, hasMore, loadingMore, loadMore } = useTournamentList();

  if (!loading && user) return <Navigate to="/app/campeonatos" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead
        title={`${t('tournament.listTitle')} · ${t('common.brandName')}`}
        description={t('tournament.listSubtitlePublic')}
      />
      <SiteHeader actions={<PublicHeaderActions withSignUp />} />

      <main className="container flex-1 py-8 sm:py-12">
        {/**
         * **A pilha da tela, e o vão entre as seções, são do `PageStack`.**
         *
         * Aqui cada bloco era filho solto da `main`, e o vão existia por acaso:
         * a prova social trazia um `mt-8` próprio e o agrupamento não trazia
         * nada · 0px medidos a 390 e a 1280. Vão de página não é escolha de
         * quem desenha a tela.
         */}
        <PageStack>
          <PageHeader
            title={t('tournament.listTitle')}
            subtitle={t('tournament.listSubtitlePublic')}
          />

          {/**
           * **A prova social, na tela onde a objeção nasce** · é nesta tela que
           * alguém decide se entra, e *"isso funciona mesmo?"* é a pergunta que
           * ela precisa responder antes do primeiro card. Número que seria zero
           * não entra, e sem nenhum ela some.
           */}

          {tournaments === null && !failed && <ListSkeleton />}

          {/* **Falha de carregamento e ausência são coisas diferentes**, e
            juntá-las é o defeito que a página aberta do club já custou uma vez ·
            aqui ele afirmava, na superfície de aquisição, que o produto não tem
            campeonato nenhum. A falha só toma a tela quando não há lista
            (pendência 176). */}
          {failed && tournaments === null && (
            <EmptyState
              icon={Trophy}
              title={t('tournament.failureTitle')}
              description={t('tournament.listFailureBody')}
              action={{ onClick: refresh, label: t('tournament.retry') }}
            />
          )}

          {!failed && tournaments?.length === 0 && (
            <EmptyState
              icon={Trophy}
              title={t('tournament.emptyTitle')}
              description={t('tournament.emptyBodyPublic')}
              action={{ to: '/login?criar=1', label: t('common.createAccount') }}
            />
          )}

          {tournaments && tournaments.length ? (
            <TournamentGroups hasMore={hasMore} loadingMore={loadingMore} loadMore={loadMore} failed={failed} tournaments={tournaments} href={tournamentPath} />
          ) : null}
          <TournamentProof totals={proof} tournaments={tournaments} failed={failed} compact />

          {/**
           * **Preço, escada e reembolso só depois de saber se há edição** · a
           * peça lê o preço da edição em destaque, e enquanto a lista não
           * chegou ela cairia pra regra geral e trocaria de frase um instante
           * depois. Com a busca falhando ela entra assim mesmo: a regra geral é
           * verdade sem edição nenhuma.
           */}
          {(tournaments !== null || failed) && (
            <section>
              <SectionTitle hint={t('landing.pillarPrizeBody')}>
                {t('landing.termsTitle')}
              </SectionTitle>
              <TournamentTerms tournaments={tournaments} general />
            </section>
          )}

          <section>
            <SectionTitle>{t('landing.tournamentsHowTitle')}</SectionTitle>
            <TournamentHow />
          </section>
        </PageStack>
      </main>

      {/**
       * **O app entra AQUI e não mais acima** · pedido do Eduardo em 03/09/2026,
       * e a posição é a decisão.
       *
       * Quem abre esta tela veio ver campeonato · o app é o jeito de acompanhar
       * um, então ele só faz sentido depois de a pessoa ter visto o que há pra
       * acompanhar. Oferecer antes seria vender o secundário na frente do
       * principal, que é o erro que a landing acabou de desfazer no hero.
       *
       * **A peça é a mesma da landing** · ela já se esconde sozinha fora do
       * Windows, então quem está no celular não vê oferta de `.exe`.
       */}
      <DesktopDownloadSection />

      {/* **O fecho é o mesmo da landing**, e até 03/09/2026 esta tela não tinha
          nenhum · o header carrega o cadastro contornado, e o sólido da tela é
          este, depois de a pessoa ter visto a lista inteira. */}
      <TournamentClosing />

      {/* **A assinatura da marca, na tela do core** · 19/08/2026, apontado pelo
          Eduardo. O marquee rodava em quatro telas públicas e em nenhuma das
          duas de campeonato. */}
      <Marquee items={t('landing.marquee').split(' · ')} />

      <SiteFooter />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <SkeletonGroup className="grid gap-4 sm:grid-cols-2">
      {/* O corte acompanha o do cartão que vai entrar aqui · 1,25rem no
          destacado e 0,9rem nos demais. */}
      <SkeletonCard className="h-52 sm:col-span-2" size="1.25rem" />
      <SkeletonCard className="h-44" />
      <SkeletonCard className="h-44" />
    </SkeletonGroup>
  );
}

export { PublicTournamentsPage as TournamentsPage };
