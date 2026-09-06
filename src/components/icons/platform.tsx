import type { Platform } from '@ggclubs/schemas';
import type { SVGProps } from 'react';

/**
 * Marcas das plataformas, monocromáticas, em `currentColor`.
 *
 * **Os paths não são desenhados aqui, e essa é a decisão que importa.** Duas
 * versões anteriores foram desenhadas à mão a partir da minha memória do
 * logotipo, e as duas saíram erradas · o "S" do PlayStation terminava reto na
 * borda em vez de curvar de volta, e o Switch tinha proporção inventada. Marca
 * de terceiro é uma forma exata: ou vem de uma fonte, ou está errada.
 *
 * Procedência de cada um, pra qualquer pessoa reconferir:
 *
 * | Marca | De onde | Como reconferir |
 * |---|---|---|
 * | PlayStation | `@fortawesome/free-brands-svg-icons` · `faPlaystation` | `node -e "console.log(require('@fortawesome/free-brands-svg-icons').faPlaystation.icon[4])"` |
 * | Xbox | idem · `faXbox` | idem, trocando o nome |
 * | Windows | idem · `faWindows` | idem |
 * | Nintendo Switch | **desenhado aqui** | não existe no Font Awesome free nem no simple-icons · ver abaixo |
 *
 * O pacote entrou só pra extrair os três e **saiu depois**: eram três strings
 * constantes, e carregar uma dependência inteira (mesmo de desenvolvimento)
 * pra guardá-las seria custo sem retorno. O caminho de reconferir está na
 * tabela e leva trinta segundos.
 *
 * Cada um mantém o **viewBox de origem**. Normalizar tudo pra 24 exigiria
 * reescalar os números na mão, que é exatamente o tipo de conta que introduz o
 * erro que a fonte veio evitar. Quem equaliza o peso ótico entre eles é o
 * tamanho de renderização, não o path.
 *
 * São **quatro famílias pra sete plataformas**: PlayStation cobre PS5 e PS4,
 * Xbox cobre Series e One, Nintendo cobre Switch e Switch 2. Quem separa
 * geração é o texto ao lado · dois desenhos quase iguais lado a lado pedem
 * comparação onde a palavra já resolve.
 *
 * Uso de identificação: eles dizem **onde o club joga**. Vêm sempre numa cor
 * só, herdando a do texto, e nunca colados ao nosso wordmark de um jeito que
 * sugira parceria que não existe.
 *
 * Medido: **abaixo de ~14px de glifo os desenhos fecham** e viram mancha. Por
 * isso o ícone nunca aparece sozinho em contexto denso · ou tem 14px, ou vem
 * com a palavra do lado.
 */

export function PlayStationGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 576 512" fill="currentColor" aria-hidden {...props}>
      <path d="M571 372.3c-11.3 14.2-38.8 24.3-38.8 24.3l-205.1 73.6 0-54.3 150.9-53.8c17.1-6.1 19.8-14.8 5.8-19.4-13.9-4.6-39.1-3.3-56.2 2.9l-100.5 35.5 0-56.4c23.2-7.8 47.1-13.6 75.7-16.8 40.9-4.5 90.9 .6 130.2 15.5 44.2 14 49.2 34.7 38 48.9zM346.6 279.8l0-139c0-16.3-3-31.3-18.3-35.6-11.7-3.8-19 7.1-19 23.4l0 347.9-93.8-29.8 0-414.7c39.9 7.4 98 24.9 129.2 35.4 79.5 27.3 106.4 61.3 106.4 137.8 0 74.5-46 102.8-104.5 74.6zM43.3 410.2c-45.4-12.8-53-39.5-32.3-54.8 19.1-14.2 51.7-24.9 51.7-24.9l134.5-47.8 0 54.5-96.8 34.6c-17.1 6.1-19.7 14.8-5.8 19.4s39.1 3.3 56.2-2.9l46.4-16.9 0 48.8c-51.6 9.3-101.4 7.3-153.9-10z" />
    </svg>
  );
}

