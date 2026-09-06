import { ArrowLeft, LogOut, Settings, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hasUnreadChangelog } from '@/lib/changelog';
import { appPlayerPath, CHANGELOG_PATH } from '@/lib/paths';
import { useAuth } from '@/lib/use-auth';

/**
 * Entrada da conta no header. Substituiu o botão solto de sair: com perfil e
 * configurações no roteiro, sair vira **um** item entre outros, não a única
 * coisa que dá pra fazer com a própria conta.
 *
 * **Os dois itens ficaram desabilitados até 08/08/2026**, com "em breve" ao
 * lado · mostrar o caminho é honesto, levar a um 404 não é. Hoje as duas telas
 * existem e o rótulo virou destino.
 */
export function UserMenu() {
  const { t } = useTranslation();
  const { account, user, role, signOut } = useAuth();
  const navigate = useNavigate();
  // O prefixo de idioma já vem removido pelo `basename` do router, então `/es`
  // não muda esta conta.
  const inAdminArea = useLocation().pathname.startsWith('/admin');

  async function onSignOut() {
    await signOut();
    void navigate('/login', { replace: true });
  }

  const name = account?.displayName ?? '';
  // Conta criada antes de guardarmos a foto do Google não tem `avatarUrl`, mas
  // o Firebase continua tendo a imagem · usar como reserva evita avatar de
  // iniciais em quem visivelmente tem foto.
  const photo = account?.avatarUrl ?? user?.photoURL;
  // Lido no render, e não guardado: o menu remonta a cada troca de rota (ele
  // pergunta ao router onde está), então voltar da página de novidades apaga o
  // ponto sem nenhum estado a mais.
  const unreadChangelog = hasUnreadChangelog();

  /**
   * **O rótulo diz que há novidade**, e não só que este é o menu da conta.
   *
   * O ponto verde é `aria-hidden`, porque ele é desenho · sem isto aqui, quem
   * usa leitor de tela não recebia sinal nenhum de que havia algo novo lá
   * dentro, e o item do menu se chama "Novidades" com ou sem.
   */
  const menuLabel = unreadChangelog
    ? `${t('account.menu')} · ${t('changelog.unreadHint')}`
    : t('account.menu');

  return (
    <DropdownMenu>
      {/* Só o avatar, sem seta: ele é o último elemento da barra e não tem
          preenchimento interno, então a borda dele bate com o limite do
          container, igual à marca do outro lado.

          **O `touch-target` é o que mantém ele redondo no celular** · o gatilho
          do Radix é um `button`, e a regra de 44px de altura mínima em ponteiro
          grosso transformava um avatar de 32x32 num **oval de 32x44**, no header
          de toda tela logada. A classe desliga o mínimo e desenha os 44px por
          fora. Achado na varredura de 10/08/2026, que nasceu do checkbox. */}
      <DropdownMenuTrigger
        className="touch-target relative inline-flex shrink-0 rounded-full outline-hidden ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={menuLabel}
      >
        <Avatar name={name} src={photo} size="sm" />
        {/* **O ponto é do menu, não da pessoa** · o sininho já diz "aconteceu
            algo com você", e treinar quem usa a ignorá-lo custa o próximo aviso
            de disputa. Um ponto de 10px na borda do avatar diz só que há algo
            novo lá dentro, e ele apaga na primeira leitura das novidades. O
            posicionamento pertence ao botão em todos os tipos de ponteiro. */}
        {unreadChangelog && (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          {account?.handle && (
            <span className="block truncate text-xs text-muted-foreground">@{account.handle}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* **Os dois deixaram de ser promessa em 08/08/2026.** Eles nasceram
            desabilitados com "em breve" porque mostrar o caminho é honesto e
            levar a um 404 não é · agora as duas telas existem, e o item leva
            pra elas.

            **Perfil é a página pública dele, dentro do app** · a mesma que
            qualquer visitante vê, com a navegação em volta. Sem `handle` não há
            pra onde ir, e isso só acontece entre autenticar e concluir o
            onboarding. */}
        {account?.handle && (
          <DropdownMenuItem onSelect={() => void navigate(appPlayerPath(account.handle))}>
            <User className="h-4 w-4" aria-hidden />
            {t('account.profile')}
          </DropdownMenuItem>
        )}

        {/* **O item e o título da tela dizem a mesma palavra.** Cada um dizia a
            sua · duas palavras pra mesma coisa é o que o glossário existe pra
            impedir, e quem clica num rótulo e cai noutro não sabe se chegou no
            lugar certo. Apontado pelo Eduardo em 08/08/2026. */}
        <DropdownMenuItem onSelect={() => void navigate('/app/conta')}>
          <Settings className="h-4 w-4" aria-hidden />
          {t('account.title')}
        </DropdownMenuItem>

        {/* **As novidades moram aqui porque é o único lugar de dentro do app que
            alcança toda tela logada** · o rodapé só existe nas públicas, e a
            barra de navegação tem quatro itens medidos a 320px. O ponto verde
            no fim da linha é o mesmo do avatar, e some junto. */}
        <DropdownMenuItem onSelect={() => void navigate(CHANGELOG_PATH)}>
          <Sparkles className="h-4 w-4" aria-hidden />
          {t('changelog.title')}
          {unreadChangelog && (
            <span aria-hidden className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>

        {/* **O admin mora aqui desde 05/08/2026**, e não mais numa aba do
            header. Ele é ferramenta de operação, não destino de produto · ao
            lado de Feed e Clubs ele ocupava largura permanente e, no celular,
            um quarto lugar na barra flutuante.

            **E o item é o caminho que falta, não o nome da área.** Dentro do
            admin, "Admin" levaria pra onde a pessoa já está · ali o que ela
            precisa é a volta. É a mesma regra do selo na marca, que é porta no
            `/app` e estado no `/admin`.

            Separador próprio porque ele não é "sobre o seu perfil" como os dois
            de cima nem saída como o de baixo · é outro assunto. */}
        {role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            {inAdminArea ? (
              <DropdownMenuItem onSelect={() => void navigate('/app')}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('nav.backToApp')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => void navigate('/admin')}>
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                {t('nav.admin')}
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => void onSignOut()}>
          <LogOut className="h-4 w-4" aria-hidden />
          {t('nav.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
