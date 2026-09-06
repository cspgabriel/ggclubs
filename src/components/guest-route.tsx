import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { BootSplash } from '@/components/boot-splash';
import { internalPathOr } from '@/lib/internal-path';
import { hadSession } from '@/lib/session-hint';
import { useAuth } from '@/lib/use-auth';
import { useMinimumVisible } from '@/lib/use-minimum-visible';

type LocationState = { from?: string };

/**
 * Espelho do ProtectedRoute: porta de entrada não é pra quem já entrou.
 *
 * A decisão precisa acontecer **antes** do render. Enquanto ela morava num
 * `useEffect` do formulário, a tela de entrada era pintada e só então trocava
 * sozinha · então todo caminho até ela com sessão viva piscava: link, botão,
 * histórico, URL digitada, F5. Consertar cada origem trata sintoma; a origem
 * é a rota não ter opinião sobre quem pode estar ali.
 *
 * Enquanto a sessão é desconhecida existem dois palpites possíveis, e o certo
 * depende de quem chegou · ver `lib/session-hint.ts`. Pra quem nunca entrou, o
 * formulário é o destino provável e aparece na hora. Pra quem tinha sessão,
 * segurar o primeiro quadro custa menos que mostrar a tela errada.
 */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;
  const holding = useMinimumVisible(loading && hadSession());

  if (loading || holding) {
    return hadSession() ? <BootSplash /> : <>{children}</>;
  }

  // **Todo mundo entra no `/app`, inclusive quem é admin** · decisão do Eduardo
  // em 07/08/2026. Ser admin é um papel a mais, não outra identidade: quem loga
  // quer usar o produto, e o painel é ferramenta que se abre quando precisa,
  // pelo menu da conta. Mandar direto pro `/admin` fazia a conta dele nunca ver
  // a própria tela inicial · e é a conta que valida o produto na mão.
  //
  // O `from` continua mandando: quem tentou abrir uma rota do painel sem sessão
  // volta pra ela depois de entrar, que é o que ele de fato pediu. **E ele passa
  // por `internalPathOr` porque é o único destino aqui que não é literal** · o
  // porquê, com o advisory que o motivou, está no módulo.
  if (user) {
    return <Navigate to={internalPathOr(from, '/app')} replace />;
  }

  return <>{children}</>;
}
