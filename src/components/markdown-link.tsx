import { Link } from 'react-router';
import { ExternalLink } from '@/components/ui/external-link';

/**
 * O link do documento · caminho nosso vira navegação, `https://` abre fora.
 *
 * **Ele morava dentro do `lib/markdown.tsx` até 26/08/2026**, e saiu por
 * ferramenta e não por desenho: um componente convivendo com as funções puras
 * do parser tira o Fast Refresh do arquivo inteiro, e o
 * `react-refresh/only-export-components` cobra isso. Quem decide **se** o
 * endereço pode virar link continua sendo o `safeHref`, lá.
 */
export function MarkdownLink({ label, href }: { label: string; href: string }) {
  const className =
    'rounded-sm text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

  // **Caminho nosso vai por `Link`, e isso não é preferência de estilo:** o
  // prefixo de idioma é o `basename` do router, então um `<a href="/reembolso">`
  // jogaria quem está em espanhol pra fora do `/es`.
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {label}
      </Link>
    );
  }

  // **`ExternalLink` e não `<a target="_blank">`** · no app instalado a âncora
  // de destino externo não abre nada, e o regulamento de campeonato é feito de
  // link.
  return (
    <ExternalLink href={href} className={className}>
      {label}
    </ExternalLink>
  );
}
