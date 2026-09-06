import { legalKind, type LegalKind } from '@ggclubs/schemas';
import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MarkdownEditor } from '@/components/markdown-editor';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { SectionTitle } from '@/components/ui/section-title';
import { api, type LegalVersionRecord } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { LEGAL_TITLE_KEY } from '@/lib/legal-title';
import { SUPPORTED_LANGUAGES } from '@/i18n/language';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';

/**
 * Publicar termos de uso e política de privacidade.
 *
 * ## As três coisas que esta tela tem que deixar claras
 *
 * **Que publicar é definitivo.** Não existe editar: a versão publicada é o que
 * alguém aceitou, e reescrevê-la apagaria isso. A tela diz a frase e a
 * confirmação pede a palavra · é o mesmo freio da exclusão de club, e pelo mesmo
 * motivo, que é ser proporcional ao estrago.
 *
 * **Que os dois idiomas são obrigatórios.** O servidor recusa metade, e
 * descobrir isso no envio seria descobrir tarde · o botão fica desligado e diz
 * o que falta.
 *
 * **O que a pessoa está prestes a publicar.** A prévia mostra o texto
 * renderizado, não o markdown cru · publicar às cegas um documento legal é como
 * a tela de erro sem saída: existe uma hora certa pra descobrir, e é antes.
 */
