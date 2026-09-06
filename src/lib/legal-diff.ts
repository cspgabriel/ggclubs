import type { DiffLine } from '@ggclubs/schemas';

/**
 * Agrupa linhas consecutivas do mesmo tipo.
 *
 * Um parágrafo inteiro que mudou vira **um** trecho marcado, não sete linhas
 * marcadas uma a uma · é o que faz o destaque acompanhar a leitura em vez de
 * picotá-la.
 *
 * **Mora aqui e não no componente** porque o arquivo de componente só pode
 * exportar componentes · o fast refresh do Vite exige isso, e a regra de lint
 * reclama. É a mesma razão de o `AuthProvider` viver separado do hook.
 */
export function groupDiffLines(lines: DiffLine[]): { kind: DiffLine['kind']; text: string }[] {
  const groups: { kind: DiffLine['kind']; text: string }[] = [];
  for (const line of lines) {
    const last = groups.at(-1);
    if (last && last.kind === line.kind) last.text += `\n${line.text}`;
    else groups.push({ kind: line.kind, text: line.text });
  }
  return groups;
}

/**
 * Quantos **trechos** entraram e saíram · não quantas linhas.
 *
 * A contagem que vem do servidor é por linha, e ela dizia "11 trechos novos"
 * numa tela onde a pessoa enxerga dois · o número tem que contar a mesma coisa
 * que o olho conta, senão ele mina a confiança no resto da página. Visto em
 * captura, com o texto de exemplo.
 */
export function countPassages(lines: DiffLine[]): { added: number; removed: number } {
  const groups = groupDiffLines(lines).filter((group) => group.kind !== 'same');
  return {
    added: groups.filter((group) => group.kind === 'added').length,
    removed: groups.filter((group) => group.kind === 'removed').length,
  };
}
