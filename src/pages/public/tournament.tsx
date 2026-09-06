import { ArrowLeft, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { Marquee } from '@/components/ui/marquee';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { TournamentSignUpCta } from '@/components/tournament/tournament-signup-cta';
import { TournamentView } from '@/components/tournament/tournament-view';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, SkeletonGroup } from '@/components/ui/skeleton';
import { clubUrl } from '@/lib/clubs';
import { appTournamentPath } from '@/lib/paths';
import { useAuth } from '@/lib/use-auth';
import { useTournament } from '@/lib/use-tournament';

/**
 * A página aberta de uma edição · **o link que circula no grupo, e por isso a
 * superfície de aquisição do produto.**
 *
 * **Quem já entrou não vê esta tela** · a rota manda pra dentro do app, onde a
 * mesma edição aparece com a navegação em volta e o painel de inscrever. É
 * exatamente o que a página do club faz, e pelo mesmo motivo: manter a pessoa
 * logada numa moldura de visitante é fazer o app parecer site.
 *
 * > **Eu tinha decidido o contrário**, com o argumento de que uma página só
 * > evitaria a segunda cópia · o Eduardo derrubou em 12/08/2026 e está certo. O
 * > que evita a cópia é o `TournamentView` ser um componente só; a moldura é
 * > outra coisa, e **as duas conversas são diferentes de propósito**: aqui a
 * > página convence quem não tem conta, lá ela opera pra quem já tem club.
 *
 * O conteúdo é o mesmo componente das duas; o que muda é o que vai nos slots.
 * Aqui: premiação, formato e **o que acontece se não encher** vêm antes de
 * qualquer botão, e o botão promete o campeonato em vez do formulário.
 */
export function PublicTournamentPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const { user, loading: session } = useAuth();
  const { tournament, registrations, matches, clubs, loading, failure, errorMessage, reload } =
    useTournament(slug);

  // **Espera o Firebase antes de decidir** · sem isso o visitante logado veria a
  // moldura de fora por um quadro antes de ser mandado pra dentro.
  if (!session && user) return <Navigate to={appTournamentPath(slug)} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead
        title={`${tournament?.name ?? t('tournament.listTitle')} · ${t('common.brandName')}`}
        description={
          tournament
            ? t('tournament.seoDescription', { name: tournament.name })
            : t('tournament.listSubtitle')
        }
        ogImage={tournament?.crestUrl ?? undefined}
      />
      <SiteHeader actions={<PublicHeaderActions withSignUp />} />

      <main className="container flex-1 py-8 sm:py-12">
        {/**
         * **A saída, e ela faltava aqui** · 19/08/2026, apontado pelo Eduardo.
         *
         * O gêmeo de dentro do app tem a volta pra lista desde 12/08 e **este
         * não tinha** · é o defeito que o `CLAUDE.md` descreve por escrito: as
         * duas telas divergem porque quem constrói está olhando a de dentro, e
         * a pública só é aberta por quem chega de fora.
         *
         * **E aqui ela vale mais do que lá.** Quem cai neste link veio do
         * Discord e não sabe que existem outras edições · sem a saída, a única
         * porta pro resto do produto é o cabeçalho, que leva pra landing e não
         * pro catálogo. É o funil vazando na tela de aquisição.
         */}
        <Link
          to="/campeonatos"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('tournament.backToList')}
        </Link>

        {loading && <TournamentSkeleton />}

        {!loading && failure === 'notFound' && (
          <EmptyState
            icon={Trophy}
            title={t('tournament.notFoundTitle')}
            description={t('tournament.notFoundBody')}
            action={{ to: '/campeonatos', label: t('tournament.listTitle') }}
          />
        )}

        {/* **A falha só toma a tela quando não há o que mostrar** · pendência 176.
            Com a edição já carregada, um blip na revalidação apagava a chave
            inteira embaixo de quem estava lendo. */}
        {!loading && failure === 'error' && !tournament && (
          <EmptyState
            icon={Trophy}
            title={t('tournament.failureTitle')}
            description={errorMessage ?? ''}
            action={{ onClick: reload, label: t('tournament.retry') }}
          />
        )}

        {/* **Uma coluna só, desde 18/08/2026** · a `aside` de 20rem levava as
            datas e deixava ~5.000px de coluna vazia a 1280. Elas subiram pra
            capa, que é onde o prazo pertence: junto do que a decisão custa, e
            não depois de treze telas de rolagem no celular. */}
        {/* `notFound` continua escondendo · ali não há edição nenhuma. */}
        {!loading && tournament && failure !== 'notFound' && (
          <div className="min-w-0">
            <TournamentView
              tournament={tournament}
              registrations={registrations}
              matches={matches}
              clubs={clubs}
              clubHref={clubUrl}
              join={<TournamentSignUpCta tournament={tournament} placement="top" />}
              footer={<TournamentSignUpCta tournament={tournament} placement="bottom" />}
            />
          </div>
        )}
      </main>

      {/* **A assinatura da marca, na tela do core** · 19/08/2026, apontado pelo
          Eduardo. O marquee rodava na landing, na página do club, na do player
          e no login · ou seja, em **quatro** telas públicas, e em nenhuma das
          duas de campeonato. As telas que não são o produto tinham a assinatura
          e as que são, não.

          > **Eu tinha rejeitado o marquee no discovery**, e o parecer continua
          > válido pro que foi proposto lá: uma tarja com **as datas da edição**
          > dentro, que a 320 mostra um item por vez e congela num fragmento com
          > `prefers-reduced-motion`. Dado operacional não vai em texto que anda.
          > Este aqui é o outro: a frase da marca, a mesma das outras quatro. */}
      <Marquee items={t('landing.marquee').split(' · ')} />

      <SiteFooter />
    </div>
  );
}

/**
 * A silhueta da página de uma edição.
 *
 * **Ela repete a geometria do conteúdo, e isso mudou em 19/08/2026** · eram
 * três retângulos de canto arredondado, e a página que chega é feita de peças
 * **chanfradas**: a capa, o painel de formato e os cartões de grupo. Silhueta
 * de forma diferente troca o vazio por um salto no instante em que o dado
 * chega, que é exatamente o que ela existe pra evitar.
 *
 * A ordem também é a da página de verdade: capa alta, o painel do formato, e
 * a chave em duas colunas a partir de `xl`.
 */
export function TournamentSkeleton() {
  return (
    <SkeletonGroup className="space-y-6">
      <SkeletonCard className="h-48 w-full" size="1.25rem" />
      <SkeletonCard className="h-36 w-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <SkeletonCard key={i} className="h-64" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
