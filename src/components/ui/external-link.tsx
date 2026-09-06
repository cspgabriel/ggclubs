import type { AnchorHTMLAttributes } from 'react';
import { openExternal } from '@/lib/desktop';
import { isDesktop } from '@/lib/platform';

/**
 * O link que sai do produto · **um só, porque no app instalado ele não é um
 * `<a target="_blank">`.**
 *
 * No WebView2 o pedido de janela nova é engolido em silêncio, então toda âncora
 * de destino externo simplesmente não fazia nada no empacotado · o pior caso era
 * o checkout do cartão do Mercado Pago, que a tela afirmava ter aberto. O
 * conserto é abrir pelo navegador do sistema (`openExternal`), e ele mora aqui
 * em vez de espalhado: eram **seis** pontos, e link externo novo nasce toda
 * semana.
 *
 * **Na web nada muda de propósito.** O clique continua sendo do navegador · o
 * `href` real é o que faz o meio, o Ctrl+clique e o "abrir em nova guia"
 * funcionarem, e trocar isso por `window.open` só entregaria o gesto a um
 * bloqueador de pop-up.
 */
export function ExternalLink({
  href,
  onClick,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        onClick?.(e);
        // Quem já cancelou o clique manda · e o `Slot` do Radix encadeia o
        // handler de quem envolve este link (o `Button asChild` do estado
        // vazio), então isto não é hipótese.
        if (e.defaultPrevented || !isDesktop()) return;
        e.preventDefault();
        void openExternal(href);
      }}
    >
      {children}
    </a>
  );
}
