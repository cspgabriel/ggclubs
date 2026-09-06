import { z } from 'zod';
import { baseDocumentFields, httpUrl, objectIdString } from './common.js';

/**
 * A caixa do sininho · **a fonte da verdade da notificação.**
 *
 * O canal de tempo real entrega pra quem está conectado; esta collection é o que
 * sobrevive a estar offline. Sem ela, quem fechou a aba perde o aviso pra
 * sempre e o canal vira enfeite pra quem está com a janela aberta · é por isso
 * que o sininho vem **antes** de qualquer tela ouvir.
 *
 * ## O texto não é gravado · gravamos a chave e os parâmetros
 *
 * **Decisão do Eduardo em 11/08/2026.** O produto fala português e espanhol, e
 * gravar a frase pronta obrigaria a saber o idioma de quem recebe **na hora de
 * escrever** · quem trocasse de idioma depois veria a caixa velha na língua
 * antiga, misturada com a nova.
 *
 * Guardando `club.invited` mais `{ clubName }`, quem traduz é o catálogo do
 * cliente, e a caixa inteira muda de idioma junto com a pessoa. É o mesmo
 * argumento que fez o `pnpm scan:strings` existir: **texto de tela mora no
 * catálogo**, e notificação é texto de tela que chegou por outro caminho.
 *
 * O custo aceito: o toast nativo do desktop precisa traduzir no cliente antes de
 * disparar · o que ele já sabe fazer, porque o i18n está lá.
 */

/**
 * O que aconteceu · **é esta a chave que o catálogo traduz.**
 *
 * O nome é o vocabulário do domínio, como o `type` do barramento (`club.squad`)
 * · e a lista é exatamente a que o `docs/produto.md` chama de notificável:
 * convite, pedido de entrada e mexida no elenco.
 *
 * **Valor novo aqui obriga entrada no `NOTIFICATION_PARAMS` e no catálogo dos
 * dois idiomas**, e as duas coisas são cobradas por teste · sem isso ele entra e
 * some da interface em silêncio, que é o defeito que a tabela de crossplay já
 * ensinou a travar.
 */
