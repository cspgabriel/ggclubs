import { z } from 'zod';
import { objectIdString, slug } from './common.js';
import { playerPosition } from './enums.js';

// Entradas do fluxo de entrada num club: o player pede, o dono responde.
//
// O que **não** está aqui é tão decidido quanto o que está: nada de `userId`,
// `clubId`, `role` ou `status` vindo do corpo. Quem pede sai do token, o club
// sai da URL e o papel é sempre `member` · aceitar papel do cliente deixaria
// alguém entrar como dono do club dos outros.

export const joinClubInput = z
  .object({
    /**
     * Onde a pessoa joga, opcional. É o que o dono usa pra decidir · num club
     * que já tem três goleiros, a posição é a informação que responde o pedido.
     *
     * Opcional de propósito: quem chegou pela página pública e quer entrar não
     * pode ser barrado por um campo que ele ainda vai poder preencher depois.
     */
    position: playerPosition.nullable().optional(),
  })
  .strict();

export type JoinClubInput = z.infer<typeof joinClubInput>;

/**
 * A resposta do dono, numa rota só em vez de duas (`/approve` e `/reject`).
 *
 * Uma rota é uma conferência de permissão · com duas, a autorização de quem
 * pode responder pelo club fica escrita em dois lugares, e é assim que uma das
 * duas envelhece sem ninguém ver. Mesmo raciocínio do "o conserto mora onde os
 * caminhos se encontram".
 */
export const decideJoinRequestInput = z
  .object({
    decision: z.enum(['approve', 'reject']),
  })
  .strict();

export type DecideJoinRequestInput = z.infer<typeof decideJoinRequestInput>;

/**
 * **Oferecer a gerência ou rebaixar a membro.**
 *
 * **`owner` não está no enum, e a ausência é a regra.** Transferir club é outra
 * operação, com outras consequências (o dono atual passa a poder sair, o club
 * troca de responsável) · aceitar `owner` aqui deixaria a transferência
 * acontecer por acidente, pela rota errada, sem nada avisando.
 *
 * **O enum continua com dois valores e eles deixaram de ser simétricos em
 * 03/09/2026** (pendência 185): `manager` **oferece** e a pessoa decide;
 * `member` rebaixa na hora **e desiste da oferta pendente**. A rota responde
 * qual dos dois aconteceu · ver o `setClubRole`.
 */
export const setClubRoleInput = z
  .object({
    role: z.enum(['manager', 'member']),
  })
  .strict();

export type SetClubRoleInput = z.infer<typeof setClubRoleInput>;

/**
 * Convidar alguém pelo **@nick**, que é como o dono conhece a pessoa.
 *
 * Aqui o handle é o certo, e não contradiz o `userId` das outras rotas: este é
 * o momento em que quem convida **digita** quem é · não há id pra ter. O
 * servidor resolve pra id na hora, e a partir daí tudo age por id.
 */
export const inviteToClubInput = z
  .object({
    handle: slug,
  })
  .strict();

export type InviteToClubInput = z.infer<typeof inviteToClubInput>;

/** A resposta de quem foi convidado · e só ela decide. */
export const decideInviteInput = z
  .object({
    decision: z.enum(['accept', 'decline']),
  })
  .strict();

export type DecideInviteInput = z.infer<typeof decideInviteInput>;

/**
 * A oferta de posse do club · o dono aponta **quem já está no elenco**.
 *
 * O alvo vem por `userId` e não por `@nick`, ao contrário do convite: aqui a
 * pessoa está numa lista que a tela acabou de mostrar, então o id existe. E
 * `@nick` é trocável · entre a tela carregar e o clique, ele pode ser de outra
 * pessoa, e passar o club pra pessoa errada não tem desfazer fácil.
 */
export const offerOwnershipInput = z
  .object({
    memberId: objectIdString,
  })
  .strict();

export type OfferOwnershipInput = z.infer<typeof offerOwnershipInput>;

/**
 * A resposta de quem recebeu a oferta.
 *
 * Ser dono é responsabilidade, não presente · é a mesma razão pela qual o
 * convite pra entrar precisa de aceite, e por isso o verbo aqui é o mesmo.
 */
export const decideOwnershipInput = z
  .object({
    decision: z.enum(['accept', 'decline']),
  })
  .strict();

export type DecideOwnershipInput = z.infer<typeof decideOwnershipInput>;

/**
 * A resposta de quem recebeu a oferta de **gerência**.
 *
 * Mesma forma da de posse, e pelo mesmo motivo: as duas perguntam "você aceita
 * isto?" sobre um cargo que quem recebe não pediu. **Cargo é responsabilidade,
 * não presente** · e desde a trava de liderança única ele custa a vaga de
 * liderança da conta, então aceitar por outra pessoa é gastar o que é dela.
 *
 * **O club vem da URL e a pessoa vem do token** · não há `memberId` aqui, e a
 * ausência é a regra: quem responde é sempre quem recebeu.
 */
export const decideManagerOfferInput = z
  .object({
    decision: z.enum(['accept', 'decline']),
  })
  .strict();

export type DecideManagerOfferInput = z.infer<typeof decideManagerOfferInput>;

/**
 * Definir a posição de alguém **naquele club**.
 *
 * `null` limpa · campo opcional precisa poder voltar ao vazio, que é regra de
 * tela já registrada no `docs/design.md`.
 *
 * Rota única pra dois atores (o próprio player e quem gerencia) de propósito:
 * com duas, a autorização de quem pode mexer em posição ficaria escrita em dois
 * lugares, e é assim que uma das duas envelhece sem ninguém ver.
 */
export const setMemberPositionInput = z
  .object({
    position: playerPosition.nullable(),
  })
  .strict();

export type SetMemberPositionInput = z.infer<typeof setMemberPositionInput>;
