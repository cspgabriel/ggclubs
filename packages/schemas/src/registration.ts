import { z } from 'zod';
import { baseDocumentFields, clubTag, objectIdString, slug } from './common.js';
import { crossplayPool } from './crossplay.js';
import { playerPosition } from './enums.js';
import { paymentView } from './payment.js';
import { tournamentStatus } from './tournament.js';

/**
 * Quantos minutos a vaga fica segura enquanto o pagamento não fecha.
 *
 * **Dez desde 13/08/2026**, decisão do Eduardo · é o **piso** da faixa que ele
 * deu em 10/08 (10 a 15), e a troca veio junto do conserto que a torna
 * defensável: **até então o relógio só aparecia depois de a cobrança nascer**,
 * então boa parte dos quinze minutos queimava sem ninguém ver. Dez minutos
 * **vistos** valem mais que quinze invisíveis.
 *
 * > **Eu tinha recomendado não mexer no número antes do conserto**, e ele mandou
 * > fazer as duas coisas no mesmo bloco. O registro fica porque a recomendação
 * > era sobre a ordem, não sobre o valor.
 *
 * O porquê de a faixa ter subido de 5, lá atrás, continua valendo: cinco minutos
 * derrubavam quem estava pagando de verdade, e **essa é a fricção que ele mandou
 * evitar**.
 *
 * A vaga segura é o que faz o Pix funcionar sem corrida: **o Pix expira junto**,
 * então "paguei depois de lotar" deixa de ser rotina e reembolso volta a ser
 * exceção (cancelamento, prazo vencido).
 */
export const RESERVATION_MINUTES = 10;

/**
 * > **Aqui viveu um `MIN_CHARGE_MINUTES`, e ele foi recusado no mesmo dia**
 * > (13/08/2026, decisão do Eduardo). A ideia era não deixar a cobrança nascer
 * > nos últimos minutos da reserva, porque o prazo do Pix é o que sobra dela.
 * >
 * > **A justificativa que eu dei era falsa** · eu disse que a cobrança curta
 * > faria a pessoa pagar sem a vaga fechar, e isso não acontece: código vencido
 * > o banco recusa, e pagamento atrasado o webhook confirma. O piso trocava
 * > "talvez dê" por "não dá", **no instante de maior intenção** · quem tem 90
 * > segundos e o aplicativo aberto paga.
 * >
 * > Fica escrito porque a ideia é tentadora e volta sozinha. **Quem quiser
 * > reabrir precisa de um custo medido**, e não de um caso hipotético.
 */

/**
 * Situação da inscrição de um club numa edição.
 *
 * **`reserved` e `confirmed` são os dois que seguram vaga**, e é essa a
 * distinção que o resto do modelo usa · os outros três são fins.
 *
 * **`expired` e `cancelled` são fins diferentes de propósito**, pela mesma régua
 * que separa `left` de `removed` no vínculo de club: um é o relógio, o outro é
 * alguém decidindo. Juntar os dois faria o histórico do club afirmar que ele
 * desistiu quando na verdade o Pix venceu.
 *
 * **`refunded` é LEGADO desde 02/09/2026, e nada mais o escreve** · ele existia
 * porque o reembolso fazia duas coisas de uma vez: devolvia o dinheiro **e**
 * tirava o club da edição. A pendência 169 separou os dois eixos, por decisão do
 * Eduardo · **a inscrição diz o estado da VAGA e o pagamento diz o do
 * DINHEIRO**, e um club reembolsado que ninguém removeu fica `confirmed` com o
 * pagamento em `refunded`.
 *
 * **O valor fica no enum porque documento antigo o tem** · as quatro inscrições
 * da edição de teste de 01/09 estão assim, e elas foram reembolsadas **e**
 * removidas ao mesmo tempo, que era o comportamento da época. Apagar o valor
 * faria o Zod recusar documento que existe.
 *
 * **Quem quiser saber se o dinheiro voltou pergunta ao PAGAMENTO**, e não aqui.
 */
export const registrationStatus = z.enum([
  'reserved',
  'confirmed',
  'expired',
  'cancelled',
  'refunded',
]);
export type RegistrationStatus = z.infer<typeof registrationStatus>;

