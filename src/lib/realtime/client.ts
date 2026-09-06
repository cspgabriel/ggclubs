/**
 * O hub de tempo real do cliente · **uma conexão por aplicativo, não por tela.**
 *
 * As telas se inscrevem nele; tela nova **não abre conexão nova**. Quem liga e
 * desliga é o `AuthProvider`, porque é lá que a sessão muda · pendurar isso numa
 * tela deixaria de fora todas as outras.
 *
 * **Ele não transporta nada de produto ainda** (bloco 2b) · abre, se mantém vivo
 * e reconecta. Tópicos e eventos são o bloco 3, e o `docs/produto.md` tem a
 * ordem.
 */

export type RealtimeState = 'closed' | 'connecting' | 'open';

export type RealtimeOptions = {
  /** De onde sai o bilhete de uso único · o `AuthProvider` passa o da API. */
  requestTicket: () => Promise<string>;
  /** Base do WebSocket. Sai da URL da API, trocando http por ws. */
  url: string;
  onState?: (state: RealtimeState) => void;
  /**
   * **A conta perdeu o direito de estar aqui** · suspensão, hoje.
   *
   * O servidor fecha com **1008** exatamente pra isto ser distinguível de queda
   * de rede, e sem ler o código o cliente ficaria tentando pra sempre contra uma
   * rota que não vai mais dar bilhete · com a tela mostrando dado velho e
   * **nenhum sinal** pra quem está olhando.
   */
  onRevoked?: () => void;
  /**
   * **O servidor está sendo trocado** · o `closeRealtimeHub` fecha com
   * `1001 going away` no `SIGTERM`, e isso é a assinatura de um deploy da API.
   *
   * É o único sinal instantâneo e honesto que o produto tem de que **um deploy
   * está acontecendo agora**, e ele custa zero: o quadro já chega, faltava
   * alguém ler. Quem usa é o `lib/app-version.ts`, pra conferir na volta do
   * canal se o bundle da web também mudou.
   *
   * **Não muda a reconexão** · ela continua pela espera crescente com aleatório,
   * que existe justamente porque um deploy derruba todo mundo no mesmo instante.
   */
  onServerGoingAway?: () => void;
  /**
   * A versão do app instalado, pro piso de versão valer **no upgrade também** ·
   * lá o servidor não tem cabeçalho pra ler, então ela vai na query.
   *
   * É assíncrona porque no desktop ela vem do binário · o cliente já espera o
   * bilhete de qualquer forma, então esperar as duas juntas não custa nada. Na
   * web devolve `null` e o parâmetro não é escrito.
   */
  clientVersion?: () => Promise<string | null>;
};

/**
 * **A espera cresce e tem aleatório**, e o aleatório é o que importa aqui: um
 * deploy derruba todo mundo no mesmo instante, e sem ele quinhentos clientes
 * voltam juntos contra 0,25 vCPU. É estampida marcada na agenda.
 */
const BACKOFF_MS = [500, 1_000, 2_000, 5_000, 10_000, 30_000];
const JITTER = 0.3;

/**
 * Quanto silêncio até desconfiar. O servidor anuncia o próprio intervalo no
 * `ready`, e a margem é de **duas rodadas e um pouco** · uma só transformaria
 * atraso de rede em reconexão.
 */
const SILENCE_FACTOR = 2.5;

/**
 * `policy violation` · o código com que o servidor fecha a conexão de uma conta
 * suspensa. **O número é combinado entre os dois lados** e está escrito no
 * `dropAccount`, do lado de lá.
 */
const REVOKED_CODE = 1008;

/**
 * `going away` · o código com que o `closeRealtimeHub` fecha tudo no `SIGTERM`,
 * ou seja **o servidor está sendo substituído**. Como o 1008, ele é combinado
 * entre os dois lados e está escrito lá também.
 *
 * **Ele não muda o caminho de reconexão**, e essa distinção importa: a espera
 * crescente com aleatório existe porque um deploy derruba todo mundo junto, e
 * voltar na hora seria a estampida que ela evita. O que ele faz é avisar quem
 * quer saber que houve deploy.
 */
const GOING_AWAY_CODE = 1001;

/**
 * O que o servidor manda, **normalizado na leitura**.
 *
 * No fio o campo é sempre `type`, e o tipo de um evento de domínio é o nome dele
 * (`club.squad`). Aqui isso vira `frame: 'event'` com o `type` dentro · sem essa
 * tradução, a união teria um membro `{ type: string }` que engole todos os
 * outros e o TypeScript deixa de distinguir um `ready` de um evento qualquer.
 */
