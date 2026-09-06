import { z } from 'zod';
import type { Platform } from './enums.js';

/**
 * Geração de crossplay · quem consegue jogar com quem no modo Clubs.
 *
 * **Não é campo de documento, é função da plataforma.** Guardar a geração ao
 * lado da plataforma criaria dois campos capazes de discordar, e o dia em que
 * a EA remanejar os pools viraria migração de dados · derivando, muda esta
 * tabela e todo documento existente passa a responder certo na hora. É a mesma
 * regra do tema de perfil em `docs/produto.md`: guardar identificador, nunca o
 * valor derivado dele.
 *
 * A regra do jogo, em 30/07/2026:
 *
 * - PS5, Xbox Series X|S e PC jogam juntos
 * - PS4 e Xbox One jogam juntos
 * - Switch 2 e Switch **não têm crossplay** · cada um só encontra o mesmo sistema
 *
 * Fonte: [EA Help · Cross-play](https://help.ea.com/en/articles/ea-sports-fc/cross-play/).
 * **Não mexer nesta tabela sem conferir a regra do jogo** · ela existe pra o
 * produto não contar uma história que o EA FC desmente.
 */
export const crossplayPool = z.enum(['current', 'legacy', 'switch2', 'switch1']);
export type CrossplayPool = z.infer<typeof crossplayPool>;

const POOL: Record<Platform, CrossplayPool> = {
  ps5: 'current',
  'xbox-series': 'current',
  pc: 'current',
  ps4: 'legacy',
  'xbox-one': 'legacy',
  switch2: 'switch2',
  switch: 'switch1',
};

export function poolOf(value: Platform): CrossplayPool {
  return POOL[value];
}

/** As plataformas de cada pool, na ordem em que a interface as mostra. */
export const POOL_PLATFORMS: Record<CrossplayPool, readonly Platform[]> = {
  current: ['ps5', 'xbox-series', 'pc'],
  legacy: ['ps4', 'xbox-one'],
  switch2: ['switch2'],
  switch1: ['switch'],
};

/**
 * Responde a pergunta que a página do club existe pra responder: **eu consigo
 * jogar com esse time?**
 */
export function canPlayTogether(a: Platform, b: Platform): boolean {
  return POOL[a] === POOL[b];
}

