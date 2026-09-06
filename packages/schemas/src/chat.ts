import { z } from 'zod';
import { baseDocumentFields, clubTag, httpUrl, objectIdString } from './common.js';
import {
  effectiveMatchStart,
  matchCard,
  matchClaim,
  ROUND_INTERVAL_MINUTES,
  type MatchPhase,
  type MatchStatus,
} from './match.js';
import type { TournamentStatus } from './tournament.js';

/**
 * **A sala de um confronto** · os dois clubs conversando, com a organização
 * podendo entrar.
 *
 * O porquê de o produto ter isto está em `docs/produto.md`, e o andamento em
 * `docs/chat-confronto.md`. O que mora aqui é a **regra**, e ela é uma só nas
 * três fases da edição.
 */

/**
 * Quanto cabe numa mensagem.
 *
 * **Duzentos, decidido pelo Eduardo em 27/08/2026** · desceu de 1.000 pra 400
 * e dele pra 200, na mesma conversa. O primeiro teto tinha saído do Discord
 * (2.000), e **o Discord é outra coisa**: lá se escreve regulamento, cola
 * escalação e se discute a noite inteira. Aqui a sala vive **uma hora** e o
 * assunto é combinar horário.
 *
 * **A referência é o uso real, medido na frase:** *"vamos 20:35?"* tem 12, e
 * *"caiu no 2-1 do segundo tempo, dá pra refazer 20:50?"* tem 51 · duzentos é
 * **quatro vezes** a mensagem típica, e é o mesmo degrau de um tweet antigo
 * (140) com folga.
 *
 * **O teto curto muda o formato da sala, e isso é o ponto:** ele empurra pra
 * conversa e não pra monólogo. É também anti-abuso · parede de texto é o
 * formato do assédio numa sala sem moderação, e `messages` é a primeira
 * collection do produto que cresce por rajada, num cluster compartilhado.
 */
export const MESSAGE_MAX = 200;

/**
 * Quanto tempo ANTES do horário a sala abre.
 *
 * **É um intervalo de rodada**, e reusar o número é o que impede o quinto
 * relógio do produto: com rodadas de 30 em 30 minutos, a sala do próximo
 * confronto abre quando a rodada atual começa. As duas convivem por meia hora,
 * e isso é útil · durante o jogo N se fala de N e se combina N+1.
 *
 * **A primeira rodada da fase de grupos é a exceção, e o motivo está na frase
 * acima** · ver o `matchChatOpensAt`.
 */
export const CHAT_OPENS_BEFORE_MINUTES = ROUND_INTERVAL_MINUTES;

/**
 * Quanto tempo até o club poder **chamar a organização de novo**.
 *
 * **Cinco minutos, decisão do Eduardo em 28/08/2026 (noite)** · antes disso o
 * chamado só reabria quando alguém da organização **lia** a sala, e se ninguém
 * lesse ele ficava preso pra sempre: o club olhava a mesma frase estática sem
 * saber se alguém tinha visto, e **insistir era impossível**.
 *
 * **Insistir é legítimo**, e a trava é o que separa insistência de spam · o
 * conserto de 28/08 de manhã (uma linha de sistema por sala, e a leitura de
 * quem joga não fechando o próprio chamado) continua valendo por cima disto.
 *
 * **O aviso passa a contar o tempo** · *"chamada há 12 min"* diz o que "foi
 * chamada" escondia: que ninguém atendeu ainda.
 */
export const CALL_ADMIN_AGAIN_AFTER_MINUTES = 5;

/**
 * **Quanto tempo a conversa continua aberta DEPOIS de a edição encerrar.**
 *
 * **Seis horas, decisão do Eduardo em 30/08/2026** · *"acho que pode fechar
 * depois de 6 horas (explicitamente avisado)"*.
 *
 * O encerramento é justamente o momento em que mais se contesta placar, e
 * fechar tudo ali empurra a discussão pro Discord · que é o contrário do que
 * este produto existe pra fazer. A janela mantém o fim administrativo (a
 * conversa **não** fica aberta pra sempre) e devolve a tarde de quem tem o que
 * dizer.
 *
 * **O "explicitamente avisado" é metade da decisão** · a sala diz que vai
 * fechar e quando, em vez de fechar calada. Ver o `tournamentEnding`.
 */
export const TOURNAMENT_GRACE_HOURS = 6;

/**
 * Quanto tempo DEPOIS do horário efetivo a escrita fecha.
 *
 * **Sem teto de relógio a sala nunca fecharia**, e isso não é hipótese: nenhum
 * caminho de produção grava `matchStatus: 'cancelled'` e a varredura deixou de
 * fechar partida em 22/08/2026 · a partida que ninguém declarou fica
 * `scheduled` para sempre. Dois rivais continuariam podendo brigar em setembro
 * na sala de um jogo de agosto.
 *
 * **Uma hora, que é o dobro do prazo de declaração** · quem ainda está
 * resolvendo a partida na mesa do admin teve o tempo do prazo mais o mesmo
 * tempo de novo pra conversar.
 */
export const CHAT_WRITE_CLOSES_AFTER_MINUTES = 2 * ROUND_INTERVAL_MINUTES;

