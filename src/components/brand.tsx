import { useTranslation } from 'react-i18next';
import logoUrl from '@/assets/brand/logo.svg';
import wordmarkUrl from '@/assets/brand/wordmark.svg';
import symbolUrl from '@/assets/brand/symbol.svg';
import { cn } from '@/lib/utils';

// A marca é larga (5,8:1), então altura fixa em tela estreita empurra o resto do
// header pra fora. Em celular a densidade é 2x ou 3x, e o desenho aguenta ser
// menor; o tamanho maior existe pro desktop, onde a tela é 1x e as contraformas
// começam a fechar abaixo de ~36px. Ver docs/design.md · Marca.
// A marca ocupa cerca de metade da altura da barra · mais que isso e o header
// engorda pra acomodá-la, que foi o efeito do primeiro corte.
const SIZE = {
  header: 'h-7 sm:h-9',
  entry: 'h-9 sm:h-12',
} as const;

type BrandProps = {
  className?: string;
  size?: keyof typeof SIZE;
  /**
   * Avisa quando o desenho está de fato na tela.
   *
   * A marca é **arquivo**, então ela chega por uma requisição própria · quem
   * desenhar algo ao lado dela com CSS puro aparece primeiro e fica sozinho no
   * meio do preto. É o que acontecia no `BootSplash`, e o único consumidor
   * disto hoje é ele. Dispara também no erro: peça escondida esperando um
   * evento que não vem é pior que peça fora de ordem.
   */
  onReady?: () => void;
};

/** Nome da marca. Não usar ao lado do símbolo: a inicial apareceria duas vezes. */
export function Wordmark({ className, size = 'header', onReady }: BrandProps) {
  const { t } = useTranslation();
  return (
    <img
      src={wordmarkUrl}
      alt={t('common.brandName')}
      onLoad={onReady}
      onError={onReady}
      className={cn(SIZE[size], 'w-auto max-w-full', className)}
    />
  );
}

/** Logotipo com a placa. Para peça isolada, não para header. */
export function Logo({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <img
      src={logoUrl}
      alt={t('common.brandName')}
      className={cn('h-[85px] w-auto max-w-full', className)}
    />
  );
}

/** Só o GG, para onde o contexto já diz o nome. */
export function BrandSymbol({ className }: { className?: string }) {
  return <img src={symbolUrl} alt="" aria-hidden className={cn('h-8 w-8', className)} />;
}

/**
 * Textura de fundo com o símbolo GG repetido. É padrão, não peça posicionada:
 * um ladrilho não tem lugar certo pra cair, então ele se comporta igual em
 * qualquer proporção de tela.
 *
 * A versão anterior era um símbolo só, a 125% da altura do painel e sangrando
 * por duas bordas. Nessa escala o GG não lê como marca · lê como mancha, e a
 * mancha mudava de lugar a cada resolução porque o símbolo é assimétrico e a
 * proporção do painel vai de 0,85:1 a 2,4:1. Não existia percentual que
 * servisse pra todas.
 */
export function BrandWatermark({
  className,
  tile,
}: {
  className?: string;
  /**
   * O tamanho do ladrilho, quando o padrão não serve.
   *
   * **O padrão tem degrau por JANELA (`sm:`), e isso é certo pra painel de
   * página e errado pra card** · um card de 340px numa janela de 1280 recebe o
   * ladrilho de 7rem e o GG deixa de ler como campo: viram duas letras grandes
   * atrás do texto. Quem sabe a própria largura é o card, então ele diz.
   *
   * Substitui as duas classes de tamanho, e não acrescenta uma terceira ·
   * passar só a base deixaria o `sm:` de pé e o defeito voltaria acima de 640.
   */
  tile?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        // Desce até a base sem chegar no texto · o painel ganha volume embaixo,
        // que é onde não tem nada disputando atenção.
        '[mask-image:linear-gradient(to_top,#000_20%,transparent_85%)]',
        className,
      )}
    >
      <span
        // **As aspas não são estilo, são o que faz isto funcionar no build.**
        // O `symbol.svg` tem 463 bytes, abaixo do limite do Vite, então em
        // produção ele vira **data URI embutida** · e ela carrega aspas simples
        // (`fill='%2307F469'`). Um `url()` sem aspas não pode conter aspas: o
        // CSS invalida a declaração, o React atribui pelo CSSOM, o navegador
        // recusa calado, e o atributo `style` nem chega a existir.
        //
        // Em dev a URL é um caminho limpo (`/src/assets/...`), então o defeito
        // **só aparece no build** · a marca d'água sumiu de toda tela que a usa
        // e ninguém viu, porque captura de dev mostrava ela lá.
        style={{ backgroundImage: `url("${symbolUrl}")` }}
        className={cn(
          // Escala em rem, não em porcentagem · é o que mantém o ladrilho do
          // mesmo tamanho de 1024 a 2560. O degrau no celular é porque com
          // 7rem cabem três colunas numa tela de 375px, e três símbolos grandes
          // não lêem como campo · lêem como mancha, que é o defeito anterior.
          'absolute -inset-full opacity-[0.05]',
          tile ?? 'bg-[length:4.5rem_4.5rem] sm:bg-[length:7rem_7rem]',
          // Inclinado no ângulo do chanfro da marca. Ortogonal, a fileira
          // encosta na borda e o símbolo fica pela metade, que lê como erro;
          // inclinado, o mesmo corte lê como campo de fundo.
          //
          // **`-inset-full` e não `-inset-1/2`, e é isto que consertou o corte
          // diagonal.** O elemento é girado 18 graus, então a área que ele cobre
          // encolhe nos cantos · com 200% do pai, o canto de baixo à direita de
          // uma caixa larga e baixa (a capa tem 1232x194) ficava **fora** do
          // retângulo girado, e o que aparecia ali não era o ladrilho cortado:
          // era a **borda do próprio elemento**, em diagonal. O diagnóstico foi
          // do Eduardo, em 08/08/2026 · com 300% sobra margem pra qualquer
          // proporção.
          'rotate-[-18deg]',
        )}
      />
    </span>
  );
}
