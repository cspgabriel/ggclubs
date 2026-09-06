import { groupCount, type BracketSize } from '@ggclubs/schemas';
import { type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { groupLetter } from './tournament-shared.js';
import {
  DIAGRAM_COLUMN_CAP,
  DIAGRAM_COLUMN_CAP_LG,
  balancedColumns,
} from './format-diagram-columns.js';

/**
 * **O formato, desenhado** · e a frase ao lado é a manchete, não a legenda.
 *
 * Até 19/08/2026 este painel eram dois ladrilhos grandes ("3 GRUPOS" e "8
 * CLASSIFICAM") com a frase do formato embaixo, em cinza pequeno. O Eduardo leu
 * a tela e apontou o que estava invertido: *"essa parte que é importante, muito
 * sutil"*, sobre a frase.
 *
 * Ele está certo, e a razão é que **os números sozinhos não são informação**.
 * "3" e "8" só significam alguma coisa depois de a pessoa saber que são grupos
 * de quatro e que passam dois de cada · quem carrega isso é a frase, e ela
 * estava em `text-xs text-muted-foreground`.
 *
 * **O desenho substitui os ladrilhos** porque ele responde a mesma pergunta sem
 * exigir a conta: doze quadradinhos em três colunas, com os dois de cima de cada
 * coluna acesos, **é** "3 grupos de 4, passam 2".
 *
 * > **E ele repete em desenho o que a frase diz em palavras · isso é de
 * > propósito, e foi pesado em 03/09/2026.** O que o desenho tem e a frase não
 * > tem é a **proporção**: quantos ficam de fora por grupo, e o tamanho relativo
 * > da fase de grupos. É o que faz a página parecer produto e não formulário.
 * > O que ele **não** merecia era a altura: a linha do grupo perdeu a entrelinha
 * > solta da letra e um degrau de vão, e em 12 grupos o painel encolheu ~11% sem
 * > perder nada do que ele conta.
 *
 * **Ele saiu do `tournament-hero.tsx` em 03/09/2026** · o arquivo já é grande, e
 * a peça tem regra de grade própria, que agora mora ao lado dela em
 * [format-diagram-columns.ts](./format-diagram-columns.ts).
 */
export function FormatDiagram({ size }: { size: BracketSize }) {
  const groups = groupCount(size);
  return (
    <div
      aria-hidden
      // A âncora existe pra teste e pra probe · o diagrama não tem texto, então
      // não há nada no DOM que o identifique.
      data-format-diagram
      data-groups={groups}
      style={
        {
          '--cols': balancedColumns(groups, DIAGRAM_COLUMN_CAP),
          '--cols-lg': balancedColumns(groups, DIAGRAM_COLUMN_CAP_LG),
        } as CSSProperties
      }
      className={cn(
        /**
         * **Grade, e não `flex-wrap`** · 19/08/2026, achado do Eduardo no
         * cenário de 12 grupos: o embrulho enfileirava **nove numa linha e três
         * na outra**, e a segunda ficava órfã sob uma fileira cheia.
         *
         * **O número de colunas é calculado, e não um teto** · 03/09/2026. O
         * teto sozinho produzia o mesmo defeito com outra cara: 8 grupos com
         * teto 6 quebravam em 6+2. Quem escolhe é o `balancedColumns`, e o
         * porquê está no módulo dele.
         *
         * O contador vem em variável CSS porque o valor é **dado**, e não
         * classe · são duas (`--cols` e `--cols-lg`) porque o teto muda no
         * breakpoint, e `min()` não vale dentro de `repeat()`.
         */
        /**
         * **`minmax(0,1fr)`, e essa é a regra da casa pra trilha de grade**
         * (ver `docs/design.md`) · item de grid nasce com `min-width: auto` e se
         * recusa a encolher, e foi assim que o diagrama de 12 grupos empurrou a
         * frase pra fora da tela a 768px em 19/08, com a página rolando 84px de
         * lado. Com a trilha flexível **isso deixa de ser possível em qualquer
         * largura**, e não só na que foi medida.
         *
         * As trilhas eram `auto` até 03/09, e é o que deixava o desenho
         * empoçado à esquerda do card no celular: quatro caixinhas de 28px numa
         * caixa de 280 e o resto vazio. Trilha `1fr` **distribui o que sobra
         * entre as colunas** em vez de acumular tudo na direita, e por isso o
         * `justify-start`/`md:justify-center` saiu junto · não há mais conjunto
         * a alinhar dentro de uma caixa maior que ele.
         */
        'grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-3 gap-y-3',
        'lg:grid-cols-[repeat(var(--cols-lg),minmax(0,1fr))]',
        /**
         * **O teto de 40% é rede de segurança, e não o layout** · a partir de
         * `sm` o diagrama divide a linha com a frase e se mede pelo próprio
         * conteúdo (as barras têm largura fixa lá), o que dá ~180px em quatro
         * colunas e ~276px em seis. O teto só entraria em cena numa edição com
         * muito mais grupos do que o produto tem · e é ele que impede que esse
         * dia volte a empurrar a frase pra fora da tela.
         */
        'min-w-0 sm:max-w-[40%]',
      )}
    >
      {Array.from({ length: groups }, (_, g) => (
        <div key={g} data-format-group className="flex flex-col items-center gap-1">
          <span className="font-display text-[10px] uppercase leading-none tracking-widest text-muted-foreground">
            {groupLetter(g)}
          </span>
          <div className="flex w-full flex-col items-center gap-1">
            {Array.from({ length: size.groupSize }, (_, slot) => (
              <span
                key={slot}
                data-format-slot
                className={cn(
                  /**
                   * **A barra acompanha a coluna no celular e é fixa a partir de
                   * `sm`** · empilhado, o diagrama ocupa a largura inteira do
                   * card e as barras crescem com a trilha (com teto de 48px, pra
                   * a caixinha continuar lendo como grupo e não como risco).
                   *
                   * A partir de `sm` ela **precisa** ser largura definida: lá a
                   * caixa do diagrama se mede pelo conteúdo, e conteúdo em
                   * porcentagem não tem largura intrínseca · com `w-full` a
                   * coluna mediria zero e o desenho colapsaria numa tira.
                   */
                  'h-1.5 w-full max-w-12 rounded-full sm:w-9',
                  // **Aceso é quem passa** · a leitura é de cima pra baixo, que
                  // é a ordem da tabela do grupo logo abaixo na página.
                  slot < size.qualifiersPerGroup
                    ? 'bg-primary'
                    : /**
                       * **O slot da repescagem é vazado, e não meio-tom** · o
                       * primeiro desenho usava `bg-primary/50`, e na captura de
                       * 19/08 os três primeiros liam como três barras verdes:
                       * o diagrama afirmava que passam **3** de cada grupo, ao
                       * lado de uma frase dizendo que passam 2.
                       *
                       * Vazado ele diz o que é · a vaga existe e não está
                       * garantida. É a mesma distinção que a tabela faz entre a
                       * barra chapada e a de repescagem, dita na forma em vez
                       * de na opacidade, que a 6px de altura não se lê.
                       */
                      slot === size.qualifiersPerGroup && size.bestThirds > 0
                      ? 'border border-primary/70 bg-transparent'
                      : 'bg-border',
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
