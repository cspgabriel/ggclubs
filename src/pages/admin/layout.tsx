import { FileText, FlaskConical, LayoutDashboard, Mail, Trophy, Users } from 'lucide-react';
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { AdminBrand } from '@/components/admin-brand';
import { LanguageSwitcher } from '@/components/language-switcher';
import { MobileNav, type MobileNavItem } from '@/components/mobile-nav';
import { NotificationBell } from '@/components/notification-bell';
import { SiteHeader } from '@/components/site-header';
import { LoadingState } from '@/components/ui/loading-state';
import { UserMenu } from '@/components/user-menu';
import { RealtimeProvider } from '@/lib/realtime/realtime-provider';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// **Sem "voltar pro app".** A marca à esquerda já é a saída, e no header ela
// sempre foi · uma aba pra isso gastava largura repetindo o que o logotipo faz,
// e no celular ela competia com as duas que são de verdade.
/**
 * **A ordem é a da frequência de uso**, e ela mudou em 19/08/2026.
 *
 * Campeonato era o **último** item, depois do banco de teste da API da EA · e é
 * o que se opera todo dia: sortear, resolver disputa, destravar partida,
 * devolver dinheiro. A EA é **estudo**, não integração (não há endpoint público
 * confiável), então ela é a última de direito.
 *
 * **O teto de três é do app, não daqui** · lá a navegação é do produto e cada
 * item é uma promessa; aqui ela é lista de ferramenta de operação.
 */
const NAV = [
  { to: '/admin', labelKey: 'admin.overview', end: true },
  { to: '/admin/campeonatos', labelKey: 'admin.tournaments.title', end: false },
  { to: '/admin/usuarios', labelKey: 'admin.users', end: false },
  { to: '/admin/legal', labelKey: 'admin.legal', end: false },
  { to: '/admin/emails', labelKey: 'admin.emails.title', end: false },
  { to: '/admin/ea', labelKey: 'admin.ea', end: false },
] as const;

const MOBILE_NAV: readonly MobileNavItem[] = [
  // `end` pelo mesmo motivo do header · sem ele o painel fica aceso em toda
  // rota filha e a barra deixa de dizer onde a pessoa está.
  { to: '/admin', labelKey: 'admin.overview', icon: LayoutDashboard, end: true },
  { to: '/admin/campeonatos', labelKey: 'admin.tournaments.title', icon: Trophy },
  { to: '/admin/usuarios', labelKey: 'admin.users', icon: Users },
  { to: '/admin/legal', labelKey: 'admin.legal', icon: FileText },
  { to: '/admin/emails', labelKey: 'admin.emails.title', icon: Mail },
  { to: '/admin/ea', labelKey: 'admin.ea', icon: FlaskConical },
];

/**
 * **O painel entrou no canal em 11/08/2026, e o sininho veio junto.**
 *
 * Ele ficou de fora enquanto o canal não tinha o que fazer aqui · a decisão
 * escrita era que os dois entrariam juntos, no bloco 11, e é este o momento: a
 * contagem de conexões passou a andar sozinha, e pra isso a casca precisa do
 * provider. Com ele de pé, deixar a conta **sem** os avisos dela enquanto está
 * no painel seria uma diferença sem motivo entre duas telas da mesma pessoa.
 */
export function AdminLayout() {
  return (
    <RealtimeProvider>
      <AdminShell />
    </RealtimeProvider>
  );
}

function AdminShell() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader
        // **A marca leva pro `/app`, não pro `/admin`**, e isso virou o único
        // caminho de volta quando a aba "Voltar pro app" saiu · apontado pelo
        // Eduardo, e era regressão minha: com ela indo pro próprio `/admin`,
        // não sobrava saída nenhuma da área de admin.
        //
        // É a exceção que confirma a regra do resto do site. Nas outras telas
        // a marca leva pra "casa daquele contexto"; aqui a casa **não é** o
        // admin, porque ninguém mora nele · ele é ferramenta de operação, e
        // quem entra sempre volta pro produto.
        //
        // **Sem `badgeTo` de propósito:** aqui o selo é estado, não porta ·
        // link pra onde a pessoa já está não é navegação. No `/app` ele leva
        // pra cá, e o bloco é o mesmo componente nas duas telas.
        brand={<AdminBrand />}
        nav={
          // **A navegação do admin só entra no header a partir de `lg`**, dois
          // degraus depois da do produto · são quatro ferramentas, e elas
          // empurram o seletor de idioma e o menu da conta pra fora.
          //
          // **Ela já esteve em `sm` (vazava 108px a 640) e em `md`**, e a
          // segunda também não bastou: em 12/08/2026 o header vazava **28px a
          // 768**, medido. O que mudou entre uma medição e a outra **não foi a
          // navegação** · foi o **sininho** entrando nas ações em 11/08, e
          // ninguém remediu o header depois de acrescentar uma peça a ele.
          //
          // **É a lição que fica, e ela é maior que este arquivo:** peça nova no
          // header é largura nova numa linha que já estava no limite, em seis
          // telas de uma vez. Quem acrescentar aqui roda o `pnpm scan:overflow`
          // · nenhum dos cinco checks vê isto.
          //
          // Até `lg` quem navega é a barra flutuante, que é desenhada pra isso.
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                // O painel é `/admin` exato · sem isto ele fica aceso em toda
                // rota filha, e a aba ativa deixa de dizer onde a pessoa está.
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
        actions={
          <>
            <LanguageSwitcher />
            <NotificationBell />
            <UserMenu />
          </>
        }
      />

      {/* O vão de baixo acompanha a barra flutuante · ela vive até `md` aqui,
          então o respiro que a impede de cobrir o conteúdo tem que ir junto. */}
      {/* O respiro de baixo anda junto do `until` da barra flutuante · se um
          mudar sozinho, ou sobra vão no fim da página ou a última linha da
          tabela fica atrás dela. */}
      <main className="container flex-1 py-8 pb-28 lg:pb-8">
        {/* Mesmo motivo do `AppLayout`: o limite de espera mora **dentro** da
            casca, senão trocar de aba no admin apaga header e navegação. */}
        <Suspense fallback={<LoadingState fill />}>
          <Outlet />
        </Suspense>
      </main>

      <MobileNav items={MOBILE_NAV} until="lg" />
    </div>
  );
}
