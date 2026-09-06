import { featuredEdition } from '@ggclubs/schemas';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandWatermark } from '@/components/brand';
import { DesktopDownloadSection, HeroDownloadLine } from '@/components/desktop/download-section';
import { SeoHead } from '@/components/seo-head';
import { useTournamentList } from '@/lib/use-tournament';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { ShowcaseBracket } from '@/components/tournament/showcase-bracket';
import { ShowcasePanels } from '@/components/tournament/showcase-panels';
import { TournamentClosing } from '@/components/tournament/tournament-closing';
import { TournamentPitch } from '@/components/tournament/tournament-pitch';
import { TournamentTerms } from '@/components/tournament/tournament-terms';
import { Button } from '@/components/ui/button';
import { Marquee } from '@/components/ui/marquee';

/*
 * **O `PILLARS` saiu daqui em 12/08/2026, junto da seção que o desenhava.**
 *
 * As chaves de catálogo (`landing.pillar*`) continuam no lugar de propósito ·
 * elas são copy validada pelo Eduardo em 08/08. Uma delas voltou pra tela em
 * 03/09/2026 como a frase da seção de preço (`pillarPrizeBody`), que é
 * exatamente o argumento que ela sempre foi.
 *
 * ---
 *
 * **A landing foi recomposta em 03/09/2026 pra vender campeonato**, a partir
 * da leitura da pendência 172 e do foco que o Eduardo explicitou no dia
 * anterior. A ordem das seções é a ordem em que a pergunta de quem chega muda:
 *
 * | seção | a pergunta |
 * |---|---|
 * | hero, com a chave desenhada | o que é isso? |
 * | a edição de verdade | tem um acontecendo? |
 * | tabela, súmula e aviso | o que muda em relação ao grupo? |
 * | preço, escada e reembolso | quanto custa, e se não encher? |
 * | o fecho | o passo concreto |
 *
 * **O card do app saiu do hero.** Ele era produto secundário no espaço mais
 * caro da página, e a página inteira não mostrava uma chave, uma tabela, um
 * placar · quem chegava não via o que compra. O app continua na seção dele,
 * depois do fecho, e no `/download`.
 */

