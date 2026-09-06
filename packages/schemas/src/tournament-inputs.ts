import { z } from 'zod';
import { HANDLE_MAX, objectIdString } from './common.js';
import { crossplayPool } from './crossplay.js';
import { paymentMethod } from './payment.js';
import { tournamentSchema, tournamentStatus } from './tournament.js';

/**
 * As quatro datas na ordem em que só elas fazem sentido.
 *
 * **É função exportada porque dois lados precisam dela**, e o segundo não é
 * óbvio: o `updateTournamentInput` é parcial, então ele **não pode** conferir
 * ordem · quem edita só o `drawAt` manda um corpo com uma data só, e não há
 * contra o que comparar. Quem confere de verdade é o repositório, **depois de
 * juntar o que veio com o que já está gravado.**
 *
 * Escrever a regra duas vezes seria a divergência de sempre: a de criar ficaria
 * certa e a de editar não, e o defeito só apareceria pra quem editasse data ·
 * que é justamente o caminho que ninguém testa à mão.
 *
 * **O sorteio não pode acontecer com inscrição aberta**, e isso não é
 * formalidade: ele é o instante em que o elenco congela e em que o club de quem
 * se inscreveu sem ter um precisa existir. Sortear antes de fechar seria montar
 * a chave com gente ainda entrando.
 */
export function datesAreOrdered(t: {
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  drawAt: Date;
  startsAt: Date;
}): boolean {
  return (
    t.registrationOpensAt < t.registrationClosesAt &&
    t.registrationClosesAt <= t.drawAt &&
    t.drawAt <= t.startsAt
  );
}

/**
 * A edição como o admin a descreve · sem o que é do servidor.
 *
 * O que **não** entra: `_id`, as datas de documento, `status` (nasce `draft`,
 * sempre · edição não nasce publicada), `organizerId` (sai do token, nunca do
 * corpo) e `registeredCount` (é do servidor).
 */
const tournamentDraft = tournamentSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
  status: true,
  organizerId: true,
  registeredCount: true,
});

/**
 * Criar edição · **rota de admin**, e é o formulário de números que a decisão de
 * 10/08/2026 deixou no lugar do montador de fases arrastável.
 */
export const createTournamentInput = tournamentDraft.refine(datesAreOrdered, {
  message: 'As datas vão de abrir a inscrição até começar, nessa ordem',
  path: ['drawAt'],
});

export type CreateTournamentInput = z.infer<typeof createTournamentInput>;

/**
 * Editar edição · **o slug fica de fora, como a tag do club.**
 *
 * Ele é endereço público: trocar quebraria todo link já colado no Discord, que é
 * o canal de aquisição. Mesma regra, mesmo motivo.
 *
 * **A ordem das datas não é conferida aqui, e a ausência é deliberada** · ver o
 * `datesAreOrdered`.
 */
export const updateTournamentInput = tournamentDraft
  .omit({ slug: true })
  .partial()
  .refine((t) => Object.keys(t).length > 0, { message: 'Nada pra atualizar' });

export type UpdateTournamentInput = z.infer<typeof updateTournamentInput>;

/**
 * Mudar o estado da edição · publicar, fechar, cancelar.
 *
 * **Separado do editar de propósito.** Publicar não é "mais um campo": é o
 * instante em que a edição vira promessa pública, e é onde mora a guarda de que
 * ninguém publique um campeonato pago **sem a política de reembolso publicada**
 * · a página precisa dizer o que acontece com o dinheiro antes de alguém pagar.
 */
export const setTournamentStatusInput = z.object({
  status: tournamentStatus.exclude(['draft']),
  /**
   * O apelido da edição, digitado de novo · **exigido pra cancelar quando há
   * club inscrito**, e quem cobra é o repositório.
   *
   * **A exigência não cabe no schema, e é por isso que o campo é opcional
   * aqui:** ela depende do `registeredCount`, que mora no documento · quem
   * publica ou fecha não confirma nada, e cancelar um rascunho vazio também
   * não. O schema não alcança nenhuma das duas coisas.
   *
   * **Normaliza e não valida formato**, ao contrário do `slug`. O rótulo da
   * janela manda digitar em CAIXA ALTA e o valor é guardado em minúscula,
   * então sem o `toLowerCase` quem seguisse a instrução ao pé da letra levaria
   * um erro · foi exatamente o que aconteceu ao encerrar club, e lá o conserto
   * ficou na tela. E recusar por formato daria **dois** erros diferentes pro
   * mesmo engano: quem digita "copa dem" levaria `VALIDATION` e quem digita
   * "copa-dema" levaria `TOURNAMENT_SLUG_MISMATCH`. O teto acompanha o do
   * `slug` porque nada maior que um slug pode conferir com um.
   */
  confirm: z.string().trim().toLowerCase().max(HANDLE_MAX).optional(),
});
export type SetTournamentStatusInput = z.infer<typeof setTournamentStatusInput>;

/**
 * Inscrever um club · **o corpo leva o club, e nunca quem está inscrevendo.**
 *
 * A identidade sai do token, como em toda mutação deste produto.
 */
export const registerForTournamentInput = z.object({
  clubId: objectIdString,
});
export type RegisterForTournamentInput = z.infer<typeof registerForTournamentInput>;

/**
 * Começar a pagar uma inscrição · **o corpo leva só o meio.**
 *
 * O valor **não vem daqui**, e essa ausência é a regra de segurança da casa: o
 * preço é decidido no servidor, lido da edição. Aceitar `amountCents` do cliente
 * seria deixar quem paga escolher quanto paga.
 */
export const startPaymentInput = z.object({
  clubId: objectIdString,
  method: paymentMethod,
});
export type StartPaymentInput = z.infer<typeof startPaymentInput>;

/**
 * A lista pública de campeonatos.
 *
 * **O filtro de geração é o mesmo par das duas vitrines** · quem é `legacy` não
 * tem o que fazer numa lista de edições `current`, e é a pergunta que a tela
 * responde.
 */
export const tournamentListQuery = z.object({
  pool: crossplayPool.optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).optional(),
});
export type TournamentListQuery = z.infer<typeof tournamentListQuery>;