/** Por que a sala não aceita mensagem agora. */
export type ChatClosedReason =
  /** A organização trancou · é decisão, e não relógio. */
  | 'locked'
  /** Ainda não abriu · falta chegar perto do horário. */
  | 'tooEarly'
  /** A partida acabou. */
  | 'matchOver'
  /** A edição acabou ou foi cancelada, e a cortesia venceu · aqui fecha mesmo. */
  | 'tournamentOver'
  /**
   * **A edição acabou e a conversa ainda aceita, com prazo** · as 6h do
   * `TOURNAMENT_GRACE_HOURS`.
   *
   * Ele é o único motivo que **avisa uma coisa que vai acontecer** · os outros
   * contam o que já aconteceu. O *"explicitamente avisado"* da decisão do
   * Eduardo mora aqui: a sala diz que vai fechar e quando, em vez de fechar
   * calada num dia em que a pessoa ainda tinha o que dizer.
   */
  | 'tournamentEnding'
  /** Passou o teto de relógio. */
  | 'expired';

export type ChatWindow = {
  /** Dá pra ler? · a leitura abre com a sala e **nunca fecha**. */
  readable: boolean;
  /** Dá pra escrever agora? */
  writable: boolean;
  /** Quando ela abre · a tela mostra a contagem antes disso. */
  opensAt: Date;
  /** Quando a escrita fecha · `null` quando ela já fechou por outro motivo. */
  writeClosesAt: Date | null;
  reason: ChatClosedReason | null;
};

/**
 * **Quando a sala de um confronto abre** · o relógio, e a exceção da primeira
 * rodada.
 *
 * ## A regra
 *
 * | | |
 * |---|---|
 * | primeira rodada da **fase de grupos** | **no sorteio** (`drawnAt`) |
 * | qualquer outra | `CHAT_OPENS_BEFORE_MINUTES` antes do começo efetivo |
 *
 * ## Por que a primeira rodada é diferente · 04/09/2026
 *
 * Pedido do Eduardo: *"o sorteio sai horas antes do apito, e é nessa janela que
 * os dois lados precisam se achar, combinar plataforma e trocar o convite do
 * lobby"*.
 *
 * **A meia hora nunca foi um número sobre negociação, e sim sobre a rodada
 * anterior** · `CHAT_OPENS_BEFORE_MINUTES` é o `ROUND_INTERVAL_MINUTES`, então
 * a sala da rodada N+1 abre **quando a rodada N começa**: quem joga tem os 30
 * minutos do jogo anterior pra combinar o próximo, e nesse intervalo os dois
 * lados já estão com o produto aberto.
 *
 * **A primeira rodada é a única que não tem rodada anterior.** O que vem antes
 * dela é o sorteio, e é ele que devolve o mesmo tipo de janela · com uma
 * diferença a favor: ali ninguém está jogando, então o adversário responde.
 *
 * ## Por que NÃO é "a primeira partida de cada club"
 *
 * As duas leituras só divergem em **grupo de tamanho ímpar**, onde o rodízio dá
 * um descanso por rodada (ver `roundRobinRounds`): ali um club por grupo estreia
 * na rodada 2. **E ele não fica sem janela** · a rodada 1 inteira acontece antes
 * dele, que é exatamente a folga que a regra dos 30 minutos existe pra dar.
 *
 * A leitura por club custaria uma pergunta ao banco por leitura de sala (*"este
 * club tem partida mais cedo nesta edição?"*, e o `chatContextOf` é chamado a
 * cada abertura e a cada mensagem) pra corrigir um caso que já está coberto pelo
 * relógio. **A regra por confronto é uma propriedade do próprio documento** ·
 * `phase` e `round` estão nele, e a resposta não depende de quem está olhando.
 *
 * ## `round === 1` sozinho seria a resposta ERRADA
 *
 * **A rodada conta do 1 por fase** (ver o `matchSchema`), então a primeira
 * eliminatória também é `round: 1` · e ali os dois clubs já jogaram a fase de
 * grupos inteira, além de a chave sequer existir no dia do sorteio. Sem o
 * `phase`, o mata-mata abriria a sala no passado.
 *
 * ## E ela nunca ATRASA uma sala
 *
 * Sorteio em cima da hora (ou edição sorteada sem carimbo, que é o dado antigo)
 * cai no relógio de sempre · a exceção só sabe **antecipar**.
 */
export function matchChatOpensAt(params: {
  scheduledAt: Date;
  startedAt: Date | null;
  phase: MatchPhase;
  round: number;
  /**
   * Quando a edição foi sorteada · **`null` é resposta válida**, e o parâmetro
   * é obrigatório de propósito: campo de relógio omitido por engano é o defeito
   * que o `startedAt` já produziu aqui, e ele some numa projeção sem ninguém ver.
   */
  drawnAt: Date | null;
}): Date {
  const start = effectiveMatchStart(params.scheduledAt, params.startedAt);
  const byTheClock = new Date(start.getTime() - CHAT_OPENS_BEFORE_MINUTES * 60_000);
  if (!params.drawnAt) return byTheClock;
  if (params.phase !== 'group' || params.round !== 1) return byTheClock;
  const drawn = new Date(params.drawnAt);
  return drawn < byTheClock ? drawn : byTheClock;
}

