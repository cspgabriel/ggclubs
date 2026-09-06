import { z } from 'zod';
import { baseDocumentFields, httpUrl, moneyCents, objectIdString, slug } from './common.js';
import { crossplayPool } from './crossplay.js';

/**
 * Teto do nome do campeonato.
 *
 * **A referência é o nome mais longo que o rival usa**, lido em 08/08/2026 e
 * registrado no `docs/produto.md`: as categorias dele são "Copa do Mundo",
 * "Champions League", "Squad" e "Eurocopa" · a maior tem 16 caracteres. Com
 * marca e ano junto ("Champions League GGClubs 2026") são 29, e 40 dá folga sem
 * deixar o cabeçalho da página quebrar em duas linhas a 320px.
 *
 * **Não é número inventado, e não é o teto do club** · o do club são 15 porque
 * o EA FC 26 impõe isso no campo do jogo. Aqui não há campo do jogo nenhum: o
 * nome é nosso, e quem o limita é a tela.
 */
export const TOURNAMENT_NAME_MAX = 40;

/**
 * Teto do regulamento, em markdown.
 *
 * **A referência é o regulamento do rival**, que é a coisa mais longa desse tipo
 * que este produto conhece: lido inteiro em 08/08/2026, ele cabe em cerca de
 * 3.000 caracteres. Oito mil são mais de duas vezes ele · espaço pra um
 * regulamento honesto e não pra um contrato.
 */
export const TOURNAMENT_RULES_MAX = 8_000;

/**
 * Ciclo de vida da edição.
 *
 * **`draft` não aparece em lugar nenhum** · nem na lista pública, nem pra quem
 * tem o endereço. É o rascunho do admin, e é o que permite montar a edição com
 * calma antes de ela virar promessa.
 *
 * **`open` e `closed` são os dois estados de inscrição**, e a diferença entre
 * eles não é só a data: `closed` é também onde a edição fica quando **lotou**.
 * A tela precisa distinguir "ainda não abriu" de "acabou" de "encheu", e as três
 * saem daqui mais das datas.
 *
 * Os quatro últimos existem porque o ciclo é este, e declarar meio ciclo faria a
 * transição seguinte parecer estado novo. **Os sete são alcançáveis** · uma
 * edição foi levada do rascunho ao `finished` pelas telas em 22/08/2026. Esta
 * linha dizia que sortear, jogar e terminar ainda não existiam, e ficou dizendo
 * isso por uma semana depois de existirem.
 */
export const tournamentStatus = z.enum([
  'draft',
  'open',
  'closed',
  'drawn',
  'running',
  'finished',
  'cancelled',
]);
export type TournamentStatus = z.infer<typeof tournamentStatus>;

/**
 * Um degrau da escada de tamanhos · **e é ele que responde "e se não encher?"**
 *
 * O formato padrão da casa é grupos seguidos de mata-mata (decisão do Eduardo em
 * 10/08/2026), e nele **só mudam os números**. O problema que a escada resolve é
 * outro e não estava escrito em lugar nenhum: 48 vagas com grupos de 4 **não
 * fecham com 41 inscritos**, e sem resposta pra isso a véspera da primeira
 * edição vira adiamento ou reembolso em massa · com dinheiro de gente dentro.
 *
 * Com a escada, a edição declara antes *"roda no maior tamanho que couber"*, e
 * cada degrau é uma chave válida por si só. Isso deixa de ser crise e vira
 * regra escrita na página · e a regra também é conversão, porque a maior objeção
 * de quem paga cedo é a edição não acontecer.
 *
 * **A premiação é por degrau**, e isso não é detalhe contábil: prometer
 * R$ 550/300/200 e rodar com 32 pagantes é prometer o que a arrecadação não
 * cobre. Cada degrau declara o que paga, e a página mostra os dois.
 */
