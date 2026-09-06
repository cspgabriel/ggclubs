import { legalKind, type DiffLine, type LegalKind } from '@ggclubs/schemas';
import { ArrowLeft, FileText, GitCompare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { LegalDocument, LegalDocumentDiff } from '@/components/legal-document';
import { countPassages } from '@/lib/legal-diff';
import { LEGAL_TITLE_KEY } from '@/lib/legal-title';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { StickyAside } from '@/components/ui/sticky-aside';
import { api, type LegalDocumentRecord } from '@/lib/api';
import { activeLanguage } from '@/i18n';
import { formatDate } from '@/lib/date-format';
import { LEGAL_PATH } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { useResource } from '@/lib/use-resource';

/**
 * Termos de uso, política de privacidade e política de reembolso.
 *
 * **Uma página, três documentos, dois modos: ler e comparar.** O estado vem da
 * URL (`?v=` e `?comparar`), então o link de uma versão é compartilhável ·
 * metade do motivo de existir histórico público.
 */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const version = Number(params.get('v')) || null;
  const comparing = params.has('comparar');

  const [loaded, setLoaded] = useState<LegalDocumentRecord | null>(null);
  /**
   * **Falhar aqui cai no estado vazio abaixo** · o `error` é ignorado de
   * propósito, e sem histórico a página diz que não há documento publicado.
   */
  const { data: versionsOrNull, loading } = useResource(
    (signal) => api.getLegalVersions(kind, { signal }).then((r) => r.versions),
    [kind],
  );
  const versions = versionsOrNull ?? [];
  const [diff, setDiff] = useState<{ lines: DiffLine[]; added: number; removed: number } | null>(
    null,
  );

  // A versão anterior à que está sendo lida · é ela que dá sentido a comparar.
  const shown = version ?? versions[0]?.version ?? null;
  const shownIndex = versions.findIndex((row) => row.version === shown);
  const previous = shownIndex >= 0 ? versions[shownIndex + 1] : undefined;

  // O efeito depende do **número** da versão anterior, não do objeto · ele é
  // recriado a cada resposta do histórico e reexecutaria a busca à toa.
  const previousVersion = previous?.version ?? null;
  /**
   * **Este efeito NÃO virou `useResource`, e a razão é comportamento.**
   *
   * Ele é ramificado: busca o diff **ou** o documento, conforme o `comparing`.
   * Com dois `useResource` e `skip` cruzado, alternar a comparação **apagaria o
   * texto** antes de rebuscá-lo · o `skip` zera o dado de propósito, porque o
   * que estava ali respondia outra pergunta. Aqui não responde: é o mesmo
   * documento, visto de dois jeitos.
   *
   * Trocar um `useEffect` legível por uma piscada na tela é o oposto do que a
   * fase 1 do [arquitetura.md](../../../../docs/arquitetura.md) existe pra
   * fazer.
   *
   * **E ele não apaga o documento, nunca.** Um `setLoaded(null)` aqui
   * reintroduzia a piscada pelo outro lado: sair do modo comparação reroda o
   * efeito, e o texto já carregado caía pro esqueleto até a busca voltar. Quem
   * decide o que aparece é a derivação logo abaixo · o registro carrega `kind`
   * e `version`, então o de outra versão simplesmente não é o pedido.
   */
  useEffect(() => {
    if (!shown) return;
    const ctrl = new AbortController();
    const locale = activeLanguage;
    setDiff(null);

    if (comparing && previousVersion) {
      api
        .getLegalDiff(kind, previousVersion, shown, locale, { signal: ctrl.signal })
        .then((r) => setDiff({ lines: r.lines, ...r.stat }))
        .catch(() => {});
    } else {
      api
        .getLegalVersion(kind, shown, locale, { signal: ctrl.signal })
        .then((r) => setLoaded(r.document))
        .catch(() => {});
    }

    return () => ctrl.abort();
  }, [kind, shown, comparing, previousVersion]);

  const document = loaded && loaded.kind === kind && loaded.version === shown ? loaded : null;

  const title = t(LEGAL_TITLE_KEY[kind]);
  const empty = !loading && versions.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead title={`${title} · ${t('common.brandName')}`} description={title} />
      <SiteHeader actions={<PublicHeaderActions />} />

      <main className="container flex-1 py-8 sm:py-12">
        <PageHeader title={title} subtitle={t('legal.subtitle')} />
        {/* A lista sai do schema, e o caminho do `LEGAL_PATH` · um quarto
            documento aparece aqui sem ninguém lembrar de escrevê-lo. */}
        <nav aria-label={t('legal.documents')} className="mb-6 flex flex-wrap gap-2">
          {legalKind.options.map((item) => (
            <Link
              key={item}
              to={LEGAL_PATH[item]}
              aria-current={item === kind ? 'page' : undefined}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-primary',
                item === kind
                  ? 'border-border bg-secondary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {t(LEGAL_TITLE_KEY[item])}
            </Link>
          ))}
        </nav>

        {/* A silhueta repete a grade de verdade · coluna de leitura à esquerda e
            histórico de versões à direita. Com um spinner centralizado, a
            página trocava de largura ao carregar.

            **As duas trilhas são a mesma string de propósito** · silhueta com
            largura diferente do conteúdo devolve o salto que ela existe pra
            evitar, e quem trocar uma sem a outra não vê o defeito no navegador
            rápido dele. */}
        {loading && (
          <div
            role="status"
            aria-live="polite"
            aria-label={t('common.loading')}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10"
          >
            <LegalTextSkeleton />
            <SkeletonGroup className="space-y-2">
              <SkeletonBar className="mb-3 h-3 w-20 bg-secondary/70" />
              {Array.from({ length: 3 }, (_, i) => (
                <SkeletonBar key={i} className="h-9 w-full rounded-lg" />
              ))}
            </SkeletonGroup>
          </div>
        )}

        {empty && (
          // **Nada publicado não é erro** · o documento vai existir, só não
          // existe ainda. 404 aqui contaria outra história.
          <EmptyState
            icon={FileText}
            title={t('legal.emptyTitle')}
            description={t('legal.emptyBody')}
          />
        )}

        {!loading && !empty && (
          /*
            **A coluna de leitura ocupa o que sobra, e o histórico cola na
            direita** · decisão do Eduardo em 21/08/2026, olhando a tela.

            Antes a trilha era `minmax(0,72ch)`, pela medida de leitura clássica
            (45 a 75 caracteres por linha). O custo dela era **315px de vazio na
            borda direita**, constante de 1280 a 1920 · o `container` trava em
            1232, então a sobra não cresce, ela só fica lá. Medido antes de
            trocar.

            **O que se ganha:** o texto vai de 621 pra 936px e o histórico
            encosta na margem, como todo o resto do site.

            **O que se paga, e é real:** a linha passa de 72 pra ~108 caracteres,
            acima da faixa confortável. Em documento legal, que se lê uma vez e
            com atenção, ele preferiu o layout cheio · e é escolha dele, não
            descuido.

            **Duas tentativas anteriores continuam valendo como o que NÃO fazer**,
            e nenhuma das duas é esta:

            - **Teto só no texto, com a trilha larga** · o aviso de comparação ia
              até a borda e o parágrafo parava no meio, então o limite lia como
              corte. **É diferente do que está aqui**: sem teto, o aviso e o
              texto têm a mesma largura e o desalinhamento não existe.
            - **Estreitar tudo e centralizar** · a página flutuava no meio,
              desalinhada da margem que o header e o rodapé usam. O Eduardo
              apontou, e o argumento continua de pé: a margem do `container` é a
              mesma no site inteiro.
          */
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10">
            <article className="min-w-0 rounded-xl border border-border bg-card/40 p-5 sm:p-7">
              {/*
                **A faixa diz em palavras o que está na tela.** Antes ela era só
                a contagem de linhas, que responde quanto mudou e não o que se
                está vendo · e sem dizer quais versões, comparar virava
                adivinhação.
              */}
              {comparing && previous ? (
                <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {t('legal.comparingTitle', { to: shown ?? 0, from: previous.version })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      'legal.comparingBody',
                      diff ? countPassages(diff.lines) : { added: 0, removed: 0 },
                    )}
                  </p>
                  {/* **A saída fica junto do que ela desfaz.** Sem isto, quem
                      entrava no modo comparar só voltava pelo botão do
                      navegador · e o convite pra comparar continuava na tela,
                      como se nada tivesse acontecido. */}
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to={`?v=${shown}`}>
                      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                      {t('legal.backToText')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {document &&
                      t('legal.publishedOn', {
                        version: shown ?? 0,
                        date: formatDate(document.publishedAt),
                      })}
                  </p>
                  {/* **Só aparece quando há com o que comparar** · na primeira
                      versão o convite levaria a uma tela vazia. */}
                  {previous && (
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`?v=${shown}&comparar`}>
                        <GitCompare className="mr-1.5 h-3.5 w-3.5" />
                        {t('legal.compareWith', { from: previous.version })}
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {comparing && previous ? (
                diff ? (
                  <LegalDocumentDiff lines={diff.lines} />
                ) : (
                  <LegalTextSkeleton />
                )
              ) : document ? (
                <LegalDocument body={document.body} />
              ) : (
                <LegalTextSkeleton />
              )}
            </article>

            {/* **A coluna que gruda é o `StickyAside`, como no app** · a
                quarta cópia escrita à mão inventava o terceiro conjunto de
                números (`1rem`/`3rem` contra os `2rem` do token) e não tinha o
                `data-sticky-aside` que os probes procuram. O cartão é o
                conteúdo dela, e não a estrutura. */}
            <StickyAside>
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('legal.history')}
                </h2>
                <ol className="space-y-1">
                  {versions.map((row) => {
                    const active = row.version === shown;
                    return (
                      <li key={row.version}>
                        <Link
                          to={`?v=${row.version}`}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-sm',
                            active
                              ? 'bg-primary/10 font-semibold text-primary'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          <span>{t('legal.versionLabel', { version: row.version })}</span>
                          <span className="text-xs">{formatDate(row.publishedAt)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
                {/* A mais nova é a que vale · dizer isso evita a dúvida de quem
                    abriu uma antiga pelo link e não sabe se está lendo a atual. */}
                <p className="mt-3 px-3 text-xs text-muted-foreground">
                  {t('legal.currentHint')}
                </p>
              </div>
            </StickyAside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * Silhueta de texto corrido · a mesma dos dois lugares que esperam documento
 * (o corpo e a comparação).
 *
 * **Linhas de larguras diferentes, e a última curta.** Bloco de barras todas do
 * mesmo tamanho lê como tabela, não como parágrafo · a variação é o que faz o
 * olho reconhecer texto antes de saber o que está escrito.
 */
function LegalTextSkeleton() {
  const LINES = ['w-1/3', 'w-full', 'w-full', 'w-11/12', 'w-2/3', 'w-1/4', 'w-full', 'w-10/12'];
  return (
    <SkeletonGroup className="space-y-3">
      {LINES.map((width, i) => (
        <SkeletonBar
          key={i}
          className={cn('h-4', width, i === 0 || i === 5 ? 'h-5 bg-secondary' : 'bg-secondary/70')}
        />
      ))}
    </SkeletonGroup>
  );
}
