import { MAX_GOALS } from '@ggclubs/schemas';

/**
 * O placar digitado · **a mesma regra nas duas telas que aceitam gol.**
 *
 * São elas o diálogo de lançar (o club declarando) e a mesa de disputa (a
 * organização decidindo). **Isto nasceu como duas cópias literais** e virou
 * módulo no mesmo bloco, que é a régua do `CLAUDE.md`: extrair na segunda cópia
 * custa minutos, depois da terceira custa um bloco.
 *
 * **E a divergência aqui seria silenciosa.** Se `MAX_GOALS` subir pra 30, ou o
 * corte de dígitos virar três, uma tela passa a aceitar o que a outra recusa · e
 * lint, typecheck, teste e os scanners ficam verdes nas duas.
 */

/** Quantos dígitos o campo aceita · sai do teto, e não de um número escrito. */
export const GOALS_DIGITS = String(MAX_GOALS).length;

/**
 * O que sobra do que a pessoa digitou.
 *
 * Filtra na digitação em vez de recusar no envio: teclado numérico de celular
 * ainda manda vírgula e sinal.
 */
export function onlyGoals(value: string): string {
  return value.replace(/\D/g, '').slice(0, GOALS_DIGITS);
}

/** **Campo em branco não é zero** · vazio não pode virar placar declarado. */
export function isGoals(value: string): boolean {
  if (value === '') return false;
  const goals = Number(value);
  return Number.isInteger(goals) && goals >= 0 && goals <= MAX_GOALS;
}

/**
 * A disputa de pênaltis **decidiu alguém?** · e a comparação é de número.
 *
 * **Nasceu como três cópias literais**, duas delas escritas no mesmo commit ·
 * a régua da casa manda extrair na segunda, e aqui a terceira apareceu antes de
 * alguém olhar. As três comparavam **string**, e é isso que fazia elas
 * divergirem do servidor: o `onlyGoals` deixa zero à esquerda passar, então
 * `"03"` e `"3"` são dois valores válidos e **diferentes** como texto. O botão
 * acendia, o aviso de empate não aparecia, e a rota respondia 400
 * `PENALTIES_REQUIRED` · quem compara é o `shootoutFor` da API, com número.
 *
 * `false` quando falta preencher, quando o valor não é placar, ou quando os dois
 * empataram · empate na disputa não fecha partida nenhuma.
 */
export function shootoutDecided(homePens: string, awayPens: string): boolean {
  if (!isGoals(homePens) || !isGoals(awayPens)) return false;
  return Number(homePens) !== Number(awayPens);
}
