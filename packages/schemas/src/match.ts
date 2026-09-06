import { z } from 'zod';
import { baseDocumentFields, httpUrl, objectIdString } from './common.js';

/**
 * Em que parte da competição a partida acontece.
 *
 * **Só `group` é alcançável hoje** · o mata-mata entra com o bloco dele, e
 * declarar meio ciclo faria a fase seguinte parecer conceito novo · é a mesma
 * razão pela qual `tournamentStatus` já nasceu com `running` e `finished`.
 */
export const matchPhase = z.enum(['group', 'knockout']);
export type MatchPhase = z.infer<typeof matchPhase>;

/**
 * O ciclo de uma partida.
 *
 * **`scheduled` é o único que o sorteio produz** · o resto entra com o resultado
 * declarado, que é o bloco seguinte. `walkover` já está aqui porque o W.O. é a
 * resposta do produto pra time que não aparece (decisão em aberto do Eduardo
 * sobre tolerância e placar, nunca sobre existir).
 */
export const matchStatus = z.enum(['scheduled', 'played', 'disputed', 'walkover', 'cancelled']);
export type MatchStatus = z.infer<typeof matchStatus>;

/**
 * **Quem NÃO apareceu** · o lado que perdeu por W.O., e `both` quando ninguém
 * apareceu.
 *
 * O nome diz o sentido de propósito: `walkoverAgainst: 'away'` é *"o W.O. foi
 * contra o visitante"*, ou seja quem faltou foi ele. Ler ao contrário inverte o
 * placar de uma partida inteira, e é o mesmo cuidado que faz as duas declarações
 * falarem sempre na perspectiva mandante × visitante.
 *
 * **`both` existe porque sem ele a tabela adivinharia pelo placar** · um 3-0 de
 * W.O. conta pontos e um 0-0 de W.O. duplo não conta nada, e distinguir os dois
 * pelo número gravado é o tipo de inferência que quebra calado no dia em que
 * alguém empatar 0-0 de verdade.
 */
export const walkoverSide = z.enum(['home', 'away', 'both']);
export type WalkoverSide = z.infer<typeof walkoverSide>;

/**
 * O placar de um W.O. · **3 a 0, e o número tem referência.**
 *
 * É o padrão FIFA, que é o mesmo lugar de onde saiu o desempate em bloco. A
 * decisão do Eduardo em 21/08/2026 pôs o custo na mesa: saldo decide grupo,
 * então um 3-0 injeta +3 em quem não jogou. **A distorção é real e é
 * simétrica** · quem levou o W.O. é quem faltou. Inventar 1-0 exigiria explicar
 * de onde veio.
 *
 * **O W.O. duplo é 0-0 e não pontua** · ver `walkoverSide`.
 */
export const WALKOVER_GOALS = 3;

/**
 * Quantos gols cabem num placar declarado.
 *
 * **O teto tem referência, como todo limite deste projeto** · num jogo de Clubs
 * de dois tempos de seis minutos, dois dígitos já é goleada histórica. Vinte
 * deixa folga pro absurdo real sem aceitar o dedo escorregando no teclado, que é
 * o que um campo sem teto aceita.
 */
export const MAX_GOALS = 20;

/**
 * Quantos pênaltis cabem numa disputa declarada.
 *
 * **O teto tem referência**, como o de gols: uma disputa de pênaltis do EA FC
 * começa em cinco cobranças por lado e segue em alternadas · vinte por lado é
 * absurdo real com folga, e recusa o dedo escorregando no teclado.
 *
 * **Ele existe desde 19/08/2026**, com o mata-mata · na fase de grupos empate é
 * resultado, e é por isso que o campo não é do documento inteiro.
 */
export const MAX_PENALTIES = 20;

/**
 * O que **um** dos dois clubs diz que aconteceu.
 *
 * **Os dois lados declaram na mesma perspectiva** (gols do mandante, gols do
 * visitante), e não "meus gols / gols dele" · comparar duas declarações exige
 * que elas falem a mesma língua, e converter na leitura seria a chance de
 * inverter um placar sem ninguém ver.
 */
export const matchReport = z.object({
  homeGoals: z.number().int().min(0).max(MAX_GOALS),
  awayGoals: z.number().int().min(0).max(MAX_GOALS),
  /**
   * O print do placar · **prova, e é ela que o admin lê na disputa.**
   *
   * Vai pro CDN público, como escudo e avatar (decisão de 15/08/2026): é prova
   * de resultado, não dado sensível, e deixá-la visível pra quem olha a partida
   * é o argumento contra a operação por foto no grupo de WhatsApp.
   *
   * **`null` só no W.O.**, e a exceção é decisão do Eduardo em 21/08/2026:
   * **não se fotografa a ausência de alguém.** Exigir prova de um não-evento faz
   * a pessoa mandar qualquer captura pra passar pelo campo obrigatório, e aí o
   * print perde significado **em todas** as partidas. O que sustenta a
   * declaração de W.O. é o silêncio do outro lado por 24h, não uma foto.
   *
   * Quem cobra a presença é o repositório, que sabe se a declaração é de placar
   * ou de ausência · o schema sozinho não sabe.
   */
  shotUrl: httpUrl.nullable(),
  /**
   * **Este lado não apareceu** · `null` na declaração de placar, que é o caso
   * comum.
   *
   * Ela é uma **declaração como qualquer outra**, e é isso que faz o W.O. não
   * precisar de mecanismo próprio: dois lados declarando ausências opostas
   * discordam, e discordância já tem desfecho (a mesa do admin). Um declarando
   * W.O. e o outro declarando placar também discorda, pelo mesmo caminho.
   *
   * **Nunca vale `both` aqui** · uma declaração fala de um lado só. O `both` é
   * do documento da partida, e quem o escreve é a varredura, quando **ninguém**
   * declarou nada.
   */
  noShow: z.enum(['home', 'away']).nullable(),
  /**
   * A disputa de pênaltis · **só existe no mata-mata, e só quando os gols
   * empatam.**
   *
   * `null` é o caso comum, e não ausência de dado: na fase de grupos o empate
   * **é** o resultado, e no mata-mata a partida que não empatou não teve
   * pênaltis. Quem cobra a presença é a rota, que conhece a fase.
   *
   * **Os dois números vão na mesma perspectiva dos gols** (mandante ×
   * visitante) · converter na leitura seria a chance de inverter quem passou.
   */
  penalties: z
    .object({
      home: z.number().int().min(0).max(MAX_PENALTIES),
      away: z.number().int().min(0).max(MAX_PENALTIES),
    })
    .nullable(),
  /** Quem declarou · dono ou gerente, conferido na rota. */
  byUserId: objectIdString,
  at: z.coerce.date(),
});
export type MatchReport = z.infer<typeof matchReport>;