export const bracketSize = z.object({
  /** Quantos clubs entram neste degrau. */
  slots: z.number().int().min(2),
  /** Times por grupo · 4 é o padrão da casa e o do rival. */
  groupSize: z.number().int().min(2),
  /** Quantos passam de cada grupo. */
  qualifiersPerGroup: z.number().int().min(1),
  /**
   * Quantos melhores terceiros completam o mata-mata.
   *
   * É o parafuso que faz a conta fechar: 12 grupos × 2 dão 24, que não é
   * potência de dois · com 8 melhores terceiros viram 32, que é. Sem ele a
   * escada só teria degraus onde `grupos × classificados` já é potência de dois,
   * o que joga fora 48, 24 e 40.
   */
  bestThirds: z.number().int().nonnegative(),
  /** O que paga a este tamanho, em centavos · 1º, 2º e 3º. */
  prize: z.object({
    first: moneyCents,
    second: moneyCents,
    third: moneyCents,
  }),
});
export type BracketSize = z.infer<typeof bracketSize>;

/**
 * Quantos clubs saem da fase de grupos deste degrau.
 *
 * Função pura, e é ela que a tela do admin usa pra mostrar a conta enquanto a
 * pessoa digita · sem isso o formulário de números vira adivinhação.
 */
export function qualifiedCount(size: BracketSize): number {
  const groups = Math.floor(size.slots / size.groupSize);
  return groups * size.qualifiersPerGroup + size.bestThirds;
}

export function groupCount(size: BracketSize): number {
  return Math.floor(size.slots / size.groupSize);
}

/**
 * Este degrau é uma chave que dá pra jogar?
 *
 * **É a validação inteira do formulário do admin**, e ela é o que sobrou de "o
 * que sai de uma fase tem que caber na próxima" depois de o Eduardo decidir que
 * o formato é o padrão da casa. Quatro condições, e cada uma tem um jeito
 * concreto de dar errado:
 *
 * 1. **os grupos fecham** · 50 times em grupos de 4 deixam dois times sem grupo;
 * 2. **passa menos gente do que entra no grupo** · classificar 4 de 4 é não ter
 *    fase de grupos;
 * 3. **os melhores terceiros existem de verdade** · não dá pra pescar 8
 *    terceiros de 6 grupos, e só há terceiro quando o grupo tem ao menos três;
 * 4. **o mata-mata é potência de dois**, com pelo menos uma final · 24
 *    classificados não formam chave sem dar bye a alguém, e bye num campeonato
 *    pago é privilégio sorteado.
 */
export function isPlayableBracket(size: BracketSize): boolean {
  if (size.slots % size.groupSize !== 0) return false;
  if (size.qualifiersPerGroup >= size.groupSize) return false;

  const groups = groupCount(size);
  if (size.bestThirds > groups) return false;
  // Terceiro colocado só existe em grupo de três ou mais · com grupos de dois,
  // pescar "melhores terceiros" é pescar quem não existe.
  if (size.bestThirds > 0 && size.groupSize < 3) return false;
  // E ele precisa ser o terceiro **que não classificou**: com 3 passando de cada
  // grupo, o terceiro já entrou pela porta da frente e seria contado duas vezes.
  if (size.bestThirds > 0 && size.qualifiersPerGroup >= 3) return false;

  const qualified = qualifiedCount(size);
  return qualified >= 2 && (qualified & (qualified - 1)) === 0;
}

/**
 * O formato da edição · a escada, e a disputa de terceiro.
 *
 * **A escada é ordenada do maior pro menor e o primeiro degrau é o teto de
 * vagas.** Ordem crescente daria uma edição que "encolhe" pra cima, e a página
 * precisa dizer um número quando alguém pergunta quantas vagas há.
 */
export const tournamentFormat = z
  .object({
    sizes: z.array(bracketSize).min(1).max(6),
    /**
     * **Não é opcional na prática, e o padrão é `true`** · a decisão é do Eduardo
     * e o argumento é dele: *"com R$ 200 em jogo, os dois eliminados voltam · a
     * gente evita W.O. na reta final e ainda ganha mais uma partida boa pra
     * transmitir antes da final"*.
     *
     * Existe como campo porque uma liga ou uma copa simples não têm essa
     * partida, e o modelo continua sendo composição de fases.
     */
    thirdPlaceMatch: z.boolean(),
  })
  .refine((f) => f.sizes.every(isPlayableBracket), {
    message: 'Todo tamanho precisa formar uma chave que dá pra jogar',
    path: ['sizes'],
  })
  .refine((f) => f.sizes.every((size, i) => i === 0 || size.slots < (f.sizes[i - 1]?.slots ?? 0)), {
    message: 'Os tamanhos vão do maior pro menor, sem repetir',
    path: ['sizes'],
  });