type ServerFrame =
  | { frame: 'ready'; heartbeatMs: number }
  | { frame: 'ping' }
  | { frame: 'subbed'; topic: string; seq: number }
  | { frame: 'unsubbed'; topic: string }
  | { frame: 'denied'; topic: string }
  | { frame: 'event'; topic: string; type: string; seq: number; data?: Record<string, unknown> };

/**
 * O que a tela recebe.
 *
 * **Ela quase nunca precisa saber qual evento foi**, e é isso que o desenho
 * magro compra: `changed` significa *refaça a sua busca*, e o `type` está ali
 * pra quem um dia quiser distinguir sem precisar de outro canal.
 *
 * **`resync` é a mesma ordem com outro motivo** · a tela perdeu evento (buraco
 * na sequência, ou reconexão depois de um tempo fora) e o estado dela pode estar
 * velho. Quem recebe faz a mesma coisa: busca de novo.
 */
export type TopicEvent =
  | {
      kind: 'changed';
      type: string;
      seq: number;
      /**
       * **Quase sempre ausente, e é assim que tem que ser** · o evento magro é
       * a regra, e ele não carrega nada.
       *
       * A **notificação é a exceção do produto inteiro**: o balão do desktop
       * precisa do texto, e buscá-lo por notificação multiplicaria a consulta
       * pelo número de conectados. Quem consome valida o formato com o schema
       * de `@ggclubs/schemas` · aqui ele passa cru de propósito, pra o cliente
       * não conhecer nenhum tipo de evento.
       */
      data?: Record<string, unknown>;
    }
  | { kind: 'resync'; reason: 'gap' | 'reconnected' | 'subscribed' };

type TopicListener = (event: TopicEvent) => void;