export const notificationKind = z.enum([
  /** O club te chamou · quem recebe é a pessoa convidada. */
  'club.invited',
  /** Alguém pediu pra entrar · quem recebe é quem gerencia o club. */
  'club.joinRequested',
  /** O pedido foi aprovado · quem recebe é quem pediu. */
  'club.joinApproved',
  /** O pedido foi recusado · quem recebe é quem pediu. */
  'club.joinRejected',
  /**
   * Virou gerente · **não é mais produzido desde 03/09/2026**, quando promover
   * passou a exigir aceite (pendência 185). Quem aceita o cargo já sabe que
   * aceitou, e o par que fecha o laço agora é o `club.managerAccepted`, que vai
   * pro dono.
   *
   * scan-realtime: ok · há aviso deste tipo gravado na caixa de gente de
   * verdade, e apagar o tipo faria a caixa dessas pessoas parar de renderizar o
   * próprio histórico · a frase do catálogo continua sendo a única coisa capaz
   * de traduzir um documento que já existe.
   */
  'club.promoted',
  /**
   * **O dono te ofereceu a gerência** · quem recebe é quem foi convidado, e a
   * decisão é dela. 03/09/2026, pendência 185.
   *
   * Ele espera resposta, como o `club.invited` e o `club.ownershipOffered`, e
   * por isso sai também por e-mail: o cargo **gasta a única vaga de liderança da
   * conta**, e uma oferta que dorme numa aba fechada é uma vaga que a pessoa nem
   * soube que estava sendo pedida.
   */
  'club.managerOffered',
  /** Aceitaram a gerência que você ofereceu · quem recebe é o dono. */
  'club.managerAccepted',
  /** Recusaram a gerência que você ofereceu · a vaga continua aberta pra outra pessoa. */
  'club.managerDeclined',
  /** Deixou de ser gerente. */
  'club.demoted',
  /**
   * **Largou a gerência por conta própria** · quem recebe é quem **continua**
   * mandando no club, e não a pessoa que largou.
   *
   * Ele é o par do `club.demoted` visto do outro lado, e existe pelo mesmo
   * motivo do `club.memberLeft`: a vaga de gerente é uma das duas do club, e
   * quem manda precisa saber que ela abriu · gerente inscreve, paga e declara
   * placar, então perder um em silêncio é perder uma mão que move dinheiro.
   */
  'club.managerStepDown',
  /** Foi tirado do elenco. */
  'club.removed',
  /** O dono quer te passar o club · o verbo canônico está no `docs/i18n.md`. */
  'club.ownershipOffered',

  /**
   * **Os seis abaixo fecham laço**, e a varredura de 11/08/2026 mostrou que era
   * exatamente isso que faltava: o produto avisava quem **recebia** uma ação e
   * deixava quem **agiu** sem resposta.
   *
   * Eles são a metade que ninguém sente falta até precisar · quem oferece o
   * club, quem convida e quem gerencia ficavam olhando uma fila que esvaziava
   * sozinha, sem saber o desfecho.
   */
  /** Assumiram o club que você ofereceu · quem recebe é quem ofereceu. */
  'club.ownershipAccepted',
  /** Recusaram o club que você ofereceu · e aqui a má notícia tem ação: oferecer a outra pessoa. */
  'club.ownershipDeclined',
  /** Aceitaram seu convite · quem recebe é quem gerencia. */
  'club.inviteAccepted',
  /** Recusaram seu convite · libera a vaga mental de quem estava esperando. */
  'club.inviteDeclined',
  /** Alguém saiu do elenco · quem recebe é quem gerencia. */
  'club.memberLeft',
  /** O club foi encerrado · quem recebe é o elenco inteiro, menos o dono que encerrou. */
  'club.deleted',

  /**
   * **O club entrou num campeonato** · quem recebe é dono e gerente, menos quem
   * inscreveu.
   *
   * Ele existe por causa da decisão de 12/08/2026 de deixar **qualquer membro**
   * iniciar a inscrição: sem fricção na porta, o controle do club vira este
   * aviso mais o cancelamento. Quem manda no club fica sabendo na hora, e não
   * quando a chave sai.
   */
  'tournament.registered',
  /** A inscrição do club foi cancelada · quem recebe é o elenco que gerencia. */
  'tournament.registrationCancelled',

  /**
   * **Os quatro abaixo fecham o laço do campeonato**, e a auditoria de
   * 13/08/2026 mostrou que era exatamente a passada que faltava · o domínio de
   * club recebeu a dele em 11/08 e ganhou seis tipos de uma vez; campeonato
   * nasceu depois com **dois**, os dois sobre *inscrever*, e nada sobre o que
   * acontece **depois**.
   *
   * **Nos quatro, quem age é o sistema** (o relógio, o provedor, o organizador),
   * e é por isso que a regra "aviso é sobre o que outro alguém fez com você"
   * parecia justificar o silêncio. Ela pergunta **quem foi o autor**; a pergunta
   * que decide é *alguém precisa saber disso?*.
   */
  /**
   * A reserva venceu sem pagamento · quem recebe é **quem inscreveu e quem
   * gerencia**.
   *
   * **Ele é a correção de um aviso que já foi entregue**, e não um conforto: numa
   * edição paga o `tournament.registered` dispara na **reserva**, antes de
   * existir dinheiro. A frase de lá descreve a ação e não mente quando sai · mas
   * é a única daquela conversa, e a reserva vencendo a deixa errada em silêncio.
   */
  'tournament.reservationExpired',
  /**
   * O dinheiro entrou e a vaga está confirmada · quem recebe é **quem pagou e
   * quem gerencia**.
   *
   * É o "vocês estão dentro", e até 13/08/2026 ele só existia **na tela** · quem
   * fechasse a aba não ficava sabendo nunca. O par dele é o de cima: um fecha o
   * laço pelo lado bom, o outro pelo ruim.
   */
  'tournament.paymentConfirmed',
  /** O valor da inscrição voltou · quem recebe é **quem pagou**, e só ele. */
  'tournament.refunded',
  /**
   * A edição foi cancelada · quem recebe é **o elenco inscrito inteiro**.
   *
   * **É o único destes quatro em que a promessa é desfeita por nós**, e o único
   * que alcança o elenco e não só quem gerencia: foi o club inteiro que ficou sem
   * campeonato. E ele tem dinheiro dentro · o `refundReason` já prevê
   * `tournament-cancelled` desde que o pagamento existe.
   */
  'tournament.cancelled',
  /**
   * A chave saiu · quem recebe é **o elenco congelado inteiro**.
   *
   * **É o segundo aviso que alcança quem não agiu em nada**, e o par dele é o
   * `cancelled`: um desfaz a promessa, este a cumpre. O motivo de ele existir é
   * de produto e está escrito no `produto.md` desde 12/08/2026 · *"a chave saiu
   * é o único motivo de abrir o app naquele dia"*.
   *
   * **O elenco é o congelado, e não o vivo** · quem entrou no club depois do
   * sorteio não joga esta edição, e avisá-lo seria convidar pra uma partida que
   * não é dele.
   */
  'tournament.drawn',
  /**
   * A organização tirou o club da edição · quem recebe é **o elenco inteiro**.
   *
   * Ele existe por causa da escada rígida (decisão de 14/08/2026): quando os
   * confirmados não fecham um degrau, o admin tira quem sobra na mão. **Sair da
   * edição por decisão de outra pessoa é exatamente o que a caixa existe pra
   * contar** · sem este aviso, o club descobriria pela chave em que não está.
   *
   * **A frase não promete reembolso**, e a ausência é deliberada · o dinheiro
   * volta pela mão do admin quando for o caso, e prometer na notificação o que o
   * código não executa é pior que não avisar.
   */
  'tournament.removed',
  /**
   * **A organização deu uma vaga ao club** · quem recebe é dono e gerente.
   *
   * Ele existe porque a cortesia (pendência 191) confirma a inscrição **sem
   * cobrança nenhuma**, e o aviso que já havia não sabe contar isso: o
   * `tournament.registered` fala de quem apertou o botão, e aqui quem apertou é
   * um admin que não é do club · a frase sairia com o `@nick` de um estranho
   * inscrevendo o time.
   *
   * **E ele precisa dizer que não há o que pagar.** Sem isso, quem vê o club
   * dentro de uma edição paga procura o Pix que não existe · é o mesmo erro de
   * leitura que a pendência inteira existe pra acabar, só que do lado de fora.
   *
   * **Sem `handle`**, como os quatro do laço · o sujeito é a organização, e
   * apontar o admin pessoalmente não ajuda quem recebe.
   */
  'tournament.courtesy',
  /**
   * Você está em dois clubs inscritos, e joga por um · quem recebe é **o
   * player**, e o club citado é o que **ficou** com ele.
   *
   * **Ele fecha a metade que faltava de uma regra de 12/08/2026** · a plataforma
   * resolve o conflito pela inscrição mais antiga *e avisa os três lados*, e por
   * um bloco ela só resolvia. O silêncio apareceu na primeira vez que a regra
   * rodou de verdade: a pessoa recebeu o aviso de um club e nada do outro.
   */
  'tournament.squadLocked',
  /**
   * Um player do seu elenco vai jogar por outro club · quem recebe é **quem
   * gerencia o club que o perdeu**, e é o único aviso de campeonato que leva
   * `handle`.
   *
   * **Sem o nome dele o aviso não serve** · quem escala precisa saber quem
   * faltou, e "um jogador seu" deixaria o club procurando.
   */
  'tournament.squadLost',

  /**
   * **Os três abaixo são o laço do resultado**, e sem eles o placar declarado não
   * funciona · não é conforto, é o mecanismo.
   *
   * A declaração de um lado só vira resultado quando o outro responde, e uma
   * ponta que não sabe que precisa responder é uma partida que fecha por prazo
   * contra ela. **A tela não serve aqui**: quem acabou de jogar fechou o app.
   */
  /**
   * O adversário lançou o placar · quem recebe é **quem manda no outro club**
   * (dono e gerente), que são os únicos que podem responder.
   *
   * **A frase não repete o placar dele**, e a ausência é de propósito: ver o
   * número antes de declarar convida a copiar em vez de conferir, que é o que a
   * declaração das duas pontas existe pra impedir. É a mesma razão de o print só
   * aparecer depois que a partida fecha.
   */
  'tournament.matchReported',
  /**
   * As duas declarações não bateram · quem recebe é **quem manda nos dois
   * clubs**, e a partida saiu da mão deles.
   *
   * Sem este aviso, os dois lados ficam achando que estão esperando o outro ·
   * cada um já falou, e a tela de quem declarou primeiro dizia "esperando o
   * adversário" até alguém abrir a chave por acaso.
   */
  'tournament.matchDisputed',
  /**
   * **O seu próximo confronto existe** · quem recebe é quem manda nos dois
   * clubs do jogo novo.
   *
   * Ele nasce das duas transições que criam partida **depois** da largada: a
   * chave saindo dos grupos (a organização gera) e a rodada seguinte do
   * mata-mata (automática, quando a rodada inteira fecha). **O sorteio inicial
   * não manda este** · lá quem fala é o `tournament.drawn`, e dois avisos no
   * mesmo instante é o ruído que a política inteira evita.
   *
   * **Sem ele, saber que você tem adversário depende de estar com a tela
   * aberta**, porque o `TOURNAMENT_EVENT.matches` só alcança quem está olhando ·
   * e quem não sabe que tem jogo perde por W.O.
   */
  'tournament.nextMatch',
  /**
   * **Os grupos acabaram e a chave espera a organização** · quem recebe é
   * **admin**, e é o primeiro aviso do produto que não é sobre um club de quem
   * lê.
   *
   * A primeira rodada do mata-mata **não nasce sozinha**: quem a gera é uma
   * pessoa, apertando um botão (`generateKnockout`, na rota de admin). Entre o
   * fim dos grupos e esse clique, ninguém tem próximo adversário e ninguém sabe
   * por quê · numa noite de três horas com uma pessoa organizando, é o gargalo
   * mais provável da edição.
   */
  'tournament.groupsClosed',
  /**
   * **Chamaram a organização numa conversa de confronto** · quem recebe é
   * **admin**, e é o segundo aviso do produto que não é sobre um club de quem
   * lê.
   *
   * **Uma vez por conversa**, garantido no repositório · dois clubs discutindo
   * chamariam os dois, e o sininho da organização viraria o eco da briga.
   */
  'chat.adminCalled',
  /**
   * **A organização falou numa conversa de confronto** · quem recebe é quem
   * manda nos dois clubs.
   *
   * Pedido do Eduardo em 27/08/2026, e ele tem razão de produto: o que a
   * organização diz numa disputa **decide**, e um aviso que só existe dentro da
   * sala só alcança quem já estava com a sala aberta.
   *
   * **Uma rajada é um aviso** · o repositório segura o segundo dentro da
   * mesma janela curta, senão a organização escrevendo três linhas toca o
   * sininho três vezes.
   */
  'chat.adminSpoke',
  /**
   * **Marcaram o seu club numa conversa** · `@TAG` no corpo da mensagem.
   *
   * É o canal de "vem cá agora" · e é o único aviso de chat que **fura a
   * espera**, porque quem marca está esperando resposta.
   */
  'chat.mention',
  /**
   * **O adversário falou e você não leu** · quem recebe é quem fala pelo outro
   * club.
   *
   * **É o aviso que faltava pra promessa de centralizar a comunicação valer** ·
   * estava no plano desde o começo e não existia: sem ele, *"vamos 20:35?"*
   * escrito aqui não alcança ninguém que não esteja com a tela aberta, e o time
   * volta pro Discord exatamente na hora que importa.
   *
   * **Uma vez por silêncio, e a marca de leitura é quem decide** · ele só sai
   * quando a mensagem nova é a **primeira** não lida de quem recebe. Enquanto
   * o outro lado não abrir a sala, não sai de novo · abrir zera. Sem isso o
   * sininho vira o eco da conversa, que é o motivo de este aviso ter esperado.
   */
  'chat.firstUnread',
  /**
   * O prazo passou e o placar do adversário virou oficial · quem recebe é **quem
   * manda no club que ficou em silêncio**.
   *
   * **É a correção de um aviso já entregue**, como a reserva vencida: o
   * `matchReported` disse "responda", e o prazo respondendo sozinho deixaria
   * aquela conversa terminando no vazio. **Aqui o placar vai na frase**, ao
   * contrário do primeiro, porque agora ele é o resultado e não a versão de
   * alguém · e vai com o nome dos dois lados, porque quem lê perdeu o jogo sem
   * ter olhado a tela.
   *
   * ---
   *
   * **DESCONTINUADO em 22/08/2026 · nada mais produz este aviso.** Quem o
   * emitia era a `settleUnansweredReports`, e ela caiu junto com a outra
   * varredura quando o Eduardo decidiu que partida nenhuma fecha sozinha ·
   * *"precisa passar pelo admin verificar e decidir"*. Hoje o desfecho
   * equivalente é o `matchClosedByAdmin`.
   *
   * **E ele NÃO é removido de propósito** · a varredura rodou em produção entre
   * 15 e 22/08/2026, então pode haver avisos deste tipo gravados na caixa de
   * alguém. Tirar o tipo faria a caixa dessa pessoa parar de renderizar o
   * próprio histórico · **o texto continua verdadeiro pra quem o recebeu**, e é
   * só pra frente que ele deixou de existir.
   *
   * Sobreviveu sem essa marca até 31/08/2026, junto com a promessa das 24h na
   * tela e no e-mail · as três eram a mesma sobra da mesma decisão.
   *
   * scan-realtime: ok · descontinuado em 22/08/2026, e mantido porque pode
   * haver aviso deste tipo gravado na caixa de quem jogou antes daquela data
   */
  'tournament.matchTimedOut',
  /**
   * A organização decidiu a partida em disputa · quem recebe é **quem manda nos
   * dois clubs**, e os dois precisam igual.
   *
   * **É o único desfecho em que ninguém sabe o número antes do aviso** · no
   * acordo os dois declararam o mesmo, e no prazo um deles declarou. Aqui o
   * placar veio de fora dos dois, então a frase carrega ele.
   */
  'tournament.matchResolved',
  /**
   * **A organização encerrou a partida que ficou esperando** · e o placar que
   * vale é o que **um** dos lados declarou.
   *
   * Ele é o irmão do `matchTimedOut`, com uma diferença que muda tudo pra quem
   * lê: ali o prazo venceu sozinho, aqui **uma pessoa decidiu encurtar**. Por
   * isso ele carrega o `reason` · quem ficou calado recebe um resultado que não
   * declarou, e a pergunta seguinte é sempre *por quê*. Decisão do Eduardo em
   * 19/08/2026, junto com a de deixar o admin encerrar.
   */
  'tournament.matchClosedByAdmin',
  /**
   * **Ninguém declarou, e a partida foi dada como não jogada** · o W.O. duplo.
   * Quem recebe é quem manda **nos dois** clubs.
   *
   * É o único desfecho em que os dois lados erraram igual, e por isso é o único
   * em que os dois recebem a mesma frase. Ele **não carrega placar**: o 0-0
   * gravado não é resultado de jogo nenhum, e escrevê-lo na caixa faria a
   * pessoa procurar uma partida que não aconteceu.
   *
   * **Sem ele o silêncio seria completo** · a partida some da lista de "esperando
   * placar" e vira `walkover` sem que nenhum dos dois clubs fique sabendo por
   * quê. Decisão de 22/08/2026, com o resto do W.O.
   */
  'tournament.matchWalkover',
]);