/**
 * Como o placar virou oficial · **e ele existe porque "o placar" sozinho não
 * conta a história.**
 *
 * Um 3×1 fechado pelos dois lados e um 3×1 que valeu por silêncio são o mesmo
 * número com peso diferente na hora de alguém reclamar. A tela mostra a
 * diferença, e o admin decide sabendo dela.
 */
export const matchSettlement = z.enum(['agreement', 'timeout', 'admin']);
export type MatchSettlement = z.infer<typeof matchSettlement>;

/**
 * Quantas horas uma declaração espera a outra ponta.
 *
 * **Passado o prazo, a que existe vira oficial** · sem isso todo adversário
 * ausente vira tarefa manual do admin, e numa edição de 18 partidas isso é
 * rotina e não exceção (decisão do Eduardo em 15/08/2026).
 *
 * **O prazo não é campo do documento** · ele sai da primeira declaração, e
 * guardar o que se calcula é criar um segundo lugar capaz de divergir.
 */
/**
 * **Trinta minutos, e eles contam do horário MARCADO da partida** · decisão do
 * Eduardo em 22/08/2026, e ela reverte as 24h de 15/08.
 *
 * O que mudou não foi o número, foi o entendimento do produto: **o campeonato
 * acontece na hora**, numa noite só. Um prazo de 24h numa edição que dura 3h30
 * do começo ao pódio é um prazo que nunca vence dentro do evento · ele existia
 * pra um mundo em que as partidas eram marcadas ao longo de dias.
 *
 * **E o relógio sai do horário marcado, não da primeira declaração.** São coisas
 * diferentes e a escolha é de produto: contando da declaração, o prazo cobra
 * **quem não respondeu**; contando do horário, cobra **quem não jogou** · e é
 * este o que o campeonato quer, porque a rodada seguinte não espera.
 *
 * > **O encaixe com o intervalo entre rodadas é exato** · elas são de 30 em 30
 * > minutos (`ROUND_INTERVAL_MINUTES`), então o prazo de uma partida vence
 * > **quando a rodada seguinte começa**. Não é coincidência: é o mesmo relógio.
 */
export const REPORT_DEADLINE_MINUTES = 30;

/**
 * Quando a partida passa a esperar a organização.
 *
 * **Vencer o prazo NÃO fecha mais nada** · até 22/08/2026 a declaração de um
 * lado só virava oficial sozinha, e a partida sem declaração nenhuma virava W.O.
 * duplo. As duas coisas acabaram, por decisão do Eduardo: *"não pode ter a
 * decisão automática ou algo do tipo; precisa passar pelo admin verificar e
 * decidir"*. O prazo agora só diz **quando entra na mesa dele**.
 *
 * **O nome ficou no singular de propósito** · é um prazo só pros dois casos (uma
 * ponta declarou, ou nenhuma), e dois números obrigariam quem lê a saber qual
 * vale.
 */
export function reportDeadline(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime() + REPORT_DEADLINE_MINUTES * 60_000);
}

/**
 * Mesma coisa, e existe como nome próprio porque quem chama pergunta outra
 * coisa · *"quando a partida que ninguém declarou entra na mesa"*.
 */
export function walkoverDeadline(scheduledAt: Date): Date {
  return reportDeadline(scheduledAt);
}

/**
 * **De quando o relógio da partida conta de verdade.**
 *
 * O `scheduledAt` é escrito no sorteio, a partir do `startsAt` da edição · ele
 * é uma **promessa**, e uma edição que começou atrasada a quebra inteira. Uma
 * chave de 8 clubs tem rodadas de 30 em 30 minutos, então meia hora de atraso
 * na largada faz **toda** partida da noite nascer com o prazo já correndo.
 *
 * Por isso o relógio conta do que veio depois: o horário marcado, ou o começo
 * de verdade da edição.
 *
 * **Isto já existia, escrito à mão, em UM dos caminhos** (o da partida sem
 * declaração nenhuma) e não no irmão ao lado, que contava do `scheduledAt`
 * cru · a mesma partida tinha dois prazos dependendo de alguém ter declarado
 * ou não. Virou função em 27/08/2026, e a mesma conta passou a servir também o
 * `matchCard`, que é o que a tela do campeonato desenha.
 */