/** Os dois estados que ocupam uma das vagas da edição. */
export const HOLDING_STATUSES = ['reserved', 'confirmed'] as const;

export function holdsSlot(status: RegistrationStatus): boolean {
  return (HOLDING_STATUSES as readonly string[]).includes(status);
}

/**
 * Uma linha do elenco congelado · **quem pode jogar por este club nesta edição.**
 *
 * **Grava o `@handle` e o nome junto**, e não só o id, pela mesma razão do nome
 * do club na notificação: isto é registro do que **era** no instante do sorteio.
 * Quem trocar de @nick depois não reescreve a súmula, e mostrar a lista custa
 * zero consulta.
 */
export const registeredPlayer = z.object({
  userId: objectIdString,
  handle: slug,
  displayName: z.string(),
  position: playerPosition.nullable(),
});
export type RegisteredPlayer = z.infer<typeof registeredPlayer>;

/**
 * O motivo da cortesia · **os mesmos 4 e 200 do `CLOSE_REASON` do `match.ts`**,
 * e a referência é essa.
 *
 * É a mesma pessoa (a organização), no mesmo painel, escrevendo a mesma classe
 * de frase: uma justificativa curta que **outro admin vai ler daqui a um mês**
 * tentando entender por que aquele club está dentro sem ter pago. Inventar um
 * teto próprio aqui seria um número que ninguém sabe defender.
 *
 * **O piso existe pelo mesmo motivo do de lá** · "ok" e "x" não explicam nada, e
 * motivo que não explica é exatamente o estado que a pendência 191 existe pra
 * acabar.
 */
export const COURTESY_REASON_MIN = 4;
export const COURTESY_REASON_MAX = 200;

/**
 * **A vaga que a organização deu** · pendência 191, 04/09/2026.
 *
 * Ela nasce de um caso real: na Copa de Estreia a inscrição de um streamer foi
 * dada de graça pela única porta que havia, **cobrando o Pix e reembolsando**.
 * O registro que sobrou é indistinguível de um defeito (*"club dentro da edição
 * com o pagamento estornado"*), e foi lido como um no mesmo dia, numa auditoria
 * que contou 17 vagas contra 16 pagamentos.
 *
 * **O que ela guarda é o que faltava naquele dia:** o motivo, quem concedeu e
 * quando. Sem os três, a diferença entre vaga e dinheiro fica sendo uma conta
 * que não fecha, e quem olhar daqui a um mês vai ter **menos** contexto pra
 * desfazer a leitura, não mais.
 *
 * **Ela conta como VAGA e não como RECEITA**, e essa é a regra inteira: a
 * inscrição fica `confirmed`, entra no `registeredCount`, ocupa degrau e entra
 * no sorteio · e **nenhum documento de pagamento nasce**, então ela não aparece
 * na mesa do dinheiro nem soma em arrecadação nenhuma. Os dois eixos do
 * `docs/pagamento.md` continuam sendo dois, e este campo é o que diz de qual
 * dos dois lados a vaga veio.
 */
export const registrationCourtesy = z.object({
  reason: z.string().trim().min(COURTESY_REASON_MIN).max(COURTESY_REASON_MAX),
  /** O admin que concedeu · **sai do token, nunca do corpo da requisição.** */
  grantedBy: objectIdString,
  grantedAt: z.coerce.date(),
});
export type RegistrationCourtesy = z.infer<typeof registrationCourtesy>;

