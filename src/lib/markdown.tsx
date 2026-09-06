import type { ReactNode } from 'react';
import { MarkdownLink } from '@/components/markdown-link';

/**
 * Um markdown pequeno e fechado, para regulamentos, documentos legais e novidades.
 *
 * ## Por que não uma biblioteca
 *
 * O que os documentos legais pedem é título, **negrito**, *itálico*, lista,
 * lista numerada, tabela, link e parágrafo · isso cabe em duzentas linhas e tem
 * teste. `react-markdown` traz `remark` junto e passa de 100 KB no bundle pra
 * servir três páginas que quase ninguém abre · num produto cujo bundle já é a
 * maior pendência de front, isso não se paga.
 *
 * **O limite continua existindo e mudou de lugar em 20/08/2026.** Tabela e link
 * entraram porque os documentos **já os usavam** e a tela mostrava o texto cru:
 * a tabela da política de privacidade saía como uma linha de canos, e o link da
 * política de reembolso saía como `[texto](/reembolso)` dentro dos termos ·
 * justamente na frase que manda a pessoa ler o que ela vai aceitar antes de
 * pagar. O que **não** entra sem trazer a lib de verdade: imagem, HTML,
 * bloco de código cercado, aninhamento de ênfase e lista dentro de lista.
 *
 * ## Por que não `dangerouslySetInnerHTML`
 *
 * Porque o corpo vem do **banco**, escrito por gente, e virar HTML na tela é
 * XSS direto · a vítima é quem visita a página pública. É a mesma recusa que o
 * `docs/produto.md` faz pro perfil customizável. Aqui nada vira HTML: o texto é
 * quebrado em nós de React, e uma tag escrita no meio do documento aparece como
 * texto, que é o certo.
 *
 * **O link é a única coisa daqui que carrega um endereço**, e por isso ele é o
 * único ponto onde essa recusa poderia vazar · quem decide é o `safeHref`, logo
 * abaixo.
 */

/**
 * Só endereço nosso e `https://` de fora · o resto **não vira link**.
 *
 * A lista é fechada de propósito, e não uma lista de proibidos: `javascript:`,
 * `data:` e `vbscript:` são os que qualquer um lembra, mas quem escreve o corpo
 * escreve o que quiser, e proibir por nome é a forma que sempre deixa passar a
 * próxima. Aqui o endereço precisa **provar** que é um dos dois formatos.
 *
 * O `//` e o `/\` do começo são a pegadinha que a leitura ingênua deixa passar:
 * os dois são **endereço absoluto sem esquema** pro navegador, então `//evil.tld`
 * parece caminho nosso e sai do produto.
 *
 * `http://` sem o `s` fica de fora porque o produto inteiro é https · link em
 * texto público arrastando a pessoa pra uma conexão aberta é degradação, e não
 * há caso de uso.
 */
export function safeHref(href: string): string | null {
  const value = href.trim();
  if (value.startsWith('/') && value[1] !== '/' && value[1] !== '\\') return value;
  if (/^https:\/\/[^\s/]+/i.test(value)) return value;
  return null;
}

const LINK_TEXT = /^\[([^\]\n]+)\]\(([^()\s]*)\)$/;

/**
 * Negrito, itálico, código e link · o resto do texto passa direto.
 *
 * **Os grupos são todos não capturantes de propósito.** `String.split` com um
 * regex que captura devolve *cada* grupo junto dos pedaços, e aí a lista deixa
 * de alternar texto e marcação.
 */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]\n]+\]\([^()\s]*\))/g;

/**
 * Um link, ou `null` se o pedaço não for um.
 *
 * **Endereço recusado volta como o texto cru do documento**, e não como link
 * morto nem como texto some: quem escreveu vê o que escreveu, e quem lê não
 * clica em nada.
 */
function renderLink(piece: string, key: number): ReactNode | null {
  const match = LINK_TEXT.exec(piece);
  if (!match) return null;

  const href = safeHref(match[2] ?? '');
  if (!href) return piece;

  return <MarkdownLink key={key} label={match[1] ?? ''} href={href} />;
}

/**
 * A ênfase dentro de uma linha.
 *
 * Sem aninhamento de ênfase, de propósito: `**um *dois* três**` sai com o
 * itálico literal. Documento legal não precisa disso, e suportar aninhado é o
 * começo do parser que não para de crescer.
 *
 * **O link é a exceção, e ela é obrigatória**, não um afrouxamento da regra
 * acima: os termos escrevem `**[Política de reembolso](/reembolso)**`, com o
 * link **dentro** do negrito. Sem esta volta, a frase mais importante do
 * documento sairia em negrito e com os colchetes na tela.
 */
