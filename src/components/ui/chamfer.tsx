import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * **A geometria da marca, como peça de interface.**
 *
 * A regra do `docs/design.md` é de 28/07 e governa toda forma da marca · corta
 * o canto superior esquerdo e o inferior direito, e nenhuma outra. Ela nasceu no
 * símbolo, no alfabeto e na placa, e **até 18/08/2026 nunca tinha saído dos
 * SVG**: a interface inteira era retângulo de canto arredondado, que é o
 * desenho de qualquer produto. É o que faz uma peça ler como GGClubs sem
 * escrever GGClubs nela.
 *
 * **São duas camadas, e isso não é preciosismo:** `clip-path` corta a borda
 * junto com a caixa, então um cartão chanfrado com `border` fica **sem contorno
 * exatamente nos dois cantos que dão a identidade**. O pai carrega a cor da
 * borda e o corte; o filho carrega o fundo e o mesmo corte um pixel pra dentro.
 *
 * > **O `innerClassName` precisa de fundo OPACO**, e esta linha custou um
 * > cartão inteiro pintado de verde (19/08/2026). A cor da `border` mora no
 * > elemento **de trás** e o miolo só cobre um pixel a menos · com um fundo
 * > translúcido (`bg-primary/5`), o que devia ser um fio de contorno atravessa
 * > a peça e vira o fundo dela. **Nada reclama disso** · não é classe
 * > inexistente, não é vazamento, e passa nos cinco checks. Quem viu foi o
 * > Eduardo, na tela.
 *
 * **Existe como componente porque a segunda cópia nasceu em 19/08/2026**, no
 * cartão do painel de admin · e a regra da casa é extrair no trabalho em que ela
 * aparece, não depois da terceira. As duas cópias já eram seis linhas de JSX que
 * ninguém garantia iguais, e o par de `clip-path` desalinhado é o tipo de
 * defeito que passa pelos cinco checks.
 */
export function Chamfer({
  children,
  /** A cor da borda · ela vive no pai, porque o corte come a borda do filho. */
  border,
  /** O tamanho do corte. Cartão pequeno usa menos. */
  size = '0.9rem',
  className,
  innerClassName,
  /**
   * A camada de fora, quando ela precisa ser outra coisa que não uma `div` ·
   * no cartão público ela **é** o link, porque o cartão inteiro é clicável.
   */
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  border: string;
  size?: string;
  className?: string;
  innerClassName?: string;
  as?: ElementType;
} & Record<string, unknown>) {
  return (
    <Tag
      {...rest}
      className={cn('chamfer p-px', border, className)}
      style={{ ['--chamfer' as string]: size }}
    >
      <div className={cn('chamfer-inner h-full', innerClassName)}>{children}</div>
    </Tag>
  );
}