export const registrationSchema = z.object({
  ...baseDocumentFields,
  tournamentId: objectIdString,
  clubId: objectIdString,
  /**
   * Quem apertou o botão · **e desde 03/09/2026 ele é quem LIDERA o club**, dono
   * ou gerente (`CLUB_LEAD_ROLES`).
   *
   * **Ele já pôde ser qualquer membro do elenco**, por decisão de 12/08/2026 ·
   * *"não pode ter fricção até assinar de fato"*, com o controle do club vindo
   * depois (o aviso e o cancelamento). Isso foi revertido em 18/08/2026, quando
   * o campeonato inteiro virou do dono · ver `docs/historico.md`.
   *
   * **Então por que o campo continua?** Porque ele é registro do que
   * **aconteceu**, e não entrada de autorização: as inscrições feitas antes da
   * mudança guardam quem de fato apertou, e o dono do club pode ter mudado
   * desde então. Quem decide quem pode agir é sempre o papel **agora**, lido no
   * vínculo (`leadsClub`) · nunca este campo.
   *
   * > **Estas duas linhas afirmaram "sempre o dono" até 04/09/2026**, três
   * > semanas depois de o gerente passar a agir pela edição · o `docs/estado.md`
   * > foi corrigido na chegada daquele dia e o comentário ficou pra trás.
   */
  registeredBy: objectIdString,
  /**
   * A geração do club **no instante da inscrição**, congelada.
   *
   * Ela é `poolOf(club.platform)` e podia ser recalculada na leitura · não é, e
   * a razão é a única que importa num produto que cobra: se o club editar a
   * plataforma depois, recalcular o tiraria da chave. **Remover um club pago
   * depois do sorteio, por causa de uma edição na tela de configurar, é o pior
   * desfecho possível** · a elegibilidade se confere na porta, uma vez.
   */
  pool: crossplayPool,
  status: registrationStatus,
  /** Até quando a vaga está segura · só enquanto `reserved`. */
  reservedUntil: z.coerce.date().nullable(),
  confirmedAt: z.coerce.date().nullable(),
  /**
   * Em que grupo este club caiu · **`null` até o sorteio**.
   *
   * > **Aqui morava o `squad`, a foto do elenco congelada no sorteio** · ela foi
   * > removida em 22/08/2026. Era **escrita e nunca lida**, por ninguém, e a
   * > regra que ela sustentava (*um player joga por um club só*) o produto **não
   * > consegue cumprir sozinho**: quem entra em campo no EA FC é quem estiver
   * > online, não o elenco cadastrado aqui. O que sobrou dela é o **aviso** aos
   * > dois clubs sobre quem ficou com o player disputado · ver `freezeSquads`.
   *
   * **Ele mora aqui e não numa collection de grupo**, e a razão é que grupo não
   * é entidade: ele não tem nome, dono nem ciclo próprio · é uma etiqueta que o
   * sorteio põe na inscrição. Uma collection `groups` existiria só pra guardar
   * um número, e toda leitura da tabela pagaria um `$lookup` pra descobrir o que
   * já está aqui.
   *
   * É índice (0, 1, 2…) e não letra, pelo mesmo motivo do `groupIndex` da
   * partida: a letra é rótulo de tela.
   */
  groupIndex: z.number().int().nonnegative().nullable(),
  /**
   * A vaga foi **dada** · `null` no caminho normal, que é a esmagadora maioria.
   *
   * Ver o `registrationCourtesy` pro porquê de ela existir.
   *
   * **Leia com `?? null`** · o campo nasceu em 04/09/2026 e todo documento
   * anterior chega **sem a chave**, que não é a mesma coisa que `null` pro
   * TypeScript · ver `docs/dados.md`. No filtro do Mongo o comportamento é o
   * contrário e ajuda: `{ courtesy: null }` casa com ausente **e** com nulo, e
   * `{ courtesy: { $ne: null } }` acha só quem tem.
   */
  courtesy: registrationCourtesy.nullable(),
});

export type Registration = z.infer<typeof registrationSchema>;

/**
 * A inscrição como as telas do produto a mostram · o club junto, porque nenhuma
 * tela mostra uma inscrição sem dizer de quem ela é.
 */
export const registrationCard = z.object({
  _id: objectIdString,
  status: registrationStatus,
  reservedUntil: z.coerce.date().nullable(),
  club: z.object({
    tag: z.string(),
    name: z.string(),
    crestUrl: z.string().nullable(),
  }),
});
export type RegistrationCard = z.infer<typeof registrationCard>;

/**
 * Um club **como a chave precisa dele** · pendência 107, 19/08/2026.
 *
 * A grade de inscritos só lista quem **ocupa vaga**, e é isso que ela deve
 * fazer · mas a chave é outra pergunta: ela mostra partidas que **aconteceram**,
 * e o club de uma delas pode ter saído da grade depois (encerrado pelo dono,
 * reembolsado pela organização). Quando isso acontecia, o nome dele virava a
 * **tag em maiúsculas** com um link pra uma página que responde 404.
 *
 * **Ele não some da chave**, e essa é a decisão: a partida aconteceu, e apagá-la
 * reescreveria a história do campeonato. O que muda é que o nome deixa de ser
 * link e ganha a marca de encerrado.
 */