export type NotificationKind = z.infer<typeof notificationKind>;

/**
 * Teto de um valor interpolado.
 *
 * **Ele tem referência, como todo limite deste projeto**, e ela mudou em
 * 19/08/2026: até então o maior valor era o `@nick` (`HANDLE_MAX`, 32), e
 * quarenta dava folga. Hoje o maior é **o motivo do encerramento pela
 * organização** (`closeMatchInput.reason`), que é uma frase e tem teto próprio
 * de 200 · este acompanha ele.
 *
 * **O motivo de o teto existir não mudou** · a caixa interpola texto escrito
 * por gente, e sem limite ela vira campo livre. O que mudou foi o tamanho da
 * maior frase que precisa caber.
 *
 * > **E o teto antigo derrubava o aviso em silêncio** · o produtor valida os
 * > parâmetros e o `catch` engole a falha (por desenho: aviso que lança
 * > desfaria a ação). O placar era gravado, os dois clubs ficavam sem saber, e
 * > nada aparecia em tela nenhuma. Achado no teste do próprio bloco, pelo log.
 */
export const NOTIFICATION_PARAM_MAX = 200;

/**
 * **Por quantos dias um aviso fica na caixa** · 90, contados de quando ele
 * nasceu, e **independente de ter sido lido**.
 *
 * Vale como índice TTL no Mongo (`notification_ttl_idx`), e quem o aplica é o
 * `pnpm migrate` · ver o comentário lá, que carrega a decisão inteira.
 *
 * **A referência do número é medida, e não gosto:** aviso pesa ~333 bytes, e
 * num cenário de 10 mil jogadores ativos a collection sozinha põe ~133 MB por
 * mês no banco. Sem prazo ela é ~75% do crescimento, contra um cluster M0 de
 * **512 MB de teto**. Noventa dias é o ponto em que ela **para de acumular** e
 * passa a girar: a caixa vira uma janela de três meses.
 *
 * **Por que 90 e não 30:** a temporada de um campeonato dura semanas, e quem
 * volta ao produto depois de um mês parado precisa achar o que perdeu. Trinta
 * dias apagaria a edição anterior inteira.
 */
