import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ClubViewSkeleton } from '@/components/club/club-view-skeleton';
import { PlayerViewSkeleton } from '@/components/player/player-view-skeleton';
import { GuestRoute } from '@/components/guest-route';
import { ProtectedRoute } from '@/components/protected-route';
import { PublicPageFallback } from '@/components/public-page-fallback';
import { RouteErrorBoundary } from '@/components/route-error-boundary';
import { AuthProvider } from '@/lib/auth';
import { LoadingState } from '@/components/ui/loading-state';
import { activeLanguage } from '@/i18n';
import { LANGUAGE_BASENAME } from '@/i18n/language';
import { isDesktop } from '@/lib/platform';
import { CHANGELOG_PATH } from '@/lib/paths';
import { needsSession, withoutLanguagePrefix } from '@/lib/session-routes';
import { publicTwinOf } from '@/lib/public-twin';
import { LoginPage } from './login.js';
import { NotFoundPage } from './not-found.js';
import { DesktopWelcomePage } from './desktop/welcome.js';
import { LandingPage } from './public/landing.js';

/**
 * **O que entra no primeiro carregamento e o que espera ser pedido.**
 *
 * Ficam estáticos os quatro que a primeira visita pode precisar: a landing, a
 * porta do desktop, o login e o 404 · carregar o resto junto é fazer todo
 * visitante baixar telas que ele talvez nunca abra. O bundle estava em 782 KB
 * num arquivo só, e isso importa mais no site que no app instalado: **no
 * desktop o arquivo vem do disco, no celular vem pela rede toda visita.**
 *
 * O `/admin` é o caso extremo e a razão de a lista começar por ele: hoje todo
 * mundo baixa a tela que só admin usa.
 *
 * **A espera é o `LoadingState` que a casa já usa**, não um indicador novo · e
 * ela quase não aparece em rede boa, porque o pedaço é pequeno e vem do mesmo
 * host. Quando o editor de táticas existir, ele nasce aqui.
 */
