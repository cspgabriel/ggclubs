import { z } from 'zod';

/**
 * Os nomes dos tópicos do canal · **e eles moram aqui porque os dois lados
 * precisam falar a mesma coisa.**
 *
 * O servidor publica em `user:{id}` e o cliente se inscreve em `user:{id}` · a
 * string escrita nos dois lugares é a divergência que não dá erro em lugar
 * nenhum: a inscrição é aceita, o evento é publicado, e ninguém recebe nada.
 * É o mesmo argumento da lista de idiomas, que já esteve escrita em quatro
 * arquivos.
 *
 * **A autorização não vem junto**, e não deve vir: quem pode ouvir o quê se
 * decide contra o banco, no servidor (`lib/realtime/subscribe-policy.ts` da API). Aqui é
 * só o nome.
 */

/**
 * A caixa da própria conta · **ninguém pede, toda conexão já tem.**
 *
 * Ele é a identidade da conexão virada tópico, e é por onde a notificação
 * chega.
 */
export function userTopic(accountId: string): string {
  return `user:${accountId}`;
}

export function clubTopic(clubId: string): string {
  return `club:${clubId}`;
}

/**
 * **O que muda dentro de um club** · e este vocabulário é o que faz o evento
 * magro funcionar.
 *
 * O evento diz *o que* mudou, e **cada busca da tela decide se aquilo é com
 * ela** · a página do club tem três buscas independentes desde 07/08/2026, cada
 * uma com o gatilho dela, e um evento único ("algo mudou") desfaria essa
 * economia recarregando as três a cada mexida.
 *
 * **Ele mora aqui pelo mesmo motivo do nome do tópico:** quem publica é o
 * servidor e quem escuta é a tela, e string escrita nos dois lados é a
 * divergência que não dá erro em canto nenhum · o evento sai, ninguém reage, e
 * a tela fica velha em silêncio.
 */
export const CLUB_EVENT = {
  /** Quem está no elenco, ou com que papel · inclui braçadeira e posição. */
  squad: 'club.squad',
  /** Nome, escudo, banner, plataforma · o que a capa mostra. */
  identity: 'club.identity',
  /** A escalação foi gravada. */
  tactic: 'club.tactic',
  /** A fila de quem pediu pra entrar andou. */
  requests: 'club.requests',
  /** Os convites que o club mandou andaram. */
  invites: 'club.invites',
  /** A oferta de posse foi feita, retirada ou respondida. */
  ownership: 'club.ownership',
  /** O club acabou · quem ouve isto para de ouvir logo depois. */
  deleted: 'club.deleted',
} as const;

export type ClubEvent = (typeof CLUB_EVENT)[keyof typeof CLUB_EVENT];

/**
 * **O que muda na caixa de uma conta** · o par do `CLUB_EVENT`, um nível acima.
 *
 * A diferença entre os dois é de quem é o assunto: `club:{id}` fala do club, e
 * `user:{id}` fala **da pessoa** · onde ela entrou, de onde saiu, quem a chamou.
 * É o que a tela "Meus clubs" ouve, porque o que muda aquela lista nunca é um
 * club específico.
 *
 * Os avisos do sininho também viajam aqui, e os nomes deles moram no
 * `notification.ts` · são texto, e este arquivo é só transporte.
 */