export const tournamentClubCard = z.object({
  tag: z.string(),
  name: z.string(),
  crestUrl: z.string().nullable(),
  /**
   * O club ainda existe e tem página · **é o que decide se o nome vira link.**
   *
   * `false` cobre os dois jeitos de sair: encerrado pelo dono (`status:
   * 'deleted'`) e o que a leitura pública recusa por qualquer outro motivo.
   */
  active: z.boolean(),
});
export type TournamentClubCard = z.infer<typeof tournamentClubCard>;

/**
 * Por que este club **não** pode se inscrever · a pergunta respondida **antes do
 * clique**, e não depois dele.
 *
 * É o que transforma a promessa de "elegibilidade automática" em tela: quem
 * abre a página logado já lê *"o seu Fúria FC pode entrar"* ou o motivo de não
 * poder, em vez de descobrir no erro. A rota revalida tudo isto na hora de
 * gravar · esconder é UX, quem recusa é o servidor.
 */
export const eligibilityReason = z.enum([
  'ok',
  /** A geração do club não é a da edição · é a única que o club não resolve hoje. */
  'wrong-pool',
  /** Este club já está inscrito. */
  'already-registered',
  /**
   * A vaga está segura e o pagamento não fechou · **é o estado que tem ação.**
   *
   * Separado do `already-registered` porque a tela faz coisas opostas nos dois:
   * lá ela comemora e oferece chamar adversário, aqui ela mostra o QR e um
   * relógio correndo. Fundir os dois esconderia o pagamento **atrás da palavra
   * "inscrito"**, que é a leitura mais cara possível · a pessoa fecharia a
   * página achando que terminou.
   */
  'awaiting-payment',
  /** As vagas acabaram. */
  'full',
  /** As inscrições não estão abertas. */
  'closed',
]);
export type EligibilityReason = z.infer<typeof eligibilityReason>;

/** Um club de quem está olhando, com a resposta pronta. */
export const eligibleClub = z.object({
  id: objectIdString,
  tag: z.string(),
  name: z.string(),
  crestUrl: z.string().nullable(),
  reason: eligibilityReason,
  /**
   * Até quando a vaga está segura · **preenchido só em `awaiting-payment`.**
   *
   * **Ele existe porque o relógio precisa começar na inscrição, e não na
   * cobrança** (13/08/2026). Enquanto o prazo só vinha dentro do pagamento, a
   * tela não tinha o que desenhar antes de a pessoa apertar "Pix": ela lia um
   * texto dizendo que a vaga estava segura e **a reserva queimava invisível**.
   * Das três primeiras tentativas da edição piloto, **duas venceram assim**.
   *
   * É a data do servidor, e é ela que manda · o prazo do código Pix é derivado
   * dela, nunca o contrário.
   */
  reservedUntil: z.coerce.date().nullable(),
  /**
   * **A vaga foi DADA** · e a tela precisa saber, porque o botão de sair depende
   * disso.
   *
   * O `reason` responde *"o club está dentro"*, e não *"ele pagou"* · são a mesma
   * coisa numa edição paga **menos** na cortesia, que nasce `confirmed` sem nunca
   * ter tido cobrança. Sem este campo o painel derivava "pagou" de
   * `priceCents > 0 && already-registered` e escondia o cancelar de quem ganhou a
   * vaga · **a API deixou de recusar em 04/09/2026 e a tela continuou
   * escondendo**, que é o pior dos dois mundos: o conserto existia e não chegava
   * a ninguém. Achado pelo `revisor` no mesmo bloco.
   *
   * **Booleano, e não o motivo** · por que a organização deu a vaga é anotação de
   * uma mesa pra outra, e quem lê isso é o painel do admin.
   */
  courtesy: z.boolean(),
  /**
   * A cobrança viva deste club · **e ela vem daqui porque a tela não pode ser
   * dona dela** (pendência 94, 14/08/2026).
   *
   * Enquanto o QR só existia no estado do componente, ele era **a única coisa
   * da tela que o servidor não sabia desmentir**: cobrança morta no provedor
   * seguia desenhada até a reserva vencer, e um F5 apagava um QR que continuava
   * pagável. Com ela na elegibilidade, o evento `tournament.payment` chega e a
   * tela **refaz a busca que já sabe fazer** · é a receita 1 do
   * `docs/tempo-real.md`, e é o que o evento magro exige.
   *
   * **`null` é "não há cobrança pra mostrar"**, e cobre os dois casos que a tela
   * trata igual: nunca houve, ou a que havia morreu. Quem decide o que é "viva"
   * é o `livePaymentsOf` · `pending` e ainda dentro do prazo.
   */
  payment: paymentView.nullable(),
});
export type EligibleClub = z.infer<typeof eligibleClub>;

