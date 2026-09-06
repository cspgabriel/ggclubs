import { z } from 'zod';
import { baseDocumentFields, objectIdString } from './common.js';
import { membershipRole, membershipStatus, playerPosition } from './enums.js';
import type { MembershipRole } from './enums.js';

// Vínculo player ↔ club. É o que responde "quem joga onde" e sustenta o elenco
// na página do club.

/**
 * **Quem lidera um club** · o dono e o gerente, e é este conjunto que a trava de
 * liderança única conta.
 *
 * **Mora aqui desde 03/09/2026, e pelo mesmo motivo dos dois tetos abaixo** ·
 * ele estava escrito à mão em cinco lugares além da fonte declarada
 * (`apps/api/src/repositories/club-authority.ts`, que o front **não alcança**):
 * o `$in` da própria trava, o `roleOf`, o `clubManagerIds`, quem convida, e duas
 * derivações no front.
 *
 * **O estrago de divergir não aparece na hora, e a pendência 187 escreveu o
 * cenário:** no dia em que a lista mudar, quem editar o conjunto das ações de
 * campeonato conserta cinco lugares e **não** conserta a trava · e aí a mesma
 * conta volta a liderar dois clubs da mesma edição paga, que é exatamente o
 * defeito que a trava existe pra fechar. Nenhum check vê isso.
 *
 * **Não é o `SPEAKING_ROLES` do chat com outro nome**, e os dois continuam
 * separados de propósito: lá a pergunta é *"quem fala na sala"*, aqui é *"quem
 * lidera o club"*. Ter os mesmos dois valores hoje é coincidência, e juntá-los
 * faria a primeira que mudasse arrastar a outra sem ninguém decidir isso.
 */
export const CLUB_LEAD_ROLES = ['owner', 'manager'] as const;

/** Um dos papéis que lideram · o que o `leadsClub` estreita. */
export type ClubLeadRole = (typeof CLUB_LEAD_ROLES)[number];

const LEAD_ROLES = new Set<string>(CLUB_LEAD_ROLES);

/**
 * **Este papel lidera o club?**
 *
 * Recebe o papel de um vínculo **ativo** · quem chama filtra por
 * `status: 'active'`, e por isso `null`/`undefined` (não há vínculo) responde
 * `false` de graça.
 *
 * **É um type predicate, e não um `boolean`, porque quem pergunta costuma
 * precisar do papel depois** · sem ele o `roleOf` da API teria que repetir a
 * comparação só pra o compilador aceitar o retorno, e aí a grafia à mão que esta
 * constante veio apagar voltaria pela porta dos fundos.
 */
export function leadsClub(role: MembershipRole | null | undefined): role is ClubLeadRole {
  return role != null && LEAD_ROLES.has(role);
}

/**
 * Teto de clubs por player · **espelha o EA FC 26**, que permite afiliação a 3.
 * Ver `docs/dados.md`.
 *
 * **Mora aqui porque os dois lados usam o mesmo número.** Ele já esteve escrito
 * **duas vezes**, uma em `apps/web/src/lib/clubs.ts` e outra em
 * `apps/api/src/repositories/club/club-base.ts`, com um comentário defendendo a
 * duplicação: *"não é regra de segurança, é rótulo"*.
 *
 * **O argumento não se sustenta**, e o repositório já tem a prova: a lista de
 * idiomas viveu em quatro arquivos pelo mesmo motivo, e o estrago de divergir
 * nunca aparece na hora. Aqui ele seria a tela dizendo "você pode ter mais um"
 * enquanto o servidor recusa, ou o contrário · **nada dá erro**, e quem
 * descobre é a pessoa que não consegue entrar num club.
 *
 * Quem decide de verdade continua sendo o servidor. O que muda é que agora os
 * dois leem **o mesmo número**.
 */
export const MAX_CLUBS_PER_PLAYER = 3;

/**
 * Quantos **gerentes** um club aguenta · o dono **não** conta.
 *
 * Regra nossa, de 03/09/2026, e ela é do mesmo bloco da trava de liderança
 * única: gerente passou a inscrever, pagar e declarar placar, então cada um a
 * mais é mais uma pessoa que move dinheiro do club. Dois cobrem a ausência do
 * dono sem transformar o cargo em "todo mundo é gerente".
 *
 * **Mora aqui pelo mesmo motivo do teto acima** · a frase da recusa precisa
 * dizer o número, e teto sem número na mensagem é o que faz a pessoa tentar de
 * novo. Ele vai pro catálogo por interpolação, nunca escrito à mão.
 *
 * **É um portão na promoção, e não um invariante do documento** · a diferença
 * importa e está escrita no `setClubRole`: a transferência de posse pode deixar
 * um club com três gerentes, e ela não é barrada porque é a única saída do dono.
 */
export const MAX_MANAGERS_PER_CLUB = 2;