export type TournamentFormat = z.infer<typeof tournamentFormat>;

export const tournamentSchema = z.object({
  competitionRevision: z.number().int().optional(),
  ...baseDocumentFields,
  /**
   * Endereço público (`/campeonato/copa-ggclubs-2026`).
   *
   * **Terceira família de endereço público do produto**, junto do `@handle` e da
   * tag de club · por isso as palavras da rota entraram em `reserved.ts` antes
   * de existir campeonato. O prefixo é diferente, então o slug **não** disputa
   * namespace com as outras duas.
   */
  slug,
  name: z.string().trim().min(2).max(TOURNAMENT_NAME_MAX),
  /**
   * A geração que joga esta edição · **obrigatória, e não é rigor de
   * configuração.**
   *
   * No Clubs do EA FC um club `current` **não joga** contra um `legacy`, então
   * edição de pool misto seria uma chave impossível de jogar. É a mesma divisão
   * que o rival opera na mão (jogo × geração) e que aqui sai do documento do
   * club, porque `clubs.platform` é campo declarado.
   */
  pool: crossplayPool,
  status: tournamentStatus,
  format: tournamentFormat,
  /** Zero é campeonato grátis, e ele é o mesmo produto com o preço zerado. */
  priceCents: moneyCents,
  /**
   * Regulamento em markdown · o mesmo renderizador do texto legal.
   *
   * **Um texto só, e não um por idioma**, ao contrário do documento legal. A
   * diferença é de quem escreve: o texto legal é do produto e sai nos dois
   * idiomas por obrigação nossa; o regulamento é de quem **organiza** a edição,
   * como a frase do club e a do player. Traduzi-lo seria o produto pondo palavra
   * na boca do organizador.
   */
  rules: z.string().trim().max(TOURNAMENT_RULES_MAX).nullable().optional(),
  crestUrl: httpUrl.nullable().optional(),
  bannerUrl: httpUrl.nullable().optional(),
  registrationOpensAt: z.coerce.date(),
  registrationClosesAt: z.coerce.date(),
  /**
   * **O instante em que tudo congela**, e ele é uma data só de propósito.
   *
   * No sorteio: o club de quem se inscreveu sem ter um **precisa existir**, o
   * elenco vira a lista daquela edição, e a chave sai. Congelar o elenco na
   * inscrição brigaria com o outro laço do produto · entre inscrever e jogar, o
   * club está recrutando, e a vitrine de players existe pra isso.
   */
  drawAt: z.coerce.date(),
  /** Quando se joga · a tabela por rodada entra com o bloco do chaveamento. */
  startsAt: z.coerce.date(),
  /**
   * **Quando a edição entrou em jogo de verdade** · escrito na primeira vez que
   * ela vira `running`, e nunca reescrito.
   *
   * Ele não é o `startsAt`: aquele é a **promessa** feita na criação, e este é o
   * **fato**. A distância entre os dois é o que o W.O. precisa saber · o prazo
   * que dá uma partida como não jogada conta do mais tarde entre o horário dela
   * e este instante, porque antes dele não dava pra jogar.
   *
   * **`.optional()` cobre as edições anteriores a 22/08/2026** · nenhuma delas
   * está `running`, e reescrever o passado pra caber num campo novo é o que
   * este projeto evita.
   */
  startedAt: z.coerce.date().nullable().optional(),
  organizerId: objectIdString,
  /**
   * Inscrições que seguram vaga · **denormalizado, e mantido na mesma
   * transação** que cria e desfaz a inscrição.
   *
   * É a mesma regra do `memberCount` do club, e existe pelos mesmos dois
   * motivos: a lista de campeonatos mostra o número em toda visita, e **o
   * contador ao vivo é a alavanca de conversão da página** · escassez verdadeira
   * num produto com teto de vagas. Contar por consulta a cada carregamento
   * seria varrer `registrations` pra desenhar um selo.
   *
   * O `pnpm migrate` recalcula, que é o conserto no dia da divergência.
   */
  registeredCount: z.number().int().nonnegative(),
  /** Quando a chave saiu · `null` enquanto o sorteio não rodou. */
  drawnAt: z.coerce.date().nullable().optional(),
  /**
   * **Quando a edição foi encerrada ou cancelada** · o relógio da janela de
   * cortesia da conversa, e nada mais.
   *
   * A sala dos confrontos fecha **6h depois disto**, e não no instante · decisão
   * do Eduardo em 30/08/2026. **Opcional porque edição antiga não tem** · e a
   * ausência dele é lida como *"encerrou há muito tempo"*, que é o certo pro
   * histórico.
   */
  finishedAt: z.coerce.date().nullable().optional(),
  /**
   * **Quando o último jogo fechou** · e ele NÃO é o `finishedAt`.
   *
   * São duas coisas diferentes e o produto precisava das duas: `finishedAt` é o
   * **ato administrativo** de quem organiza (e destrava as 6h da conversa);
   * este aqui é o **fato esportivo** de não haver mais nada a jogar.
   *
   * **Sem ele a tela mentia** · achado pelo Eduardo em 05/09/2026, com a Copa de
   * Estreia decidida havia horas: a landing, a lista e a capa continuavam
   * anunciando *"acontecendo agora"* e *"ao vivo"*, porque o único sinal que
   * elas tinham era o status, e ele só muda com um clique. Quem chegasse de fora
   * naquele intervalo leria um campeonato ao vivo que já tinha campeão · e isso
   * na superfície de aquisição.
   *
   * **Ele é escrito pelo `settleAftermath`**, no mesmo caminho que faz a chave
   * andar, e **não** decide nada de administrativo: encerrar continua sendo ato
   * de quem organiza, como manda a decisão de 22/08/2026.
   *
   * Opcional porque edição anterior a esta data não tem · e a ausência é lida
   * como *"não sei"*, que devolve o comportamento antigo.
   */
  playedOutAt: z.coerce.date().nullable().optional(),
  /**
   * O degrau que a edição de fato jogou · **congelado no sorteio.**
   *
   * Ele podia ser recalculado por `sizeFor(format, registeredCount)` a cada
   * leitura, e não é, pelo mesmo motivo do `amountCents` da cobrança: **ler da
   * escada depois faria o admin corrigir o formato e reescrever o que foi
   * prometido a quem já jogou.** A premiação que a página mostra depois do
   * sorteio é a deste campo, e não a do primeiro degrau.
   */
  drawnSize: bracketSize.nullable().optional(),
});