const AdminLayout = lazy(() =>
  import('./admin/layout.js').then((m) => ({ default: m.AdminLayout })),
);
const AdminUsersPage = lazy(() =>
  import('./admin/users.js').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminLegalPage = lazy(() =>
  import('./admin/legal.js').then((m) => ({ default: m.AdminLegalPage })),
);
const AdminEaPage = lazy(() => import('./admin/ea.js').then((m) => ({ default: m.AdminEaPage })));
const AdminEmailsPage = lazy(() =>
  import('./admin/emails.js').then((m) => ({ default: m.AdminEmailsPage })),
);
const AdminOverviewPage = lazy(() =>
  import('./admin/overview.js').then((m) => ({ default: m.AdminOverviewPage })),
);
const AppLayout = lazy(() => import('./app/layout.js').then((m) => ({ default: m.AppLayout })));
const AppHomePage = lazy(() => import('./app/home.js').then((m) => ({ default: m.AppHomePage })));
const ClubDetailPage = lazy(() =>
  import('./app/club-detail.js').then((m) => ({ default: m.ClubDetailPage })),
);
const ClubNewPage = lazy(() =>
  import('./app/club-form.js').then((m) => ({ default: m.ClubNewPage })),
);
const ClubEditPage = lazy(() =>
  import('./app/club-form.js').then((m) => ({ default: m.ClubEditPage })),
);
const ClubsPage = lazy(() => import('./app/clubs.js').then((m) => ({ default: m.ClubsPage })));
const AccountPage = lazy(() =>
  import('./app/account.js').then((m) => ({ default: m.AccountPage })),
);
const PlayersPage = lazy(() =>
  import('./app/players.js').then((m) => ({ default: m.PlayersPage })),
);
const OnboardingPage = lazy(() =>
  import('./onboarding.js').then((m) => ({ default: m.OnboardingPage })),
);
const PublicClubPage = lazy(() =>
  import('./public/club.js').then((m) => ({ default: m.PublicClubPage })),
);
const PublicPlayerPage = lazy(() =>
  import('./public/player.js').then((m) => ({ default: m.PublicPlayerPage })),
);
const PlayerDetailPage = lazy(() =>
  import('./app/player-detail.js').then((m) => ({ default: m.PlayerDetailPage })),
);
const LegalPage = lazy(() => import('./public/legal.js').then((m) => ({ default: m.LegalPage })));
const DownloadPage = lazy(() =>
  import('./public/download.js').then((m) => ({ default: m.DownloadPage })),
);
const ChangelogPage = lazy(() =>
  import('./public/changelog.js').then((m) => ({ default: m.ChangelogPage })),
);
const UnsubscribePage = lazy(() =>
  import('./public/unsubscribe.js').then((m) => ({ default: m.UnsubscribePage })),
);
const ResetPasswordPage = lazy(() =>
  import('./public/reset-password.js').then((m) => ({ default: m.ResetPasswordPage })),
);
const PublicTournamentPage = lazy(() =>
  import('./public/tournament.js').then((m) => ({ default: m.PublicTournamentPage })),
);
const PublicTournamentsPage = lazy(() =>
  import('./public/tournaments.js').then((m) => ({ default: m.PublicTournamentsPage })),
);
const TournamentDetailPage = lazy(() =>
  import('./app/tournament-detail.js').then((m) => ({ default: m.TournamentDetailPage })),
);
const TournamentsPage = lazy(() =>
  import('./app/tournaments.js').then((m) => ({ default: m.TournamentsPage })),
);
const AdminTournamentsPage = lazy(() =>
  import('./admin/tournaments.js').then((m) => ({ default: m.AdminTournamentsPage })),
);
/** A tela de operar uma edição · pendência 103. Ver `admin/tournament-detail`. */
const AdminTournamentPage = lazy(() =>
  import('./admin/tournament-detail.js').then((m) => ({ default: m.AdminTournamentPage })),
);

/**
 * Puxa a casca **enquanto** o Firebase resolve a sessão, em vez de depois.
 *
 * `React.lazy` só começa a baixar quando o componente é **renderizado**, e o
 * `ProtectedRoute` devolve o `BootSplash` enquanto não sabe quem está logado ·
 * então o elemento da rota nunca chegava a renderizar e o download do layout só
 * partia depois da resposta do Firebase. Duas esperas em fila que não dependem
 * uma da outra, e entre elas aparecia um indicador **sem casca nenhuma**: ~190ms
 * mesmo com cache cheio e sem rede lenta, o que cai justo na faixa em que um
 * indicador vira pisca (ver `docs/design.md` · o limiar de 300ms).
 *
 * **A condição não é só "estou numa rota protegida"**, e a primeira versão disto
 * errou justamente aí: ela olhava só o caminho atual, então cobria quem abre
 * `/app` direto (link, favorito, F5) e **não cobria quem entra pelo login** ·
 * que é o caminho normal na web e o **único** no desktop, onde a raiz do app
 * *é* a tela de entrar. No fluxo que mais acontece, o prefetch não fazia nada.
 *
 * O que continua fora é o visitante da landing sem sessão, e é ele que mantém o
 * custo em zero pra quem nunca faz login · por isso não vale trocar isto por
 * import estático, que poria ~4 kB no bundle de entrada de todo mundo.
 *
 * O `void` é porque não há o que esperar: quem consome o módulo é o `lazy`
 * acima, e o registro de módulos do navegador reaproveita o mesmo download.
 */
function prefetchShell(): void {
  const path = window.location.pathname;
  if (/\/admin(\/|$)/.test(path)) {
    void import('./admin/layout.js');
    return;
  }
  const headingToApp = /\/(app|login)(\/|$)/.test(path) || isDesktop();
  if (headingToApp) void import('./app/layout.js');
}

/**
 * O SDK do Firebase, aquecido nas rotas que **decidem** pela sessão.
 *
 * Ele deixou de ser import estático em 06/08/2026 pra sair do caminho crítico
 * da landing (161 kB, 34 kB gzip, 23% do peso bruto da primeira visita). A
 * contrapartida é que quem depende dele passa a esperar um ida-e-volta a mais ·
 * aqui esse ida-e-volta acontece **junto** do resto do boot, em paralelo, em
 * vez de começar quando a guarda de rota pergunta.
 *
 * Quem fica de fora é justamente quem não pergunta nada: a landing, o texto
 * legal e o 404. O club público entra porque lá a sessão decide um
 * redirecionamento, e não uma palavra.
 */
function prefetchSession(): void {
  // **A mesma lista do provider**, e o `withoutLanguagePrefix` é obrigatório
  // aqui: isto roda no boot, então o caminho vem do `window` e traz o `/es`
  // junto · o provider recebe o caminho já sem ele, pelo `basename`. Duas
  // formas, uma lista só.
  if (needsSession(withoutLanguagePrefix(window.location.pathname))) void import('@/lib/firebase');
}

prefetchShell();
prefetchSession();

/**
 * Espera do chunk de uma rota **sem casca própria** · a pública do club, o
 * texto legal, o onboarding, e o primeiro carregamento dos dois layouts.
 *
 * **Quem tem casca não usa isto pras telas de dentro**, e a diferença custou um
 * defeito: este limite chegou a embrulhar o `AppLayout`, e como cada tela filha
 * é um chunk próprio, a suspensão dela subia até aqui e **desmontava a casca
 * inteira** · header e navegação sumiam por ~340ms a cada clique dentro do app.
 * O comentário que morava aqui afirmava justamente que isso não acontecia.
 *
 * Hoje `AppLayout` e `AdminLayout` têm o `Suspense` deles em volta do
 * `<Outlet />`, então a casca fica de pé e só o miolo espera.
 *
 * **E o limite de erro mora aqui pelo mesmo motivo que o `Suspense`** · são as
 * duas metades do mesmo carregamento. O chunk que demora cai no `fallback`; o
 * chunk que **não vem** cai no `RouteErrorBoundary`, que é a camada 3 da
 * pendência 193 · sem ele, um asset apagado por um deploy antigo quebrava a tela
 * sem palavra nenhuma. Uma peça cobre as 29 rotas, inclusive as duas cascas,
 * porque o `Suspense` interno delas sobe até este limite.
 */
function Under(props: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={props.fallback ?? <LoadingState fill />}>{props.children}</Suspense>
    </RouteErrorBoundary>
  );
}