export const USER_EVENT = {
  /** Entrou, saiu, foi removido, foi convidado, o convite morreu, o papel mudou. */
  membership: 'user.membership',
  /**
   * **Esta pessoa leu uma sala** · e ele existe pra apagar o ponto verde nas
   * **outras** telas dela, no navegador e no app instalado ao mesmo tempo.
   *
   * É o irmão do `NOTIFICATION_READ_EVENT` do sininho, e a assimetria entre os
   * dois era um defeito: a caixa de avisos zerava em toda aba desde que nasceu,
   * e a bandeja de conversas zerava **só na aba que abriu a sala**. Achado pelo
   * Eduardo em 28/08/2026 · *"cliquei aqui e ele não saiu o verdinho"*.
   *
   * **Ele viaja no tópico da PESSOA, e não no da sala** · o assunto é *"até
   * onde eu já vi"*, que não interessa a quem está do outro lado do confronto ·
   * mandar pela sala contaria ao rival a hora em que você leu.
   *
   * **E ele só sai quando havia o que ler** · abrir uma sala em dia não muda
   * número nenhum, e um evento por abertura seria ruído que ninguém consome.
   */
  chatRead: 'user.chatRead',
  /**
   * **O papel desta pessoa na PLATAFORMA mudou** · promovida a admin ou
   * rebaixada. Desde 04/09/2026.
   *
   * **Não confunda com o `membership`**, que fala do papel dentro de um club ·
   * este é o `role` da conta, o que abre e fecha o `/admin`.
   *
   * Ele existe porque o papel morava só no **claim do token**, que dura uma
   * hora: quem era promovido não via o painel até deslogar (achado pelo Eduardo
   * com o @gow) e quem era rebaixado continuava vendo. O servidor deixou de
   * confiar no claim no mesmo dia; **este evento é o que faz a tela alcançar a
   * mudança sem um F5.**
   */
  role: 'user.role',
} as const;

export type UserEvent = (typeof USER_EVENT)[keyof typeof USER_EVENT];

/**
 * **O canal falando de si mesmo** · o painel do admin, e é o primeiro tópico que
 * não pertence a um recurso.
 *
 * Os dois de cima são de **quem** (um club, uma conta) e a autorização deles é
 * um vínculo no banco. Este é de **papel**: quem entra é admin, e é o
 * `canSubscribe` que confere isso.
 *
 * **É a única tela do produto onde o dado muda sozinho de verdade, o tempo
 * todo**, sem ninguém agir · ou seja, é onde um defeito de entrega aparece na
 * hora e de graça. Foi por isso que o Eduardo pediu, mesmo marcando como uma das
 * últimas etapas.
 */
/**
 * **A edição de um campeonato** · e ele é o primeiro tópico de leitura ampla do
 * canal.
 *
 * Os outros três perguntam *"esta conta tem relação com este recurso?"* ou
 * *"esta conta é admin?"*. Este pergunta só **se a edição está publicada**, e a
 * razão é que o que ele carrega já é público: quantas vagas sobraram. A
 * autorização continua sendo do servidor e continua sendo conferida no banco ·
 * o que muda é a regra, não o lugar dela.
 *
 * **Ele existe porque a escassez é a alavanca de conversão desta página.** O
 * teto de vagas é verdadeiro, e um contador que anda sozinho enquanto a pessoa
 * lê o regulamento é a diferença entre decidir agora e voltar depois. Foi por
 * isso que o canal veio **antes** de campeonatos, em decisão de 11/08/2026:
 * *"campeonato nasce ouvindo em vez de ser retrofitado depois"*.
 */
export function tournamentTopic(tournamentId: string): string {
  return `tournament:${tournamentId}`;
}

export const TOURNAMENT_EVENT = {
  /** Uma vaga foi tomada ou devolvida · é o contador da página. */
  registrations: 'tournament.registrations',
  /**
   * Abriu, fechou, lotou, foi cancelada · **ou a organização editou a edição**
   * (data, formato, preço), o que passou a valer em 22/08/2026 com o
   * `updateTournament`. O que a tela faz nos dois casos é o mesmo: recarregar a
   * edição inteira, porque qualquer um deles muda o que ela oferece.
   */
  status: 'tournament.status',
  /**
   * **Uma cobrança desta edição mudou de estado sem mexer em vaga** · quem
   * escuta é o painel de quem está pagando.
   *
   * Ele existe porque o vocabulário de `registrations` **mentiria sobre o que
   * mudou** (pendência 94): quando o provedor diz que a order morreu (recusada,
   * cancelada, expirada do lado deles), a tentativa fecha no banco e a **vaga
   * continua reservada** · o contador não se mexe, e é justamente por isso que
   * nenhum evento existente cobre este caso.
   *
   * O sintoma sem ele: a tela segue mostrando o QR de uma cobrança que já não é
   * pagável, até o relógio da reserva vencer sozinho · e a reserva ainda tinha
   * minutos pra tentar de novo.
   *
   * **Ele é magro como todos os outros**, então não diz de QUEM é a cobrança ·
   * o tópico da edição é de leitura ampla, e quem recebe **refaz a busca dele**
   * (a elegibilidade), que é a única que sabe responder isso.
   */
  payment: 'tournament.payment',
  /**
   * **Uma partida mudou** · placar declarado, resultado fechado ou disputa
   * aberta.
   *
   * Ele é irmão do `payment` e existe pela mesma razão: nada disso mexe em vaga,
   * então `registrations` mentiria. E a tela que reage é outra · a chave, que
   * redesenha a tabela do grupo quando um resultado entra.
   */
  matches: 'tournament.matches',
} as const;