export type Tournament = z.infer<typeof tournamentSchema>;

/**
 * O teto de vagas · o primeiro degrau da escada.
 *
 * **Não se chama `slotsOf`** porque esse nome já é das onze posições de uma
 * formação (`formations.ts`), e duas funções com o mesmo nome no mesmo pacote
 * são a ambiguidade que o compilador recusa · aqui o assunto é capacidade da
 * edição, e o nome diz isso.
 */
export function capacityOf(tournament: Pick<Tournament, 'format'>): number {
  return tournament.format.sizes[0]?.slots ?? 0;
}

/**
 * Quem está **acima do teto** numa edição paga · decisão do Eduardo em
 * 24/08/2026, pendência 91.
 *
 * A edição passa do teto quando um pagamento confirma depois de a reserva
 * vencer e a vaga já ter sido tomada · recusar esse pagamento seria deixar de
 * fora quem **pagou**, então o produto confirma e o excedente é reembolsado.
 *
 * **A ordem é a do pagamento confirmado, e não a da inscrição iniciada** · quem
 * estourou o teto foi justamente quem pagou atrasado, então ordenar pelo início
 * faria essa pessoa tomar a vaga de quem pagou em dia. É a mesma frase que a
 * tela promete antes de a pessoa pagar: a vaga é de quem confirma primeiro.
 *
 * **Só pagamento aprovado segura vaga** · devolvido já saiu da conta, e por
 * isso não entra na fila nem empurra ninguém.
 *
 * **E a cortesia come degrau antes de todo mundo** · pendência 191, 04/09/2026.
 * Ela é vaga sem pagamento nenhum, então ela **não aparece nesta lista** e
 * mesmo assim ocupa. Sem o `courtesySlots`, uma edição com uma cortesia e o
 * teto de pagantes cheio responde *"ninguém passou do teto"* enquanto o
 * `drawTournament` recusa por `leftovers` · a mesa diria que está tudo certo
 * justamente na hora em que a organização precisa saber quem tirar.
 *
 * **Não é uma terceira contagem, é a mesma:** o que entra aqui é quantas das
 * vagas do degrau já foram dadas, e o que sobra é o que o dinheiro pode ocupar.
 *
 * Devolve os ids na ordem da fila, do primeiro excedente em diante.
 */