export const NOTIFICATION_TTL_DAYS = 90;

/**
 * Os valores que a frase interpola · nada de HTML, nada de texto livre.
 *
 * Chave em inglês, como todo identificador, e é ela que aparece no catálogo
 * como `{{clubName}}`.
 */
// O zod 4 exige o tipo da CHAVE junto do tipo do valor · no 3 ela era
// implícita. `z.string()` é o que o 3 assumia, então isto é a mesma coisa
// escrita por extenso, e não uma restrição nova.
export const notificationParams = z.record(
  z.string(),
  z.string().min(1).max(NOTIFICATION_PARAM_MAX),
);

export type NotificationParams = z.infer<typeof notificationParams>;

/**
 * Que parâmetros cada tipo carrega · **e é este par que impede a frase de nascer
 * com buraco.**
 *
 * A tabela e o enum são as duas metades da mesma coisa, e a regra do
 * `docs/dados.md` vale aqui: quando a tabela derivada tem par, **um teste trava
 * os dois** · tipo novo que não apareça aqui quebra a suíte em vez de gravar uma
 * notificação cujo texto sai com `{{clubName}}` na cara da pessoa.
 *
 * **`clubTag` está em todas** porque é dela que sai o link · a notificação leva
 * pra página do club, e o endereço público é a tag, nunca o id interno.
 */
