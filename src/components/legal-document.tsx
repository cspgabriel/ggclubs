import './markdown-document.css';
import type { DiffLine } from '@ggclubs/schemas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { groupDiffLines } from '@/lib/legal-diff';
import { inlineMarkdown, parseBlocks, type Block } from '@/lib/markdown';
import { cn } from '@/lib/utils';

/**
 * O documento legal renderizado · e, quando se está comparando, **o mesmo
 * documento com o que mudou destacado dentro dele.**
 *
 * ## O que eu tinha feito errado
 *
 * A primeira versão era uma tabela de diff igual à do GitHub: duas colunas de
 * número de linha, `+`/`-` na frente, tudo em monoespaçada. O Eduardo apontou,
 * e ele está certo · aquilo serve pra quem lê **código**, e aqui quem lê é
 * alguém tentando entender **o que mudou nas regras que ele aceitou**. Ler o
 * documento inteiro em fonte de terminal, com o texto quebrado por número de
 * linha, é o oposto de responder essa pergunta.
 *
 * O que serve é o texto **como ele é**, com o trecho novo marcado e o trecho
 * que saiu riscado no lugar onde estava. A pessoa lê o documento e enxerga a
 * mudança no caminho, sem trocar de modo de leitura.
 */
export function LegalDocument({ body, headingLevel = 2 }: { body: string; headingLevel?: 2 | 3 }) {
  const { t } = useTranslation();
  // **Memoizado porque o corpo chega de um formulário** · o editor do admin
  // renderiza um por idioma contra o mesmo objeto de textos, e uma tecla no
  // campo pt-BR rerenderiza a prévia em espanhol. Sem isto, cada caractere
  // retokenizava o documento inteiro do outro idioma.
  const blocks = useMemo(() => parseBlocks(body), [body]);
  const tableLabel = t('markdown.table');

  return (
    // **Sem largura própria · quem limita é a coluna da página.**
    //
    // Ela tinha, e o efeito era o oposto do pretendido: o aviso de comparação
    // ia até a borda e o texto parava no meio, então o limite lia como **corte**
    // em vez de coluna. Quem decide a medida agora é a página, e ela vale pro
    // aviso e pro texto igual.
    //
    // **E o vão entre blocos não mora aqui** · ver `gapBefore`, logo abaixo.
    <div className="markdown-document">
      {blocks.map((block, i) => (
        <BlockView
          key={i}
          block={block}
          previous={blocks[i - 1]}
          headingLevel={headingLevel}
          tableLabel={tableLabel}
        />
      ))}
    </div>
  );
}

/**
 * O vão antes de cada bloco · **é ele quem separa um tópico do seguinte.**
 *
 * O documento era um `space-y-5`: **20px entre tudo**, inclusive entre o fim de
 * uma seção e o título da próxima. Com o vão de cima igual ao de baixo o título
 * fica flutuando entre dois blocos, a proximidade não agrupa nada, e onze
 * seções leem como uma coluna corrida · foi a leitura do Eduardo sobre o
 * regulamento da Copa de Estreia em 04/09/2026.
 *
 * A regra é a de tipografia de sempre: **o vão pertence ao que COMEÇA.** O
 * título traz o respiro grande e um fio; o primeiro bloco depois dele encosta.
 * É a razão entre os dois (36px contra 12) que faz o olho pular de tópico em
 * tópico sem ler tudo · não o tamanho da letra, que já estava certo.
 *
 * **O fio é neutro de propósito.** O verde já está gasto no traço da seção que
 * embrulha o documento, e onze marcas verdes empilhadas matariam o destaque que
 * ele existe pra dar · é a regra dos doze blocos verdes do `docs/design.md`.
 *
 * Nada disso vale pro **primeiro** bloco: fio no topo seria um risco solto
 * debaixo do título da seção, e margem ali só afastaria o documento do
 * cabeçalho que o anuncia.
 */
function gapBefore(block: Block, previous: Block | undefined): { gap: string; divider: boolean } {
  if (!previous) return { gap: '', divider: false };
  if (block.kind === 'heading') {
    return block.level === 2 ? { gap: 'mt-9', divider: true } : { gap: 'mt-7', divider: false };
  }
  // Título e o que ele anuncia são uma coisa só.
  if (previous.kind === 'heading') return { gap: 'mt-3', divider: false };
  return { gap: 'mt-5', divider: false };
}

