import { z } from 'zod';

// Enums de plataforma. Os de domínio entram junto com os schemas deles.

/** Firebase custom claim · sem claim, a conta é player. */
export const role = z.enum(['player', 'admin']);
export type Role = z.infer<typeof role>;

export const accountStatus = z.enum(['active', 'suspended', 'deleted']);
export type AccountStatus = z.infer<typeof accountStatus>;

/*
 * **A assinatura foi descontinuada em 22/08/2026**, por decisão do Eduardo · o
 * `subscriptionPlan` (`free`/`pro`/`club`) morava aqui e o `plan` no `User`.
 *
 * Ele nunca passou de campo: não houve rota, tela nem cobrança, e as 9 contas
 * do banco eram todas `free`. **Um enum que só tem um valor alcançável é um
 * campo que finge decisão**, e neste repositório campo assim vira `as never` no
 * primeiro script que insere documento.
 *
 * O `pnpm migrate` tira o campo dos documentos que já existiam · sem isso o
 * `pnpm scan:data` acusaria campo desconhecido pra sempre.
 */
/**
 * Onde a pessoa (ou o club) joga. **As sete do EA FC 26**, não as três da
 * geração atual · PS4 e Xbox One continuam recebendo o jogo, e é justamente
 * a existência delas que dá sentido ao pool de crossplay (ver `crossplay.ts`).
 *
 * O Luna não é valor próprio: é o jogo de PC transmitido, e quem joga por ele
 * cai no mesmo pool do PC. Valor a mais aqui seria um valor que não muda
 * nenhuma resposta.
 *
 * `xbox-series` já se chamou só `xbox`. O nome trocou quando o Xbox One entrou:
 * com dois Xbox no enum, o valor genérico deixaria de dizer qual é.
 */
export const platform = z.enum([
  'ps5',
  'xbox-series',
  'pc',
  'ps4',
  'xbox-one',
  'switch2',
  'switch',
]);
export type Platform = z.infer<typeof platform>;

/**
 * Situação do club. Mesmo vocabulário do `accountStatus` de propósito · quem lê
 * "suspended" num lugar não precisa aprender outra palavra no outro.
 */
export const clubStatus = z.enum(['active', 'suspended', 'deleted']);
export type ClubStatus = z.infer<typeof clubStatus>;

/**
 * **Poder** no club · quem pode o quê.
 *
 * `owner` é quem responde pelo club, e **cada pessoa é dona de no máximo um**
 * (18/08/2026) · quem garante é um índice parcial único em `memberships`, não
 * uma conferência de rota. Ele se transfere desde 31/07/2026, e quem passa cai
 * pra `manager`, o que é justamente o que libera a vaga de dono da pessoa.
 *
 * **É o `owner` que manda o club num campeonato**, e sozinho: inscrever, pagar,
 * cancelar e lançar placar são dele. O `manager` administra o **elenco**, e a
 * separação é de 18/08/2026 · ver `docs/historico.md`.
 *
 * **`captain` saiu daqui em 30/07/2026, e a ausência é a decisão.** Ele era um
 * valor deste enum, o que fazia dele alternativa aos outros: ou você era
 * capitão, ou era gerente. Pela decisão do Eduardo o capitão é **ilustrativo**,
 * não tem poder nenhum, e **pode ser gerente ao mesmo tempo** · duas coisas
 * ortogonais não cabem num campo só. Virou `isCaptain` no vínculo.
 *
 * `manager` espelha o **General Manager** do Clubs do EA FC 26.
 */
export const membershipRole = z.enum(['owner', 'manager', 'member']);
export type MembershipRole = z.infer<typeof membershipRole>;

/**
 * Ciclo de vida do vínculo. `pending` existia desde antes do fluxo de entrada,
 * e por isso ele entrou sem migração nenhuma.
 *
 * **`left` e `rejected` são estados diferentes de propósito**, e a diferença
 * não é derivável de outro campo: `left` é quem esteve no elenco e saiu,
 * `rejected` é quem pediu e o dono recusou · nunca entrou. Marcar recusa como
 * `left` faria o histórico do player dizer que ele jogou num club onde nunca
 * pôs o pé, que é a doc mentindo sobre a realidade em forma de dado.
 *
 * Quem **cancela o próprio pedido** não vira estado: o documento é apagado.
 * Pedido sem resposta que a pessoa retirou não é história de ninguém, e apagar
 * é o que devolve o par `(userId, clubId)` livre pra ela pedir de novo.
 *
 * **`invited` é o espelho de `pending`, e precisa ser um estado próprio porque
 * quem responde muda.** Em `pending` o player pediu e **o club decide**; em
 * `invited` o club chamou e **o player decide**. Com um estado só, o dono
 * aprovaria o próprio convite · seria pôr alguém no elenco à força, e estar num
 * club consome uma das 3 vagas de quem foi posto.
 *
 * **`removed` é o terceiro fim, e existe pela mesma régua que separou `left` de
 * `rejected`:** sair e ser tirado são coisas diferentes, e a diferença não sai
 * de outro campo. O histórico do player precisa poder dizer qual das duas foi ·
 * juntar tudo em `left` faria o dado afirmar que a pessoa escolheu ir embora.
 */
export const membershipStatus = z.enum([
  'pending',
  'invited',
  'active',
  'left',
  'rejected',
  'removed',
]);
export type MembershipStatus = z.infer<typeof membershipStatus>;

/**
 * Posições do Pro Clubs, na sigla **inglesa**, que é o identificador gravado.
 *
 * O comentário antigo dizia "a sigla que o jogo usa" e induzia ao erro: o jogo
 * **localiza** · em português é VOL, MEI e ATA; em espanhol, MCD, MCO e DC. A
 * tradução mora no catálogo de i18n (`position.*`), com um teste travando enum
 * e catálogo juntos. Aqui fica só o valor que vai pro banco.
 */
export const playerPosition = z.enum([
  'GK',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
]);
export type PlayerPosition = z.infer<typeof playerPosition>;