/**
 * Por onde um aviso pode sair · o **sininho** é a fonte da verdade e o e-mail é
 * o canal que alcança quem não está com o app aberto.
 */
export const notificationChannel = z.enum(['bell', 'email']);
export type NotificationChannel = z.infer<typeof notificationChannel>;

/**
 * Por onde cada aviso sai · **é aqui que se decide o que vira e-mail**, e o
 * `Record` não compila sem entrada, como o `NOTIFICATION_PARAMS` ao lado.
 *
 * Isso é de propósito: **tipo novo obriga alguém a responder "isto merece a
 * caixa de entrada?"**, em vez de herdar um default. Convenção que depende de
 * lembrar já falhou três vezes nesta casa.
 *
 * ## O critério, decidido em 21/08/2026
 *
 * **E-mail é pro que tem prazo, dinheiro, ou espera resposta da pessoa** · o
 * resto fica só no sininho.
 *
 * A tentação é mandar tudo, e ela se paga uma vez: **ruído treina a pessoa a
 * ignorar o remetente**, e aí o canal se perde justamente no dia em que ele
 * importa (a reserva vencendo, a partida que fecha por prazo). Marcar como spam
 * é o pior desfecho possível, porque a reputação é da conta e ela é
 * compartilhada com outro produto.
 *
 * **O sininho recebe todos**, sem exceção · ele é a fonte da verdade, e não um
 * canal que se escolhe.
 */
export const NOTIFICATION_CHANNELS: Record<NotificationKind, readonly NotificationChannel[]> = {
  // **Espera resposta sua** · quem recebe precisa decidir alguma coisa, e pode
  // levar dias pra abrir o app de novo.
  'club.invited': ['bell', 'email'],
  'club.joinRequested': ['bell', 'email'],
  'club.ownershipOffered': ['bell', 'email'],
  // O cargo gasta a única vaga de liderança da conta · é decisão com
  // consequência, e ela não pode depender de a pessoa abrir o app.
  'club.managerOffered': ['bell', 'email'],

  // **Consequência de algo que a pessoa já sabe** · ela pediu, ela entrou, ela
  // saiu. Não há prazo correndo nem decisão pendente.
  'club.joinApproved': ['bell'],
  'club.joinRejected': ['bell'],
  'club.promoted': ['bell'],
  'club.demoted': ['bell'],
  'club.managerStepDown': ['bell'],
  'club.managerAccepted': ['bell'],
  'club.managerDeclined': ['bell'],
  'club.removed': ['bell'],
  'club.ownershipAccepted': ['bell'],
  'club.ownershipDeclined': ['bell'],
  'club.inviteAccepted': ['bell'],
  'club.inviteDeclined': ['bell'],
  'club.memberLeft': ['bell'],
  'club.deleted': ['bell'],

  // **Dinheiro** · os três são recibo, e recibo se guarda na caixa de entrada.
  'tournament.registered': ['bell', 'email'],
  'tournament.paymentConfirmed': ['bell', 'email'],
  'tournament.refunded': ['bell', 'email'],
  // A vaga que caiu · a pessoa perdeu algo e pode querer entrar de novo.
  'tournament.reservationExpired': ['bell', 'email'],
  // A edição caiu, e havia dinheiro nela.
  'tournament.cancelled': ['bell', 'email'],

  // **Prazo** · perder isto é perder a partida, e é o núcleo do produto.
  'tournament.drawn': ['bell', 'email'],
  'tournament.matchReported': ['bell', 'email'],
  'tournament.matchTimedOut': ['bell', 'email'],
  'tournament.matchDisputed': ['bell', 'email'],
  // **Mesmo peso do `matchReported`** · quem não sabe que tem adversário perde
  // por W.O., e é exatamente quem está longe da tela que precisa saber.
  'tournament.nextMatch': ['bell', 'email'],
  // **Só o sininho** · quem recebe é admin, e admin está no painel. E-mail pra
  // toda transição de fase de toda edição vira ruído na caixa de quem organiza.
  'tournament.groupsClosed': ['bell'],
  /**
   * **O único do chat que também sai por e-mail** · decisão do Eduardo em
   * 28/08/2026 (noite), e ela reverte a linha anterior daqui.
   *
   * A regra antiga dizia *"quem recebe é admin, e admin está no painel"*. Isso
   * vale pra `groupsClosed`, que é informação · **não vale pra este**, que é o
   * pedido de socorro de uma partida acontecendo **agora**. Dois clubs
   * discutindo um placar às 22h não podem depender de quem organiza estar com o
   * app aberto naquele minuto.
   *
   * **E ele não vira ruído**, que é o medo legítimo de e-mail de chat: um
   * chamado por sala, e a linha de sistema já entra uma vez só · quem rechama
   * gera um e-mail novo porque **rechamar é exatamente pedir de novo**.
   *
   * Os outros três continuam sem e-mail, e o porquê está logo abaixo.
   */
  /**
   * **Só o sininho** · decisão do Eduardo em 30/08/2026 · *"não precisa enviar
   * e-mail nisso (só na plataforma basta, pois o admin sempre estará vendo a
   * plataforma quando tiver tendo campeonato)"*.
   *
   * O e-mail foi ligado em 28/08 seguindo o recomendado, e **o argumento dele é
   * melhor que o meu**: quem organiza está com a plataforma aberta justamente
   * enquanto a edição acontece, que é a única janela em que este aviso existe.
   * Mandar e-mail ali é duplicar na caixa o que já está na tela · e rechamar
   * dispara pra **todos** os organizadores.
   *
   * **A trava de 5 min continua valendo** · ela protegia a caixa de entrada, e
   * agora protege o sininho. Ver o `CALL_ADMIN_AGAIN_AFTER_MINUTES`.
   */
  'chat.adminCalled': ['bell'],
  /**
   * **Só o sininho, e a bandeja do app** · e-mail por mensagem de chat é o
   * caminho mais curto pra pessoa desligar o e-mail do produto inteiro. O que
   * alcança quem está longe da tela aqui é a bandeja (fatia 5), não a caixa.
   */
  'chat.adminSpoke': ['bell'],
  'chat.mention': ['bell'],
  'chat.firstUnread': ['bell'],
  'tournament.matchResolved': ['bell', 'email'],
  'tournament.matchClosedByAdmin': ['bell', 'email'],
  // **Perder a partida sem jogar é dinheiro e classificação** · a pessoa não
  // estava com a tela aberta (é justamente por isso que a partida venceu), então
  // o sininho sozinho chegaria tarde.
  'tournament.matchWalkover': ['bell', 'email'],
  // O club saiu da edição pela mão da organização · ele não escolheu isso.
  'tournament.removed': ['bell', 'email'],
  // **Vaga dada é dinheiro que a pessoa não vai gastar**, e ela precisa saber
  // disso antes de tentar pagar · mesma faixa dos outros três de dinheiro.
  'tournament.courtesy': ['bell', 'email'],

  // **Cancelar a própria inscrição é ação da pessoa** · e-mail aqui seria
  // contar de volta o que ela acabou de fazer.
  'tournament.registrationCancelled': ['bell'],
  // O elenco congelou na data anunciada · não há o que fazer com a informação.
  'tournament.squadLocked': ['bell'],
  'tournament.squadLost': ['bell'],
};

