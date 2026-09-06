import { z } from 'zod';
import { CLUB_BIO_MAX, CLUB_NAME_MAX } from './club.js';
import { clubTag, httpUrl } from './common.js';
import { platform } from './enums.js';

// Os tetos vêm das constantes do documento, não de número escrito aqui. Ficaram
// em 40 e 280 quando o resto do projeto desceu pros números do EA FC 26, e a
// divergência era invisível: a tela trava em 20 pelo `maxLength`, então só quem
// chamasse a API direto passaria um nome que o documento não aceita.
const name = z.string().trim().min(2).max(CLUB_NAME_MAX);
const bio = z.string().trim().max(CLUB_BIO_MAX).nullable();

// POST /me/clubs · qualquer conta com onboarding concluído cria.
//
// `ownerId`, `status` e `schemaVersion` estão fora daqui pelo mesmo motivo que
// `role` está fora do cadastro de conta: **quem grava é o servidor**. Dono
// vindo do body deixaria qualquer um criar club no nome de outra pessoa.
export const createClubInput = z
  .object({
    tag: clubTag,
    name,
    platform,
    bio: bio.optional(),
    crestUrl: httpUrl.nullable().optional(),
    bannerUrl: httpUrl.nullable().optional(),
  })
  .strict();

export type CreateClubInput = z.infer<typeof createClubInput>;

// PATCH /me/clubs/:id
//
// **`tag` não está aqui, e a ausência é a regra.** Ela é o endereço público do
// club: trocar quebraria todo link já compartilhado, que é justamente o canal
// de aquisição do produto. Mesma decisão do `@handle` não ser editável à toa.
export const updateClubInput = z
  .object({
    name: name.optional(),
    platform: platform.optional(),
    bio: bio.optional(),
    crestUrl: httpUrl.nullable().optional(),
    bannerUrl: httpUrl.nullable().optional(),
  })
  .strict();

export type UpdateClubInput = z.infer<typeof updateClubInput>;

/**
 * Encerrar o club · **com a tag digitada de novo**.
 *
 * A confirmação por digitação não é enfeite de tela: ela vem no corpo e o
 * **servidor confere**. Confirmação que só existe no cliente é confirmação que
 * qualquer chamada direta pula, e aí o freio proporcional ao estrago vira
 * decoração. É o mesmo mecanismo que GitHub e Discord usam pra isto.
 */
export const deleteClubInput = z
  .object({
    tag: clubTag,
  })
  .strict();

export type DeleteClubInput = z.infer<typeof deleteClubInput>;