export function effectiveMatchStart(scheduledAt: Date, startedAt: Date | null): Date {
  const scheduled = new Date(scheduledAt);
  // Sem começo registrado sobra a promessa · e edição que começou ADIANTADA não
  // encurta prazo de ninguém.
  if (!startedAt) return scheduled;
  const started = new Date(startedAt);
  return started > scheduled ? started : scheduled;
}

/**
 * O mínimo que as duas perguntas abaixo precisam saber sobre a partida.
 *
 * **`declared` é booleano de propósito** · quem pergunta são três telas com três
 * formas do mesmo dado: o repositório tem `homeReport`/`awayReport`, a tela do
 * organizador tem `homeClaim`/`awayClaim`, e a pergunta é a mesma nas duas ·
 * *alguém falou?*. Pedir os campos obrigaria a função a conhecer as três formas.
 */
type MatchWaitInput = {
  status: MatchStatus;
  scheduledAt: Date | string;
  declared: boolean;
};

/**
 * **A partida está esperando alguém?** · a pergunta da MESA do organizador.
 *
 * Agendada, e ou alguém declarou (e o outro não respondeu), ou ninguém declarou
 * e o horário já passou. **Não olha prazo**, e isso é escolha: a mesa é a tela
 * onde a organização opera aquela edição, e ver a partida que ainda está no
 * prazo com o rótulo de espera é informação, não ruído.
 *
 * **Ela nasce em 03/09/2026 porque a tela do organizador REIMPLEMENTAVA isto**
 * pra contar o número ao lado do rótulo do painel · o repositório listava uma
 * coisa e o contador contava outra, e o painel fechado dizia *"ninguém devendo
 * placar"* em cima de linhas que pediam decisão. Pendência 181.
 *
 * > **Ela NÃO é a mesma pergunta do painel geral do admin** · ver o
 * > `organizerIsNeeded` logo abaixo, e a diferença entre as duas está escrita
 * > lá. Elas divergem de propósito, e o que faltava era o nome de cada uma.
 */
export function matchAwaitsSomeone(match: MatchWaitInput, now: Date = new Date()): boolean {
  if (match.status !== 'scheduled') return false;
  return match.declared || new Date(match.scheduledAt) <= now;
}

/**
 * **A partida já passou do prazo?** · a pergunta do PAINEL GERAL do admin.
 *
 * Ela é mais estreita que a da mesa, e o motivo é o que cada tela é: o painel
 * geral é a **fila de trabalho** de quem administra o produto inteiro, e fila
 * que acusa o que ainda pode se resolver sozinho é fila que ninguém abre. Aqui
 * o corte é o `reportDeadline` contado do **começo efetivo** da edição.
 *
 * **A diferença entre as duas é medível**, e vale saber qual você está fazendo:
 * uma partida com uma declaração feita há dez minutos **aparece na mesa** e
 * **não** entra na fila · o outro lado ainda tem prazo pra responder.
 *
 * O `startedAt` é o da edição, e ele é o campo mais fácil de esquecer aqui · a
 * projeção do painel ficou sem ele por semanas, com o comentário logo acima
 * prometendo que estava lá, e o prazo passou todo esse tempo contando do
 * horário marcado.
 */
export function organizerIsNeeded(
  match: MatchWaitInput,
  startedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (match.status !== 'scheduled') return false;
  const from = effectiveMatchStart(new Date(match.scheduledAt), startedAt);
  return reportDeadline(from) <= now;
}

/**
 * Esta partida entra na tabela de classificação?
 *
 * **Existe como função porque a pergunta é feita em dois lugares** · o servidor,
 * pra decidir quem classifica pro mata-mata, e a tela, pra desenhar a tabela.
 * Duas derivações do mesmo critério é o desenho que já divergiu aqui seis vezes
 * (ver o `effectiveSize`), e aqui a divergência seria a chave saindo com um
 * classificado diferente do que a tabela mostrou.
 *
 * **O W.O. duplo fica de fora inteiro** · nem ponto, nem gol, nem jogo. Ele é
 * gravado `0-0`, e um 0-0 somado como empate daria **um ponto a cada um dos dois
 * que faltaram**, que é o contrário do que a regra decidiu.
 */
export function countsForStandings(match: {
  score: { home: number; away: number } | null;
  walkoverAgainst?: WalkoverSide | null;
}): boolean {
  return match.score !== null && match.walkoverAgainst !== 'both';
}

/**
 * O que a tela manda ao declarar · **e o `clubId` vem no corpo de propósito.**
 *
 * Quem declara pode mandar em **dois** clubs da mesma edição (o teto é três por
 * pessoa), então a partida sozinha não diz por qual lado ela está falando. O
 * servidor confere que o club é um dos dois da partida e que quem pede manda
 * nele · o corpo escolhe, ele não autoriza.
 */
export const reportMatchInput = z.object({
  clubId: objectIdString,
  homeGoals: z.number().int().min(0).max(MAX_GOALS),
  awayGoals: z.number().int().min(0).max(MAX_GOALS),
  shotUrl: httpUrl,
  /**
   * Os pênaltis · **opcionais aqui, obrigatórios no mata-mata empatado.**
   *
   * O schema não sabe a fase da partida, então quem exige é a rota · pedir aqui
   * faria toda declaração de fase de grupos carregar dois campos que não
   * existem. É a mesma divisão do `clubId`: o corpo diz, o servidor decide.
   */
  homePenalties: z.number().int().min(0).max(MAX_PENALTIES).optional(),
  awayPenalties: z.number().int().min(0).max(MAX_PENALTIES).optional(),
});
export type ReportMatchInput = z.infer<typeof reportMatchInput>;