/** `true` quando aquele tipo também sai por e-mail. */
export function notifiesByEmail(kind: NotificationKind): boolean {
  return NOTIFICATION_CHANNELS[kind].includes('email');
}

/**
 * **Param terminado em `?` é opcional**, e essa convenção nasceu de um defeito
 * de produção evitado por uma revisão em 21/08/2026.
 *
 * A conferência do `createNotificationInput` é por **igualdade exata** de
 * chaves · é ela que garante que aviso novo não nasce com o param errado. Ao
 * acrescentar `reservedUntil` ao `tournament.registered` eu chamei o campo de
 * "opcional" no comentário e **o modelo não tinha essa noção**: numa edição
 * grátis não há prazo, o produtor mandava cinco chaves contra seis esperadas, o
 * `parse` lançava dentro do `notifyMany` e o `catch` engolia. O desfecho era
 * **toda inscrição grátis sem aviso nenhum** · nem sininho, nem e-mail, e o
 * único rastro era uma linha de `warn` no log do container.
 *
 * O `?` fica só aqui · quem lê o param usa o nome sem ele.
 */
export const NOTIFICATION_PARAMS: Record<NotificationKind, readonly string[]> = {
  'club.invited': ['clubName', 'clubTag'],
  // O `@nick` de quem pediu · sem ele, quem gerencia não sabe pra quem olhar.
  'club.joinRequested': ['clubName', 'clubTag', 'handle'],
  'club.joinApproved': ['clubName', 'clubTag'],
  'club.joinRejected': ['clubName', 'clubTag'],
  'club.promoted': ['clubName', 'clubTag'],
  'club.demoted': ['clubName', 'clubTag'],
  // O `@nick` de quem largou · sem ele a frase seria "alguém largou a
  // gerência", e o dono teria que abrir o elenco pra descobrir quem.
  'club.managerStepDown': ['clubName', 'clubTag', 'handle'],
  'club.managerOffered': ['clubName', 'clubTag'],
  // Os dois que fecham o laço da oferta levam o `@nick` de quem respondeu ·
  // "aceitaram a gerência" sem dizer quem manda o dono abrir a tela pra
  // descobrir o que o aviso deveria ter dito.
  'club.managerAccepted': ['clubName', 'clubTag', 'handle'],
  'club.managerDeclined': ['clubName', 'clubTag', 'handle'],
  'club.removed': ['clubName', 'clubTag'],
  'club.ownershipOffered': ['clubName', 'clubTag'],
  // Os seis que fecham laço levam o `@nick` de quem respondeu · sem ele a frase
  // seria "alguém aceitou", que manda a pessoa abrir a tela pra descobrir o que
  // o aviso deveria ter dito. A exceção é o club encerrado, onde o sujeito é o
  // club.
  'club.ownershipAccepted': ['clubName', 'clubTag', 'handle'],
  'club.ownershipDeclined': ['clubName', 'clubTag', 'handle'],
  'club.inviteAccepted': ['clubName', 'clubTag', 'handle'],
  'club.inviteDeclined': ['clubName', 'clubTag', 'handle'],
  'club.memberLeft': ['clubName', 'clubTag', 'handle'],
  'club.deleted': ['clubName', 'clubTag'],
  // **O link daqui é o do campeonato, não o do club** · quem recebe já sabe qual
  // é o club dele, e o que ele quer abrir é a edição. Por isso vai o
  // `tournamentSlug` junto do `clubTag`, que continua nomeando o club na frase.
  /**
   * **O `reservedUntil` existe porque numa edição paga este aviso dispara na
   * RESERVA**, antes de existir dinheiro · o próprio bloco de canais já
   * registrava isso ("a reserva vencendo a deixa errada em silêncio").
   *
   * No sininho isso era uma linha curta; **na caixa de entrada é um assunto
   * afirmativo que a pessoa arquiva achando que acabou.** Com o campo, o e-mail
   * diz "vaga reservada" e mostra até quando · opcional, porque edição grátis
   * confirma na hora e ali não há prazo nenhum.
   */
  'tournament.registered': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'handle',
    // **Opcional** · edição grátis confirma na hora e ali não há prazo nenhum.
    'reservedUntil?',
  ],
  'tournament.registrationCancelled': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'handle',
  ],
  // **Os quatro do laço não levam `handle`, e a ausência é o desenho** · em
  // nenhum deles existe uma pessoa que agiu. Uma frase com "@fulano" aqui teria
  // que inventar um sujeito, e o sujeito de verdade é o relógio, o provedor ou a
  // organização.
  'tournament.reservationExpired': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag'],
  /**
   * **O valor e a data existem porque o e-mail manda guardar o comprovante** ·
   * e um comprovante sem valor e sem data não serve pra nada. A frase prometia
   * o que a peça não entregava, que é a categoria de defeito que este projeto
   * mais persegue.
   *
   * A prova de que era esquecimento e não decisão: o `CHROME` do `copy.ts`
   * declarava `amount: 'Valor'` desde sempre, e **o rótulo nunca teve linha**.
   */
  'tournament.paymentConfirmed': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'amount',
    'paidAt',
  ],
  // **`refundReason` é opcional de propósito** · o estorno feito pelo painel do
  // provedor chega pelo webhook sem motivo nenhum, e exigir a chave ali faria o
  // `parse` lançar e o aviso sumir inteiro · foi assim que a inscrição grátis
  // ficou sem aviso, e a lição está escrita acima.
  // **`slotFreed` também é opcional**, e pelo mesmo motivo do irmão acima: o
  // aviso antigo, já entregue, não tem a chave · exigir faria o `parse` lançar
  // ao reabrir o sininho de quem recebeu um reembolso antes de 03/09/2026.
  'tournament.refunded': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'refundReason?',
    'slotFreed?',
  ],
  'tournament.cancelled': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag'],
  'tournament.drawn': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag'],
  'tournament.removed': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag'],
  // **Sem `handle` e sem o motivo** · o sujeito é a organização, e o motivo da
  // cortesia é anotação interna da mesa · mandá-lo pra quem recebeu seria
  // publicar a justificativa que um admin escreveu pra outro admin.
  'tournament.courtesy': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag'],
  'tournament.squadLocked': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag'],
  // O único do laço de campeonato com `handle` · sem o nome, quem gerencia não
  // sabe quem faltou.
  'tournament.squadLost': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag', 'handle'],
  // **`rivalName` e não `handle`** · o sujeito de uma partida é o club do outro
  // lado, e quem declarou por ele não interessa a quem recebe. O `clubName`
  // continua sendo o **seu** club, porque a pessoa pode ter três na mesma edição.
  'tournament.matchReported': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'rivalName',
  ],
  'tournament.matchDisputed': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'rivalName',
  ],
  'tournament.nextMatch': ['tournamentName', 'tournamentSlug', 'clubName', 'clubTag', 'rivalName'],
  // **Sem club, e é o que o torna diferente de todos os outros** · este aviso é
  // sobre a EDIÇÃO, e quem recebe não tem club nenhum nela.
  'tournament.groupsClosed': ['tournamentName', 'tournamentSlug'],
  // **As duas tags, e nada do que foi dito** · o aviso não interpola trecho de
  // mensagem · é o que mata de uma vez o teto do `NOTIFICATION_PARAM_MAX`, o
  // escape sutil do e-mail e o assédio ganhando um segundo canal.
  /**
   * **O `matchId` entrou pra o aviso levar PRA SALA** · sem ele o sininho só
   * sabia apontar pra página da edição, e quem foi chamado tinha que achar o
   * confronto na chave. O endereço da sala é `?conversa=<matchId>`.
   */
  'chat.adminCalled': ['tournamentName', 'tournamentSlug', 'homeTag', 'awayTag', 'matchId'],
  'chat.adminSpoke': ['tournamentName', 'tournamentSlug', 'homeTag', 'awayTag', 'matchId'],
  // **`byTag` é quem marcou** · `admin` quando foi a organização. Continua sem
  // trecho da mensagem, pela mesma razão do `adminCalled`.
  'chat.mention': ['tournamentName', 'tournamentSlug', 'homeTag', 'awayTag', 'byTag', 'matchId'],
  'chat.firstUnread': [
    'tournamentName',
    'tournamentSlug',
    'homeTag',
    'awayTag',
    'byTag',
    'matchId',
  ],
  'tournament.matchTimedOut': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'rivalName',
    // **Os gols vão separados, e a frase nomeia cada lado** · um "1 - 3" solto
    // não diz de quem é o 1, e quem lê pode estar no mandante ou no visitante.
    'yourGoals',
    'rivalGoals',
  ],
  'tournament.matchResolved': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'rivalName',
    'yourGoals',
    'rivalGoals',
    // Optional for notifications persisted before decisions required a reason.
    'reason?',
  ],
  // **Sem gols de propósito** · o 0-0 gravado não é resultado de jogo nenhum, e
  // pôr número na frase faria a pessoa procurar uma partida que não aconteceu.
  'tournament.matchWalkover': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'rivalName',
  ],
  'tournament.matchClosedByAdmin': [
    'tournamentName',
    'tournamentSlug',
    'clubName',
    'clubTag',
    'rivalName',
    'yourGoals',
    'rivalGoals',
    // **O porquê, escrito por quem encerrou** · é o que separa este aviso de um
    // placar que apareceu do nada na caixa de quem não declarou.
    'reason',
  ],
};

