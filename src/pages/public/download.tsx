import { featuredEdition } from '@ggclubs/schemas';
import { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandWatermark } from '@/components/brand';
import { AppNotice } from '@/components/desktop/app-notice';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { TournamentCard } from '@/components/tournament/tournament-card';
import { Button } from '@/components/ui/button';
import { Chamfer } from '@/components/ui/chamfer';
import { WarningNote } from '@/components/ui/warning-note';
import { DESKTOP_INSTALLER_MB, DESKTOP_INSTALLER_URL } from '@/lib/desktop-download';
import { tournamentPath } from '@/lib/paths';
import { viewerPlatform } from '@/lib/platform';
import { useTournamentList } from '@/lib/use-tournament';

/**
 * A página de depois do clique · ela dispara o download **e** explica a
 * instalação.
 *
 * **Ela existe por causa de um aviso do Windows.** O instalador não tem
 * certificado de assinatura (pendência 15, adiada por custo), então o
 * SmartScreen mostra *"editor desconhecido"* na cara de quem acabou de baixar.
 * Quem não foi avisado fecha ali · e esse é o último passo do funil inteiro,
 * depois de a pessoa já ter decidido que quer. **Preparar pro aviso antes dele
 * aparecer é o trabalho principal desta página**, e é por isso que ela cita os
 * rótulos do Windows ao pé da letra em vez de parafrasear.
 *
 * **Ela também é o endereço que se manda no Discord** · "baixa em
 * ggclubs.com.br/download" é uma frase que alguém consegue repetir de cabeça, e
 * o link direto pro `.exe` não é.
 *
 * > **O bloco de "criar conta" saiu em 28/08/2026, e o Eduardo estava certo** ·
 * > eu tinha posto com o argumento do tempo morto do download. **O app tem a
 * > mesma tela de entrada, com cadastro** (é o mesmo `SignInForm`), então criar
 * > conta aqui não poupa passo nenhum: a pessoa ia ter que entrar no app do
 * > mesmo jeito. Era um passo a mais vestido de conveniência.
 *
 * ---
 *
 * **Ela vende o campeonato, e o app é o jeito de acompanhar** · 03/09/2026,
 * pendência 172. A capa dizia o que o app **é** (leve o GGClubs pro PC), e o
 * motivo de alguém instalar é outro: não perder o jogo. Hoje a capa mostra o
 * aviso como ele chega, e embaixo dos passos entra a edição em destaque · quem
 * está no celular, que não tem o que instalar, sai daqui pro campeonato em vez
 * de ficar num beco.
 */
