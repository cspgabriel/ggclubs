import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandWatermark, Wordmark } from '@/components/brand';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Marquee } from '@/components/ui/marquee';

/**
 * Tela de entrar na conta, usada pelo `/login` do site e pela porta do app
 * desktop. Uma só, porque as duas mostram a mesma coisa · manter duas seria
 * garantir que uma envelheça.
 *
 * O painel da esquerda carrega a identidade e some abaixo de `lg`, onde a
 * largura toda pertence ao formulário.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    /* A partir de `lg`, a janela é a moldura e **quem rola é a coluna do
       formulário**, não a página · o painel da marca é decoração e sair da
       vista junto com o conteúdo faz a tela parecer que perdeu a identidade.
       Abaixo de `lg` nada disso vale: lá só existe uma coluna e o documento
       rola normal, que é o certo no celular. */
    <div className="flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      {/* `min-h-0` é o que faz a rolagem interna existir. Filho de flex nasce
          com `min-height: auto`, então ele se recusa a encolher abaixo do
          conteúdo e o `overflow-y-auto` do neto nunca chega a valer · o
          conteúdo simplesmente empurra a página. */}
      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-center overflow-hidden bg-card px-12 lg:flex">
          <BrandWatermark />

          {/* Luz de palco · verde difuso saindo de baixo, como refletor de
              estádio. Ilumina sem pintar a área de verde. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-[100px]"
          />

          <div className="relative">
            <Wordmark size="entry" />
            {/* Entrelinha junto do tamanho (`text-4xl/[0.95]`) e repetida em cada
                breakpoint de propósito: `xl:text-5xl` carrega entrelinha própria
                e sobrescreve um `leading-` solto, então a headline mudava de
                respiro só em certas larguras.
                E não desce de 0.95 · em caixa alta o acento de Ó/Á sobe acima da
                altura de caixa e encosta na linha de cima. Os dois idiomas do
                produto têm acento. */}
            <h1 className="mt-12 font-display text-4xl/[0.95] uppercase tracking-tight xl:text-5xl/[0.95]">
              <span className="block text-primary">{t('auth.panelLine1')}</span>
              <span className="block text-foreground">{t('auth.panelLine2')}</span>
            </h1>
            <p className="mt-6 max-w-sm text-base font-bold leading-snug text-foreground">
              {t('auth.panelPitch')}
            </p>
          </div>

          <DiagonalEdge />
        </section>

        {/* Centralizar na vertical em tela alta de celular empurra o formulário
            pra baixo · a regra já vale no hero da landing, e vale aqui também. */}
        {/* Centralizar por `my-auto` no filho, e **não** por `justify-center` no
            container: com rolagem interna, `justify-center` empurra o começo do
            conteúdo pra fora da área rolável quando ele não cabe, e aí o topo do
            formulário fica inalcançável. Margem automática centraliza quando
            sobra espaço e se rende quando falta. */}
        <section className="flex flex-col px-6 py-10 sm:px-12 lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-sm sm:my-auto">
            <div className="mb-10 flex items-center justify-between lg:justify-end">
              <Wordmark className="lg:hidden" />
              <LanguageSwitcher />
            </div>

            <h2 className="font-display text-2xl uppercase tracking-tight">{title}</h2>
            <p className="mb-8 mt-2 text-sm text-muted-foreground">{subtitle}</p>

            {children}
          </div>
        </section>
      </div>

      <Marquee items={t('landing.marquee').split(' · ')} />
    </div>
  );
}

/**
 * Aresta diagonal separando os painéis, com o fio de luz nascendo da mesma
 * coordenada do corte · desenhados juntos de propósito. Quando eram dois
 * elementos calculados separado, a linha corria paralela e deslocada, e lia
 * como risco perdido em vez de contorno.
 *
 * É a regra da marca em escala de layout: corta o canto superior esquerdo e o
 * inferior direito.
 */
function DiagonalEdge() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-y-0 right-0 h-full w-24 text-primary"
    >
      <defs>
        <linearGradient id="auth-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="45%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="100,0 100,100 0,100 55,0" className="fill-background" />
      <line
        x1="55"
        y1="0"
        x2="0"
        y2="100"
        stroke="url(#auth-edge)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