/**
 * O que o servidor grava.
 *
 * **É ele que o repositório parseia antes de inserir** · a regra do
 * `docs/dados.md` sobre script que escreve com cast vale igual aqui: quem grava
 * sem passar por schema é quem grava dado torto.
 */
/**
 * A imagem que acompanha o aviso · hoje é o escudo do club.
 *
 * **Não é texto, então ela não fere a decisão de gravar chave + parâmetros** ·
 * é uma referência, e continua valendo em qualquer idioma. Fica **gravada** em
 * vez de ser buscada na hora de ler porque a caixa é histórico: resolver o
 * escudo na leitura custaria uma consulta por linha, e o aviso de um club que
 * trocou de escudo continuar mostrando o antigo é o comportamento certo pra
 * quem está lendo o que aconteceu naquele dia.
 *
 * **Quem usa hoje é só o balão nativo do Windows**, que exige arquivo local · o
 * caminho de download e a restrição ao nosso CDN estão em
 * `apps/desktop/src-tauri/src/windows_toast.rs`.
 */
export const notificationImageUrl = httpUrl.nullable().optional();

export const createNotificationInput = z
  .object({
    /** Quem recebe · e a caixa é sempre de uma pessoa só. */
    userId: objectIdString,
    kind: notificationKind,
    params: notificationParams,
    imageUrl: notificationImageUrl,
  })
  .superRefine((value, ctx) => {
    const { required, optional } = splitParams(NOTIFICATION_PARAMS[value.kind]);
    const got = new Set(Object.keys(value.params));

    // **Duas perguntas, e as duas importam** · faltar obrigatório é frase sem
    // dado, e sobrar chave é o param que alguém renomeou de um lado só.
    const missing = required.filter((key) => !got.has(key));
    const unknown = [...got].filter((key) => !required.includes(key) && !optional.includes(key));
    if (missing.length === 0 && unknown.length === 0) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['params'],
      message: `${value.kind} espera ${[...required, ...optional.map((k) => `${k}?`)].sort().join(', ')}`,
    });
  });