type TopicState = {
  listeners: Set<TopicListener>;
  /** O último `seq` visto · `null` enquanto o servidor não confirmou a inscrição. */
  seq: number | null;
  /** Recusado pelo servidor · não se pede de novo, nem na reconexão. */
  denied: boolean;
  /**
   * Quem assina este tópico quer ser avisado **quando a inscrição fica pronta**
   * · ver o `subbed`. Vale pra tela que não pode perder um evento publicado
   * entre a busca dela e a inscrição.
   */
  syncOnSubscribe: boolean;
};

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatMs = 25_000;
  /** Ligado enquanto alguém quer conexão · `stop()` desliga pra sempre. */
  private wanted = false;
  /** Uma abertura em andamento · ver o comentário do `connect`. */
  private connecting = false;
  private state: RealtimeState = 'closed';
  private readonly topics = new Map<string, TopicState>();

  constructor(private readonly options: RealtimeOptions) {}

  start(): void {
    if (this.wanted) return;
    this.wanted = true;
    void this.connect();
  }

  /**
   * **Fecha e não volta.** É o que o logout e a troca de conta chamam · e é o
   * caso mais grave dos quatro de sessão do `docs/produto.md`, porque a conexão
   * continua **saudável** entregando dado da conta anterior numa tela que já
   * mostra outra pessoa.
   */
  stop(): void {
    this.wanted = false;
    this.clearTimers();
    this.attempt = 0;
    const ws = this.ws;
    this.ws = null;
    // 1000 é saída limpa · o servidor não precisa saber por que, e o cliente
    // não vai tentar de novo.
    ws?.close(1000, 'client-stop');
    this.setState('closed');
  }

  private setState(state: RealtimeState): void {
    if (this.state === state) return;
    this.state = state;
    this.options.onState?.(state);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.reconnectTimer = null;
    this.silenceTimer = null;
  }

  private async connect(): Promise<void> {
    /**
     * **O `connecting` é a trava, e o `this.ws` sozinho não era.**
     *
     * Entre esta linha e a criação do socket existe um `await` (o bilhete), e
     * `this.ws` só é preenchido **depois** dele · duas chamadas no mesmo instante
     * passavam as duas e abriam **duas conexões**. Acontece de verdade: `online`
     * e `visibilitychange` disparam juntos quando a máquina volta a dormir.
     *
     * **O estrago não é só a conexão a mais** · a órfã continua respondendo
     * `pong` e **rearmando o relógio do silêncio**, então a principal morrer
     * deixa de ser detectável. E ela ainda ocupa uma das cinco vagas da conta.
     */
    if (!this.wanted || this.ws || this.connecting) return;
    this.connecting = true;
    this.setState('connecting');

    let ticket: string;
    let version: string | null;
    try {
      [ticket, version] = await Promise.all([
        this.options.requestTicket(),
        this.options.clientVersion?.() ?? Promise.resolve(null),
      ]);
    } catch {
      // **Falhar aqui é normal**, não excepcional: sessão que acabou de expirar,
      // rede caindo, API reiniciando. Volta pela mesma espera crescente.
      this.connecting = false;
      this.scheduleReconnect();
      return;
    }
    // A sessão pode ter sido desligada enquanto o bilhete vinha · sem isto, um
    // logout no meio do caminho abriria a conexão logo depois de fechá-la.
    if (!this.wanted) {
      this.connecting = false;
      return;
    }

    const query = `?t=${encodeURIComponent(ticket)}${version ? `&v=${encodeURIComponent(version)}` : ''}`;
    const ws = new WebSocket(`${this.options.url}${query}`);
    this.ws = ws;
    this.connecting = false;

    ws.onopen = () => {
      this.attempt = 0;
      this.setState('open');
      this.armSilenceTimer();
      /**
       * **O servidor não lembra de nada** · a inscrição vive na conexão, então
       * reconectar é reassinar tudo.
       *
       * **Inclusive o que foi recusado**, e isto mudou em 12/08/2026: a recusa
       * também é um retrato, do mesmo jeito que a autorização é. Quem pediu pra
       * entrar num club e foi aceito **enquanto estava fora** voltava mudo, com
       * a tela aberta e o direito na mão. O medo antigo era laço · não é o caso,
       * porque isto acontece uma vez **por conexão nova**, e o número de tópicos
       * que o aplicativo tenta é o punhado de clubs da pessoa.
       */
      for (const [topic, state] of this.topics) {
        state.denied = false;
        this.send({ type: 'sub', topic });
      }
    };

    ws.onmessage = (event) => {
      this.armSilenceTimer();
      const frame = parse(event.data);
      if (!frame) return;
      if (frame.frame === 'ready') {
        this.heartbeatMs = frame.heartbeatMs;
        this.armSilenceTimer();
        return;
      }
      if (frame.frame === 'ping') {
        ws.send('pong');
        return;
      }
      this.handleTopicFrame(frame);
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.setState('closed');

      /**
       * **1008 é "acabou pra você", e não "a rede caiu"** · é o código que o
       * `dropAccount` usa ao suspender uma conta. Insistir seria laço contra uma
       * rota que exige conta ativa pra dar bilhete, e o pior: a tela ficaria
       * mostrando dado velho sem sinal nenhum.
       *
       * **Quem decide o que fazer é o aplicativo** · aqui só se para de tentar.
       */
      if (event?.code === REVOKED_CODE) {
        this.wanted = false;
        this.clearTimers();
        this.options.onRevoked?.();
        return;
      }

      // **Deploy da API** · segue reconectando como qualquer queda, e só conta
      // a quem quiser saber. Ver `GOING_AWAY_CODE`.
      if (event?.code === GOING_AWAY_CODE) this.options.onServerGoingAway?.();

      this.scheduleReconnect();
    };

    // `onerror` sempre vem seguido de `onclose` · reconectar aqui daria duas
    // tentativas pro mesmo desligamento.
    ws.onerror = () => {};
  }

  /**
   * Assina um tópico enquanto alguém estiver ouvindo.
   *
   * **Vários ouvintes dividem uma inscrição** · duas telas olhando o mesmo club
   * não pedem duas vezes, e a inscrição só sai quando o último deles vai embora.
   * Devolve a função de cancelar.
   */
  subscribe(
    topic: string,
    listener: TopicListener,
    options: { syncOnSubscribe?: boolean } = {},
  ): () => void {
    let state = this.topics.get(topic);
    if (!state) {
      state = {
        listeners: new Set(),
        seq: null,
        denied: false,
        syncOnSubscribe: options.syncOnSubscribe ?? false,
      };
      this.topics.set(topic, state);
      this.send({ type: 'sub', topic });
    }
    // **Um pedindo basta** · dois consumidores do mesmo tópico, e o que precisa
    // do aviso manda.
    if (options.syncOnSubscribe) state.syncOnSubscribe = true;
    state.listeners.add(listener);

    return () => {
      const current = this.topics.get(topic);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size > 0) return;
      this.topics.delete(topic);
      this.send({ type: 'unsub', topic });
    };
  }

  /**
   * O que chega num tópico · **e é aqui que o buraco vira ordem de refazer.**
   *
   * A tela fez o `GET` e recebeu a sequência do momento; a partir daí, cada
   * evento tem que ser o próximo número. **Qualquer salto significa que ela
   * perdeu alguma coisa**, e a resposta é a mesma do `snapshot`: buscar de novo.
   * É a retomada do SSE na versão que cabe aqui, sem buffer no servidor.
   */
  private handleTopicFrame(
    frame: Extract<ServerFrame, { topic: string }>,
  ): void {
    const state = this.topics.get(frame.topic);
    if (!state) return;

    if (frame.frame === 'denied') {
      // **Não insiste sozinho** · a resposta não muda até o direito mudar, e
      // insistir por conta própria seria laço contra o banco. Quem sabe que o
      // direito pode ter mudado é o aplicativo, e ele chama o `retryDenied`.
      state.denied = true;
      return;
    }
    /**
     * **O servidor cortou este tópico** · quem foi tirado do elenco, ou o club
     * que acabou. A inscrição local **continua existindo** de propósito: a tela
     * ainda está aberta, e se o vínculo voltar (foi tirado por engano e chamado
     * de novo) o `retryDenied` a traz de volta sem remontar nada.
     */
    if (frame.frame === 'unsubbed') {
      state.denied = true;
      return;
    }

    if (frame.frame === 'subbed') {
      /**
       * **Reassinar depois de uma queda é onde o buraco aparece de verdade.**
       * Se o tópico andou enquanto a conexão estava fora, o número volta
       * diferente do último que a tela viu · e ela precisa refazer a busca.
       *
       * **É `!==` e não `>`, e a diferença é o dia do deploy** · a sequência
       * vive na memória do processo, então subir uma versão **zera todas** · o
       * número volta **menor**, que com `>` não era buraco nenhum e a tela ficava
       * com dado velho em silêncio. E deploy é a causa mais comum de reconexão
       * que existe aqui, porque `scale: 1` derruba todo mundo junto.
       */
      const missed = state.seq !== null && frame.seq !== state.seq;
      const first = state.seq === null;
      state.seq = frame.seq;
      if (missed) emit(state, { kind: 'resync', reason: 'reconnected' });
      /**
       * **A PRIMEIRA inscrição também é um buraco**, e ele é silencioso.
       *
       * A tela busca no `mount` e assina logo depois · a inscrição leva o tempo
       * de uma pergunta ao banco (medido em **600ms a 1,1s** contra o Atlas), e
       * **o que for publicado nesse intervalo não chega em lugar nenhum**: o
       * evento passa antes de existir inscrito, e a tela não tem polling quando
       * o canal está vivo. Ela fica com dado velho **para sempre**, até alguém
       * reabrir.
       *
       * Achado em 27/08/2026 dirigindo a sala do confronto: a mensagem do club
       * não aparecia pra organização, e o quadro **não tinha sido perdido pelo
       * servidor** · ele foi publicado antes de a sala assinar.
       *
       * **Só avisa quem pede** (`syncOnSubscribe`) · pra todo mundo isto seria
       * uma busca a mais em cada montagem, e a maioria das telas não perde nada
       * se ficar um instante sem o evento.
       */
      if (first && state.syncOnSubscribe) emit(state, { kind: 'resync', reason: 'subscribed' });
      return;
    }

    // Evento antes de o servidor confirmar a inscrição · sem base de comparação,
    // o certo é aceitar e começar a contar dali.
    if (state.seq === null) {
      state.seq = frame.seq;
      emit(state, { kind: 'changed', type: frame.type, seq: frame.seq, data: frame.data });
      return;
    }
    if (frame.seq <= state.seq) return; // repetido ou fora de ordem · já contado.

    const gap = frame.seq > state.seq + 1;
    state.seq = frame.seq;
    emit(
      state,
      gap
        ? // **O `data` não vai no `resync`, e a ausência é a decisão** · quem
          // perdeu evento não pode remendar o estado com o payload do último,
          // porque ele conta só a última mudança. A ordem é refazer o `GET`.
          { kind: 'resync', reason: 'gap' }
        : { kind: 'changed', type: frame.type, seq: frame.seq, data: frame.data },
    );
  }

  private send(frame: { type: 'sub' | 'unsub'; topic: string }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(frame));
  }

  /**
   * **O vigia do silêncio, e ele existe por uma medição.**
   *
   * O navegador responde ao `ping` de **protocolo** sozinho e **não conta nada
   * ao JavaScript** · a API `WebSocket` só tem `open`, `message`, `error` e
   * `close`. Por isso o heartbeat é de **aplicação**: sem mensagem chegando, o
   * cliente não teria como distinguir "silêncio normal" de "conexão morta", que
   * é o caso do notebook que dormiu.
   */
  private armSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      const ws = this.ws;
      this.ws = null;
      // A conexão já não responde · fechar aqui é o que dispara o caminho de
      // reconexão, e o `onclose` dela não vai mais mexer no estado.
      ws?.close(4000, 'silence');
      this.setState('closed');
      this.scheduleReconnect();
    }, this.heartbeatMs * SILENCE_FACTOR);
  }

  private scheduleReconnect(): void {
    if (!this.wanted || this.reconnectTimer) return;
    const base = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)] ?? 30_000;
    const delay = base * (1 + (Math.random() * 2 - 1) * JITTER);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  /**
   * **Pede de novo o que foi recusado ou cortado** · a outra metade do
   * `dropTopic` do servidor.
   *
   * A autorização de tópico é conferida uma vez, no `sub`, e o servidor já sabe
   * **tirar** quem perdeu o direito. Faltava o caminho inverso: **quem ganha o
   * direito com a tela aberta**. Era o caso de quem pede pra entrar num club e é
   * aceito olhando a página dele · a inscrição tinha sido recusada quando ela
   * era visitante, e nada nunca mais pedia.
   *
   * **Quem chama é o aplicativo, não o cliente** · aqui não se conhece nenhum
   * tipo de evento, e é o `RealtimeProvider` que sabe que `user.membership`
   * significa "seus direitos mudaram". Sem tópico recusado, isto não faz nada.
   */
  retryDenied(): void {
    for (const [topic, state] of this.topics) {
      if (!state.denied) continue;
      state.denied = false;
      // **A sequência volta a zero de conhecimento** · a tela vai refazer a
      // busca de qualquer forma, e comparar com o `seq` de antes da recusa
      // acusaria buraco onde houve ausência de direito.
      state.seq = null;
      this.send({ type: 'sub', topic });
    }
  }

  /**
   * **Volta a tentar agora**, sem esperar a vez da espera crescente.
   *
   * É o que a rede voltando (`online`) e a aba reaparecendo chamam · quem
   * acabou de voltar não deve esperar trinta segundos porque a última
   * tentativa falhou enquanto a máquina dormia.
   */
  retryNow(): void {
    if (!this.wanted || this.ws) return;
    this.clearTimers();
    this.attempt = 0;
    void this.connect();
  }
}