/**
 * O que a tela manda ao declarar **W.O.** · *"o adversário não apareceu"*.
 *
 * **Entrada própria, e não uma flag no `reportMatchInput`** · aqui não há placar
 * a mandar (ele é fixo, `WALKOVER_GOALS` a 0) e o print é **opcional**. Enfiar
 * as duas coisas num schema só produziria um objeto onde metade dos campos é
 * ignorada conforme o valor de outro, e é aí que alguém manda gols junto de um
 * W.O. e ninguém percebe qual dos dois valeu.
 *
 * **O `clubId` vem no corpo pela mesma razão do irmão** · quem declara pode
 * mandar em dois clubs da mesma edição, então a partida sozinha não diz por qual
 * lado ele está falando. O corpo escolhe, o servidor autoriza.
 *
 * **O print é opcional e não proibido** · quem tiver a tela do lobby vazio pode
 * mandar, e ela ajuda o admin se a coisa virar disputa. O que não se faz é
 * **exigir** foto de um não-evento.
 */
export const reportWalkoverInput = z.object({
  clubId: objectIdString,
  shotUrl: httpUrl.optional(),
});
export type ReportWalkoverInput = z.infer<typeof reportWalkoverInput>;

/**
 * O placar que a organização decide · **a única saída de uma partida em disputa.**
 *
 * **Não tem `clubId`**, e a ausência é a diferença entre as duas rotas: quem
 * declara fala **por um lado** e precisa dizer qual; quem resolve fala **pela
 * partida**, e a perspectiva é sempre mandante × visitante. Pedir o club aqui
 * abriria a porta pra um placar gravado invertido.
 *
 * **Não tem print**, e isso é de propósito também · a prova são os dois prints
 * que já estão gravados. O admin decide **lendo** eles, e não mandando um
 * terceiro.
 */
/**
 * **Esta partida precisa da disputa de pênaltis?** · a pergunta, num lugar só.
 *
 * Ela vivia em três lugares que sabiam dela (o `reportMatch` do servidor, o
 * diálogo do club e a linha da chave) e em **dois que não sabiam**: as duas
 * mesas do admin. Por isso a organização gravava empate num mata-mata e a chave
 * **travava pra sempre** · pendência 173.
 *
 * Mora no schema porque **o cliente e o servidor precisam da mesma resposta** ·
 * a tela decide se mostra os campos, e o servidor decide se aceita gravar. Regra
 * de negócio escrita em cinco lugares é regra que diverge, e aqui divergir
 * significa uma chave que nunca avança.
 *
 * **O W.O. não chega aqui** · 3-0 não empata, então a pergunta não existe.
 */
export function needsShootout(phase: MatchPhase, homeGoals: number, awayGoals: number): boolean {
  return phase === 'knockout' && homeGoals === awayGoals;
}

/** Motivo com 4 a 200 caracteres: recusa respostas como "ok" e cabe nos avisos. */
export const CLOSE_REASON_MIN = 4;
export const CLOSE_REASON_MAX = 200;

export const resolveMatchInput = z.object({
  reason: z.string().trim().min(CLOSE_REASON_MIN).max(CLOSE_REASON_MAX),
  walkoverAgainst: z.enum(['home', 'away']).optional(),
  homeGoals: z.number().int().min(0).max(MAX_GOALS),
  awayGoals: z.number().int().min(0).max(MAX_GOALS),
  /**
   * Os pênaltis · **mesma forma do `reportMatchInput`, e pelo mesmo motivo.**
   *
   * O schema não sabe a fase da partida, então quem exige é a gravação. Sem
   * isto a organização gravava empate num mata-mata e a chave **travava pra
   * sempre**: o `winnerOf` devolvia nulo, a fase seguinte nunca nascia, os dois
   * clubs liam *"fim de linha · sua caminhada acabou aqui"*, e a mesa ainda
   * oferecia **Encerrar** · a edição terminava sem pódio, e só o banco
   * destravava. Pendência 173.
   */
  homePenalties: z.number().int().min(0).max(MAX_PENALTIES).optional(),
  awayPenalties: z.number().int().min(0).max(MAX_PENALTIES).optional(),
});
export type ResolveMatchInput = z.infer<typeof resolveMatchInput>;

/**
 * A organização encerra a partida que ficou esperando · **e o motivo é
 * obrigatório.**
 *
 * **Não tem placar**, e a ausência é a decisão: vale o que o lado que falou
 * declarou. Aceitar número aqui seria o admin decidindo com **uma versão só**,
 * que é justamente o que a mesa de disputa (onde há duas) existe pra evitar.
 *
 * **O motivo é obrigatório porque alguém recebe um resultado que não declarou**
 * · o teto de 200 é o de uma frase, e não o de um relatório: ela vai inteira
 * pra caixa de avisos dos dois clubs e pra linha da chave.
 */
export const closeMatchInput = z.object({
  reason: z.string().trim().min(CLOSE_REASON_MIN).max(CLOSE_REASON_MAX),
});
export type CloseMatchInput = z.infer<typeof closeMatchInput>;

/**
 * Uma partida em disputa, como o admin precisa vê-la · **as duas declarações
 * inteiras, e não o resumo.**
 *
 * Contrato da mesa do admin, com os dados necessários à decisão. A sala da
 * partida também mostra as declarações aos participantes, pelo contrato de chat.
 */