export function paymentsOverCapacity<
  T extends { paymentId: string; status: string; paidAt: string | null },
>(payments: readonly T[], capacity: number, courtesySlots = 0): string[] {
  return payments
    .filter((payment) => payment.status === 'approved')
    .slice()
    .sort((left, right) => (left.paidAt ?? '').localeCompare(right.paidAt ?? ''))
    .slice(Math.max(0, capacity - courtesySlots))
    .map((payment) => payment.paymentId);
}

/**
 * **A inscrição está aberta agora** · e `status === 'open'` não responde isso.
 *
 * O status diz que a edição foi publicada; **quem abre e fecha a porta é a
 * janela de datas**, e é ela que o `registerClub` confere antes de aceitar
 * alguém. Enquanto isto não existia, **cinco telas** traduziam o status cru e
 * anunciavam *"Inscrições abertas"* pra uma edição que responde `closed` ·
 * **quatro no selo** (a lista do admin, o painel de operar, o cartão público e a
 * página da edição) e a quinta na **copy do painel de inscrição**. **O visitante
 * clicava e levava a recusa** · achado pelo `revisor` em 22/08/2026, a partir da
 * metade que eu tinha consertado só no painel de operar.
 *
 * **Quatro e cinco não é descuido, é a divisão** · quem desenha selo chama o
 * `displayStatusOf`; o painel de inscrição chama esta função direto, porque o
 * que ele decide é frase e não rótulo. Contar errado aqui já custou um dia neste
 * repositório (ver o header, no `CLAUDE.md`), então **conte pelo `grep`**.
 *
 * **Lotação não entra aqui de propósito** · a edição cheia continua com a porta
 * aberta (alguém pode desistir e a vaga volta), e quem responde por vaga é o
 * `registeredCount` contra a capacidade. Misturar as duas daria um selo que
 * muda de texto quando um club sai.
 */
export function registrationIsOpen(
  tournament: Pick<Tournament, 'status' | 'registrationOpensAt' | 'registrationClosesAt'>,
  now: Date = new Date(),
): boolean {
  if (tournament.status !== 'open') return false;
  return (
    new Date(tournament.registrationOpensAt) <= now &&
    now < new Date(tournament.registrationClosesAt)
  );
}

/**
 * **Quantos times a edição tem, de verdade** · e depois do sorteio o contador
 * deixa de ser a resposta.
 *
 * O `registeredCount` conta **vaga ocupada**, e é a resposta certa enquanto a
 * inscrição decide alguma coisa. Depois do sorteio ele continua andando (é o
 * `releaseSlot` que o move, e quem o chama é remover, cancelar e a reserva que
 * venceu), enquanto a chave já está desenhada com o número que entrou · a capa
 * dizia **"7 TIMES NA EDIÇÃO · 7 de 8 vagas"** em cima de quatro quartas com 8
 * escudos. Pendência 177.
 *
 * **O `drawnSize` é o degrau congelado no sorteio**, e é ele que o
 * `generateKnockout` leu pra montar a chave · quem jogou é isso.
 */
export function teamsInEdition(
  tournament: Pick<Tournament, 'status' | 'registeredCount' | 'drawnSize'>,
): number {
  if (tournament.drawnSize) return tournament.drawnSize.slots;
  return tournament.registeredCount;
}