/** Um ouvinte quebrado não pode calar os outros. */
function emit(state: TopicState, event: TopicEvent): void {
  for (const listener of state.listeners) {
    try {
      listener(event);
    } catch {
      /* a tela que quebrou é problema dela */
    }
  }
}

function parse(data: unknown): ServerFrame | null {
  if (typeof data !== 'string') return null;
  try {
    const value = JSON.parse(data) as {
      type?: unknown;
      heartbeatMs?: unknown;
      topic?: unknown;
      seq?: unknown;
      data?: unknown;
    };
    if (value.type === 'ready' && typeof value.heartbeatMs === 'number') {
      return { frame: 'ready', heartbeatMs: value.heartbeatMs };
    }
    if (value.type === 'ping') return { frame: 'ping' };
    // Todo o resto é de tópico, e sem tópico não há o que fazer com ele.
    if (typeof value.type !== 'string' || typeof value.topic !== 'string') return null;
    if (value.type === 'unsubbed') return { frame: 'unsubbed', topic: value.topic };
    if (value.type === 'denied') return { frame: 'denied', topic: value.topic };
    if (typeof value.seq !== 'number') return null;
    if (value.type === 'subbed') return { frame: 'subbed', topic: value.topic, seq: value.seq };
    // **Qualquer outro tipo é evento de domínio** · o cliente não precisa
    // conhecer a lista deles, e é isso que deixa tópico novo não mexer aqui.
    return {
      frame: 'event',
      topic: value.topic,
      type: value.type,
      seq: value.seq,
      // Objeto ou nada · `null` e valor solto não passam, então quem consome
      // nunca precisa se defender de um `data` que não é um mapa.
      ...(isRecord(value.data) ? { data: value.data } : {}),
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `https://api…` vira `wss://api…/realtime` · uma conversão, num lugar só. */
export function realtimeUrl(apiUrl: string): string {
  return `${apiUrl.replace(/^http/, 'ws')}/realtime`;
}