export const disputedMatchView = z.object({
  _id: objectIdString,
  /**
   * A fase · **e a ausência dela era a causa da pendência 173.**
   *
   * Sem este campo as mesas do organizador não tinham **como** saber que a
   * partida era de mata-mata, então elas não pediam pênaltis e o empate travava
   * a chave. O `groupIndex` nulo era a única pista, e ninguém a lia.
   */
  phase: matchPhase,
  groupIndex: z.number().int().nonnegative().nullable(),
  round: z.number().int().min(1),
  scheduledAt: z.coerce.date(),
  home: z.object({ tag: z.string(), name: z.string() }),
  away: z.object({ tag: z.string(), name: z.string() }),
  /**
   * O que cada lado disse · **sempre na perspectiva mandante × visitante**, a
   * mesma dos dois formulários. É ela que faz a discordância ser legível numa
   * olhada, em vez de exigir conversão de cabeça.
   */
  // O print é `null` quando a declaração é de **ausência** · a mesa mostra "sem
  // print · declarou W.O." no lugar da imagem, que é o dado que o admin precisa.
  homeClaim: z.object({
    homeGoals: z.number().int(),
    awayGoals: z.number().int(),
    shotUrl: httpUrl.nullable(),
    noShow: z.enum(['home', 'away']).nullable(),
    penalties: z.object({ home: z.number(), away: z.number() }).nullable().optional(),
  }),
  awayClaim: z.object({
    homeGoals: z.number().int(),
    awayGoals: z.number().int(),
    shotUrl: httpUrl.nullable(),
    noShow: z.enum(['home', 'away']).nullable(),
    penalties: z.object({ home: z.number(), away: z.number() }).nullable().optional(),
  }),
});
export type DisputedMatchView = z.infer<typeof disputedMatchView>;

/**
 * Uma declaração, como a chave a mostra · **sem quem apertou o botão.**
 *
 * O `byUserId` do documento fica de fora: a pergunta pública é *o que o club
 * declarou*, e quem dentro dele mandou não muda nada pra quem lê · é a mesma
 * régua que mantém o elenco falando por `@handle` e não por id.
 */
export const matchClaim = z.object({
  homeGoals: z.number().int().min(0).max(MAX_GOALS),
  awayGoals: z.number().int().min(0).max(MAX_GOALS),
  /** A disputa de pênaltis · `null` fora do mata-mata e em jogo que não empatou. */
  penalties: z
    .object({
      home: z.number().int().min(0).max(MAX_PENALTIES),
      away: z.number().int().min(0).max(MAX_PENALTIES),
    })
    .nullable(),
  /** `null` na declaração de W.O. · não se fotografa a ausência de alguém. */
  shotUrl: httpUrl.nullable(),
  /** Este lado não apareceu, segundo quem declarou · `null` na declaração de placar. */
  noShow: z.enum(['home', 'away']).nullable(),
  at: z.coerce.date(),
});
export type MatchClaim = z.infer<typeof matchClaim>;

/**
 * **A partida travada com uma ponta só** · a leitura de quem organiza.
 *
 * Ela é a irmã da `disputedMatchView`, e a diferença é o estado: lá os dois
 * falaram e discordaram; aqui um lado falou e o outro sumiu. **Nas duas o admin
 * decide**, e é ele quem fecha.
 *
 * **Este docblock afirmou o contrário até 03/09/2026**, e três vezes: que *"o
 * admin não decide nada"*, que *"quem fecha é a varredura, no prazo"* e que a
 * view vinha *"sem o print, de propósito"*. **As varreduras caíram em 22/08** e
 * o `claim` logo abaixo **traz o print** desde 19/08 · o irmão exato desta frase
 * na rota do admin foi corrigido no mesmo dia e este ficou.
 *
 * O que continua verdade é a razão de a lista existir: sem ela, uma partida
 * parada há horas não aparece em tela nenhuma, e quem reclamar *"declarei e não
 * fechou"* fala com um admin que não tem onde olhar.
 */
export const pendingMatchView = z.object({
  _id: objectIdString,
  /**
   * A fase · **e a ausência dela era a causa da pendência 173.**
   *
   * Sem este campo as mesas do organizador não tinham **como** saber que a
   * partida era de mata-mata, então elas não pediam pênaltis e o empate travava
   * a chave. O `groupIndex` nulo era a única pista, e ninguém a lia.
   */
  phase: matchPhase,
  groupIndex: z.number().int().nonnegative().nullable(),
  round: z.number().int().min(1),
  scheduledAt: z.coerce.date(),
  home: z.object({ tag: z.string(), name: z.string() }),
  away: z.object({ tag: z.string(), name: z.string() }),
  /**
   * Qual dos dois lados declarou · `null` quando **ninguém** declarou.
   *
   * **O nulo é o caso que a mesa não enxergava**, e ele é o que trava uma
   * edição: partida sem declaração nenhuma não aparecia em lista alguma, e a
   * chave parava sem nada na tela dizer onde. Ver `pendingMatchView`.
   */
  reportedBy: z.enum(['home', 'away']).nullable(),
  /**
   * O que ele declarou · **sempre na perspectiva mandante × visitante**, e
   * **com o print**.
   *
   * A prova entrou aqui em 19/08/2026, no mesmo pedido que a tornou pública ·
   * o admin não decide nada nesta mesa, mas encerrar antes do prazo é decisão
   * o bastante pra ele querer ver o que está validando.
   */
  claim: matchClaim.nullable(),
  deadline: z.coerce.date(),
});
export type PendingMatchView = z.infer<typeof pendingMatchView>;