/**
 * O `·` gruda na palavra da esquerda.
 *
 * Ele é o separador da casa (é o em-dash que não usamos), e quem escreve título
 * o usa no meio da frase · "O ELENCO PODE MUDAR AO LONGO DA EDIÇÃO · A PARTIDA
 * NÃO". Quebrando pelo espaço da esquerda, a linha seguinte **começa** com o
 * ponto, que aí lê como marcador de lista solto. Visto a 390 no regulamento.
 *
 * Só no título, e de propósito: em parágrafo a quebra some no meio do bloco, e
 * grudar palavras num texto de largura estreita é o que produz linha frouxa.
 */
function keepSeparator(text: string): string {
  // O espaço fixo vai como escape · no meio do código ele é invisível na
  // leitura e no diff. E vai entre crases porque é pontuação, não texto de
  // tela: entre aspas, o `pnpm scan:strings` o cobra como frase sem catálogo.
  return text.replace(/ · /g, `\u00A0· `);
}

/** O nível do título é a soma dos dois: o `##` do markdown mais o degrau da página. */
const HEADING_TAGS = ['h2', 'h3', 'h4'] as const;

function BlockContent({
  block,
  divider = false,
  headingLevel = 2,
  tableLabel,
}: {
  block: Block;
  divider?: boolean;
  headingLevel?: 2 | 3;
  /** O nome da região de tabela larga · vem de quem tem o `t`, uma vez por documento. */
  tableLabel: string;
}) {
  if (block.kind === 'heading') {
    const Heading = HEADING_TAGS[block.level + headingLevel - 4] ?? 'h4';
    return (
      <Heading
        className={cn(
          block.level === 2 ? 'md-heading' : 'md-subheading',
          divider && 'border-t border-border pt-5',
        )}
      >
        {inlineMarkdown(keepSeparator(block.text))}
      </Heading>
    );
  }
  if (block.kind === 'list') {
    const List = block.ordered ? 'ol' : 'ul';
    return (
      <List
        className={cn(
          'md-list',
          block.ordered
            ? 'list-decimal marker:font-semibold marker:text-foreground'
            : 'list-disc marker:text-primary',
        )}
      >
        {block.items.map((item, i) => (
          <li key={i}>{inlineMarkdown(item)}</li>
        ))}
      </List>
    );
  }
  if (block.kind === 'quote')
    return <blockquote className="md-quote">{inlineMarkdown(block.text)}</blockquote>;
  if (block.kind === 'table') return <TableBlock block={block} label={tableLabel} />;
  return <p>{inlineMarkdown(block.text)}</p>;
}

/**
 * **A tabela só vira parada de teclado quando rola de verdade**, e quem sabe
 * disso é o layout, não a contagem de colunas.
 *
 * Região com foco existe pra rolar de lado por teclado. Anunciada em toda
 * tabela, era um Tab a mais por tabela em cada documento e em cada entrada das
 * novidades, numa caixa que não vai a lugar nenhum. E o gatilho por coluna
 * (`data-wide`, mais de três) não responde a pergunta certa · medido a 320 em
 * 06/09/2026: a de **três** colunas da privacidade rola, porque a célula não
 * parte palavra (`overflow-wrap: normal`, senão "notificações" quebra no meio),
 * e a de duas não. Quem decide é `scrollWidth > clientWidth`, refeito quando a
 * coluna muda de largura · o mesmo `ResizeObserver` da tabela de grupo.
 *
 * Um hook por **tabela**, e não por bloco: os termos têm ~52 blocos e nenhuma
 * tabela, a privacidade tem duas.
 */