/** Separa o obrigatório do que termina em `?` · ver o bloco do `NOTIFICATION_PARAMS`. */
export function splitParams(expected: readonly string[]): {
  required: string[];
  optional: string[];
} {
  const required: string[] = [];
  const optional: string[] = [];
  for (const key of expected) {
    if (key.endsWith('?')) optional.push(key.slice(0, -1));
    else required.push(key);
  }
  return { required, optional };
}

export type CreateNotificationInput = z.infer<typeof createNotificationInput>;

export const notificationSchema = z.object({
  ...baseDocumentFields,
  userId: objectIdString,
  kind: notificationKind,
  params: notificationParams,
  imageUrl: notificationImageUrl,
  /**
   * Quando foi lida · **nulo é não lida**.
   *
   * Data em vez de booleano porque ela não custa nada a mais e responde uma
   * pergunta que o booleano não responde · e porque é ela que um dia decide o
   * que sai da caixa quando a retenção existir.
   */
  readAt: z.coerce.date().nullable(),
});

export type Notification = z.infer<typeof notificationSchema>;

/**
 * Uma linha da caixa, como a tela recebe.
 *
 * **`id` e não `_id`** · é o identificador que a tela devolve pra marcar como
 * lida, e ele é da própria pessoa. A regra de não vazar id interno é sobre dado
 * **aberto**; aqui a resposta é da caixa de quem pediu.
 */
export const notificationView = z.object({
  id: objectIdString,
  kind: notificationKind,
  params: notificationParams,
  imageUrl: notificationImageUrl,
  read: z.boolean(),
  createdAt: z.coerce.date(),
});

export type NotificationView = z.infer<typeof notificationView>;

/**
 * O que viaja no canal quando uma notificação nasce · **a exceção do evento
 * magro, e a única do produto.**
 *
 * A regra é *o evento diz que mudou e a tela refaz a busca*. Aqui não, por dois
 * motivos medidos e não de gosto: o **toast nativo precisa do texto**, e buscá-lo
 * por notificação multiplicaria a consulta pelo número de conectados · que é
 * exatamente o fan-out que o desenho evita.
 *
 * **O contador vai junto e não é enfeite: é o que impede o sininho de derivar.**
 * Se um evento se perder, o próximo corrige o número · e a reconexão também,
 * porque ela refaz o `GET`.
 *
 * **O mesmo schema dos dois lados** · o servidor monta e o cliente lê com ele.
 */
export const notificationEvent = notificationView.extend({
  unread: z.number().int().nonnegative(),
});

export type NotificationEvent = z.infer<typeof notificationEvent>;

/**
 * O que viaja quando alguém marca como lida.
 *
 * **Ler numa aba apaga o contador nas outras** · sem isto a pessoa lê no site,
 * volta pro app e o sininho ainda mostra 3. É o tipo de coisa que ninguém pede e
 * todo mundo nota.
 */
export const notificationCountEvent = z.object({
  unread: z.number().int().nonnegative(),
});

export type NotificationCountEvent = z.infer<typeof notificationCountEvent>;

/** Os dois tipos de evento da caixa · nomes num lugar só, como os tópicos. */
export const NOTIFICATION_EVENT = 'user.notification';
export const NOTIFICATION_READ_EVENT = 'user.notificationRead';

/**
 * Quantas linhas a caixa devolve de uma vez.
 *
 * **Sem cursor por enquanto, e isso tem gatilho escrito:** o sininho mostra as
 * mais recentes e não tem tela de "ver todas" · quando ela existir, a paginação
 * é a mesma das vitrines (`useShowcase`, cursor com sentinela), e não uma
 * terceira invenção.
 */
export const NOTIFICATIONS_PAGE = 20;
export const NOTIFICATIONS_PAGE_MAX = 50;

export const notificationsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(NOTIFICATIONS_PAGE_MAX).default(NOTIFICATIONS_PAGE),
});

export type NotificationsQuery = z.infer<typeof notificationsQuery>;

/**
 * Marcar como lida · **com `ids`, marca aquelas; sem `ids`, marca todas.**
 *
 * Uma rota com o alvo no corpo, e não `/read` e `/read-all`: duas rotas seriam
 * duas conferências de que a caixa é de quem está pedindo, escritas em dois
 * lugares · é assim que uma das duas envelhece. É a mesma decisão do `decision`
 * no corpo do pedido de entrada.
 */
export const markNotificationsReadInput = z.object({
  ids: z.array(objectIdString).min(1).max(NOTIFICATIONS_PAGE_MAX).optional(),
});

export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadInput>;
