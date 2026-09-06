import { Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EaClubLookup } from '@/components/admin/ea-club-lookup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { SectionTitle } from '@/components/ui/section-title';
import { SelectField } from '@/components/ui/select-field';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { api, type EaCall, type EaCatalog } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useResource } from '@/lib/use-resource';

/**
 * O banco de teste da API interna de Pro Clubs do EA FC.
 *
 * **É levantamento, não integração**, e a distinção é a razão desta tela
 * existir: o produto trata estatística como **autodeclarada** (não-objetivo
 * escrito no `CLAUDE.md`), e antes de derrubar essa decisão a gente precisa
 * saber o que a API de verdade responde, com que forma e a que custo. Nada aqui
 * é gravado e nenhuma tela de produto consome isto.
 *
 * **O catálogo vem do servidor** · a tela não conhece caminho nem host, e manda
 * só a chave do endpoint mais os parâmetros. Rota que aceita URL do cliente é
 * SSRF, e o fato de só admin chegar aqui muda quem dispara, não o que é.
 *
 * **A resposta do banco de teste continua crua**, e o que se olha ali é a forma
 * do dado, o tempo e o tamanho.
 *
 * > **Este comentário dizia que desenhar peça bonita seria "a integração
 * > começando antes da decisão", e o Eduardo pediu o contrário em 24/08/2026.**
 * > Ele está certo e o argumento antigo estava incompleto: a pergunta *"vale
 * > integrar?"* não se responde só medindo forma e custo · ela depende de o dado
 * > virar algo que um jogador de Pro Clubs reconheça, e isso só se vê desenhado.
 * > A ficha (`EaClubLookup`) é parte do levantamento, não o fim dele · continua
 * > sem gravar nada e sem tela de produto consumindo.
 */
const EMPTY_CATALOG: EaCatalog = { endpoints: [], platforms: [], matchTypes: [] };

export function AdminEaPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.eaTitle'));

  /**
   * **Falhar vale catálogo vazio** · a tela é de levantamento, e um erro em
   * cima dela não ajuda quem só queria ver o que a API interna responde.
   */
  const { data: catalogOrNull, error: catalogError } = useResource(
    (signal) => api.getEaEndpoints({ signal }),
    [],
  );
  const catalog = catalogError ? EMPTY_CATALOG : catalogOrNull;
  const [endpointKey, setEndpointKey] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EaCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * **O primeiro endpoint vem escolhido** · abrir a tela num formulário vazio
   * obrigaria a escolher antes de ver o que existe. Isto é derivação da
   * resposta, e não busca · por isso continua sendo um efeito, e um bem
   * pequeno.
   */
  useEffect(() => {
    const first = catalog?.endpoints[0];
    if (!first) return;
    setEndpointKey(first.key);
    // A geração de hoje é o padrão · é a que tem gente jogando.
    setValues({ platform: catalog?.platforms[0] ?? '', matchType: catalog?.matchTypes[0] ?? '' });
  }, [catalog]);

  const endpoint = catalog?.endpoints.find((item) => item.key === endpointKey);

  const call = useCallback(() => {
    if (!endpoint) return;
    setPending(true);
    setError(null);
    setResult(null);
    const params: Record<string, string> = { endpoint: endpoint.key };
    for (const param of endpoint.params) {
      const value = values[param.name];
      if (value) params[param.name] = value;
    }
    void api
      .callEa(params)
      .then(setResult)
      .catch((cause: unknown) => setError(apiErrorMessage(cause, t)))
      .finally(() => setPending(false));
  }, [endpoint, values, t]);

  if (catalog === null) {
    return (
      <PageStack>
        <PageHeader title={t('admin.eaTitle')} subtitle={t('admin.eaSubtitle')} />
        <SkeletonGroup className="space-y-3">
          <SkeletonBar className="h-11 w-full" />
          <SkeletonBar className="h-11 w-2/3" />
        </SkeletonGroup>
      </PageStack>
    );
  }

  return (
    <PageStack>
      <PageHeader title={t('admin.eaTitle')} subtitle={t('admin.eaSubtitle')} />

      {/* **O aviso não é decoração.** Quem abrir esta tela daqui a um mês precisa
          saber que ela é estudo, e que a API do outro lado não tem contrato ·
          sem isso ela lê como funcionalidade pronta. */}
      <p className="rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 p-4 text-sm text-muted-foreground">
        {t('admin.eaWarning')}
      </p>

      <EaClubLookup platforms={catalog.platforms} />

      {/* **O título mora FORA da moldura** · dentro dela o vão do `SectionTitle`
          soma com o `space-y` da seção, e é o que o `pnpm scan:spacing` cobra. */}
      <SectionTitle meta={t('admin.eaRawMeta')}>{t('admin.eaRawTitle')}</SectionTitle>

      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="ea-endpoint">{t('admin.eaEndpoint')}</Label>
          <SelectField
            id="ea-endpoint"
            label={t('admin.eaEndpoint')}
            value={endpointKey}
            onChange={(value) => {
              setEndpointKey(value);
              setResult(null);
              setError(null);
            }}
            options={catalog.endpoints.map((item) => ({
              // O caminho no rótulo, porque é ele que a gente está estudando ·
              // a chave sozinha não diz o que vai ser chamado.
              value: item.key,
              label: item.path,
            }))}
          />
        </div>

        {/* Os campos saem dos parâmetros que o servidor declarou · endpoint novo
            desenha o próprio formulário sem tela nova. */}
        {endpoint && endpoint.params.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {endpoint.params.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={`ea-${param.name}`}>{param.name}</Label>
                {param.name === 'platform' || param.name === 'matchType' ? (
                  <SelectField
                    id={`ea-${param.name}`}
                    label={param.name}
                    value={values[param.name] ?? ''}
                    onChange={(value) => setValues((v) => ({ ...v, [param.name]: value }))}
                    options={(param.name === 'platform'
                      ? catalog.platforms
                      : catalog.matchTypes
                    ).map((option) => ({ value: option, label: option }))}
                  />
                ) : (
                  <Input
                    id={`ea-${param.name}`}
                    value={values[param.name] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [param.name]: e.target.value }))}
                    placeholder={param.name === 'clubName' ? 'Real' : '123762'}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <Button type="button" onClick={call} disabled={pending || !endpoint}>
          <Play className="h-4 w-4" aria-hidden />
          {pending ? t('common.loading') : t('admin.eaCall')}
        </Button>
      </section>

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
          {/* Status, tempo e tamanho juntos · nesta fase os três são o resultado
              tanto quanto o corpo. Um endpoint que responde em 2s e devolve
              20 kB por club é um fato de produto, não detalhe. */}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
            <span className={result.status === 200 ? 'text-primary' : 'text-amber-400'}>
              HTTP {result.status}
            </span>
            <span>{result.ms} ms</span>
            <span>{result.bytes.toLocaleString()} B</span>
          </p>
          {/* `overflow-auto` com teto de altura · a resposta do leaderboard tem
              mais de cem mil caracteres, e sem o teto a página vira um
              quilômetro de rolagem. */}
          <pre className="max-h-[32rem] overflow-auto overscroll-contain rounded-xl bg-background p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </section>
      )}
    </PageStack>
  );
}