/**
 * Uma edição em que o club está metido agora · **o que passa junto com a posse.**
 *
 * Existe por um pedido do Eduardo em 18/08/2026, e ele nasce de um problema
 * concreto: quem passa o club passa junto **o mando do campeonato**, porque
 * inscrever, pagar, cancelar e lançar placar são todos do dono. Sem esta peça,
 * as duas pontas descobrem isso depois · quem deu, ao não conseguir mais lançar
 * o placar do jogo que acabou de jogar; quem recebeu, ao receber um aviso de
 * partida de uma edição que ele não sabia que existia.
 *
 * **Ela não bloqueia nada, e isso é decisão.** Trancar a transferência enquanto
 * o club joga prenderia o dono por semanas · e passar o club é a única saída
 * que ele tem. O que o produto deve aqui é não deixar ninguém ser pego de
 * surpresa, e pra isso basta a edição ter **nome**.
 *
 * **`awaitingPayment` é o caso que muda o texto**, e por isso é campo e não
 * dedução do status: uma vaga reservada tem relógio correndo, e quem assume
 * precisa saber que **herda um prazo**, não só um compromisso.
 */
export const clubTournamentTie = z.object({
  slug,
  name: z.string(),
  status: tournamentStatus,
  /** A vaga está reservada e a cobrança não fechou · há relógio correndo. */
  awaitingPayment: z.boolean(),
  /**
   * A vaga está **paga** · confirmada numa edição que cobra.
   *
   * Nasce em 19/08/2026, quando encerrar o club passou a soltar as vagas dele:
   * ele é uma das duas coisas que **impedem** o encerramento, e a janela de
   * confirmação precisa dizer isso **antes** do clique. Sem ele o front teria
   * que deduzir de `status` mais o preço da edição, e o preço não vem aqui ·
   * dedução que precisa de um dado ausente é a que erra em silêncio.
   */
  paid: z.boolean(),
});
export type ClubTournamentTie = z.infer<typeof clubTournamentTie>;

/**
 * O que a organização manda pra dar uma vaga · **e o club vem por `tag`.**
 *
 * É o mesmo identificador que a grade de inscritos e a mesa de pagamentos já
 * entregam à tela (dado aberto não carrega id interno), então o painel não
 * precisa de uma segunda leitura só pra traduzir escudo em identificador · é a
 * mesma escolha do `DELETE /admin/tournaments/:id/registrations/:tag`.
 *
 * **Quem concedeu NÃO vem aqui**, e essa ausência é a regra de segurança da
 * casa: a identidade sai do token.
 */
export const grantCourtesyInput = z.object({
  clubTag,
  reason: z.string().trim().min(COURTESY_REASON_MIN).max(COURTESY_REASON_MAX),
});
export type GrantCourtesyInput = z.infer<typeof grantCourtesyInput>;

/**
 * Uma cortesia como a mesa do organizador a mostra · **o motivo junto**, que é
 * o ponto inteiro da pendência 191.
 *
 * Ela sai pela mesma rota que os pagamentos da edição, e o porquê está lá: as
 * duas listas respondem **a mesma pergunta** (quem está dentro e o que pagou),
 * e a conta do excedente do teto precisa das duas **no mesmo instante**.
 *
 * **`grantedByHandle` é anulável** porque a conta que concedeu pode ter sumido ·
 * o registro do que aconteceu não some junto com ela.
 */
export const courtesyGrantView = z.object({
  clubTag: z.string(),
  clubName: z.string(),
  reason: z.string(),
  grantedByHandle: z.string().nullable(),
  grantedAt: z.coerce.date(),
});
export type CourtesyGrantView = z.infer<typeof courtesyGrantView>;