export function DownloadPage() {
  const { t } = useTranslation();
  /**
   * A edição em destaque · a mesma busca da landing, pelo mesmo motivo: dado de
   * verdade em vez de prosa. Falhando ou vazia, o bloco some.
   */
  const { tournaments } = useTournamentList();
  const { edition, stage } = featuredEdition(tournaments);
  /** Uma vez por montagem · o `StrictMode` monta duas vezes em desenvolvimento. */
  const started = useRef(false);
  /**
   * **Só o Windows recebe o arquivo sozinho** · conserto de 28/08/2026 (noite).
   *
   * A seção da landing se esforça pra ninguém ficar sem resposta (Mac, Linux e
   * celular leem o que existe pra eles), e **esta página esquecia a pessoa**:
   * ela disparava o `.exe` pra todo mundo que não fosse celular, e explicava a
   * instalação no Windows sem uma palavra sobre o outro sistema. Baixar um
   * binário que não roda é pior do que não oferecer nada.
   *
   * **O link manual continua na página**, e é de propósito: a detecção erra
   * (`unknown` existe), e quem sabe o que está fazendo não pode ser impedido de
   * pegar o arquivo · errar pro lado de **não disparar** custa um clique, e
   * errar pro outro custa um download inútil.
   */
  const viewer = viewerPlatform();
  const autoStarts = viewer === 'windows';

  useEffect(() => {
    // **Celular não baixa `.exe`**, e Mac e Linux também não · disparar ali
    // entrega um arquivo inútil e, em alguns navegadores, um aviso de segurança
    // sobre nada.
    if (!autoStarts) return;

    /**
     * **`location.assign` num link de arquivo NÃO navega** · o navegador vê o
     * `Content-Type: application/octet-stream`, começa o download e deixa a
     * página onde está, que é exatamente o que se quer aqui.
     *
     * O atraso é pra pessoa **ver** a página antes de a barra de download
     * aparecer · sem ele, o navegador rouba a atenção pro canto da tela no mesmo
     * quadro em que o texto pinta, e as instruções passam despercebidas.
     */
    /**
     * **A trava fica DENTRO do relógio, e não antes dele** · conserto de
     * 28/08/2026 (noite), achado dirigindo a página.
     *
     * Estava fora: `started.current = true` na entrada do efeito e
     * `clearTimeout` na saída. **Com o `StrictMode` isso nunca baixa nada** ·
     * ele monta, o efeito marca e agenda, ele desmonta e o cleanup cancela, ele
     * remonta e a marca **já está lá**, então o efeito volta na primeira linha e
     * o download não acontece. Em produção funcionava, e por isso passou · em
     * desenvolvimento a página anunciava *"o download começou"* e não começava.
     *
     * Aqui a marca é gravada **no disparo**, que é o evento que ela protege ·
     * remontar reagenda, e o arquivo sai uma vez só.
     */
    const timer = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      window.location.assign(DESKTOP_INSTALLER_URL);
    }, 700);
    return () => clearTimeout(timer);
  }, [autoStarts]);

  const steps = [
    <Trans
      key="1"
      i18nKey="desktop.thanksStep1"
      // **O nome do arquivo não quebra** · a 1280 a coluna é estreita e ele
      // partia em `GGClubs-` / `setup.exe`, que é justamente o texto que a
      // pessoa vai procurar na pasta de downloads. Visto na captura.
      components={[<code key="0" className="whitespace-nowrap text-foreground" />]}
    />,
    <Trans
      key="2"
      i18nKey="desktop.thanksStep2"
      components={[
        <strong key="0" className="text-foreground" />,
        <strong key="1" className="text-foreground" />,
      ]}
    />,
    <Trans key="3" i18nKey="desktop.thanksStep3" components={[]} />,
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SeoHead title={t('desktop.downloadTitle')} description={t('desktop.downloadBody')} />
      <SiteHeader actions={<PublicHeaderActions />} />

      <main className="flex-1">
        {/**
         * **A capa carrega a marca d'água, como as outras telas de peso do
         * produto** · sem ela esta página lia como um aviso de sistema, e não
         * como uma tela do GGClubs. É a mesma peça da landing e do cartão de
         * campeonato.
         */}
        <section className="relative overflow-hidden border-b border-border/60 bg-card/30">
          <BrandWatermark />
          <div className="container relative py-12 text-center sm:py-16">
            {/**
             * **O ponto pulsando é o sinal de que ALGO está acontecendo** · a
             * página dispara o arquivo 700ms depois de pintar, e sem um sinal
             * vivo ela parece uma tela estática que não fez nada.
             */}
            {/**
             * **O selo só pulsa quando o download começou de verdade** · em
             * Mac, Linux e celular ele mentiria, e "o download começou" com
             * nada acontecendo é a tela contradizendo o navegador.
             */}
            {autoStarts && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {t('desktop.thanksTitle')}
              </span>
            )}

            {/**
             * **O título é o motivo de instalar, e não o nome do que se instala**
             * · ver o docblock. O aviso de exemplo embaixo é o mesmo desenho da
             * landing, e é o que o app faz que o site não consegue: chegar com o
             * navegador fechado.
             */}
            <h1 className="mx-auto mt-5 max-w-2xl font-display text-3xl uppercase leading-tight text-foreground sm:text-4xl">
              {t('desktop.downloadPitchTitle')}
            </h1>
            <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
              {t('desktop.downloadPitchBody')}
            </p>
            <AppNotice
              className="mx-auto mt-5 max-w-sm text-left"
              title={t('desktop.noticeTitle')}
              body={t('desktop.noticeBody')}
              alt={t('desktop.noticeAlt')}
            />
            {/**
             * **A frase da capa depende de ter começado alguma coisa.**
             *
             * *"Se não começar sozinho, clique aqui"* é verdade no Windows e
             * **mentira em todo o resto** · nada ia começar. Quem não está no
             * Windows lê o que existe pra ele **antes** de qualquer outra coisa,
             * e o link continua ali · quem está no Mac pode estar baixando pro
             * PC de casa, que é o caso que o rodapé já reconhecia.
             */}
            {autoStarts ? (
              <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
                <Trans
                  i18nKey="desktop.thanksBody"
                  components={[
                    // O caminho manual · ele salva quem tem bloqueador de
                    // download, e por isso não é um botão escondido.
                    <a
                      key="0"
                      href={DESKTOP_INSTALLER_URL}
                      className="text-primary underline underline-offset-4"
                    />,
                  ]}
                />
              </p>
            ) : (
              <WarningNote
                icon={null}
                className="mx-auto mt-4 max-w-prose justify-center px-3 py-2 text-center"
              >
                {t(viewer === 'mobile' ? 'desktop.downloadMobile' : 'desktop.downloadOtherDesktop')}
              </WarningNote>
            )}
            {/**
             * **No celular o instalador não é oferecido nem como link** · ele
             * não roda ali de jeito nenhum, e um `.exe` na pasta de downloads
             * do telefone é lixo com aviso de segurança junto.
             */}
            {!autoStarts && viewer !== 'mobile' && (
              <p className="mt-3 text-sm">
                <a
                  href={DESKTOP_INSTALLER_URL}
                  className="text-primary underline underline-offset-4"
                >
                  {t('desktop.downloadAnyway')}
                </a>
              </p>
            )}
            {/**
             * **O tamanho do arquivo é informação de quem vai baixar** · no
             * celular ninguém vai, e ali *"Windows 10 ou 11 · ~5 MB"* debaixo
             * de um aviso que acabou de dizer que o app é de computador é a
             * tela repetindo o que ela mesma negou.
             */}
            {viewer !== 'mobile' && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t('desktop.downloadMeta', { mb: DESKTOP_INSTALLER_MB })}
              </p>
            )}
          </div>
        </section>

        {/**
         * **No celular os três passos não têm serventia nenhuma** · eles
         * ensinam a abrir um `.exe`, e ali não há arquivo nem para onde levá-lo.
         * No Mac e no Linux eles **ficam**: a pessoa pode estar baixando pro PC
         * de casa, que é o caso que o rodapé já reconhecia.
         */}
        {viewer !== 'mobile' && (
          <div className="container max-w-3xl py-10 sm:py-14">
            <h2 className="text-center font-display text-xl uppercase text-foreground">
              {t('desktop.thanksStepsTitle')}
            </h2>

            {/**
             * **Três cartões chanfrados, e não uma lista de texto** · a página
             * recebe quem já decidiu instalar, e ela estava lendo como parágrafo
             * corrido (apontado pelo Eduardo em 28/08/2026). O chanfro é a
             * geometria da marca · ver o `Chamfer`.
             *
             * **O do meio é o que importa**, e por isso ele é o único com borda
             * de destaque: é o passo que a pessoa relê com o aviso do Windows na
             * frente dela.
             */}
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {steps.map((body, index) => (
                <Chamfer
                  as="li"
                  key={index}
                  border={index === 1 ? 'bg-primary/40' : 'bg-border/60'}
                  innerClassName="bg-card p-5"
                >
                  <span className="font-display text-2xl text-primary">{index + 1}</span>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </Chamfer>
              ))}
            </ol>
          </div>
        )}

        {/**
         * **O campeonato que o app acompanha** · a edição em destaque, com o
         * card de sempre. No Windows ela preenche o tempo morto do download; no
         * celular ela é o que a pessoa veio fazer, porque instalar não é.
         */}
        {edition && (
          <section className="container max-w-3xl pb-10 sm:pb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              {stage === 'playing'
                ? t('landing.tournamentsOverline')
                : stage === 'signup'
                  ? t('landing.tournamentsOverlineSignup')
                  : stage === 'soon'
                    ? t('landing.nextEditionTitle')
                    : stage === 'waiting'
                      ? t('tournament.groupWaiting')
                      : t('landing.tournamentsOverlinePast')}
            </p>
            <h2 className="mt-1 font-display text-xl uppercase text-foreground">
              {t('desktop.editionTitle')}
            </h2>
            <div className="mt-4">
              <TournamentCard tournament={edition} href={tournamentPath(edition.slug)} featured />
            </div>
            <Button asChild variant="ctaOutline" size="sm" className="mt-4">
              <Link to="/campeonatos">{t('landing.tournamentsCta')}</Link>
            </Button>
          </section>
        )}

        {/**
         * **Toda tela precisa de saída · inclusive esta, e inclusive no
         * celular.**
         *
         * Ela morava dentro do bloco dos passos, e esconder os passos no
         * telefone teria levado a saída junto · a tela ficaria sem porta
         * nenhuma pra quem justamente não tem o que fazer ali. É a regra do
         * `CLAUDE.md`, e ela quase foi furada por um `&&`.
         */}
        <div className="container max-w-3xl pb-14 text-center">
          <Button asChild variant="ghost">
            <Link to="/">{t('desktop.thanksBackHome')}</Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