/**
 * **A edição já começou a jogar?** · e a resposta é o relógio, não o status.
 *
 * Ela nasce da pendência 178: o card chamava de **"Ao vivo"** toda edição
 * `drawn` ou `running` e mostrava **"Jogado em"** (pretérito) com data futura.
 * Inscrição fecha sexta, sorteio sábado, jogos no sábado seguinte · por **uma
 * semana** o produto anunciava ao vivo um campeonato que ninguém tinha jogado.
 *
 * O `startsAt` é o dado que existia e ninguém consultava.
 */
export function hasKickedOff(
  tournament: Pick<Tournament, 'status' | 'startsAt'>,
  now: Date = new Date(),
): boolean {
  if (tournament.status === 'draft' || tournament.status === 'cancelled') return false;
  return new Date(tournament.startsAt) <= now;
}

/**
 * A edição está **de pé agora** · publicada, e ainda não encerrada.
 *
 * É a pergunta que separa *"tem campeonato acontecendo"* de *"já teve"*, e ela
 * não cabe em `status === 'open'`: uma edição sorteada e rolando não aceita mais
 * inscrição e continua sendo a que está acontecendo. `draft` fica de fora porque
 * não existe pra quem está de fora, e `cancelled` porque não vai acontecer.
 *
 * **Nasce porque a lista já estava escrita em dois lugares** e ia pro terceiro ·
 * o agrupamento da lista pública e a vitrine da landing enumeravam os mesmos
 * quatro status na mão. Enquanto a sobrelinha da landing anunciava
 * *"acontecendo agora"* sem consultar nenhum dos dois, a página passou uma
 * semana anunciando uma edição **terminada**.
 */

export function isLiveTournament(status: TournamentStatus): boolean {
  return status === 'open' || status === 'closed' || status === 'drawn' || status === 'running';
}

/**
 * **A edição ainda tem jogo por jogar?** · 05/09/2026.
 *
 * É a pergunta que faltava entre *"está de pé"* e *"já acabou"*, e ela existe
 * porque as duas não bastavam: uma edição com campeão decidido continua `running`
 * até alguém encerrar, e nesse intervalo a landing anunciava **"acontecendo
 * agora"** sobre um campeonato terminado.
 *
 * **Quem responde é o fato, não o status** · o `playedOutAt` é carimbado quando
 * a final e o terceiro lugar previsto estão resolvidos, sem partidas pendentes.
 * Fechar somente os grupos não basta. Edição sem o campo (anterior a esta data, ou que ainda
 * não jogou nada) devolve `true`, que é o comportamento de antes.
 */
export function stillHasGames(
  tournament: Pick<Tournament, 'playedOutAt'>,
  now: Date = new Date(),
): boolean {
  const at = tournament.playedOutAt;
  return !at || new Date(at) > now;
}

/** O estado que a tela mostra · o do banco mais os dois que só a data conhece. */
export type TournamentDisplayStatus = TournamentStatus | 'notYetOpen' | 'signupEnded';

/**
 * O selo de estado, **como a pessoa que olha vive a edição**.
 *
 * `open` no banco vira três coisas na tela conforme o relógio, e é isso que o
 * status cru escondia. Toda tela que desenha o selo passa por aqui · são
 * quatro, e "por quantos caminhos se chega ali" é a pergunta que fez esta
 * função existir em vez de mais uma condição no JSX.
 */
export function displayStatusOf(
  tournament: Pick<Tournament, 'status' | 'registrationOpensAt' | 'registrationClosesAt'>,
  now: Date = new Date(),
): TournamentDisplayStatus {
  if (tournament.status !== 'open') return tournament.status;
  if (registrationIsOpen(tournament, now)) return 'open';
  return new Date(tournament.registrationOpensAt) > now ? 'notYetOpen' : 'signupEnded';
}

/** O que a vitrine tem pra anunciar · ver o `featuredEdition`. */
export type ShowcaseStage = 'playing' | 'signup' | 'soon' | 'waiting' | 'past';

export type TournamentProofTotals = { editions: number; teams: number; prize: number };

/** Sorteio realizado e chave carregada são fatos diferentes. */
export function tournamentIsDrawn(tournament: Pick<Tournament, 'status' | 'drawnAt'>): boolean {
  return Boolean(tournament.drawnAt) || tournament.status === 'drawn' || tournament.status === 'running';
}

