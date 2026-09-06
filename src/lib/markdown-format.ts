/**
 * A conta de um clique na barra do editor de Markdown · **pura, e fora do
 * componente**, pra ser testada linha a linha e pra não quebrar o Fast Refresh
 * (arquivo de componente exporta componente).
 */
export type MarkdownFormat = 'heading' | 'bold' | 'italic' | 'list' | 'ordered' | 'quote' | 'link';

const MARKS: Record<MarkdownFormat, readonly [string, string]> = {
  heading: ['## ', ''],
  bold: ['**', '**'],
  italic: ['*', '*'],
  list: ['- ', ''],
  ordered: ['1. ', ''],
  quote: ['> ', ''],
  link: ['[', '](https://)'],
};

/** Os formatos de **linha** · o marcador vai na frente de cada uma, e a linha é dele. */
const BLOCK: ReadonlySet<MarkdownFormat> = new Set(['heading', 'list', 'ordered', 'quote']);

export type MarkdownFormatResult = {
  /** O texto inteiro depois do clique. */
  text: string;
  /** O que entra no lugar da seleção · é o que o navegador insere, pra pilha de desfazer. */
  insert: string;
  /** A seleção depois: **o que o clique formatou** · o miolo do inline, o bloco inteiro do de linha. */
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Aplica um formato à faixa `[start, end)` de `value`. Sem seleção entra o
 * `sample` no lugar, pra pessoa ver o marcador em volta de alguma coisa.
 *
 * **Formato de linha começa uma linha e, quando é texto de amostra, termina
 * uma também.** Sem o `\n` de trás o marcador colava no fim da linha anterior;
 * sem o da frente, a amostra colava no começo da linha seguinte · um clique em
 * "Lista" com o cursor no início de um regulamento existente produzia
 * `- TextoPrimeira regra`, e ninguém via porque a barra não foca o campo.
 *
 * **A seleção devolvida tem o comprimento do que foi inserido, e não do que
 * estava selecionado** · no formato de linha o texto cresce um marcador por
 * linha, e devolver `selected.length` deixava a seleção terminando no meio da
 * segunda linha. O segundo clique, em cima disso, corrompia o texto.
 */
export function applyMarkdownFormat(
  value: string,
  start: number,
  end: number,
  kind: MarkdownFormat,
  sample: string,
): MarkdownFormatResult {
  const [before, after] = MARKS[kind];
  const selected = value.slice(start, end);
  const text = selected || sample;
  const block = BLOCK.has(kind);
  const inserted = block
    ? text
        .split('\n')
        .map((line) => before + line)
        .join('\n')
    : before + text + after;
  const prefix = block && start > 0 && value[start - 1] !== '\n' ? '\n' : '';
  const suffix = block && !selected && end < value.length && value[end] !== '\n' ? '\n' : '';
  const insert = prefix + inserted + suffix;
  const at = start + prefix.length;

  return {
    text: value.slice(0, start) + insert + value.slice(end),
    insert,
    selectionStart: block ? at : at + before.length,
    selectionEnd: block ? at + inserted.length : at + before.length + text.length,
  };
}
