import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LegalDocument } from '@/components/legal-document';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { activeLanguage } from '@/i18n';
import { formatDate } from '@/lib/date-format';
import {
  changelogDate,
  changelogEntries,
  changelogSeenUntil,
  markChangelogSeen,
  unreadChangelogCount,
  type ChangelogEntry,
} from '@/lib/changelog';

/**
 * As novidades · **a página que conta o que mudou, pra quem já usa e já pagou.**
 *
 * Ela existe por um fato da noite da estreia: dois clubs declararam o mesmo
 * placar e ele não fechou, o defeito foi consertado na mesma noite, e o produto
 * não tinha como contar isso · quem viveu o defeito viu o defeito e não viu o
 * conserto. As duas faixas de versão nova (a do site e a do app) já diziam
 * "saiu uma versão" e eram mudas sobre o conteúdo · esta página é o destino
 * que faltava a elas.
 *
 * **O texto vem de `docs/novidades.*.md`**, renderizado pelo `LegalDocument`
 * como o regulamento e os documentos legais · sem API, sem banco, e sem custo
 * no primeiro carregamento, porque o chunk é `lazy`. A forma do arquivo e o
 * que entra nele estão em `lib/changelog.ts`.
 *
 * ## A leitura é marcada por visita
 *
 * - **O que é novo desde a sua última visita** · o ID lido na visita
 *   anterior fica no `localStorage`, e o que vier depois dela ganha o selo.
 *   É lido **uma vez, na montagem**: é o retrato de antes desta visita, e ele
 *   não pode mudar debaixo da pessoa enquanto ela lê.
 */
export function ChangelogPage() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const entries = changelogEntries(activeLanguage);
  const [seenUntil] = useState(() => changelogSeenUntil());
  const unread = unreadChangelogCount(entries, seenUntil);

  useEffect(() => {
    markChangelogSeen();
  }, []);

  /**
   * **O navegador não rola pra âncora sozinho aqui**, porque o elemento só
   * existe depois que o chunk desta rota chega · quando o `#` foi lido, a
   * página ainda era o `PublicPageFallback`. Rola-se à mão, uma vez, e o
   * `:target` do CSS cuida do destaque.
   */
  useEffect(() => {
    const id = hash.slice(1);
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const title = t('changelog.title');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead
        title={`${title} · ${t('common.brandName')}`}
        description={t('changelog.subtitle')}
      />
      <SiteHeader actions={<PublicHeaderActions />} />

      <main className="container flex-1 py-8 sm:py-12">
        <PageHeader title={title} subtitle={t('changelog.subtitle')} />

        {/* **Só acima de zero**, e não por gosto: em pt-BR o zero cai no
            `_one`, e a frase diria que há uma novidade pra quem não tem nenhuma.
            E sem visita anterior não há última visita da qual contar · a
            contagem já vem zerada de `unreadChangelogCount`. */}
        {unread > 0 && (
          <p className="mb-6 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {t('changelog.unread', { count: unread })}
          </p>
        )}

        <ol className="space-y-6 sm:space-y-8">
          {/* **O selo sai da MESMA conta da frase acima**, e não de uma segunda
              comparação · a lista vai da mais recente pra mais antiga, então as
              `unread` primeiras são as novas. Enquanto eram duas regras, elas
              divergiam na entrada do mesmo dia da última leitura: a frase dizia
              quatro e o selo aparecia em três. */}
          {entries.map((entry, i) => (
            <EntryView key={entry.id} entry={entry} isNew={i < unread} />
          ))}
        </ol>
      </main>

      <SiteFooter />
    </div>
  );
}

/** A data precede o cartão em todas as larguras, mantendo a coluna livre para leitura. */
function EntryView({ entry, isNew }: { entry: ChangelogEntry; isNew: boolean }) {
  const { t } = useTranslation();
  const date = formatDate(changelogDate(entry), 'long');

  return (
    <li
      id={entry.id}
      className="grid min-w-0 gap-3 scroll-mt-[calc(var(--app-header-h)+1rem)] target:[&_article]:border-primary/50"
    >
      <div className="flex flex-wrap items-center gap-3">
        <time
          dateTime={entry.date}
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          {date}
        </time>
        {isNew && (
          <Badge variant="success" size="sm">
            {t('changelog.newBadge')}
          </Badge>
        )}
      </div>

      <article className="min-w-0 rounded-xl border border-border bg-card/50 p-5 sm:p-6">
        <div className="flex items-start gap-2">
          <h2 className="text-balance font-display text-xl uppercase tracking-tight">
            {entry.title}
          </h2>
        </div>
        <div className="mt-5">
          <LegalDocument body={entry.body} headingLevel={3} />
        </div>
      </article>
    </li>
  );
}