/**
 * **Quando a sala de um confronto está aberta.**
 *
 * A regra é uma só nas três fases, e o que muda por fase é **o que segura a
 * existência da partida**: nos grupos nada (todas nascem no sorteio), no
 * mata-mata a rodada inteira, e na virada dos grupos uma pessoa (o admin gera a
 * chave).
 *
 * **A fase entra aqui por um motivo só, e é a ABERTURA** · ver o
 * `matchChatOpensAt`. Pro resto continua valendo *partida que existe tem sala*.
 *
 * **A leitura nunca fecha.** A conversa de um confronto disputado é prova da
 * mesma natureza das duas declarações de placar, que sobrevivem à decisão do
 * admin · apagar o acesso à prova no momento em que ela é usada seria perder o
 * histórico exatamente no caso que gerou a discussão.
 *
 * **`disputed` mantém a escrita aberta**, e é deliberado: é quando os dois lados
 * mais precisam falar e menos controle têm sobre a partida.
 */
export function matchChatWindow(params: {
  scheduledAt: Date;
  startedAt: Date | null;
  /** Em que fase a partida acontece · quem lê isto é a **abertura**. */
  phase: MatchPhase;
  /** A rodada, contada do 1 **dentro da fase** · idem. */
  round: number;
  /** Quando a edição foi sorteada · ver o `matchChatOpensAt`. */
  drawnAt: Date | null;
  matchStatus: MatchStatus;
  tournamentStatus: TournamentStatus;
  /** Quando a edição encerrou · o relógio das 6h de cortesia. */
  tournamentFinishedAt?: Date | null;
  /** A organização trancou · **vence tudo**, inclusive a janela aberta. */
  locked?: boolean;
  now?: Date;
}): ChatWindow {
  const now = params.now ?? new Date();
  const start = effectiveMatchStart(params.scheduledAt, params.startedAt);
  const opensAt = matchChatOpensAt(params);
  /**
   * **O fechamento continua ancorado no APITO, e não na abertura** · a sala da
   * primeira rodada abre horas antes e fecha na mesma hora que as outras. Contar
   * as duas pontas do mesmo instante daria uma sala de dez horas de escrita pra
   * quem foi sorteado de manhã, e nenhuma pra quem foi sorteado às 21h30.
   */
  const expiresAt = new Date(start.getTime() + CHAT_WRITE_CLOSES_AFTER_MINUTES * 60_000);

  const readable = now >= opensAt;
  if (!readable) {
    return { readable: false, writable: false, opensAt, writeClosesAt: null, reason: 'tooEarly' };
  }

  const closed = (reason: ChatClosedReason): ChatWindow => ({
    readable: true,
    writable: false,
    opensAt,
    writeClosesAt: null,
    reason,
  });

  /**
   * **A tranca vem antes de tudo** · ela é decisão de gente, e uma sala trancada
   * numa edição encerrada tem que ler "a organização trancou", que é a
   * informação que explica o que aconteceu.
   */
  if (params.locked) return closed('locked');
  /**
   * **A EDIÇÃO encerrada fecha; a partida acabada apenas AVISA** · decisão do
   * Eduardo em 29/08/2026 · *"acho que não precisamos fechar o chat de fato,
   * apenas deixar o aviso"*.
   *
   * **O que ele viu:** uma sala que dizia *"a partida acabou · fica aqui como
   * registro"* e, logo abaixo, oferecia o botão de chamar a organização. Era
   * uma contradição de verdade, e do lado errado · **o momento em que mais se
   * precisa falar sobre um jogo é depois dele**, quando o placar é contestado.
   * Fechar a escrita ali empurra a discussão pro Discord, que é exatamente o
   * que este produto existe pra trazer pra dentro.
   *
   * **A edição encerrada continua fechando**, e a assimetria é deliberada: ela
   * é o fim administrativo de tudo, e sem ela um campeonato de três meses atrás
   * segue recebendo mensagem pra sempre, com aviso pra organização junto. Quem
   * quiser reabrir uma discussão de edição encerrada fala com a organização
   * por fora · a conversa continua legível.
   */
  /**
   * **A edição encerrada dá 6 HORAS de cortesia, e avisa** · decisão do Eduardo
   * em 30/08/2026 · *"acho que pode fechar depois de 6 horas (explicitamente
   * avisado)"*.
   *
   * Ela fechava no instante do encerramento, e esse é justamente o momento em
   * que mais há o que reclamar · trancar ali empurra a discussão pra fora do
   * produto. A janela mantém o fim administrativo e devolve a tarde de quem tem
   * o que dizer.
   *
   * **Sem `finishedAt` fecha na hora** · edição encerrada antes de 30/08/2026
   * não tem o carimbo, e a leitura certa pra ela é "acabou faz tempo". Errar pro
   * outro lado reabriria conversa de campeonato antigo.
   */
  if (params.tournamentStatus === 'finished' || params.tournamentStatus === 'cancelled') {
    const graceEndsAt = params.tournamentFinishedAt
      ? new Date(params.tournamentFinishedAt.getTime() + TOURNAMENT_GRACE_HOURS * 3_600_000)
      : null;
    if (!graceEndsAt || now >= graceEndsAt) return closed('tournamentOver');
    return {
      readable: true,
      writable: true,
      opensAt,
      writeClosesAt: graceEndsAt,
      reason: 'tournamentEnding',
    };
  }

  /**
   * **O aviso viaja no `reason` com `writable: true`** · e é isso que separa
   * *"não dá pra escrever"* de *"dá, e olha o contexto"*. Quem lê precisa
   * perguntar as duas coisas: o `writable` decide o campo de escrever, e o
   * `reason` decide a frase.
   */
  const notice: ChatClosedReason | null =
    params.matchStatus === 'played' ||
    params.matchStatus === 'walkover' ||
    params.matchStatus === 'cancelled'
      ? 'matchOver'
      : now > expiresAt
        ? 'expired'
        : null;

  return { readable: true, writable: true, opensAt, writeClosesAt: expiresAt, reason: notice };
}