export const membershipSchema = z.object({
  ...baseDocumentFields,
  userId: objectIdString,
  clubId: objectIdString,
  /**
   * O papel **neste** club · e desde 03/09/2026 ele carrega uma regra que o
   * schema não consegue expressar, porque ela fala de outros documentos.
   *
   * **Uma conta lidera no máximo UM club ativo** · liderar é `owner` ou
   * `manager`. Nos demais clubs ela só pode ser `member`. O motivo é conflito de
   * interesse com dinheiro: quem lidera inscreve, paga, cancela e declara
   * placar, então a mesma pessoa liderando dois clubs da mesma edição paga
   * decide dos dois lados de uma partida que vale prêmio.
   *
   * **Não confunda com o `MAX_CLUBS_PER_PLAYER`** · aquele é sobre quantidade
   * (3 vínculos, regra do EA FC), este é sobre papel. Entrar como `member` em
   * três clubs continua liberado.
   *
   * Quem aplica é o `leadsAnotherClub`, em
   * `apps/api/src/repositories/club/club-base.ts`, dentro das três transações
   * que criam ou elevam liderança · e é lá que está escrito por que ela **não**
   * tem índice atrás dela, ao contrário do teto de posse.
   */
  role: membershipRole,
  /** Posição neste club · a mesma pessoa pode jogar em posições diferentes. */
  position: playerPosition.nullable().optional(),
  /**
   * O club principal da pessoa **aqui**, não no jogo.
   *
   * A distinção importa e já se perdeu uma vez, numa dica de tela: o EA FC 26
   * também tem um club favorito, e é por ele que o jogador recebe as
   * recompensas de Clubs Rush e dos Playoffs · só que **nós não lemos nem
   * escrevemos esse estado**, porque não existe API pública da EA. Explicar a
   * regra deles na nossa interface insinua uma integração que não há.
   *
   * Aqui ele serve pra ordenar a lista e pra dizer qual club representa a
   * pessoa. Se um dia existir integração, aí sim os dois conversam.
   *
   * O índice parcial único em `(userId)` com `isPrimary: true, status: active`
   * é quem garante que só existe um.
   */
  isPrimary: z.boolean(),
  /**
   * A braçadeira · **um por club, e sem poder nenhum**.
   *
   * Campo próprio e não valor de `role` porque as duas coisas são ortogonais:
   * o capitão daqui é ilustrativo (decisão do Eduardo, 30/07/2026) e **pode ser
   * gerente ao mesmo tempo**. Como valor do enum, escolher um apagaria o outro.
   *
   * O par com o `isPrimary` é exato, e por isso os dois são fáceis de lembrar:
   * **um favorito por player** (índice parcial único em `userId`), **um capitão
   * por club** (índice parcial único em `clubId`). Nos dois casos quem garante
   * é o banco, não a aplicação.
   */
  isCaptain: z.boolean(),
  status: membershipStatus,
  /**
   * Quando a pessoa **entrou no elenco**, não quando pediu · a data do pedido é
   * o `createdAt` do documento.
   *
   * Nulo enquanto o vínculo é `pending`, e preenchido na aprovação. Escrever a
   * data do pedido aqui seria mais simples e diria uma coisa falsa: um pedido
   * feito na segunda e aprovado na sexta apareceria como se a pessoa estivesse
   * no club desde segunda, e é este campo que ordena "meus clubs".
   */
  joinedAt: z.coerce.date().nullable(),
  /** Preenchido ao sair · o vínculo vira histórico em vez de sumir. */
  leftAt: z.coerce.date().nullable().optional(),
  /**
   * **Quando o dono ofereceu a gerência a esta pessoa** · nulo ou ausente
   * quando não há oferta nenhuma. 03/09/2026, pendência 185.
   *
   * **Promover passou a exigir aceite**, e o motivo é a trava de liderança do
   * mesmo dia: ser gerente **gasta a única vaga de liderança da conta**, além de
   * passar a inscrever, pagar, cancelar e declarar placar. Promover sem
   * perguntar gastava a vaga de outra pessoa por ela, e ela podia nem querer.
   *
   * **O pendente mora AQUI e não no club, ao contrário da posse**, e a
   * diferença é a cardinalidade: o club tem uma sucessão aberta ou nenhuma (por
   * isso `pendingOwnerId` é campo do club), e a gerência tem **até um convite
   * por pessoa do elenco ao mesmo tempo**. No club isso seria um array, e array
   * de ids num documento é o começo de uma collection mal disfarçada.
   *
   * **Não guarda QUEM ofereceu, e é decisão** · só o dono oferece, então quem
   * responde pela oferta é o dono **de agora** · se a posse mudou no meio, é ele
   * quem precisa saber da resposta, e não quem saiu. É o mesmo que o
   * `club-ownership.ts` faz ao ler o `ownerId` dentro da transação.
   *
   * A expiração é conferida **na leitura**, como a da posse: oferta mais velha
   * que `MANAGER_OFFER_TTL_DAYS` é tratada como inexistente. Não há agendador
   * neste produto.
   *
   * **É limpo ao sair e ao ser tirado do elenco**, e isso não é sobre o banco:
   * o vínculo é reaproveitado por par `(userId, clubId)`, então uma oferta
   * esquecida aqui **ressuscitaria** no dia em que a pessoa voltasse pro club.
   * É a mesma linha do `isCaptain: false` que já existia ao lado.
   */
  managerOfferAt: z.coerce.date().nullable().optional(),
});

