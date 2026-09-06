import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { LoadingState } from '@/components/ui/loading-state';

/**
 * A moldura pública enquanto o código da tela ainda não chegou.
 *
 * **Header e rodapé não dependem de dado nem do chunk da rota**, então não há
 * razão pra eles esperarem: sem isto, quem abria o link de um club via ~400ms
 * de um spinner sozinho numa página em branco, e só então a casca aparecia ·
 * com o spinner **mudando de lugar** ao ser cercado por ela. Medido em frames,
 * em 05/08/2026.
 *
 * Isso importa mais aqui do que dentro do app: a página pública do club é o
 * link que circula no Discord, e é a primeira coisa que um estranho vê do
 * produto.
 *
 * **Não vira layout de rota** por um motivo concreto: a página pública devolve
 * `null` antes de qualquer casca quando há sessão, pra quem tem conta não ver a
 * moldura de visitante piscar antes de ser mandado pra dentro. Com a casca num
 * layout acima dela, essa decisão deixaria de existir.
 */
export function PublicPageFallback({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader actions={<PublicHeaderActions />} />
      <main className="flex flex-1 flex-col">{children ?? <LoadingState fill />}</main>
      <SiteFooter />
    </div>
  );
}