export type TournamentEvent = (typeof TOURNAMENT_EVENT)[keyof typeof TOURNAMENT_EVENT];

/**
 * **A sala de um confronto** · quem ouve são os dois clubs e a organização.
 *
 * **Um argumento só, e isso NÃO é estilo.** O `scripts/scan-realtime.mjs`
 * reconhece a publicação por `publish\(\s*([^,]+),\s*([A-Z_]+)\.` · um helper
 * de dois argumentos (`chatTopic('match', id)`) faz o `[^,]+` parar na vírgula
 * interna, o scanner não enxerga o `publish`, e ele **reprova uma implementação
 * correta** dizendo que o evento é ouvido e ninguém publica. Vermelho falso no
 * único check que guarda esta área é a forma mais rápida de ensinar alguém a
 * ignorá-lo.
 *
 * **E o nome carrega o tipo (`chat:match:`)** porque o confronto é a primeira
 * conversa e não a única · o chat de club e o de jogador a jogador vêm depois,
 * e vão querer `chat:club:` e `chat:dm:` sem reabrir a autorização deste.
 */
export function matchChatTopic(matchId: string): string {
  return `chat:match:${matchId}`;
}

export const CHAT_EVENT = {
  /**
   * **Uma mensagem nova, com a mensagem dentro** · o evento é gordo, e é a
   * segunda exceção do produto (a primeira é o `admin.presence`).
   *
   * O padrão da casa é evento magro (*"algo mudou, vá buscar"*), e ele não
   * serve aqui: uma sala com duas pontas conversando faria **uma requisição por
   * participante por mensagem**, e numa rajada de dez mensagens isso é vinte
   * idas ao servidor pra transportar vinte linhas de texto que já estavam na
   * mão de quem publicou.
   *
   * **O que viaja é o `chatMessageView`**, o mesmo formato que o `GET` devolve ·
   * duas formas do mesmo dado seria a divergência que o evento magro evita, e
   * aqui ela é evitada usando o mesmo schema nos dois caminhos.
   */
  message: 'chat.message',
  /**
   * **Alguém está escrevendo agora** · e o que ele carrega é **quem**, não um
   * booleano.
   *
   * Numa sala de duas pontas o valor não é a digitação: é saber que **tem
   * alguém do outro lado agora**, que numa noite de campeonato é a pergunta de
   * verdade. E carregando quem, *"a organização está digitando…"* sai de graça
   * · numa disputa, é a informação mais tranquilizadora que a tela pode dar.
   *
   * **Não grava nada, e nunca vai gravar** · é o único sinal do produto que
   * nasce pra ser jogado fora. Ele não passa por collection nenhuma: a rota
   * publica e responde 204.
   */
  typing: 'chat.typing',
  /**
   * **Chamaram a organização nesta sala** · e ele nasceu em 29/08/2026, de
   * quatro sintomas do Eduardo que eram **o mesmo buraco**:
   *
   * | o que ele viu | por que |
   * |---|---|
   * | *"abro o chat e ele some"* | a sala só sabia do chamado pela mensagem de sistema, e a leitura dela fechava o chamado no mesmo instante |
   * | *"se eu já tiver com o chat aberto, nem aparece"* | nada avisava a sala já aberta |
   * | a mesa do `/admin` não atualiza | o *"precisam de você"* só carregava na montagem |
   * | *"tem que ver se o websocket está funcionando"* | estava · **este evento é que não existia** |
   *
   * **Ele vai no tópico da SALA e no da EDIÇÃO** · são dois públicos e duas
   * telas: quem está com a conversa aberta, e quem está olhando a mesa de
   * todas elas. Sem o segundo, a lista *"precisam de você"* fica velha
   * enquanto a organização olha pra ela.
   *
   * **É evento magro** · ele diz que houve chamado, e quem quiser o estado
   * busca. O contrário obrigaria a decidir aqui o que cada uma das duas telas
   * precisa saber.
   */
  adminCalled: 'chat.adminCalled',
  /**
   * **A janela da sala mudou por fora dela** · hoje só a edição encerrando.
   *
   * Ele nasceu em 30/08/2026, da pergunta do Eduardo ao ver a decisão das 6
   * horas · *"precisa ver se o websocket ficou certinho com essa questão"*. E
   * não ficou: encerrar uma edição faz **toda** sala dela passar a avisar que
   * fecha em 6h, e quem estava com a conversa aberta não sabia que o relógio
   * tinha começado. **A cortesia só é cortesia se a pessoa souber dela.**
   *
   * **É o irmão do `adminCalled`, achado do mesmo jeito** · a ação muda o que
   * outra pessoa está vendo, e ninguém avisa. O `scan:realtime` não pega nenhum
   * dos dois, porque não há o que comparar quando o evento não existe.
   *
   * **Ele é magro e não diz o que mudou** · a sala refaz o `GET`, que já traz
   * `canWrite` e `closedReason` decididos pelo servidor. Mandar o motivo aqui
   * criaria uma segunda fonte pra divergir da primeira.
   */
  window: 'chat.window',
} as const;