export function AppRouter() {
  return (
    // O prefixo do idioma vira basename · assim toda rota e todo <Link> segue
    // escrito como "/login" e o router cuida do "/es" sozinho.
    // **`useTransitions={false}` mantém o comportamento que o produto já tinha**,
    // e ele vira necessário a partir do `react-router` 7 · lá, embrulhar as
    // mudanças de estado do router em `React.startTransition` passou a ser o
    // padrão, e com rota `lazy` sob um `Suspense` que já está montado o React
    // **segura a tela antiga em vez de pintar o fallback**.
    //
    // **Medido nos dois, no build de verdade e não no dev** (26/08/2026): com a
    // rede estrangulada, o 6 mostra o spinner na hora e o 7 deixa a tela parada
    // por ~1,1s **sem sinal nenhum de que algo está acontecendo**. Sem freio os
    // dois trocam em menos de 60ms, então o que se perde não é suavidade · é
    // justamente o caso em que a espera existe.
    //
    // Isso encosta no princípio de que ação lenta devolve o controle
    // (`docs/design.md`), e o desenho daqui não tem onde pendurar um indicador
    // de pendente: `useNavigation` só existe em data router, e o `useLinkStatus`
    // exige React 19. **Gatilho pra reavaliar:** o React 19 entrar.
    <BrowserRouter basename={LANGUAGE_BASENAME[activeLanguage]} useTransitions={false}>
      {/* **O provider mora dentro do router**, e não em volta dele, porque ele
          precisa saber em que rota a pessoa está pra decidir se boota a sessão ·
          ver `lib/session-routes.ts`. Nada fora daqui consome auth: a barra de
          título, a faixa de atualização e o menu de contexto já ficavam do lado
          de fora dele. */}
      <AuthProvider>
        <Routes>
          {/* Única troca de tela por plataforma. Fica no router, que é o lugar
            de compor · dentro de componente vira `if` espalhado.

            No desktop a raiz **é** o login, então ela é rota de visitante. Na
            web a raiz é a landing: página pública continua aberta pra quem já
            entrou · quem tem sessão vê o mesmo conteúdo, com o botão apontando
            pro app. */}
          <Route
            path="/"
            element={
              isDesktop() ? (
                <GuestRoute>
                  <DesktopWelcomePage />
                </GuestRoute>
              ) : (
                <LandingPage />
              )
            }
          />
          {/* Página pública do club · aberta a visitante deslogado de propósito.
            É o link que circula no Discord, e exigir conta pra ver mataria a
            divulgação, que é o canal de aquisição do produto. */}
          <Route
            path="/club/:tag"
            element={
              // A casca pública e a silhueta do club desde o primeiro quadro · é a
              // tela que um estranho abre vindo do Discord, e ela não pode começar
              // com um spinner solto no vazio.
              <Under
                fallback={
                  <PublicPageFallback>
                    <ClubViewSkeleton />
                  </PublicPageFallback>
                }
              >
                <PublicClubPage />
              </Under>
            }
          />

          {/* Página pública de um player · aberta pelo mesmo motivo da do club.
            Ela é o destino de cada nome do elenco, e quem chega aqui costuma
            estar a dois cliques de um link do Discord. */}
          <Route
            path="/player/:handle"
            element={
              <Under
                fallback={
                  <PublicPageFallback>
                    <PlayerViewSkeleton />
                  </PublicPageFallback>
                }
              >
                <PublicPlayerPage />
              </Under>
            }
          />

          {/* Campeonatos · **abertos, e é o oposto das duas vitrines de
            propósito**. Descobrir club é de quem tem conta (08/08/2026); o
            campeonato é a porta de entrada, e premiação e regras precisam estar
            visíveis antes de qualquer login · cada passo exigido antes do
            pagamento é gente que desiste.

            **Não há gêmea dentro do app**, e a ausência é decisão · o link que
            circula no Discord é o mesmo que quem está logado usa. Ver
            `lib/paths.ts`. */}
          <Route
            path="/campeonatos"
            element={
              <Under fallback={<PublicPageFallback />}>
                <PublicTournamentsPage />
              </Under>
            }
          />
          <Route
            path="/campeonato/:slug"
            element={
              <Under fallback={<PublicPageFallback />}>
                <PublicTournamentPage />
              </Under>
            }
          />

          {/* **A porta do app instalado** · aberta, e fora do `GuestRoute` de
            propósito: quem já tem sessão também baixa o app, e mandar essa
            pessoa pro `/app` seria recusar o que ela veio buscar.

            **O caminho é `/download` nos dois idiomas** · é o endereço que
            alguém repete de cabeça no Discord, e traduzir isso criaria dois
            endereços pro mesmo arquivo. */}
          <Route
            path="/download"
            element={
              <Under fallback={<PublicPageFallback />}>
                <DownloadPage />
              </Under>
            }
          />

          {/* As novidades · abertas, e **o mesmo caminho nos dois idiomas**, como
            `/download`. É o destino das duas faixas de versão nova e o único
            lugar em que o produto conta o que mudou · o texto vem de
            `docs/novidades.*.md`, pelo mesmo renderizador do legal. */}
          <Route
            path={CHANGELOG_PATH}
            element={
              <Under fallback={<PublicPageFallback />}>
                <ChangelogPage />
              </Under>
            }
          />

          {/* Termos, privacidade e reembolso · abertos, e a mesma página serve os
            três tipos. Preguiçosos como o resto: quem chega pela landing não
            baixa texto legal que talvez nunca abra.

            **O caminho é o mesmo nos dois idiomas**, como `/campeonato` · quem
            põe o prefixo é o `basename` do router. */}
          <Route
            path="/termos"
            element={
              <Under fallback={<PublicPageFallback />}>
                <LegalPage kind="terms" />
              </Under>
            }
          />
          <Route
            path="/privacidade"
            element={
              <Under fallback={<PublicPageFallback />}>
                <LegalPage kind="privacy" />
              </Under>
            }
          />
          {/* **Ela existe porque os termos apontam pra cá** · o link de um
            documento legal pra uma página que dá 404 é o pior 404 do produto,
            porque acontece com quem está prestes a pagar. */}
          <Route
            path="/reembolso"
            element={
              <Under fallback={<PublicPageFallback />}>
                <LegalPage kind="refund" />
              </Under>
            }
          />

          {/* **Pública de propósito, e fora do `GuestRoute`** · quem abre isto
            costuma não ter sessão nenhuma, e quem tem não pode ser mandado pro
            app · a autorização é o token do caminho, não o login. */}
          <Route
            path="/descadastro/:token"
            element={
              <Under fallback={<PublicPageFallback />}>
                <UnsubscribePage />
              </Under>
            }
          />

          {/* **Fora do `GuestRoute`, e isso não é descuido** · quem clica no
            link do e-mail pode estar logado noutra conta na mesma máquina, e o
            `GuestRoute` mandaria essa pessoa pro app sem nunca mostrar a tela
            de criar a senha nova. A autorização é o `?code=`, não a sessão. */}
          <Route
            path="/recuperar-senha"
            element={
              <Under fallback={<PublicPageFallback />}>
                <ResetPasswordPage />
              </Under>
            }
          />

          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute role="player" allowWithoutAccount>
                <Under>
                  <OnboardingPage />
                </Under>
              </ProtectedRoute>
            }
          />

          {/* O `guestGoesTo` vive aqui e não no filho porque a guarda é do pai ·
            quem chega sem sessão nunca chega a renderizar `clubs/:tag`. Quem
            sabe quais rotas têm gêmea pública é o `publicTwinOf`. */}
          <Route
            path="/app"
            element={
              <ProtectedRoute role="player" guestGoesTo={publicTwinOf}>
                <Under>
                  <AppLayout />
                </Under>
              </ProtectedRoute>
            }
          >
            {/* **`/app` voltou a ser uma tela** (Eduardo, 12/08/2026) · ele
              redirecionava pra vitrine de clubs desde que o Feed saiu do MVP em
              08/08, e aquilo era o certo naquele dia: o feed prometia conteúdo
              que não existia.

              **Deixou de ser certo quando campeonato virou o core.** A tela
              inicial agora é sobre a edição aberta e sobre o que falta pra a
              pessoa entrar nela · não é um painel de números, e a ordem dela é
              a ordem da conversão. */}
            <Route index element={<AppHomePage />} />
            <Route path="clubs" element={<ClubsPage />} />
            <Route path="clubs/novo" element={<ClubNewPage />} />
            {/* Endereçado pela tag, não pelo id · é o mesmo endereço do link
              público, então quem está logado troca só a moldura. */}
            <Route path="clubs/:tag" element={<ClubDetailPage />} />
            <Route path="clubs/:tag/editar" element={<ClubEditPage />} />
            {/* A vitrine de gente · **autenticada**, como a busca, porque é a
              superfície que expõe pessoas. O perfil individual continua aberto
              por endereço exato: endereçável, não enumerável. */}
            <Route path="players" element={<PlayersPage />} />
            {/* Endereçado pelo @nick, como a pública · quem está logado troca só
              a moldura, e a gêmea das duas mora no `publicTwinOf`. */}
            <Route path="players/:handle" element={<PlayerDetailPage />} />
            {/* Configurar a própria conta · **sem gêmea pública**, e a ausência é
              a regra: quem abre isto quer agir sobre a própria conta, não olhar
              a de alguém. Deslogado vai pro login, como as outras telas sobre
              você. */}
            {/* Campeonatos dentro do app · **a gêmea da aberta**, e o
              `publicTwinOf` conhece as duas. Quem chega sem sessão num link de
              `/app/campeonatos/...` vai pra página aberta, e não pro login:
              quem abre o link de um campeonato queria o campeonato. */}
            <Route path="campeonatos" element={<TournamentsPage />} />
            <Route path="campeonatos/:slug" element={<TournamentDetailPage />} />
            <Route path="conta" element={<AccountPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <Under>
                  <AdminLayout />
                </Under>
              </ProtectedRoute>
            }
          >
            {/* O painel é a porta · era a lista de usuários, que é uma das
              ferramentas e não o lugar de onde se decide o que fazer. */}
            <Route index element={<AdminOverviewPage />} />
            <Route path="usuarios" element={<AdminUsersPage />} />
            <Route path="legal" element={<AdminLegalPage />} />
            {/* Banco de teste da API do EA FC · **estudo, não integração**, e por
              isso ele mora no admin e não no produto. */}
            <Route path="ea" element={<AdminEaPage />} />
            <Route path="emails" element={<AdminEmailsPage />} />
            {/* Montar campeonato · o formulário de números que a decisão do
              formato padrão deixou no lugar do montador de fases. */}
            <Route path="campeonatos" element={<AdminTournamentsPage />} />
            {/* Operar uma edição · a lista responde "qual", esta responde "e
              agora". Por `slug`, como toda porta de campeonato do produto. */}
            <Route path="campeonatos/:slug" element={<AdminTournamentPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