function TableBlock({ block, label }: { block: Extract<Block, { kind: 'table' }>; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const node = box.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const measure = () => setOverflow(node.scrollWidth > node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className="md-table-scroll"
      data-wide={block.header.length > 3}
      {...(overflow ? { role: 'region', 'aria-label': label, tabIndex: 0 } : {})}
    >
      <table>
        <thead>
          <tr>
            {block.header.map((cell, i) => (
              <th key={i} scope="col">
                {inlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{inlineMarkdown(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({
  block,
  previous,
  tone,
  headingLevel = 2,
  tableLabel,
}: {
  block: Block;
  previous: Block | undefined;
  tone?: 'added' | 'removed';
  headingLevel?: 2 | 3;
  tableLabel: string;
}) {
  const { gap, divider } = gapBefore(block, previous);

  // **O destaque é uma moldura em volta, não classe no próprio bloco.** Com o
  // `border-l` e o `pl-3` aplicados na `<ul>`, o marcador da lista era
  // desenhado **fora** da caixa colorida e sobrava um ponto solto à esquerda
  // do realce · visto em captura. Envolvendo, a lista mantém o recuo dela e a
  // moldura fica por fora de tudo.
  //
  // **O fio do título mora no próprio `<h2>`, e não aqui** · nesta caixa ele
  // brigaria com a borda do realce, que pinta os quatro lados.
  return (
    <div
      className={cn(
        gap,
        tone && 'border-l-2 py-1 pl-3',
        tone === 'added' && 'border-primary bg-primary/10',
        // Riscado **além** da cor · quem não distingue vermelho de verde ficaria
        // sem informação nenhuma, e é a mesma razão do `+`/`-` num diff de código.
        tone === 'removed' && 'border-destructive bg-destructive/10 line-through opacity-70',
      )}
    >
      <BlockContent
        block={block}
        divider={divider && !tone}
        headingLevel={headingLevel}
        tableLabel={tableLabel}
      />
    </div>
  );
}

/**
 * O documento comparado com a versão anterior.
 *
 * **Reconstrói o texto dos dois lados a partir do diff** e renderiza cada
 * bloco na ordem de leitura, marcando o que entrou e o que saiu. O diff continua
 * vindo do servidor e continua sendo por linha · o que mudou é só o desenho.
 */
export function LegalDocumentDiff({ lines }: { lines: DiffLine[] }) {
  const { t } = useTranslation();
  const tableLabel = t('markdown.table');

  /**
   * **Achatado antes de desenhar, e não bloco a bloco dentro de cada trecho.**
   *
   * O ritmo depende do bloco **anterior**, e o anterior de um trecho é o último
   * do trecho de cima · calculando por grupo, o primeiro bloco de cada trecho
   * nasceria sem vizinho e o vão sumiria justo na costura entre o que saiu e o
   * que entrou.
   */
  const entries = useMemo(
    () =>
      groupDiffLines(lines).flatMap((group, gi) =>
        parseBlocks(group.text).map((block, bi) => ({
          block,
          key: `${gi}-${bi}`,
          tone: group.kind === 'same' ? undefined : group.kind,
          first: bi === 0,
        })),
      ),
    [lines],
  );

  return (
    // **Sem largura própria · quem limita é a coluna da página.**
    //
    // Ela tinha, e o efeito era o oposto do pretendido: o aviso de comparação
    // ia até a borda e o texto parava no meio, então o limite lia como **corte**
    // em vez de coluna. Quem decide a medida agora é a página, e ela vale pro
    // aviso e pro texto igual.
    <div className="markdown-document">
      {entries.map((entry, i) => (
        // O trecho marcado começa pelo rótulo, então o vão do bloco sobe pra cá
        // · senão ele cairia entre o rótulo e o texto que o rótulo anuncia.
        <div key={entry.key} className={entry.tone && entry.first && i > 0 ? 'mt-5' : undefined}>
          {/* O rótulo aparece **uma vez por trecho**, não por bloco · repetido
              em cada parágrafo ele vira ruído e some do olho. */}
          {entry.tone && entry.first && (
            <p
              className={cn(
                'mb-1 text-[10px] font-semibold uppercase tracking-widest',
                entry.tone === 'added' ? 'text-primary' : 'text-destructive',
              )}
            >
              {t(entry.tone === 'added' ? 'legal.markAdded' : 'legal.markRemoved')}
            </p>
          )}
          <BlockView
            block={entry.block}
            previous={entry.tone && entry.first ? undefined : entries[i - 1]?.block}
            tone={entry.tone}
            tableLabel={tableLabel}
          />
        </div>
      ))}
    </div>
  );
}