/**
 * O placar que a organização crava numa partida que **ninguém declarou**.
 *
 * **É a porta que faltava, e ela é a metade prática de uma premissa** · a de
 * 22/08/2026, do Eduardo: *sempre haverá um admin acompanhando a edição do
 * começo ao fim*. Uma premissa dessas só vale se ele conseguir **agir na tela**,
 * e até aqui o desfecho de uma partida travada sem declaração exigia mexer no
 * banco · a mesa de disputa exige **as duas** declarações e o encerramento exige
 * **uma**.
 *
 * Exige placar e motivo, assim como a resolução de disputa. A diferença é a
 * ausência de declarações; o encerramento com uma declaração preserva o que
 * foi informado pelo club. Aqui a organização responde pelo resultado inteiro.
 */
export const decideMatchInput = z.object({
  homeGoals: z.number().int().min(0).max(MAX_GOALS),
  awayGoals: z.number().int().min(0).max(MAX_GOALS),
  /** Os pênaltis · ver o `resolveMatchInput`. Pendência 173. */
  homePenalties: z.number().int().min(0).max(MAX_PENALTIES).optional(),
  awayPenalties: z.number().int().min(0).max(MAX_PENALTIES).optional(),
  reason: z.string().trim().min(CLOSE_REASON_MIN).max(CLOSE_REASON_MAX),
});
export type DecideMatchInput = z.infer<typeof decideMatchInput>;

/**
 * Uma partida do campeonato · **e ela nasce do sorteio, nunca à mão.**
 *
 * A tabela inteira sai no instante em que a chave existe, com horário, porque é
 * essa a promessa que separa o produto da operação do rival (*"o admin avisa o
 * horário do mata-mata no dia"*). Quem crava o horário é a plataforma, por
 * **rodada** · a decisão é de 12/08/2026 e está no `historico.md`.
 *
 * **Ela guarda os ids dos clubs e não o nome deles**, ao contrário do elenco
 * congelado da inscrição. A diferença é o que cada um responde: o `squad` é
 * registro de **quem era** naquele instante (e por isso carrega `@handle` e
 * nome), e a partida é o **confronto**, que continua sendo entre os dois clubs
 * mesmo se um deles trocar de nome no meio da edição. O escudo e o nome saem da
 * mesma busca que já traz a grade de inscritos.
 */
export const matchResultSnapshot = z.object({
  status: matchStatus,
  score: z.object({ home: z.number(), away: z.number() }).nullable(),
  penalties: z.object({ home: z.number(), away: z.number() }).nullable(),
  walkoverAgainst: walkoverSide.nullable(),
  settledBy: matchSettlement.nullable(),
  settledReason: z.string().nullable(),
  settledAt: z.coerce.date().nullable(),
});
export const matchCorrection = z.object({
  before: matchResultSnapshot,
  after: matchResultSnapshot,
  reason: z.string(),
  at: z.coerce.date(),
  byUserId: objectIdString,
});
export const publicMatchCorrection = matchCorrection.omit({ byUserId: true });
export const correctMatchInput = resolveMatchInput.extend({ version: z.string().regex(/^[a-f0-9]{64}$/) });
export type CorrectMatchInput = z.infer<typeof correctMatchInput>;