export function inlineMarkdown(text: string): ReactNode[] {
  return text.split(INLINE).map((piece, i) => {
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {emphasized(piece.slice(2, -2))}
        </strong>
      );
    }
    if (piece.startsWith('*') && piece.endsWith('*') && piece.length > 2) {
      return <em key={i}>{emphasized(piece.slice(1, -1))}</em>;
    }
    if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 2) {
      // Código é literal · link dentro de crase é endereço escrito, não clicável.
      return <code key={i}>{piece.slice(1, -1)}</code>;
    }
    return renderLink(piece, i) ?? piece;
  });
}

/** O que pode viver dentro de negrito e de itálico · só o link. */
const LINK_SPLIT = /(\[[^\]\n]+\]\([^()\s]*\))/g;

function emphasized(text: string): ReactNode[] {
  return text.split(LINK_SPLIT).map((piece, i) => renderLink(piece, i) ?? piece);
}

export type Block =
  | { kind: 'heading'; level: 2 | 3; text: string; lines: string[] }
  | { kind: 'paragraph'; text: string; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: string[]; lines: string[] }
  | { kind: 'table'; header: string[]; rows: string[][]; lines: string[] }
  | { kind: 'quote'; text: string; lines: string[] };

/**
 * **O mesmo regex na entrada do ramo e na saída do parágrafo.**
 *
 * Ele já esteve escrito duas vezes com formas diferentes (uma ancorada em `$`,
 * outra não), e foi exatamente aí que o parser travou a aba em produção · ver a
 * garantia de terminação no fim do arquivo.
 */
const HEADING = /^(#{2,3})\s+(.*)$/;
const BULLET_ITEM = /^\s*- +/;
const ORDERED_ITEM = /^\s*\d{1,9}[.)] +/;
/**
 * **Citação** · o `>` do markdown, suportado desde 03/09/2026.
 *
 * Ele nasceu de um `>` vazando **cru na página do campeonato**: o regulamento é
 * markdown escrito pela tela do admin, e quem escreve não sabe (nem tem por que
 * saber) qual subconjunto este parser entende. O que aparecia era o texto com
 * `>` no meio das frases, porque a linha caía no ramo de parágrafo.
 *
 * **A regra que fica:** construção comum de markdown que o parser não entende
 * não some · ela **vaza**. Então ou o parser entende, ou quem escreve é avisado
 * · e entender é mais barato que avisar.
 */
const QUOTE_LINE = /^\s*> ?/;

/** Célula a célula, sem os canos da borda. */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const DIVIDER_CELL = /^:?-+:?$/;

/**
 * A linha de traços que separa cabeçalho de corpo.
 *
 * O `:` de alinhamento é aceito e **ignorado** · aceitar evita que uma tabela
 * alinhada saia como texto cru, e aplicar o alinhamento seria mais coluna de
 * configuração do que qualquer documento daqui pediu até hoje.
 */
function isTableDivider(line: string): boolean {
  if (!line.trimStart().startsWith('|')) return false;
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => DIVIDER_CELL.test(cell));
}

/**
 * **Tabela é o cabeçalho mais a linha de traços, e nunca só a primeira linha.**
 *
 * Uma linha de canos solta continua sendo parágrafo · é o que acontece quando o
 * diff parte a tabela ao meio e um dos lados fica sem cabeçalho. Sem isto a
 * comparação de versões desenharia meia tabela.
 */
function startsTable(lines: string[], i: number): boolean {
  return (lines[i] ?? '').trimStart().startsWith('|') && isTableDivider(lines[i + 1] ?? '');
}

/**
 * Onde um bloco novo começa · **a mesma pergunta que cada ramo faz pra entrar.**
 *
 * Enquanto o parágrafo sair por esta função e os ramos entrarem pelos mesmos
 * testes que ela usa, os dois lados não têm como discordar · e discordância
 * entre eles é o que trava o laço.
 */
function startsBlock(lines: string[], i: number): boolean {
  const line = lines[i] ?? '';
  return (
    line.trim() === '' ||
    HEADING.test(line) ||
    BULLET_ITEM.test(line) ||
    ORDERED_ITEM.test(line) ||
    QUOTE_LINE.test(line) ||
    startsTable(lines, i)
  );
}

/**
 * Os itens de uma lista, a partir de `start`.
 *
 * Serve as duas listas porque elas só diferem no que marca o item · escrever o
 * laço duas vezes era garantir que a continuação indentada funcionasse numa e
 * não na outra.
 */