/** O que o sinal de digitação leva · **quem**, e nada mais. */
export type ChatTypingSignal = {
  /** A tag do club, ou `admin` quando é a organização. */
  by: string;
  kind: 'club' | 'admin';
};

export type ChatEvent = (typeof CHAT_EVENT)[keyof typeof CHAT_EVENT];

export const ADMIN_REALTIME_TOPIC = 'admin:realtime';

export const ADMIN_EVENT = {
  /** Quantas conexões e de quantas contas · com intervalo mínimo, ver o hub. */
  presence: 'admin.presence',
  /**
   * **Alguma coisa mudou na lista de e-mails** · saiu um, ou o SES contou o
   * desfecho de um que já tinha saído.
   *
   * **Um tipo só pros dois, de propósito.** A tela faz uma busca só (a lista com
   * o total e a contagem por status), então dois tipos disparariam a mesma
   * busca e a receita 1 diz que o gatilho é da busca, não do acontecimento.
   *
   * **Ele não carrega o e-mail** · a lista é projetada e paginada no servidor, e
   * mandar o documento no evento criaria uma segunda forma daquele dado pra
   * divergir. A exceção do `presence` existe porque lá o número **é** o evento.
   *
   * O que ele conserta: o desfecho chega pelo webhook **segundos depois** do
   * envio, então sem isto o painel afirma "enviado" até alguém recarregar ·
   * e "enviado" não é entregue, que é a razão da collection existir.
   */
  emails: 'admin.emails',
} as const;

export type AdminEvent = (typeof ADMIN_EVENT)[keyof typeof ADMIN_EVENT];

/**
 * O que o evento de presença carrega · **o número, e nada de quem é.**
 *
 * É dado de quem está online, e a pergunta operacional ("está conectando?") se
 * responde com contagem · nome e `uid` ali seriam dado pessoal num painel que
 * não precisa deles.
 *
 * **Ele vai no evento em vez de a tela buscar** · é a mesma exceção do sininho,
 * e pela mesma razão: buscar o painel a cada conexão que abre seria consulta ao
 * banco por gente entrando.
 */
export const adminPresenceEvent = z.object({
  connections: z.number().int().nonnegative(),
  accounts: z.number().int().nonnegative(),
});

export type AdminPresenceEvent = z.infer<typeof adminPresenceEvent>;