/**
 * **O endereço da conversa** · opaco de propósito.
 *
 * A collection guarda `key` e não `matchId` porque o confronto é o **primeiro**
 * tipo de conversa, não o único: o chat de club e o de jogador a jogador vêm
 * depois, e cada um traz a própria chave. Custa uma linha hoje e evita um
 * `updateMany` em toda mensagem no dia em que o segundo tipo nascer.
 */
export function matchConversationKey(matchId: string): string {
  return `match:${matchId}`;
}

export const conversationKind = z.enum(['match']);
export type ConversationKind = z.infer<typeof conversationKind>;

export const conversation = z.object({
  ...baseDocumentFields,
  /** `match:<matchId>` · ver `matchConversationKey`. */
  key: z.string().min(3).max(80),
  kind: conversationKind,
  /** O que a conversa é · hoje só o confronto sabe se descrever. */
  subject: z.object({
    matchId: objectIdString,
    tournamentId: objectIdString,
    clubIds: z.tuple([objectIdString, objectIdString]),
  }),
  /**
   * **A organização trancou a sala** · a alavanca de moderação que substitui
   * apagar em massa e banir: o admin não julga conteúdo, ele **encerra a
   * discussão**. É o que um organizador faz numa mesa.
   *
   * **Fecha a escrita e não a leitura**, como todo fechamento daqui · trancar
   * não apaga prova.
   */
  lockedAt: z.coerce.date().nullable().optional(),
  lockedBy: objectIdString.nullable().optional(),
  /** Alguém chamou a organização · uma vez por conversa. */
  adminCalledAt: z.coerce.date().nullable().optional(),
  adminCalledByClubId: objectIdString.nullable().optional(),
});
export type Conversation = z.infer<typeof conversation>;

/**
 * Quem escreveu · **e o papel importa mais que a pessoa.**
 *
 * `club` é quem responde por um dos dois lados, `admin` é a organização, e
 * `system` é o produto contando o que aconteceu (a organização entrou, a
 * partida fechou). Sem isto a tela não sabe de que lado alinhar nem que cor
 * usar, e trataria a organização como se fosse um dos clubs.
 */
export const messageAuthorKind = z.enum(['club', 'admin', 'system']);
export type MessageAuthorKind = z.infer<typeof messageAuthorKind>;

/**
 * O que o produto contou na conversa · **código, e nunca a frase.**
 *
 * A regra da casa: *"a API nunca devolve frase pro usuário final"* · uma
 * mensagem de sistema com o português gravado dentro seria intraduzível, e a
 * conversa de uma edição em espanhol teria linhas em duas línguas.
 */
export const systemMessageKind = z.enum(['adminCalled', 'chatLocked', 'chatUnlocked']);
export type SystemMessageKind = z.infer<typeof systemMessageKind>;

/** Quem apagou · muda a frase que fica no lugar, e o peso dela. */
export const deletedByKind = z.enum(['author', 'admin']);
export type DeletedByKind = z.infer<typeof deletedByKind>;

/**
 * **Por qual papel a pessoa está na sala** · decisão do Eduardo em 28/08/2026:
 * *"o acesso ao chat pela parte de admin e pelo campeonato por si só normal no
 * /app"*.
 *
 * **Quem manda é o cliente, e isso é deliberado** · a mesma pessoa pode ter os
 * dois papéis, e ela escolhe com qual entra: pela mesa do admin ela é a
 * organização, pelo `/app` ela é o club dela.
 *
 * **O que o servidor NÃO delega:** ele confere no documento que a conta é
 * mesmo da organização (o `admin` só vale pra quem é), e **marca** toda ação
 * feita como organização por quem tem club naquela partida. Não é escalada de
 * privilégio · é escolha entre dois papéis que a pessoa já tem, e o registro
 * dessa escolha é o que substitui a proibição.
 *
 * `club` é o padrão · quem não pedir nada entra pelo papel mais fraco.
 */
export const chatMode = z.enum(['club', 'admin']);
export type ChatMode = z.infer<typeof chatMode>;