/** O mínimo que a vitrine precisa saber pra escolher · o resto é desenho. */
type ShowcaseEdition = Pick<
  Tournament,
  | 'status'
  | 'startsAt'
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'playedOutAt'
  | 'format'
  | 'registeredCount'
  | 'drawnAt'
>;

export type TournamentShelf = 'signup' | 'soon' | 'playing' | 'waiting' | 'past';

/** A mesma situação governa ordem, agrupamento e apresentação da edição. */
export function tournamentShelfOf(
  tournament: ShowcaseEdition,
  now = new Date(),
): TournamentShelf | null {
  if (tournament.status === 'draft' || tournament.status === 'cancelled') return null;
  if (tournament.status === 'finished' || !stillHasGames(tournament, now)) return 'past';
  const room = tournament.registeredCount < capacityOf(tournament);
  if (registrationIsOpen(tournament, now) && room) return 'signup';
  if (displayStatusOf(tournament, now) === 'notYetOpen' && room) return 'soon';
  const drawn = tournamentIsDrawn(tournament);
  if (drawn) return hasKickedOff(tournament, now) ? 'playing' : 'soon';
  return 'waiting';
}

export function orderedShowcaseEditions<T extends ShowcaseEdition>(
  tournaments: readonly T[],
  now = new Date(),
): T[] {
  const priority: TournamentShelf[] = ['signup', 'soon', 'playing', 'waiting', 'past'];
  return [...tournaments].sort((a, b) => {
    const aStage = tournamentShelfOf(a, now);
    const bStage = tournamentShelfOf(b, now);
    const rank =
      (aStage ? priority.indexOf(aStage) : priority.length) -
      (bStage ? priority.indexOf(bStage) : priority.length);
    if (rank) return rank;
    if (aStage === 'signup')
      return +new Date(a.registrationClosesAt) - +new Date(b.registrationClosesAt);
    if (aStage === 'past')
      return +new Date(b.playedOutAt ?? b.startsAt) - +new Date(a.playedOutAt ?? a.startsAt);
    return +new Date(a.startsAt) - +new Date(b.startsAt);
  });
}

/** Escolhe a oportunidade antes do acompanhamento e do resultado.
 * A ordem é compartilhada pela API, LP, início do app e listagens.
 * Inscrição vencida sem sorteio e lotação não viram anúncio de inscrição.
 * Sem oportunidade, o histórico continua acessível com apresentação compacta.
 */
export function featuredEdition<T extends ShowcaseEdition>(
  tournaments: readonly T[] | null,
  now: Date = new Date(),
): { edition: T | null; stage: ShowcaseStage } {
  for (const edition of orderedShowcaseEditions(tournaments ?? [], now)) {
    const stage = tournamentShelfOf(edition, now);
    if (stage) return { edition, stage };
  }
  return { edition: null, stage: 'past' };
}

/**
 * A edição ainda aceita edição de formato, preço e prazo · **enquanto ninguém
 * está dentro.**
 *
 * Mora no schema porque o servidor decide e a tela precisa mostrar o mesmo
 * botão · a regra escrita duas vezes é a regra que diverge, e aqui divergir
 * significa um `Editar` que abre um formulário pra levar 409.
 *
 * **A medida é ter gente dentro, e não o status** · até 22/08/2026 era
 * `status === 'draft'`, e quem publicasse com a data de abertura errada ficava
 * sem porta nenhuma na tela. `closed` pra frente fica de fora mesmo vazia: lá a
 * edição já andou, e prazo passado não se reescreve.
 */
export function canEditTournament(
  tournament: Pick<Tournament, 'status' | 'registeredCount'>,
): boolean {
  if (tournament.status !== 'draft' && tournament.status !== 'open') return false;
  return tournament.registeredCount === 0;
}

/**
 * O degrau que vale pra um número de inscritos · o maior que couber.
 *
 * É o que a página promete (*"a edição roda no maior tamanho que couber"*), e
 * quem o mostra é **a escada do painel de formato** · o "e se não encher".
 * Devolve `null` quando nem o menor degrau fecha · aí a edição não tem como
 * acontecer, e quem decide é o admin.
 *
 * **A premiação exibida NÃO sai daqui desde 04/09/2026** · ela sai do
 * `effectiveSize`, que antes do sorteio anuncia o tamanho vendido. Esta linha
 * dizia o contrário, e era o defeito descrito lá.
 */