export const matchSchema = z.object({
  corrections: z.array(matchCorrection).optional(),
  ...baseDocumentFields,
  tournamentId: objectIdString,
  phase: matchPhase,
  /**
   * O grupo desta partida · `null` no mata-mata.
   *
   * É índice (0, 1, 2…) e não letra: a letra é rótulo de tela, e gravá-la faria
   * o banco decidir alfabeto. Quem desenha "Grupo A" é o cliente.
   */
  groupIndex: z.number().int().nonnegative().nullable(),
  /**
   * A rodada · **a unidade do calendário**, e é ela que carrega o horário.
   *
   * Numeração começa em 1, e ela é por fase: a rodada 1 do mata-mata é a
   * primeira eliminatória, não a quarta do campeonato.
   */
  round: z.number().int().min(1),
  /**
   * **A disputa de terceiro lugar** · 20/08/2026, pedido do Eduardo.
   *
   * Ela mora na **mesma rodada da final** e não é a final · e é por isso que
   * precisa de campo próprio: sem ele, a última rodada teria duas partidas e a
   * chave não saberia qual é qual, nem a tela, nem o `advanceKnockout`.
   *
   * **O `format.thirdPlaceMatch` era uma promessa que ninguém cumpria** · o
   * campo existe no schema da edição desde o começo, o formulário do painel
   * gravava `true` **fixo**, e nenhuma linha de código o lia. Toda edição
   * criada prometia uma disputa de terceiro que nunca ia acontecer.
   *
   * **`.optional()` cobre as partidas anteriores a 20/08/2026** · nenhuma delas
   * é disputa de terceiro, e reescrever o passado pra caber num campo novo é o
   * que este projeto evita em documento de partida tanto quanto em contábil.
   */
  thirdPlace: z.boolean().optional(),
  homeClubId: objectIdString,
  awayClubId: objectIdString,
  /**
   * Quando se joga · derivado de `startsAt` da edição mais o intervalo por
   * rodada, e gravado porque **remarcar é ação de admin**: se ele fosse
   * calculado na leitura, mover uma partida obrigaria a mover todas.
   */
  scheduledAt: z.coerce.date(),
  status: matchStatus,
  /**
   * O que cada lado declarou · **os dois campos existem separados de propósito.**
   *
   * Um array de declarações economizaria dois campos e custaria a única coisa
   * que importa aqui: *quem ainda não falou*. Com `homeReport` e `awayReport`, a
   * pergunta é olhar um campo nulo; com array, é procurar por `clubId` dentro
   * dele em toda leitura.
   */
  homeReport: matchReport.nullable(),
  awayReport: matchReport.nullable(),
  /**
   * O placar oficial · `null` até fechar.
   *
   * **Ele é gravado e não derivado das declarações**, ao contrário do que a
   * regra do "valor derivado não vira campo" sugeriria · aqui as fontes são
   * **duas e podem discordar**, e o admin pode gravar uma terceira coisa na
   * disputa. O que vale é o que está aqui.
   */
  score: z.object({ home: z.number().int().min(0), away: z.number().int().min(0) }).nullable(),
  /**
   * Quem passou nos pênaltis · **e ele é o que decide o mata-mata empatado.**
   *
   * Fica ao lado do `score` e não dentro dele porque **são dois placares
   * diferentes**: o do jogo (que entra na tabela e no saldo) e o da disputa
   * (que só decide quem avança). Somar os dois num campo só faria a fase de
   * grupos herdar gol que não houve.
   */
  penalties: z
    .object({
      home: z.number().int().min(0).max(MAX_PENALTIES),
      away: z.number().int().min(0).max(MAX_PENALTIES),
    })
    .nullable(),
  /**
   * **Quem faltou** · só existe quando o `status` é `walkover`.
   *
   * Ele é o que a tabela lê pra saber se a partida pontua: **`both` não pontua
   * nada** (nem ponto, nem gol, nem jogo disputado), e `home`/`away` valem 3-0
   * pra quem apareceu. Sem este campo a tabela teria de deduzir pelo placar, e
   * um 0-0 de verdade seria confundido com um W.O. duplo no dia em que alguém
   * empatar sem gols · é a mesma razão de `settledBy` existir ao lado de
   * `score`.
   *
   * **`.optional()` cobre as partidas anteriores a 22/08/2026**, como o
   * `thirdPlace` · nenhuma delas é W.O., e reescrever o passado pra caber num
   * campo novo é o que este projeto evita em documento de partida.
   */
  walkoverAgainst: walkoverSide.nullable().optional(),
  settledBy: matchSettlement.nullable(),
  /**
   * **Por que a organização encerrou** · escrito por quem apertou o botão.
   *
   * Só existe quando `settledBy` é `admin`, e é decisão do Eduardo em
   * 19/08/2026: *"precisa ser claro no retorno que foi encerrado pelo admin e
   * porque"*. Sem ele, os dois clubs recebem um placar oficial que ninguém
   * pediu e sem explicação · e o de quem ficou calado vira reclamação no dia
   * seguinte.
   */
  settledReason: z.string().nullable(),
  /**
   * **Quem decidiu tinha club nesta partida** · só existe quando `settledBy` é
   * `admin`, e é a resposta do produto ao caso levantado pelo Eduardo em
   * 28/08/2026: *"um admin que também está no campeonato e precisa administrar
   * ao mesmo tempo"*.
   *
   * **Por que marcar e não recusar** · recusar aqui é **beco**: com um
   * organizador só, a partida dele ficaria sem desfecho possível pela
   * interface, e a chave para.
   *
   * **A sala do confronto responde igual desde 28/08/2026 (noite)** · ela
   * chegou a **retirar** o poder de quem joga ali (o antigo `neutralAdmin`),
   * e a regra durou um dia: hoje o papel é o da porta de entrada e a ação sai
   * **marcada**, que é o mesmo desenho desta linha. Ver o `docs/chat.md`.
   *
   * **O que substitui a separação de poderes quando só há uma pessoa é a
   * transparência** · a marca sai na chave pra qualquer um, junto do motivo. É
   * o mesmo raciocínio do `settledReason`: quem recebe um placar que não
   * declarou tem direito de saber quem o escreveu, e de que lado essa pessoa
   * estava.
   *
   * `.optional()` cobre as partidas anteriores a 28/08/2026 · nenhuma delas
   * reescreve o passado, e ausente lê como `false` em toda a leitura.
   */
  settledByInvolved: z.boolean().optional(),
  settledAt: z.coerce.date().nullable(),
});

export type Match = z.infer<typeof matchSchema>;

/**
 * A partida como as telas a mostram · **por `tag`, e nunca por id interno.**
 *
 * É a mesma regra da escalação pública e do elenco: o que sai numa resposta
 * aberta se refere aos clubs pelo endereço público deles. Aqui isso tem um
 * segundo efeito prático · a tag é o que casa cada linha da tabela com o card
 * que a grade de inscritos já desenhou, então a tela não precisa de um segundo
 * dicionário.
 */