export const message = z.object({
  ...baseDocumentFields,
  conversationId: objectIdString,
  authorKind: messageAuthorKind,
  /** Quem escreveu · `null` só na mensagem de sistema. */
  authorId: objectIdString.nullable(),
  /** Por qual club ele falou · `null` no admin e no sistema. */
  authorClubId: objectIdString.nullable(),
  /** Vazio na mensagem de sistema · lá quem fala é o `systemKind`. */
  body: z.string().trim().max(MESSAGE_MAX),
  /**
   * **Quem falou como organização tinha club nesta partida** · só existe
   * quando `authorKind` é `admin`.
   *
   * É o análogo exato do `settledByInvolved` na partida, e existe pela mesma
   * razão: com um organizador só, **proibir trava** · o que substitui a
   * separação de poderes é a marca ficar visível pros dois clubs.
   *
   * `.optional()` cobre as mensagens anteriores a 28/08/2026 · ausente lê como
   * `false`.
   */
  authorInvolved: z.boolean().optional(),
  /** O que o produto contou · só na mensagem de sistema. */
  systemKind: systemMessageKind.nullable().optional(),
  /**
   * **Apagada, e o documento fica** · lápide e não sumiço.
   *
   * A sala existe pra ser prova de um confronto disputado · mensagem que
   * evapora sem rastro é pior que a mensagem, porque o outro lado leu e a
   * organização perde o que precisa pra julgar. **Apagar tira da vista dos
   * clubs, não do registro.**
   */
  deletedAt: z.coerce.date().nullable().optional(),
  deletedBy: objectIdString.nullable().optional(),
  deletedByKind: deletedByKind.nullable().optional(),
  /**
   * **Quem reagiu, por emoji** · `{ '👍': [userId, …] }`.
   *
   * Guardado **dentro da mensagem** porque reação não existe sem ela, some com
   * ela e nunca é consultada sozinha · uma collection própria custaria uma
   * segunda consulta por página de conversa pra nada.
   *
   * **O id de gente fica aqui e não sai** · a tela recebe contagem e "eu
   * reagi", pela mesma regra da escalação.
   */
  reactions: z.record(z.string(), z.array(objectIdString)).optional(),
  /**
   * **O print** · e ele é o conteúdo mais valioso que esta sala carrega.
   *
   * A conversa existe pra resolver disputa, e **o que resolve disputa é a
   * súmula na tela do jogo** · sem isto o club descreve o placar com palavras e
   * a organização decide no escuro.
   *
   * É a URL do nosso CDN, conferida na rota pelo `assertOwnAssetUrl` como todo
   * arquivo que o cliente devolve · a mesma faixa `match_shot` que a súmula já
   * usa, porque é a mesma coisa.
   */
  imageUrl: httpUrl.nullable().optional(),
});
export type Message = z.infer<typeof message>;

/** Uma mensagem como a tela a recebe · **sem id interno de gente**. */
export const chatMessageView = z.object({
  _id: objectIdString,
  authorKind: messageAuthorKind,
  /** O `@handle` de quem escreveu · o endereço público, como no elenco. */
  authorHandle: z.string().nullable(),
  authorName: z.string().nullable(),
  authorAvatarUrl: z.string().nullable(),
  /** A **tag** do club, e não o id · mesma regra da escalação. */
  authorClubTag: z.string().nullable(),
  /**
   * O texto · **vazio quando foi apagada e quem olha não pode ver.**
   *
   * O autor e a organização continuam vendo o que estava escrito, esmaecido ·
   * o autor porque senão ele não sabe **o que** apagou, e a organização porque
   * é ela que julga.
   */
  body: z.string(),
  /**
   * **A organização que falou tinha club nesta partida** · a bolha dela mostra
   * a marca, pros dois clubs. Ver o `authorInvolved` no documento.
   */
  authorInvolved: z.boolean(),
  /** O código da mensagem de sistema · a frase é do catálogo, no cliente. */
  systemKind: systemMessageKind.nullable(),
  createdAt: z.coerce.date(),
  /** `null` quando está de pé · quem apagou vai na frase. */
  deleted: z.object({ byKind: deletedByKind }).nullable(),
  /**
   * As reações desta mensagem · **contagem e se eu estou dentro**, nunca quem.
   *
   * Só vem o que tem pelo menos um · emoji zerado não é linha na tela.
   */
  reactions: z.array(
    z.object({
      emoji: z.string(),
      count: z.number().int().positive(),
      mine: z.boolean(),
      /**
       * **Quem reagiu, por `@handle`** · pedido do Eduardo em 28/08/2026 ·
       * *"não dá pra ver quem reagiu"*.
       *
       * É o endereço público, como no elenco e na mensagem · o id de gente
       * continua sem sair do servidor. Numa sala de dois clubs saber quem
       * confirmou **é** a informação: um 👍 anônimo no "vamos 20:35?" não fecha
       * combinado nenhum.
       */
      who: z.array(z.string()),
    }),
  ),
  /** O print · **`null` quando foi apagada**, pela mesma regra do corpo. */
  imageUrl: z.string().nullable(),
});
export type ChatMessageView = z.infer<typeof chatMessageView>;