export function AdminLegalPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.legalTitle'));

  const [kind, setKind] = useState<LegalKind>('terms');
  const [bodies, setBodies] = useState<Record<string, string>>({});
  /** O que está no ar · a régua pra saber se houve edição. */
  const [publishedBodies, setPublishedBodies] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<LegalVersionRecord[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  /**
   * **Carrega o texto que está no ar dentro do editor.**
   *
   * Sem isso a caixa nascia vazia, e corrigir uma vírgula obrigava a pessoa a
   * copiar o documento de outro lugar e colar aqui · ou pior, a reescrever. E
   * como publicar é sempre versão nova, o ponto de partida natural de qualquer
   * edição é **a versão atual**.
   *
   * O que ela **não** faz é salvar rascunho: o que está na caixa só existe
   * enquanto a tela está aberta, e é de propósito · rascunho de documento legal
   * guardado pela metade é o tipo de coisa que alguém publica sem querer.
   */
  useEffect(() => {
    const ctrl = new AbortController();
    setBodies({});

    async function load() {
      const { versions: rows } = await api.getLegalVersions(kind, { signal: ctrl.signal });
      setVersions(rows);
      if (rows.length === 0) {
        setPublishedBodies({});
        return;
      }

      const loaded = await Promise.all(
        SUPPORTED_LANGUAGES.map(async (lang) => {
          const r = await api.getLegal(kind, lang, { signal: ctrl.signal });
          return [lang, r.document?.body ?? ''] as const;
        }),
      );
      const current = Object.fromEntries(loaded);
      setBodies(current);
      // Guarda o que está no ar pra saber depois se alguém mexeu · sem isso o
      // botão de publicar nasceria ligado e criaria uma versão idêntica à
      // anterior, que é exatamente o que o histórico não devia acumular.
      setPublishedBodies(current);
    }

    void load().catch(() => {
      // Sem versão publicada a caixa fica vazia mesmo · é o primeiro documento.
    });

    return () => ctrl.abort();
  }, [kind, published]);

  const missing = SUPPORTED_LANGUAGES.filter((lang) => !(bodies[lang] ?? '').trim());
  /**
   * Alguém mexeu no texto?
   *
   * **Publicar sem mudança criaria uma versão idêntica à anterior** · e o
   * histórico existe justamente pra mostrar o que mudou entre uma e outra. Duas
   * versões iguais na lista é ruído que ninguém consegue explicar depois.
   */
  const changed = SUPPORTED_LANGUAGES.some(
    (lang) => (bodies[lang] ?? '') !== (publishedBodies[lang] ?? ''),
  );
  const current = versions[0]?.version ?? 0;
  const next = current + 1;

  async function publish() {
    setSending(true);
    setError(null);
    try {
      const body = Object.fromEntries(
        SUPPORTED_LANGUAGES.map((l) => [l, bodies[l] ?? '']),
      ) as Record<(typeof SUPPORTED_LANGUAGES)[number], string>;
      const r = await api.publishLegal({ kind, body });
      // Não limpa a caixa · o efeito acima recarrega com o que acabou de entrar
      // no ar, que é o ponto de partida da próxima correção.
      setPublished(r.version);
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  return (
    <PageStack>
      <PageHeader title={t('admin.legalTitle')} subtitle={t('admin.legalSubtitle')} />

      <div className="flex flex-wrap gap-2">
        {legalKind.options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={kind === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setKind(option);
              setPublished(null);
            }}
          >
            {t(LEGAL_TITLE_KEY[option])}
          </Button>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {versions.length === 0
            ? t('admin.legalNeverPublished')
            : t('admin.legalCurrent', {
                version: versions[0]?.version ?? 0,
                date: new Date(versions[0]?.publishedAt ?? '').toLocaleDateString(),
              })}
        </p>
        {/* **A frase só promete a versão nova quando ela vai existir.** Com o
            editor preenchido e nada editado, prometer a próxima contradiz o
            botão desligado logo abaixo · mesma incoerência que a copy da prévia
            tinha, e o scanner de strings reclama de copy citada em comentário
            de JSX, então ela não aparece aqui. */}
        <p className="mt-1 text-sm font-semibold text-foreground">
          {changed ? t('admin.legalWillPublish', { version: next }) : t('admin.legalNoChangesYet')}
        </p>
      </section>

      <section>
        <SectionTitle>{t('admin.legalBody')}</SectionTitle>

        {/* O título já deixa o vão dele · o `space-y` fica com os campos, senão
            os dois se somam e o cabeçalho descola do que ele nomeia. */}
        <div className="space-y-4">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <MarkdownEditor
              key={lang}
              id={`legal-${kind}-${lang}`}
              label={
                <span className="inline-flex items-center gap-2">
                  {lang}
                  {!(bodies[lang] ?? '').trim() && (
                    <span className="text-xs text-destructive">{t('admin.legalRequired')}</span>
                  )}
                </span>
              }
              value={bodies[lang] ?? ''}
              onChange={(body) => setBodies((current) => ({ ...current, [lang]: body }))}
              rows={14}
              placeholder={t('admin.legalPlaceholder')}
              previewLabel={
                changed ? (
                  <Trans
                    i18nKey="admin.legalPreviewNext"
                    values={{ lang, version: next }}
                    components={[
                      <span key="0" className="text-foreground" />,
                      <span key="1" className="text-foreground" />,
                    ]}
                  />
                ) : (
                  <Trans
                    i18nKey="admin.legalPreviewCurrent"
                    values={{ lang, version: current }}
                    components={[
                      <span key="0" className="text-foreground" />,
                      <span key="1" className="text-foreground" />,
                    ]}
                  />
                )
              }
            />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="cta"
          disabled={missing.length > 0 || !changed || sending}
          onClick={() => setConfirming(true)}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {t('admin.legalPublish')}
        </Button>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t('admin.legalConfirmTitle', { version: next })}
          description={t('admin.legalConfirmBody')}
          confirmLabel={t('admin.legalPublish')}
          confirmPhrase={t('admin.legalConfirmPhrase')}
          onConfirm={() => void publish()}
        />
        {missing.length > 0 ? (
          <span className="text-sm text-muted-foreground">
            {t('admin.legalMissing', { langs: missing.join(', ') })}
          </span>
        ) : (
          // Botão desligado sem dizer por quê é botão que parece quebrado · a
          // regra da casa vale aqui igual ao teto de campo batendo em silêncio.
          !changed && (
            <span className="text-sm text-muted-foreground">{t('admin.legalNoChanges')}</span>
          )
        )}
        {published && (
          <span className={cn('text-sm font-semibold text-primary')}>
            {t('admin.legalPublished', { version: published })}
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </PageStack>
  );
}
