import type { ReactNode } from 'react';
import { AccountSuspended } from '@/components/account-suspended';
import { Navigate, useLocation } from 'react-router';
import { BootSplash } from '@/components/boot-splash';
import { Button } from '@/components/ui/button';
import { type UserRole } from '@/lib/auth-context';
import { useAuth } from '@/lib/use-auth';
import { useTranslation } from 'react-i18next';

type Props = {
  role: UserRole;
  children: ReactNode;
  /** Só a própria tela de onboarding · todo o resto exige conta criada. */
  allowWithoutAccount?: boolean;
  /**
   * Pra onde mandar quem chega **sem sessão**, quando a rota tem equivalente
   * público. Recebe o caminho pedido e devolve o destino, ou `null` pro login.
   *
   * Quem declara é a rota, não este componente · a guarda continua sem saber
   * nada sobre club, e a próxima gêmea (o perfil público de player) entra sem
   * tocar aqui.
   */
  guestGoesTo?: (pathname: string) => string | null;
};

export function ProtectedRoute({
  role,
  children,
  allowWithoutAccount = false,
  guestGoesTo,
}: Props) {
  const { t } = useTranslation();
  const {
    user,
    role: userRole,
    loading,
    account,
    accountStatus,
    accountError,
    refreshAccount,
    signOut,
  } = useAuth();
  const location = useLocation();

  // Mesma tela do boot, não um "Carregando..." solto · trocar de tela protegida
  // mostrava texto cru por alguns quadros e lia como falha de render.
  //
  // **Só o `loading` do Firebase entra aqui**, e a separação das duas esperas é
  // o conserto de um beco sem saída: quem chegava **sem sessão** numa rota de
  // `/app` ficava na marca **pra sempre**. O `accountStatus` nasce `idle` e o
  // provider não o move quando não há usuário · não há conta pra buscar. Com as
  // duas esperas na mesma linha, a condição nunca deixava de valer e o
  // `Navigate` abaixo era inalcançável.
  if (loading) {
    return <BootSplash />;
  }

  if (!user) {
    // **A gêmea pública ganha do login quando ela existe.** Quem clicou no link
    // de um club queria o club · o login é a resposta certa só pra quem estava
    // tentando entrar em algo que não tem versão aberta.
    //
    // O que isso custa: quem **é** do club e está deslogado perde o retorno
    // automático que o `from` daria. É um clique · o outro erro é o estranho
    // fechando a aba na cara de um formulário, e esse é o canal de aquisição.
    const twin = guestGoesTo?.(location.pathname) ?? null;
    if (twin) return <Navigate to={twin} replace />;

    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Daqui pra baixo existe usuário, então esperar pela conta faz sentido · é
  // dela que dependem o onboarding e o papel.
  if (accountStatus === 'loading' || accountStatus === 'idle') {
    return <BootSplash />;
  }

  // Não saber se a conta existe é diferente de saber que ela não existe.
  // Mandar pro onboarding aqui faria quem já tem conta tentar criar outra.
  if (accountStatus === 'error') {
    // **Esta tela era um beco sem saída, e o pior caso dela não era a API fora
    // do ar: era conta suspensa.** O `GET /me` responde 403, o front tratava
    // igual a qualquer falha, e a pessoa via "algo deu errado do nosso lado" ·
    // que é falso. E ficava presa: `/login` devolve pra cá pelo `GuestRoute`,
    // porque o usuário do Firebase existe. Sem um "Sair", não havia saída
    // nenhuma além de limpar o navegador.
    const suspended = accountError === 'ACCOUNT_SUSPENDED';

    /**
     * **A suspensão tem tela própria, e ela se revalida sozinha** · desde
     * 21/08/2026.
     *
     * O comentário que morava aqui dizia que "conta suspensa não se resolve
     * recarregando", e por isso o botão de tentar de novo era escondido dela.
     * **Resolve** · quem suspende é o admin e quem reativa é o admin, e o
     * reativar **não tem canal pra avisar esta tela**: suspender derruba a
     * conexão de tempo real, e conta suspensa não consegue abrir outra. Sem
     * revalidar, a pessoa reativada ficava vendo "suspensa" até apertar F5 por
     * conta própria.
     */
    if (suspended) {
      return <AccountSuspended onRecheck={refreshAccount} onSignOut={signOut} />;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-sm text-muted-foreground">{t('common.errorGeneric')}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => void refreshAccount()}>
            {t('common.retry')}
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            {t('nav.signOut')}
          </Button>
        </div>
      </div>
    );
  }

  // Autenticado no Firebase sem documento em `users` é o primeiro acesso.
  if (!account && !allowWithoutAccount) {
    return <Navigate to="/onboarding" replace />;
  }
  if (account && allowWithoutAccount) {
    return <Navigate to="/app" replace />;
  }

  // Admin acessa rotas de player também · útil pra suporte/debug.
  if (role === 'admin' && userRole !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