export const matchChatView = z.object({
  matchId: objectIdString,
  /** Os dois lados, pra tela alinhar sem consultar mais nada. */
  homeTag: z.string(),
  awayTag: z.string(),
  /**
   * **Os MEUS clubs nesta partida** · zero, um, ou os dois.
   *
   * Plural porque o produto já reconhece que uma pessoa pode ter dois clubs na
   * mesma partida · uma resposta singular faria a tela alinhar como
   * "adversário" um club que também é dela.
   */
  myClubTags: z.array(z.string()),
  /**
   * **O @handle de quem está lendo** · é o que diz qual mensagem é dele.
   *
   * A tela deduzia isso da primeira mensagem de um club dela, e **num club com
   * dono e gerente isso apontava pra outra pessoa** · o botão de apagar
   * aparecia na mensagem do colega e faltava na própria. Pergunta do Eduardo
   * em 27/08/2026, e o defeito existia mesmo.
   */
  viewerHandle: z.string().nullable(),
  canWrite: z.boolean(),
  opensAt: z.coerce.date(),
  writeClosesAt: z.coerce.date().nullable(),
  closedReason: z.string().nullable(),
  /**
   * **Quem olha é a organização NESTA sala** · da organização, e sem club neste
   * confronto.
   *
   * A tela mostra as ações dela a partir daqui, e **o servidor revalida em cada
   * uma** · esconder botão é UX, não segurança. Foi exatamente o que faltava
   * até 28/08/2026: a tela já perguntava *"e não tem club aqui?"* pra decidir
   * o que oferecer, e a rota não · quem organiza e **joga** o confronto podia
   * assinar como organização e apagar a mensagem do adversário no próprio jogo.
   *
   * **O nome mudou de `viewerIsAdmin` junto com o conserto**, e não é cosmético:
   * o campo antigo respondia *"é da organização"*, que é a pergunta de entrar na
   * sala e **não** a de ter poder dentro dela. Quem lesse o nome antigo acertava
   * a leitura e erraria o uso · e errou.
   */
  viewerIsOrganizer: z.boolean(),
  /**
   * **Você é da organização E tem club nesta partida** · o par do campo acima,
   * e ele existe só pra a tela poder **explicar**.
   *
   * Sem ele a sala fica muda no caso mais confuso do produto: o organizador
   * abre a conversa **pela mesa do admin**, não vê o cadeado nem a assinatura
   * da organização, e não tem como saber se aquilo é regra ou defeito. Foi o
   * que aconteceu com o Eduardo em 28/08/2026, no mesmo dia em que a regra
   * entrou · *"não vejo o chat como admin/organização em si"*.
   *
   * **Ele não dá poder nenhum** · quem decide isso é o `viewerIsOrganizer`, no
   * servidor. Este aqui só permite dizer a frase.
   */
  organizerPlayingHere: z.boolean(),
  /** A sala está trancada pela organização. */
  locked: z.boolean(),
  /** Já chamaram a organização nesta sala, e ninguém de lá olhou ainda. */
  adminCalled: z.boolean(),
  /**
   * **Quando o chamado em aberto foi feito** · `null` quando não há chamado.
   *
   * A tela usa pra duas coisas: contar o tempo (*"chamada há 12 min"*) e
   * decidir se o botão de chamar volta · ver o
   * `CALL_ADMIN_AGAIN_AFTER_MINUTES`.
   */
  adminCalledAt: z.coerce.date().nullable(),
  messages: z.array(chatMessageView),
  /** Há página anterior · o cursor é o `_id` da mensagem mais antiga da lista. */
  hasMore: z.boolean(),
  unread: z.number().int().nonnegative(),
  /**
   * **Quem já leu, e até quando** · é o que sustenta o "visto por".
   *
   * A tela compara o `readAt` de cada um com a data da mensagem: quem leu
   * **depois** dela, viu. Mandar o carimbo em vez de uma lista por mensagem é
   * o que faz isto custar **uma** consulta em vez de uma por linha.
   *
   * **A organização NÃO entra nesta lista, e é decisão de moderação** · o
   * Eduardo recusou em 27/08/2026 a linha *"a organização entrou na sala"*,
   * *"pra não saberem quando a administração pode estar olhando"*. Um "visto
   * por" que a incluísse desfaria isso pela porta dos fundos · a leitura dela
   * continua sendo gravada (o "chamaram você" depende disso), e nunca é
   * exibida.
   *
   * **Nem quem está lendo** · "visto por você" é a tela contando o óbvio.
   */
  readers: z.array(
    z.object({
      handle: z.string(),
      clubTag: z.string(),
      readAt: z.coerce.date(),
    }),
  ),
});
export type MatchChatView = z.infer<typeof matchChatView>;

/**
 * Uma linha da **mesa de conversas da organização**.
 *
 * Ela mora aqui e não no servidor porque as duas pontas precisam do mesmo
 * formato · foi o `TournamentChatRow` declarado só na API que quebrou o
 * cliente, e é exatamente a divergência que este pacote existe pra impedir.
 */
export const tournamentChatRow = z.object({
  matchId: objectIdString,
  homeTag: z.string(),
  awayTag: z.string(),
  phase: z.string(),
  round: z.number().int(),
  /**
   * **A disputa de terceiro** · ela vive na MESMA rodada da final, e sem esta
   * marca quem nomeia a rodada conta duas partidas na última e chama a final de
   * semifinal · foi o que a mesa mostrou na Copa de Estreia, em 05/09/2026.
   */
  thirdPlace: z.boolean(),
  messages: z.number().int().nonnegative(),
  lastMessageAt: z.coerce.date().nullable(),
  /** Chamaram a organização · esta linha vai pro topo da mesa. */
  adminCalled: z.boolean(),
  locked: z.boolean(),
  /**
   * **O estado da partida** · é o que separa o que ainda vai acontecer do que
   * virou arquivo. A mesa passou a listar **todos** os confrontos em
   * 27/08/2026, e sem isto não haveria como filtrar.
   */
  matchStatus: z.string(),
  scheduledAt: z.coerce.date(),
  // Opcional para a web nova continuar lendo uma API anterior durante o deploy.
  result: matchCard
    .pick({
      score: true,
      settledAt: true,
      corrections: true,
      penalties: true,
      settledBy: true,
      settledReason: true,
      settledByInvolved: true,
      walkoverAgainst: true,
    })
    .optional(),
  /**
   * Mensagens que chegaram depois da **sua** última leitura desta sala.
   *
   * É por admin, e não por edição: dois organizadores leem coisas diferentes, e
   * "precisam de você" precisa saber de quem é o *você*.
   */
  unread: z.number().int().nonnegative(),
  /** A edição · a mesa geral mistura várias, e a da edição repete a mesma. */
  tournamentSlug: z.string(),
  tournamentName: z.string(),
  /**
   * **O que cada lado declarou** · e é isto que a sala mostra no cabeçalho.
   *
   * A conversa existe pra resolver disputa, e **o que decide disputa é a
   * súmula** · sem ela ali, quem julga precisa de duas telas, e o club que
   * mandou o print só na conversa acha que provou. É a pendência 145.
   */
  claims: z.array(
    z.object({
      tag: z.string(),
      homeGoals: z.number().int(),
      awayGoals: z.number().int(),
      shotUrl: z.string().nullable(),
      penalties: matchClaim.shape.penalties.optional(),
      noShow: matchClaim.shape.noShow.optional(),
    }),
  ),
});
export type TournamentChatRow = z.infer<typeof tournamentChatRow>;