export function sizeFor(format: TournamentFormat, registered: number): BracketSize | null {
  return format.sizes.find((size) => size.slots <= registered) ?? null;
}

/**
 * **O degrau que a tela deve mostrar** · e ele é um só, pra todas elas.
 *
 * Nasceu em 18/08/2026 porque **seis lugares do front derivavam este número por
 * conta própria** e chegavam a respostas diferentes: o card da lista anunciava
 * um prêmio e a página que recebia o clique anunciava outro. O pior deles é o
 * `drawnSize`, que o `docs/estado.md` afirmava alimentar a premiação depois do
 * sorteio e que tinha **zero** uso em `apps/web/src` · a doc descrevia um
 * comportamento que não existia.
 *
 * São **duas** respostas, e a ordem é a da certeza:
 *
 * | | |
 * |---|---|
 * | `drawnSize` | **o degrau que a edição de fato jogou** · congelado no sorteio, e é fato |
 * | `sizes[0]` | **o tamanho anunciado** · é o que a edição promete enquanto a inscrição está aberta |
 *
 * ## O degrau alcançado NÃO entra aqui · 04/09/2026
 *
 * Ela tinha um terceiro passo no meio, o `sizeFor(format, registeredCount)` · o
 * maior degrau que já cabe nos inscritos de agora. Parecia a resposta mais
 * informada, e era **a errada pra uma inscrição aberta**: a Copa de Estreia
 * abriu anunciando 32 vagas e R$ 500 pro campeão, e no instante em que o 16º
 * club entrasse a página inteira passaria a anunciar o degrau de 16 · prêmio
 * menor, chave menor, **sem ninguém ter decidido nada**. Quem chegasse depois
 * leria uma edição pior do que a que foi vendida, e quem já tinha pago veria a
 * promessa encolher enquanto o campeonato ainda enchia.
 *
 * **O degrau alcançado é informativo, e não determinante** · quem fecha o
 * tamanho é o sorteio, e até ele acontecer nada está decidido. Ele continua
 * existindo e sendo mostrado, na escada do `FormatPanel`, que pergunta ao
 * `sizeFor` por conta própria e diz explicitamente que é o "e se não encher" ·
 * lá a frase carrega o contexto que aqui faltava.
 *
 * Decisão do Eduardo, olhando o painel de premiação da Copa de Estreia.
 *
 * **Ela NÃO serve pra capacidade nem pra barra de vagas**, e isso é decisão ·
 * as duas perguntas são diferentes: "em que tamanho isto roda" e "quanta vaga
 * ainda tem". Quem responde vaga é o `capacityOf`, sempre contra o **maior**
 * degrau.
 *
 * **O argumento mudou de forma em 04/09/2026, e a decisão não.** Enquanto o
 * degrau alcançado entrava aqui, as duas divergiam **durante a inscrição** ·
 * medir a barra por este valor a levava a 100% numa edição aberta que ainda
 * aceitava club. Hoje elas coincidem antes do sorteio (as duas são `sizes[0]`)
 * e divergem **depois** dele, que é quando a edição roda em 12 e a vaga
 * continua tendo sido contra 48. Manter as duas separadas continua certo · o
 * que mudou foi o momento em que a diferença aparece.
 */
export function effectiveSize(
  tournament: Pick<Tournament, 'format' | 'drawnSize'>,
): BracketSize | null {
  return tournament.drawnSize ?? tournament.format.sizes[0] ?? null;
}

/**
 * O que sai numa resposta pública.
 *
 * A decisão de exposição mora no schema, como no `clubPublicView` · campo novo
 * só vaza depois de entrar aqui. `organizerId` fica de fora porque é id interno:
 * quando a página mostrar quem organiza, mostra o `@handle`.
 */
export const tournamentPublicView = tournamentSchema.omit({
  organizerId: true,
});

export type TournamentPublicView = z.infer<typeof tournamentPublicView>;
