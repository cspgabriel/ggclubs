import { Home, Shield, Trophy, Users } from 'lucide-react';
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { AdminBrand } from '@/components/admin-brand';
import { ChatTray } from '@/components/chat/chat-tray';
import { LanguageSwitcher } from '@/components/language-switcher';
import { MobileNav, type MobileNavItem } from '@/components/mobile-nav';
import { LiveMatchBar } from '@/components/tournament/live-match-bar';
import { NotificationBell } from '@/components/notification-bell';
import { SiteHeader } from '@/components/site-header';
import { LoadingState } from '@/components/ui/loading-state';
import { UserMenu } from '@/components/user-menu';
import { MyChatsProvider } from '@/lib/my-chats';
import { MyClubsProvider } from '@/lib/my-clubs';
import { RunningMatchProvider } from '@/lib/running-match';
import { useLiveMatchBar } from '@/lib/use-live-match-bar';
import { useAuth } from '@/lib/use-auth';
import { RealtimeProvider } from '@/lib/realtime/realtime-provider';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

/**
 * **O admin não entra aqui**, e essa é a decisão de 05/08/2026.
 *
 * Ele era uma aba ao lado de Feed e Clubs, e isso o punha no mesmo nível do
 * produto · Feed e Clubs são o que a pessoa veio fazer, admin é ferramenta de
 * operação que quase nunca se abre. Na barra flutuante do celular a diferença
 * doía mais: um quarto item disputando o polegar com os dois que importam.
 *
 * Hoje ele mora onde as outras coisas "sobre você" moram · o selo na marca e o
 * menu da conta. Ver `components/admin-brand.tsx`.
 */
/**
 * **Players entrou em 08/08/2026, e a ausência dele era a lacuna maior.**
 *
 * O produto tinha diretório de clubs e não tinha diretório de gente · dava pra
 * achar um time e não dava pra achar alguém pra jogar, numa rede social de Pro
 * Clubs. A busca de player existia e vivia escondida dentro do campo de convite
 * de um club, então quem não gerenciasse club nenhum não podia procurar
 * ninguém.
 *
 * **O teto é três, e hoje são dois.** O quarto item já foi discutido quando o
 * admin saiu daqui: na barra flutuante do celular cada item disputa o polegar
 * com os que importam.
 *
 * **O Feed saiu em 08/08/2026, por decisão do Eduardo: ele não entra no MVP.**
 * Era uma tela vazia prometendo conteúdo que não existe, ocupando a **primeira**
 * aba do produto · quem entrava caía num "feed ainda vazio" antes de ver um club
 * sequer. `/app` continua existindo e **redireciona** pra vitrine de clubs, que
 * é o que a pessoa veio fazer.
 *
 * **A vaga que sobrou virou campeonatos em 12/08/2026**, e o teto de três está
 * cheio · o quarto item não entra sem alguém sair.
 *
 * **Campeonato é o core do produto**, então ele não fica por último aqui · a
 * ordem da barra é a ordem de importância, e no celular ela é a ordem do
 * polegar.
 *
 * **O teto era três e passou a quatro em 12/08/2026**, e o motivo é que `/app`
 * deixou de ser um redirecionamento e virou tela · sem item, a home só era
 * alcançável pela marca no header, que ninguém aprende sozinho. **Apontado pelo
 * Eduardo.**
 *
 * O teto de três existia por causa da barra flutuante do celular, onde cada item
 * disputa o polegar · **o quarto entrou medido, e não no chute**: a 320px os
 * quatro cabem com o rótulo inteiro. O dia em que entrar um quinto, essa medição
 * é o que decide.
 */
const NAV = [
  { to: '/app', labelKey: 'nav.home', end: true, icon: Home },
  { to: '/app/campeonatos', labelKey: 'nav.tournaments', end: false, icon: Trophy },
  { to: '/app/clubs', labelKey: 'nav.clubs', end: false, icon: Shield },
  { to: '/app/players', labelKey: 'nav.players', end: true, icon: Users },
] as const;

/**
 * **Uma conexão por aplicativo, e ela mora na casca** · não numa tela. Tela nova
 * não abre conexão nova, e trocar de tela não derruba a que existe.
 *
 * **A landing e a página aberta do club ficam de fora de propósito:** sem sessão
 * não há bilhete, e conectar ali seria um laço contra uma rota que responde 401
 * · justamente na tela de aquisição.
 *
 * **Os seus clubs também moram na casca, pela mesma razão e um nível acima:**
 * cinco telas de dentro derivam coisas diferentes do mesmo `GET /me/clubs`. Ele
 * vem **dentro** do canal porque a lista se invalida por `user.membership`, e
 * fica **fora** das telas públicas porque ninguém ali o usa · ver `my-clubs.tsx`.
 */
export function AppLayout() {
  return (
    <RealtimeProvider>
      <MyClubsProvider>
        {/**
         * **A sua partida da edição em jogo também mora na casca**, e pela
         * mesma razão dos seus clubs, um nível adiante: a faixa do topo, a tela
         * inicial e a aba de campeonatos faziam **a mesma busca e a mesma
         * conta**, cada uma por conta própria · era a pendência 105.
         *
         * Ele vem **dentro** do `MyClubsProvider` porque precisa saber quais
         * clubs são seus pra achar a sua partida, e de qual deles você
         * responde.
         */}
        <RunningMatchProvider>
          {/**
           * **As minhas conversas também moram na casca** · a bandeja do header
           * e a faixa do jogo precisam do mesmo dado, e duas buscas iguais a
           * cada tique é o defeito que o `useMyClubs` existe pra evitar.
           */}
          <MyChatsProvider>
            <AppShell />
          </MyChatsProvider>
        </RunningMatchProvider>
      </MyClubsProvider>
    </RealtimeProvider>
  );
}