export const sendMessageInput = z
  .object({
    /**
     * **Pode vir vazio quando há print** · ver o `refine` no fim do schema.
     *
     * O `min(1)` saiu daqui e virou regra do objeto inteiro porque "mandar só a
     * imagem" é o caso mais comum do anexo: a pessoa tira o print da súmula e
     * manda, sem legenda.
     */
    body: z.string().trim().max(MESSAGE_MAX),
    /**
     * Por qual club estou falando · obrigatório, porque a pessoa pode ter os dois
     * clubs da mesma partida.
     *
     * **É a TAG e não o id**, pela mesma regra da escalação: o que a tela recebe
     * é endereço público, então o que ela devolve também é · mandar o id de volta
     * exigiria que a resposta o tivesse mandado primeiro.
     *
     * **`admin` é o valor reservado da organização** · ela não fala por um lado,
     * e é o servidor que confere o papel antes de aceitar.
     */
    clubTag: z.union([z.literal('admin'), clubTag]),
    /**
     * O print · **a URL que a API mesma acabou de assinar**, conferida de novo na
     * rota pelo `assertOwnAssetUrl`. Ver o `imageUrl` da mensagem.
     */
    imageUrl: httpUrl.nullable().optional(),
    /**
     * **Por qual papel ela entrou na sala** · o mesmo `as` das outras três rotas
     * do chat.
     *
     * **A rota DERIVAVA isto do `clubTag`** (`clubTag === 'admin' ? 'admin' :
     * 'club'`) até 28/08/2026, e o que essa linha fazia era pior do que parecia:
     * **a assinatura escolhia o papel**. Quem mandasse `clubTag: 'admin'` era
     * tratado como organização sem ter declarado nada, então o front do `/app`
     * concedia o papel por acidente de payload, e o teste que garantia o
     * contrário passava chamando o repositório **sem** o modo que a rota sempre
     * envia.
     *
     * > **E o que isto NÃO é: uma trava contra quem quer furar.** O modo é
     * > declarado pelo cliente e **concede** · é a decisão do Eduardo de
     * > 28/08/2026, e quem mandar `as: 'admin'` por `curl` age como organização
     * > do mesmo jeito. **O que segura é a marca ser pública**
     * > (`authorInvolved`), e não este campo. O ganho aqui é de arquitetura: o
     * > papel viaja separado da assinatura, igual nas quatro rotas, e a intenção
     * > fica explícita em vez de deduzida.
     *
     * **Ausente lê como `club`**, que é o papel mais fraco · cliente velho e
     * chamada sem o campo caem no lado seguro.
     */
    as: chatMode.optional(),
  })
  /**
   * **Mensagem vazia não existe** · ou tem texto, ou tem print.
   *
   * A regra subiu do campo pro objeto quando o anexo entrou: mandar só a
   * imagem é o caso comum (o print da súmula, sem legenda), e exigir texto ali
   * faria a pessoa escrever "olha" pra conseguir anexar.
   */
  .refine((one) => one.body.length > 0 || Boolean(one.imageUrl), {
    path: ['body'],
    message: 'Escreva alguma coisa ou mande um print.',
  });
export type SendMessageInput = z.infer<typeof sendMessageInput>;

/**
 * **A menção é `@TAG`, e só vale pras tags DA PARTIDA.**
 *
 * Pedido do Eduardo em 27/08/2026 · *"precisa de algo pro admin conseguir
 * mencionar o time no chat"*. Ela existe porque a sala tem dois lados e uma
 * organização: sem endereçar, "manda o print" na terceira mensagem não diz pra
 * quem.
 *
 * **Fechada nas duas tags do confronto, e não em qualquer club do produto** ·
 * mencionar quem não está na sala não avisaria ninguém e ainda faria a pessoa
 * achar que avisou. Também é o que impede a menção de virar busca no banco a
 * cada mensagem.
 *
 * **Sem `regex`, de propósito** · tag entra em expressão como texto do usuário,
 * e o custo de escapar isso direito é maior que o de varrer a string.
 */
export function mentionsIn(body: string, tags: readonly string[]): string[] {
  const upper = body.toUpperCase();
  const found: string[] = [];
  for (const tag of tags) {
    const needle = '@' + tag.toUpperCase();
    for (let at = upper.indexOf(needle); at !== -1; at = upper.indexOf(needle, at + 1)) {
      // **O caractere seguinte não pode continuar a tag** · senão `@COPA0`
      // marcaria o `COPA07`, e a menção iria pro club errado.
      if (!isTagChar(upper[at + needle.length])) {
        found.push(tag.toUpperCase());
        break;
      }
    }
  }
  return found;
}

/**
 * O corpo partido em texto e menção · **a mesma varredura da `mentionsIn`**,
 * pra tela e servidor nunca discordarem sobre o que é menção.
 */