export function LandingPage() {
  const { t } = useTranslation();
  /**
   * **A landing busca os campeonatos**, e essa é a única busca dela.
   *
   * Ela é rota aberta e sem sessão, então a chamada não puxa o SDK do Firebase
   * (a regra do `PUBLIC_PATH` no cliente de API) · o custo é uma requisição que
   * duas seções usam pra mostrar dado de verdade em vez de prosa: a edição em
   * destaque e o preço dela.
   *
   * **Falhar aqui não quebra a landing** · a seção da edição some, e a de
   * preço cai pra regra geral.
   */
  const { tournaments, proof, failed } = useTournamentList();
  /**
   * **A mesma pergunta que a sobrelinha da seção faz**, e pela mesma função ·
   * ver o `featuredEdition`. Enquanto eram duas condições escritas à mão elas
   * divergiam de graça.
   */
  const { edition: featured, stage } = featuredEdition(tournaments);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* **O título não é só a marca desde 08/08/2026** · quem vê o resultado
          de busca decide por ele. A descrição é a mesma promessa do hero, pra
          não haver duas versões do produto entre a busca e a tela. */}
      <SeoHead
        title={`${t('common.brandName')} · ${t('common.brandTagline')}`}
        description={t('landing.seoDescription')}
      />

      <SiteHeader actions={<PublicHeaderActions />} />

      {/* O hero mantém a composição própria dentro do conteúdo principal da página. */}
      {/* O `container` fica no filho, não aqui: a marca d'água e a luz de palco
          são fundo e precisam da largura da tela inteira. */}

      <main>
        <section data-landing-hero className="relative overflow-hidden py-6 sm:py-12">
          <BrandWatermark />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-[110px]"
          />
          {/* A partir de 768px, tipografia e demonstração se ajustam à largura de cada coluna. */}
          <div
            // scan-spacing: ok · vão de composição entre as duas colunas do hero, e não de pilha
            className="container relative grid gap-6 md:grid-cols-2 md:items-center md:gap-8 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-14"
          >
            <div>
              {/* **O termo do jogo é a peça grande, e isso é decisão de 08/08/2026** ·
              o Eduardo pediu destaque diferente pro termo, e ele é o que faz
              quem joga se reconhecer. A hierarquia é tamanho e cor juntos, e a
              regra antiga do `design.md` (o contraste é a hierarquia, não o
              tamanho) vale entre linhas iguais · aqui elas são deliberadamente
              desiguais.

              Entrelinha anda junto do tamanho em cada breakpoint, e não desce
              de 0.9 · abaixo disso o acento em caixa alta encosta na linha de
              cima. */}
              <h1 className="font-display uppercase tracking-tight">
                <span className="block text-[clamp(1rem,4.5vw,1.5rem)] tracking-[0.12em] text-foreground sm:text-2xl lg:text-3xl">
                  {t('landing.heroEyebrow')}
                </span>
                <span className="block text-[clamp(2rem,11.5vw,3rem)]/[0.9] text-primary sm:text-7xl/[0.9] md:text-5xl/[0.9] lg:text-7xl/[0.9] xl:text-8xl/[0.9]">
                  {t('landing.heroFocus')}
                </span>
                <span className="block text-[clamp(1.25rem,6vw,1.75rem)]/[0.95] text-foreground sm:text-4xl/[0.95] md:text-2xl/[0.95] lg:text-4xl/[0.95] xl:text-5xl/[0.95]">
                  {t('landing.heroLine2')}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg font-bold leading-snug text-foreground lg:text-2xl">
                <Trans i18nKey="landing.pitch">
                  <span className="text-primary" />
                </Trans>
              </p>

              {/* **O CTA do hero continua sendo o de criar conta** · correção do
              Eduardo em 12/08/2026: apontá-lo pro campeonato atendia uma
              intenção sacrificando a outra. Quem quer ver o campeonato tem a
              seção logo abaixo, com o chamariz aqui do lado. */}
              {/* **Largura total no celular, e não é gosto: a 320px o rótulo vazava
              a tela** · visto na captura em 08/08/2026. */}
              <Button
                asChild
                variant="cta"
                size="hero"
                className="mt-6 w-full whitespace-normal text-center sm:w-fit"
              >
                {/* `?criar=1`, como em todo o resto do produto · sem ele o maior
                botão do produto entregava o formulário de entrar. */}
                <Link to="/login?criar=1">{t('landing.cta')}</Link>
              </Button>

              {/**
               * **O chamariz leva PRA EDIÇÃO, e não pra uma âncora** · correção do
               * Eduardo em 03/09/2026.
               *
               * As três formas da frase prometem **um** campeonato, no singular ·
               * *"veja o campeonato que está rolando"*, *"inscreva seu club no
               * campeonato aberto"*, *"veja a última edição"*. Uma âncora que rola
               * pra uma seção da mesma página entrega menos do que a frase disse,
               * e o clique é o momento de maior intenção da tela.
               *
               * **O destino é a página da edição em destaque**, que é onde a
               * inscrição acontece · quem quer a lista inteira tem o botão da
               * seção e o rodapé. Sem edição nenhuma a linha não existe, então
               * nunca há link pra lugar nenhum.
               */}
              {featured && (
                <p className="mt-4 text-sm text-muted-foreground">
                  <Trans
                    i18nKey={
                      stage === 'playing'
                        ? 'landing.heroSeeTournaments'
                        : stage === 'signup'
                          ? 'landing.heroSeeTournamentsSignup'
                          : stage === 'soon' || stage === 'waiting'
                            ? 'landing.heroSeeTournamentsSoon'
                            : 'landing.heroSeeTournamentsPast'
                    }
                  >
                    <Link
                      to={`/campeonato/${featured.slug}`}
                      className="text-primary underline-offset-4 hover:underline"
                    />
                  </Trans>
                </p>
              )}

              {/* **A chamada do app no hero é uma LINHA, e não um segundo botão** ·
              pedido do Eduardo em 28/08/2026. O app não substitui a conta, e um
              botão aqui ofereceria o passo 2 antes do passo 1. Só no Windows,
              porque é a única plataforma com app. */}
              <HeroDownloadLine />
            </div>

            <ShowcaseBracket className="mx-auto w-full max-w-2xl xl:max-w-none" />
          </div>
        </section>

        {/* **A edição de verdade vem logo depois do hero** · o hero diz o que é e
          a chave desenhada mostra a forma; esta seção mostra o que está
          acontecendo agora, com prêmio, vagas e prazo do banco. Prova antes
          de argumento. */}
        <TournamentPitch proof={proof} tournaments={tournaments} failed={failed} />

        {/**
         * **O que muda em relação ao grupo** · a tabela, a súmula e o aviso,
         * desenhados. É a resposta ao achado de maior retorno da pendência 172:
         * a página prometia e não mostrava.
         *
         * **O título não cita concorrente** · a gente também vai usar grupo, pra
         * captar e avisar (decisão do Eduardo, 08/08/2026). A diferença é onde o
         * campeonato acontece, e é isso que as duas linhas dizem · a segunda em
         * verde, porque é a que carrega o argumento.
         */}
        <section className="border-t border-border/60">
          <div className="container py-12 sm:py-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              {t('landing.showcaseOverline')}
            </p>
            <h2 className="mt-2 max-w-3xl font-display uppercase leading-[0.95]">
              <span className="block text-2xl text-foreground sm:text-4xl">
                {t('landing.showcaseTitle1')}
              </span>
              <span className="block text-2xl text-primary sm:text-4xl">
                {t('landing.showcaseTitle2')}
              </span>
            </h2>
            <ShowcasePanels className="mt-8" />
          </div>
        </section>

        {/**
         * **Quanto custa, e o que acontece se não encher** · pendência 172: o
         * preço só existia como selo dentro do card, e a política de reembolso
         * estava linkada só no rodapé. A maior objeção de quem paga cedo é a
         * edição não acontecer, e ela precisa ser respondida na página que vende.
         */}
        <section className="border-t border-border/60 bg-card/30">
          <div className="container py-12 sm:py-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              {t('landing.termsOverline')}
            </p>
            <h2 className="mt-2 max-w-3xl font-display text-2xl uppercase leading-[0.95] text-foreground sm:text-4xl">
              {t('landing.termsTitle')}
            </h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t('landing.pillarPrizeBody')}
            </p>
            <TournamentTerms className="mt-8" tournaments={tournaments} />
          </div>
        </section>

        {/* **O fecho da página**, e ele não repete o botão do hero: lá em cima é
          motivação, aqui é o passo concreto, depois de a pessoa ter visto a
          edição, o produto e o preço. */}
        <TournamentClosing />

        {/* **Depois do fechamento, e de propósito** · o CTA de criar conta é o
        funil, e o app é conveniência pra quem já quer. */}
        <DesktopDownloadSection />

        <Marquee items={t('landing.marquee').split(' · ')} />
      </main>
      <SiteFooter />
    </div>
  );
}