export const matchCard = z.object({
  corrections: z.array(publicMatchCorrection).optional(),
  settledAt: z.coerce.date().nullable().optional(),
  _id: objectIdString,
  phase: matchPhase,
  groupIndex: z.number().int().nonnegative().nullable(),
  round: z.number().int().min(1),
  /** A disputa de terceiro lugar · ver `matchSchema`. */
  thirdPlace: z.boolean().optional(),
  homeTag: z.string(),
  awayTag: z.string(),
  scheduledAt: z.coerce.date(),
  status: matchStatus,
  score: z.object({ home: z.number().int(), away: z.number().int() }).nullable(),
  /** Quem passou nos pênaltis · a chave desenha `2-2 (4-3 nos pênaltis)`. */
  penalties: z.object({ home: z.number().int(), away: z.number().int() }).nullable(),
  /**
   * Como fechou · a tela mostra a diferença entre **acordo** e **prazo**.
   *
   * Um placar que os dois confirmaram e um que valeu por silêncio são o mesmo
   * número com peso diferente na hora de alguém reclamar.
   */
  settledBy: matchSettlement.nullable(),
  /**
   * Quem faltou · `null` fora de um W.O.
   *
   * A chave precisa dele pra escrever a linha certa: **um** lado ausente vira
   * *"3-0 · W.O."*, e os dois ausentes viram *"W.O. dos dois lados"*, que é uma
   * frase e não um placar. E a tabela precisa dele pra **pular** o duplo.
   */
  walkoverAgainst: walkoverSide.nullable(),
  /** Por que a organização encerrou · só quando `settledBy` é `admin`. */
  settledReason: z.string().nullable(),
  /**
   * **Quem decidiu tinha club nesta partida** · ver o `matchSchema`.
   *
   * Sai na chave pra **qualquer um**, e é de propósito: a marca só vale como
   * transparência se ela for pública. Escondê-la de quem não é da organização
   * seria guardá-la de exatamente quem ela protege.
   */
  settledByInvolved: z.boolean().optional(),
  /**
   * **O que cada lado declarou, inteiro e desde que declarou** · placar, print
   * e quando.
   *
   * **A regra mudou em 19/08/2026, por decisão do Eduardo.** Até então isto era
   * um booleano e o print só saía depois de a partida fechar, pra o adversário
   * não copiar o número em vez de conferir o próprio jogo (15/08). Ele pediu a
   * prova visível pros dois lados, e a consequência é esta: **esconder o número
   * enquanto se mostra a foto do placar é contradição** · o número está na foto.
   *
   * **O argumento que sustenta a virada é de produto, e é o do produto
   * inteiro:** a prova pública é o que separa isto de "foto que some no grupo
   * do WhatsApp". Quem confere a prova concorda com fundamento, e o risco de
   * alguém copiar dá no mesmo resultado que o silêncio daria em 24h.
   */
  homeClaim: matchClaim.nullable(),
  awayClaim: matchClaim.nullable(),
  /**
   * Quando a declaração que existe passa a valer sozinha · `null` sem
   * declaração nenhuma, e `null` depois de fechar.
   *
   * Ele é **calculado** e não gravado · sai do primeiro que falou, como o
   * `settleUnansweredReports` conta. A tela usa pra dizer *quanto falta*, que é
   * a metade que faz alguém agir antes do prazo.
   */
  deadline: z.coerce.date().nullable(),
});
export type MatchCard = z.infer<typeof matchCard>;
export const matchCorrectionView = z.object({
  tournamentId: objectIdString,
  match: matchCard, version: z.string(), homeName: z.string(), awayName: z.string(),
  hasDependents: z.boolean(),
});
export type MatchCorrectionView = z.infer<typeof matchCorrectionView>;

/**
 * Minutos entre uma rodada e a seguinte.
 *
 * **É constante da casa e não campo da edição**, e a escolha tem prazo de
 * validade escrito: enquanto o formato é um só (grupos e mata-mata da casa), um
 * número por edição seria mais um campo no formulário do admin pra responder uma
 * pergunta que ninguém fez ainda. **Vira campo no dia em que uma edição precisar
 * de outro ritmo** · quem remarca hoje é o admin, partida a partida.
 *
 * **Trinta minutos** é a partida de Clubs (dois tempos de seis, mais intervalo,
 * mais o tempo de juntar o elenco) com folga pra atraso · o número saiu daqui e
 * não de medição, e é o primeiro a corrigir quando a primeira edição rodar de
 * verdade.
 */
export const ROUND_INTERVAL_MINUTES = 30;

/**
 * O horário de uma rodada · função pura, porque a tela do admin mostra a tabela
 * antes de o sorteio existir.
 */
export function roundStartsAt(startsAt: Date, round: number): Date {
  return new Date(startsAt.getTime() + (round - 1) * ROUND_INTERVAL_MINUTES * 60_000);
}

/**
 * O rodízio de uma rodada · quem joga contra quem, dentro de um grupo.
 *
 * **É o algoritmo do círculo (round-robin), e ele não é detalhe:** com N clubs
 * num grupo, todos jogam contra todos uma vez, e a distribuição por rodada
 * precisa garantir que **ninguém jogue duas vezes na mesma rodada** · a rodada é
 * a unidade do calendário, e dois jogos simultâneos do mesmo club é a chave
 * impossível de jogar.
 *
 * Grupo com número **ímpar** de clubs ganha um descanso por rodada, e é por isso
 * que a função devolve pares e não uma lista fixa · quem folga naquela rodada
 * simplesmente não aparece.
 */
export function roundRobinRounds(clubIds: string[]): Array<Array<[string, string]>> {
  if (clubIds.length < 2) return [];

  // O `null` é o bye do círculo · com número ímpar de clubs alguém folga a cada
  // rodada, e o par com ele é o descanso.
  const wheel: Array<string | null> = [...clubIds];
  if (wheel.length % 2 === 1) wheel.push(null);

  const half = wheel.length / 2;
  const rounds: Array<Array<[string, string]>> = [];

  for (let round = 0; round < wheel.length - 1; round += 1) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < half; i += 1) {
      const home = wheel[i];
      const away = wheel[wheel.length - 1 - i];
      // Um dos dois é o bye do círculo · ali ninguém joga, e quem sobrou
      // descansa naquela rodada.
      if (!home || !away) continue;
      // **O mando alterna por rodada** · sem isso o primeiro da lista seria
      // mandante em todos os jogos dele, e num produto onde o mando decide quem
      // hospeda a partida no jogo isso é vantagem sorteada.
      pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);

    // Gira a roda mantendo o primeiro fixo · é o que faz o rodízio cobrir todos
    // os confrontos sem repetir.
    const last = wheel.pop();
    if (last !== undefined) wheel.splice(1, 0, last);
  }

  return rounds;
}