export function splitMentions(
  body: string,
  tags: readonly string[],
): { text: string; mention: boolean }[] {
  const upper = body.toUpperCase();
  const wanted = new Set(mentionsIn(body, tags).map((tag) => '@' + tag));
  if (wanted.size === 0) return [{ text: body, mention: false }];

  const parts: { text: string; mention: boolean }[] = [];
  let cut = 0;
  for (let at = 0; at < body.length; at += 1) {
    if (upper[at] !== '@') continue;
    const hit = [...wanted].find(
      (needle) => upper.startsWith(needle, at) && !isTagChar(upper[at + needle.length]),
    );
    if (!hit) continue;
    if (at > cut) parts.push({ text: body.slice(cut, at), mention: false });
    parts.push({ text: body.slice(at, at + hit.length), mention: true });
    cut = at + hit.length;
    at = cut - 1;
  }
  if (cut < body.length) parts.push({ text: body.slice(cut), mention: false });
  return parts;
}

function isTagChar(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  return (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9');
}

/**
 * **Uma sala minha, vista de fora da edição.**
 *
 * É o que sustenta as duas entradas que faltavam: o número na casca do app e a
 * lista em `/app/conversas`. **Ela nasce já pensada pra três tipos de
 * conversa** (confronto, club, player) · por isso carrega `kind`, e não assume
 * que toda conversa tem dois clubs.
 */
export const myChatRow = z.object({
  kind: conversationKind,
  matchId: objectIdString,
  tournamentSlug: z.string(),
  tournamentName: z.string(),
  homeTag: z.string(),
  awayTag: z.string(),
  /** Por qual club eu falo nesta sala · define o lado na lista. */
  myTag: z.string(),
  phase: z.string(),
  round: z.number().int().nonnegative(),
  scheduledAt: z.coerce.date(),
  matchStatus: z.string(),
  unread: z.number().int().nonnegative(),
  locked: z.boolean(),
  lastMessageAt: z.coerce.date().nullable(),
});
export type MyChatRow = z.infer<typeof myChatRow>;

export const myChatsView = z.object({
  /** A soma das não lidas · é o número que a casca mostra. */
  total: z.number().int().nonnegative(),
  rooms: z.array(myChatRow),
});
export type MyChatsView = z.infer<typeof myChatsView>;

/**
 * **O conjunto de reações é fechado · e ele tem oito, não três.**
 *
 * *"isso do `BubbleReactions` é bem legal"* (Eduardo, 27/08/2026) · e ele está
 * certo pelo motivo certo: **numa sala cujo assunto é combinar horário, reagir
 * É a confirmação.** Um 👍 no *"vamos 20:35?"* fecha o combinado sem gastar uma
 * mensagem.
 *
 * **Nasceu com três (👍 ✅ ⏰) e ele perguntou em 28/08/2026** · *"e só vai ter
 * isso de opção de emoji mesmo?"*. Três é o vocabulário de **operação**, e este
 * produto é uma **rede social**: a sala do confronto é a primeira fatia de uma
 * plataforma de mensagem, e no chat de club e no de player três seria absurdo.
 *
 * **O que continua valendo é ser FECHADO**, e as razões não mudaram:
 *
 * | | |
 * |---|---|
 * | curado | cabe na tela sem seletor, sem busca, sem tom de pele, sem "recentes" · e o dado continua pequeno |
 * | seletor aberto | multiplica escrita, e abre superfície de assédio que hoje não existe · um 🤡 anônimo não, mas com `@handle` do lado ele é uma agressão com nome |
 *
 * **Os oito cobrem o que a sala faz**: combinar (👍), confirmar (✅), avisar de
 * atraso (⏰), recusar (❌), e a parte social que faz uma rede ser rede (🔥 😂 😮
 * 🙏). **Nenhum deles é hostil** · a lista não tem 🤡 nem 😡, e essa ausência é
 * escolha, não esquecimento.
 */
export const MESSAGE_REACTIONS = ['👍', '✅', '⏰', '❌', '🔥', '😂', '😮', '🙏'] as const;
export type MessageReaction = (typeof MESSAGE_REACTIONS)[number];

export const reactToMessageInput = z.object({
  emoji: z.enum(MESSAGE_REACTIONS),
  /** Por qual papel · reagir segue a janela de quem fala. Ver o `chatMode`. */
  as: chatMode.optional(),
});
export type ReactToMessageInput = z.infer<typeof reactToMessageInput>;

/**
 * A lista pra tela, a partir do que está gravado · **conta e nomeia por
 * `@handle`**, nunca por id.
 */
export function reactionsFor(
  stored: Record<string, string[]> | undefined,
  viewerId: string,
  /** `id → @handle` · quem não estiver no mapa sai da lista de nomes. */
  handleOf: Map<string, string> = new Map(),
): { emoji: string; count: number; mine: boolean; who: string[] }[] {
  if (!stored) return [];
  // **A ordem é a do conjunto**, e não a de quem reagiu primeiro · assim a
  // mesma mensagem não troca de arranjo a cada pessoa que olha.
  return MESSAGE_REACTIONS.flatMap((emoji) => {
    const ids = stored[emoji] ?? [];
    if (ids.length === 0) return [];
    return [
      {
        emoji,
        count: ids.length,
        mine: ids.includes(viewerId),
        who: ids.map((id) => handleOf.get(id)).filter((one): one is string => Boolean(one)),
      },
    ];
  });
}