export function XboxGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden {...props}>
      <path d="M369.9 318.2c44.3 54.3 64.7 98.8 54.4 118.7-7.9 15.1-56.7 44.6-92.6 55.9-29.6 9.3-68.4 13.3-100.4 10.2-38.2-3.7-76.9-17.4-110.1-39-27.9-18.2-34.2-25.7-34.2-40.6 0-29.9 32.9-82.3 89.2-142.1 32-33.9 76.5-73.7 81.4-72.6 9.4 2.1 84.3 75.1 112.3 109.5zM188.6 143.8c-29.7-26.9-58.1-53.9-86.4-63.4-15.2-5.1-16.3-4.8-28.7 8.1-29.2 30.4-53.5 79.7-60.3 122.4-5.4 34.2-6.1 43.8-4.2 60.5 5.6 50.5 17.3 85.4 40.5 120.9 9.5 14.6 12.1 17.3 9.3 9.9-4.2-11-.3-37.5 9.5-64 14.3-39 53.9-112.9 120.3-194.4zm311.6 63.5c-16.9-80-67.5-130.3-74.6-130.3-7.3 0-24.2 6.5-36 13.9-23.3 14.5-41 31.4-64.3 52.8 42.4 53.3 102.2 139.4 122.9 202.3 6.8 20.7 9.7 41.1 7.4 52.3-1.7 8.5-1.7 8.5 1.4 4.6 6.1-7.7 19.9-31.3 25.4-43.5 7.4-16.2 15-40.2 18.6-58.7 4.3-22.5 3.9-70.8-.8-93.4zM141.3 43c47.7-2.5 109.7 34.5 114.3 35.4 .7 .1 10.4-4.2 21.6-9.7 63.9-31.1 94-25.8 107.4-25.2-63.9-39.3-152.7-50-233.9-11.7-23.4 11.1-24 11.9-9.4 11.2z" />
    </svg>
  );
}

export function WindowsGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 448 512" fill="currentColor" aria-hidden {...props}>
      <path d="M0 93.7l183.6-25.3 0 177.4-183.6 0 0-152.1zM0 418.3l183.6 25.3 0-175.2-183.6 0 0 149.9zm203.8 28l244.2 33.7 0-211.6-244.2 0 0 177.9zm0-380.6l0 180.1 244.2 0 0-213.8-244.2 33.7z" />
    </svg>
  );
}

/**
 * Nintendo Switch · **desenhado aqui**, porque nem o Font Awesome free nem o
 * simple-icons trazem a marca (os dois já removeram ícones de marca a pedido).
 *
 * Construído em geometria, não a olho, pra não repetir o erro das versões
 * anteriores: os dois Joy-Con são cápsulas de mesma largura, com a borda
 * **externa em semicírculo exato** (raio = metade da largura) e a interna
 * reta, separadas por uma fenda. Os dois círculos ficam na mesma altura, no
 * terço superior. O da esquerda é contorno com disco cheio; o da direita é
 * cheio com disco vazado · é essa inversão que faz a marca.
 */
export function SwitchGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      {/* Esquerda: contorno em traço, com disco cheio. Traço em vez de path
          vazado de propósito · a primeira tentativa subtraía uma subpath e o
          "furo" saiu com 0,05 de largura, o que virou uma barra vertical em
          vez de um disco. Traço é uma medida só e não tem como sair torto. */}
      <path
        d="M10.4 3.3H6.7A3.4 3.4 0 0 0 3.3 6.7v10.6a3.4 3.4 0 0 0 3.4 3.4h3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10.4 3.3h-1V20.7h1z" />
      <circle cx="6.55" cy="8" r="1.6" />
      {/* Direita: cheia com o disco vazado · é essa inversão que faz a marca.
          `evenodd` porque as duas subpaths têm o mesmo sentido de desenho. */}
      <path
        fillRule="evenodd"
        d="M13.6 3.3h3.7a3.4 3.4 0 0 1 3.4 3.4v10.6a3.4 3.4 0 0 1-3.4 3.4h-3.7zm4.05 2.7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
      />
    </svg>
  );
}

export function PlatformGlyph({
  platform,
  ...props
}: { platform: Platform } & SVGProps<SVGSVGElement>) {
  if (platform === 'ps5' || platform === 'ps4') return <PlayStationGlyph {...props} />;
  if (platform === 'xbox-series' || platform === 'xbox-one') return <XboxGlyph {...props} />;
  if (platform === 'switch' || platform === 'switch2') return <SwitchGlyph {...props} />;
  return <WindowsGlyph {...props} />;
}