/**
 * Quantos dias uma oferta de gerência vale.
 *
 * **Sete, o mesmo da posse (`OWNERSHIP_OFFER_TTL_DAYS`), e de propósito** · as
 * duas são a mesma pergunta pra quem recebe ("um club está esperando você"), e
 * dois prazos diferentes pro mesmo gesto seriam duas regras pra alguém explicar
 * sem ter por quê.
 *
 * Constante própria e não um `export` do outro porque **elas podem divergir**:
 * passar o club é decisão de vida do club e aceitar um cargo não é. No dia em
 * que uma mudar, a outra não deve ir junto sem alguém decidir isso.
 */
export const MANAGER_OFFER_TTL_DAYS = 7;

export type Membership = z.infer<typeof membershipSchema>;

/**
 * Uma linha do elenco na página pública. **Não é uma projeção do vínculo**: ela
 * junta o vínculo com o player, porque quem visita quer ver nome e @handle, e
 * `userId` sozinho não diz nada.
 *
 * Existe como schema pra que a decisão de exposição more aqui · o repositório
 * projeta a partir desta lista, e campo novo do player só aparece na página
 * depois de entrar nela.
 */
export const squadMember = z.object({
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: membershipRole,
  /** A braçadeira aparece **junto** do papel, não no lugar dele · o capitão pode ser gerente. */
  isCaptain: z.boolean(),
  position: playerPosition.nullable(),
});

export type SquadMember = z.infer<typeof squadMember>;

/**
 * O mesmo elenco, **pra quem gerencia o club**.
 *
 * Existe separado do `squadMember` por causa de um campo só: o `userId`, que as
 * rotas de gestão precisam pra saber em quem agir. Pelo `@handle` seria mais
 * bonito e estaria errado · ele é trocável, e entre a tela carregar e o clique
 * a pessoa pode ter mudado de nick · promover ou **remover** acertaria outra.
 *
 * **Por que não juntar tudo numa view só:** o `squadMember` sai na página
 * pública, onde o leitor é qualquer um, e id interno não tem o que fazer lá.
 * Duas audiências, duas views · é a mesma separação do `adminUserView`.
 */
export const manageSquadMember = squadMember.extend({
  userId: objectIdString,
});

export type ManageSquadMember = z.infer<typeof manageSquadMember>;

/**
 * Um pedido de entrada esperando resposta, como o dono do club vê.
 *
 * Mesma construção do `squadMember` e pelo mesmo motivo: é junção com o player,
 * não projeção do vínculo · `userId` sozinho não ajuda ninguém a decidir. E a
 * decisão de exposição mora aqui, então campo novo do player só chega na tela
 * de aprovação depois de entrar nesta lista.
 *
 * `requestedAt` é o `createdAt` do vínculo, renomeado no caminho: quem olha a
 * fila quer saber há quanto tempo a pessoa espera, e "criado em" é o nome do
 * documento, não o da pergunta.
 */
export const joinRequestView = z.object({
  /**
   * **O id interno sai aqui, e é exceção consciente à regra de não expor id.**
   *
   * A primeira versão desta view não o trazia, e a rota de resposta ia
   * identificar o candidato pelo `@handle`, que é o endereço público. Não
   * serve: o handle é **trocável**. Entre a fila carregar e o dono clicar em
   * aprovar, a pessoa pode ter mudado de nick e outra ter tomado o antigo · o
   * dono aprovaria alguém que nunca pediu, e entraria no elenco quem não
   * consentiu. Ação precisa de identificador estável.
   *
   * O que sustenta a exceção é o público: quem lê isto é o dono do club, numa
   * rota autenticada, sobre gente que pediu pra entrar nele. A regra que
   * proíbe id interno fala de **página pública**, onde o leitor é qualquer um.
   */
  userId: objectIdString,
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  position: playerPosition.nullable(),
  requestedAt: z.coerce.date(),
});

export type JoinRequestView = z.infer<typeof joinRequestView>;

/**
 * Um convite que o club mandou e ainda espera resposta · a mesma forma da fila
 * de pedidos, e de propósito: pro dono, as duas listas respondem a mesma
 * pergunta ("quem está entre nós e o elenco") e não podem parecer coisas
 * diferentes.
 */
export const clubInviteView = joinRequestView.extend({
  /** Quando o convite saiu · a fila mostra há quanto tempo ninguém respondeu. */
  invitedAt: z.coerce.date(),
}).omit({ requestedAt: true });

export type ClubInviteView = z.infer<typeof clubInviteView>;
