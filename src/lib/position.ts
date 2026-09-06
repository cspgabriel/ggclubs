import type { PlayerPosition } from '@ggclubs/schemas';

/**
 * A chave de catálogo da sigla da posição.
 *
 * O valor gravado é sempre o inglês do enum (`GK`, `CAM`), porque é o
 * identificador · quem traduz é a tela, e o EA FC **traduz de verdade**: quem
 * joga em português vê VOL e MEI, quem joga em espanhol vê MCD e MCO. Mostrar
 * a sigla inglesa nos três casos ensinava uma sigla que a pessoa não encontra
 * no jogo.
 */
export function positionKey(position: PlayerPosition) {
  return `position.${position}` as const;
}