function AppShell() {
  const { t } = useTranslation();
  const { role } = useAuth();

  const mobileItems: MobileNavItem[] = [...NAV];

  /**
   * **A casca precisa saber que a faixa está no ar**, e não só desenhá-la.
   *
   * Quem gruda mais abaixo (a prévia do `/app/conta` e a do formulário de club)
   * precisa descer a altura da faixa · e variável de CSS só desce na árvore,
   * então quem declara o desconto tem que ser um ancestral dos dois. Daqui pra
   * baixo o número vira `--app-sticky-top`, em `index.css`.
   *
   * A pergunta é a **mesma** que a faixa faz pra decidir se desenha · uma
   * cópia dela aqui voltaria a produzir a sobreposição de 9px no dia em que uma
   * das duas mudasse.
   */
  const liveBar = useLiveMatchBar() !== null;

  return (
    <div
      className="app-shell flex min-h-screen flex-col bg-background"
      data-live-bar={liveBar ? '' : undefined}
    >
      <SiteHeader
        brandHref="/app"
        // Quem é admin leva o selo junto da marca, e ele é a porta pro `/admin`.
        // O bloco é o mesmo componente que a área de admin usa · com uma cópia
        // em cada tela, a primeira mudança numa delas já as separaria.
        brand={role === 'admin' ? <AdminBrand badgeTo="/admin" /> : undefined}
        nav={
          // Em celular **e em tablet retrato** a navegação sai daqui e vive na
          // barra flutuante de baixo, onde o polegar alcança.
          //
          // **Ela entra em `md` e não em `sm`, desde 12/08/2026** · a 640 exata
          // o header vazava **7px**, porque marca + navegação + ações + os dois
          // vãos passavam do miolo do container e os três filhos são
          // `shrink-0`. É o mesmo degrau que o admin deu em 11/08, e pela mesma
          // razão · pendência 80.
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        }
        // O avatar não tem preenchimento interno, então a borda dele encosta no
        // limite do container igual à marca do outro lado · era o botão de sair,
        // com padding próprio, que fazia a direita parecer recuada.
        // **O sininho fica ao lado do avatar**, à esquerda dele: os dois são
        // "sobre você", e o avatar é a última peça da barra porque a borda dele
        // encosta no limite do container.
        actions={
          <>
            <LanguageSwitcher />
            {/* **A bandeja fica antes do sininho**, e os dois antes do avatar.
                Conversa e aviso pertencem à mesma família (o que é da pessoa),
                e a bandeja vem primeiro porque ela pede resposta e o sininho
                só informa. */}
            <ChatTray />
            <NotificationBell />
            <UserMenu />
          </>
        }
      />

      {/**
       * **A faixa do jogo vive na casca, e agora no topo** · a pessoa pode
       * estar em qualquer lugar do app quando a partida dela começa, e é
       * justamente aí que ela não pode ter que procurar.
       *
       * **Aqui e não no fim do `div`, porque ela é sticky** · grudada abaixo do
       * header, ela precisa vir logo depois dele na ordem do documento. No fim,
       * como cartão flutuante, ela disputava o polegar com a barra de navegação
       * e cobria conteúdo.
       *
       * **Ela existe só na janela do jogo** · ver o componente e o `barCovers`.
       * A busca que a alimenta é uma só, e mora no provider da casca.
       */}
      <LiveMatchBar />

      {/* O respiro de baixo é a altura da barra flutuante · sem ele o último
          conteúdo da página fica embaixo dela. **Anda junto do `until` da
          barra**: se um mudar sozinho, ou sobra um vão de 80px no fim da página
          ou o último card fica atrás dela. */}
      {/* **O respiro anda junto do `until` da barra, e ele não andava** · a
          navegação é `until="lg"` e o respiro parava em `md`, então entre 768 e
          1023 as duas peças flutuantes (a barra e a faixa do jogo) cobriam os
          últimos ~112px da página. O comentário abaixo já dizia que os dois
          andam juntos · o número é que tinha ficado pra trás. */}
      <main className="container flex-1 py-8 pb-28 lg:pb-8">
        {/* **O limite de espera é aqui, e não em volta deste layout.**
            Cada tela filha é um chunk próprio, e a suspensão sobe até o
            `Suspense` mais próximo · com ele lá fora, trocar de tela dentro do
            app desmontava a casca inteira e a pessoa via header e navegação
            sumirem por ~340ms a cada clique. Medido em frames, em 05/08/2026. */}
        <Suspense fallback={<LoadingState fill />}>
          <Outlet />
        </Suspense>
      </main>

      {/* **A navegação desceu mais um degrau em 12/08/2026** (`md` → `lg`), e
          o motivo é medido: com o quarto item da barra o header **vazava 67px
          a 768**. É o mesmo conserto da pendência 80, um degrau adiante · entre
          768 e 1024 quem navega é esta barra. */}
      <MobileNav items={mobileItems} until="lg" />
    </div>
  );
}