function collectList(
  lines: string[],
  start: number,
  marker: RegExp,
): { items: string[]; raw: string[]; next: number } {
  const items: string[] = [];
  const raw: string[] = [];
  let i = start;

  // Item que continua na linha seguinte (indentada) cola no anterior · sem
  // isto, uma lista quebrada pra caber em 80 colunas vira dois itens.
  while (i < lines.length) {
    const current = lines[i] ?? '';
    if (marker.test(current)) {
      items.push(current.replace(marker, '').trim());
      raw.push(current);
    } else if (current.startsWith('  ') && current.trim() !== '' && items.length > 0) {
      items[items.length - 1] = `${items.at(-1) ?? ''} ${current.trim()}`;
      raw.push(current);
    } else {
      break;
    }
    i += 1;
  }

  return { items, raw, next: i };
}

/**
 * A tabela, a partir da linha de cabeçalho.
 *
 * **Toda linha é preenchida até a largura da mais larga.** Linha com célula a
 * menos é o erro de digitação mais comum numa tabela escrita à mão, e ela não
 * pode virar coluna faltando na tela nem, pior, tabela sem `<td>` onde a
 * seguinte tem · o que se perde é uma célula vazia, e o que se ganha é a página
 * continuar de pé.
 */
function collectTable(
  lines: string[],
  start: number,
): { header: string[]; rows: string[][]; raw: string[]; next: number } {
  const raw: string[] = [lines[start] ?? '', lines[start + 1] ?? ''];
  const header = tableCells(lines[start] ?? '');
  const rows: string[][] = [];
  let i = start + 2;

  while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('|')) {
    rows.push(tableCells(lines[i] ?? ''));
    raw.push(lines[i] ?? '');
    i += 1;
  }

  const width = Math.max(header.length, ...rows.map((row) => row.length));
  const pad = (row: string[]) => Array.from({ length: width }, (_, c) => row[c] ?? '');

  return { header: pad(header), rows: rows.map(pad), raw, next: i };
}

/**
 * Quebra o documento em blocos, guardando **as linhas originais de cada um**.
 *
 * As linhas viajam junto porque é por elas que o diff casa: ele compara linha e
 * a tela precisa saber qual bloco mudou. Sem isso, destacar a mudança dentro do
 * texto exigiria diffar de novo no cliente, com outro algoritmo, e os dois
 * discordariam algum dia.
 */
export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  /**
   * **Fim de linha normalizado na entrada**, e isto é conserto de 14/08/2026.
   *
   * O corpo vem do banco, e o banco recebeu CRLF de uma máquina com
   * `core.autocrlf=true` · `## Título\r` **não casa** o regex de cabeçalho (o
   * `.` não casa `\r`, então o `$` não fecha). A linha caía no ramo de
   * parágrafo, que quebra em `/^#{2,3}\s/` **sem consumir nada** · laço
   * infinito, e as três páginas legais travaram a aba em produção.
   *
   * O `publish-legal.ts` passou a normalizar também · **as duas pontas**,
   * porque o documento pode ter sido gravado por uma versão anterior do script.
   */
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1]?.length === 2 ? 2 : 3,
        text: heading[2] ?? '',
        lines: [line],
      });
      i += 1;
      continue;
    }

    if (startsTable(lines, i)) {
      const table = collectTable(lines, i);
      blocks.push({ kind: 'table', header: table.header, rows: table.rows, lines: table.raw });
      i = table.next;
      continue;
    }

    if (BULLET_ITEM.test(line) || ORDERED_ITEM.test(line)) {
      const ordered = !BULLET_ITEM.test(line);
      const list = collectList(lines, i, ordered ? ORDERED_ITEM : BULLET_ITEM);
      blocks.push({ kind: 'list', ordered, items: list.items, lines: list.raw });
      i = list.next;
      continue;
    }

    if (QUOTE_LINE.test(line)) {
      const raw: string[] = [];
      // **Linhas seguidas viram uma citação só** · quebrar por linha daria um
      // bloco por linha, e o texto é escrito com quebra de coluna.
      while (i < lines.length && QUOTE_LINE.test(lines[i] ?? '')) {
        raw.push(lines[i] ?? '');
        i += 1;
      }
      blocks.push({
        kind: 'quote',
        text: raw.map((one) => one.replace(QUOTE_LINE, '')).join(' '),
        lines: raw,
      });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && !startsBlock(lines, i)) {
      paragraph.push(lines[i] ?? '');
      i += 1;
    }
    /**
     * **Toda volta consome pelo menos uma linha**, e sem esta garantia o
     * parser trava a aba.
     *
     * Hoje ela é redundante, porque a saída do parágrafo é a mesma pergunta que
     * os ramos fazem pra entrar (`startsBlock`) · e é justamente por isso que
     * ela fica. No dia em que alguém acrescentar um ramo e esquecer de contar
     * pro `startsBlock`, a discordância vira uma linha de texto solta em vez de
     * uma aba travada. Foi o que `## Título\r` fez em produção.
     */
    if (paragraph.length === 0) {
      paragraph.push(lines[i] ?? '');
      i += 1;
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' '), lines: paragraph });
  }

  return blocks;
}
