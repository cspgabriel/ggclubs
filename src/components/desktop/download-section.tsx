import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { DESKTOP_INSTALLER_MB } from '@/lib/desktop-download';
import { isDesktop, viewerPlatform } from '@/lib/platform';

/**
 * A chamada do app **no hero da landing** · uma linha, no peso do link de
 * campeonato que já mora ali.
 *
 * **Ela só existe pra Windows**, e some pra todo o resto · quem está no Mac, no
 * Linux ou no celular encontra a seção lá embaixo, que diz o que existe pra
 * ele. Oferecer no hero o que a pessoa não pode usar gasta a atenção mais cara
 * da página.
 *
 * O porquê de ser linha e não botão está no chamador · é decisão de funil, e
 * mora onde ela é tomada.
 */
export function HeroDownloadLine() {
  const { t } = useTranslation();

  if (isDesktop()) return null;
  if (viewerPlatform() !== 'windows') return null;

  return (
    // Ela viveu um dia (02/09/2026) escondida a partir de `xl`, enquanto a
    // coluna da direita do hero carregava um card do app · o card saiu em
    // 03/09 pra dar lugar à chave desenhada, e a linha voltou a valer em toda
    // largura.
    <p className="mt-2 text-sm text-muted-foreground">
      <Link to="/download" className="text-primary underline-offset-4 hover:underline">
        {t('desktop.downloadCta')}
      </Link>{' '}
      <span className="text-xs">
        · {t('desktop.downloadSizeOnly', { mb: DESKTOP_INSTALLER_MB })}
      </span>
    </p>
  );
}

/**
 * A seção da landing que conta que existe um app · **e ela é a primeira**.
 *
 * Até 28/08/2026 o produto tinha app instalado, updater e bandeja, e **nenhuma
 * linha do site dizia isso** · quem não fosse pessoalmente avisado nunca
 * descobria. Publicar versão sem porta de entrada é fabricar sem vender.
 *
 * **Três decisões que valem mais que o desenho:**
 *
 * 1. **Ela não compete com "criar conta".** Vem depois do fechamento da
 *    landing, e o botão é `outline` · o funil do produto é a conta, e o app é
 *    conveniência pra quem já quer. Quem chega pelo link de um club precisa de
 *    conta, não de instalador.
 * 2. **Ninguém fica sem resposta.** Windows vê o botão; Mac, Linux e celular
 *    veem o que existe pra eles. **Sumir com a seção faria o visitante concluir
 *    que o produto não tem app** · e a detecção erra, então errar pro lado de
 *    esconder seria o pior desfecho.
 * 3. **Dentro do app instalado ela não aparece**, pelo motivo óbvio · é a
 *    mesma pergunta que o `isDesktop()` responde no resto do produto.
 */
export function DesktopDownloadSection() {
  const { t } = useTranslation();

  // No app instalado, oferecer o instalador é ruído · a pessoa já instalou.
  if (isDesktop()) return null;

  const viewer = viewerPlatform();

  return (
    <section className="border-t border-border/60">
      <div className="container py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl uppercase leading-tight text-foreground sm:text-3xl">
            {t('desktop.downloadTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            {t('desktop.downloadBody')}
          </p>

          {viewer === 'mobile' ? (
            <p className="mt-6 text-sm text-muted-foreground">{t('desktop.downloadMobile')}</p>
          ) : (
            <>
              {/**
               * **`<a>` de verdade, e não um `onClick`** · o botão precisa
               * funcionar com o meio do mouse, com "salvar link como" e sem JS.
               *
               * **Ele leva pra `/download`, e não direto pro `.exe`** · lá a
               * página dispara o arquivo **no Windows** e explica, no mesmo
               * instante, o aviso de editor desconhecido. Mandar direto pro CDN
               * economiza um clique e entrega a pessoa sozinha na tela que faz
               * ela desistir.
               *
               * **E é ela que responde a quem NÃO está no Windows** · desde
               * 28/08/2026 (noite) o Mac e o Linux leem ali o que existe pra
               * eles, com o link manual, e o celular não recebe arquivo
               * nenhum. É por isso que este botão continua aparecendo pros
               * três.
               */}
              <Button asChild variant="outline" size="lg" className="mt-6">
                <Link to="/download">{t('desktop.downloadCta')}</Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                {t('desktop.downloadMeta', { mb: DESKTOP_INSTALLER_MB })}
              </p>
              {viewer !== 'windows' && (
                <p className="mx-auto mt-4 max-w-prose text-xs text-muted-foreground">
                  {t('desktop.downloadOtherDesktop')}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
