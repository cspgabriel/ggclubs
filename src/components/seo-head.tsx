import { Helmet } from 'react-helmet-async';
import { publicOrigin } from '@/lib/public-url';
import { activeLanguage } from '@/i18n';
import { pathInLanguage, SUPPORTED_LANGUAGES } from '@/i18n/language';

// Only crawlers that execute JS see these tags. Link previews on WhatsApp and
// Facebook fall back to the static og:image in index.html until we pre-render.

const OG_LOCALE: Record<string, string> = { 'pt-BR': 'pt_BR', es: 'es_LA' };

/**
 * Sem `hreflang` o Google trata `/` e `/es` como conteúdo duplicado em vez de
 * traduções, e escolhe uma só pra indexar · metade do trabalho de i18n morre aí.
 */
function useAlternates() {
  if (typeof window === 'undefined') return [];
  const { origin, pathname } = window.location;
  return SUPPORTED_LANGUAGES.map((lang) => ({
    lang,
    href: origin + pathInLanguage(pathname, activeLanguage, lang),
  }));
}

export type SeoHeadProps = {
  /** Falls back to the default <title> in index.html when omitted. */
  title?: string;
  description?: string;
  /** Absolute URL. */
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
  jsonLd?: unknown;
};

/**
 * O cartão de link do produto · **1200x630, gerado por `pnpm brand:og`**.
 *
 * **É o padrão porque cartão sem imagem é o que menos chama clique** · num feed
 * de conversa o preview vira uma linha de texto, e o link do club é o canal de
 * aquisição. Quem tem imagem própria (club, player) passa a dela e sobrescreve.
 *
 * **A origem sai do `publicOrigin()`** pela mesma razão do link do club: no app
 * instalado `window.location.origin` é `tauri://localhost`, e previewer nenhum
 * abre isso. E é absoluta porque caminho relativo não resolve fora da página.
 */
function siteCard(): string {
  return `${publicOrigin()}/og.png`;
}

export function SeoHead({ title, description, ogImage, canonical, noindex, jsonLd }: SeoHeadProps) {
  const alternates = useAlternates();
  const card = ogImage ?? siteCard();

  return (
    <Helmet htmlAttributes={{ lang: activeLanguage }}>
      {alternates.map((a) => (
        <link key={a.lang} rel="alternate" hrefLang={a.lang} href={a.href} />
      ))}
      {alternates[0] && <link rel="alternate" hrefLang="x-default" href={alternates[0].href} />}

      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={card} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={OG_LOCALE[activeLanguage] ?? 'pt_BR'} />

      {/* **Sempre `summary_large_image`** · agora há sempre cartão. O `summary`
          pequeno existia pro caso sem imagem, que deixou de existir. */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={card} />

      {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
    </Helmet>
  );
}
