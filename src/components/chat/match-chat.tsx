import {
  CALL_ADMIN_AGAIN_AFTER_MINUTES,
  CHAT_EVENT,
  matchChatTopic,
  MESSAGE_MAX,
  type ChatMessageView,
  type ChatMode,
  type ChatTypingSignal,
  type MatchChatView,
} from '@ggclubs/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ImageViewer } from '@/components/ui/image-viewer';
import { LoadingState } from '@/components/ui/loading-state';
import { Message, MessageContent, MessageHeader } from '@/components/ui/message';
import {
  MessageScroller,
  useMessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { useChatHeaderSlot } from '@/components/chat/chat-header-slot';
import { UnreadJump } from '@/components/chat/unread-jump';
import { SeenBy } from '@/components/chat/seen-by';
import {
  MessageActions,
  MessageBody,
  Reactions,
  Shot,
  Tombstone,
} from '@/components/chat/chat-message';
import { AppInviteNote } from '@/components/chat/app-invite-note';
import { ChatComposer } from '@/components/chat/chat-composer';
import { closedText, timeOf } from '@/components/chat/chat-format';
import { useTypingSignal } from '@/components/chat/use-typing-signal';
import { useImagePicker } from '@/lib/use-image-picker';
import { api } from '@/lib/api';
import { decideAppInvite, dismissAppInvite, noteAppInviteShown } from '@/lib/app-invite';
import { apiErrorMessage } from '@/lib/api-error';
import { relativeTime } from '@/lib/relative-time';
import { useMyChats } from '@/lib/use-my-chats';
import { useRealtimeConnected, useRealtimeTopic } from '@/lib/realtime/use-realtime-topic';
import { cn } from '@/lib/utils';

/**
 * **A sala do confronto** · os dois clubs conversando.
 *
 * **A atualização é por polling de 10s, e isso não é remendo** · é o caminho
 * degradado permanente. Quando o tempo real entrar (fatia 3) ele desliga
 * sozinho, e o que sobra é a rede de segurança pro dia em que o canal cair no
 * meio do campeonato · aí "a mensagem não chegou" vira "a mensagem chegou em
 * 10s".
 *
 * **A rolagem é do `MessageScroller`** · grudar na base, soltar quando a pessoa
 * sobe, e preservar a posição ao carregar histórico. Ver o comentário lá.
 */
const POLL_MS = 10_000;

/**
 * **O relógio do "visto por"**, e ele só corre enquanto há resposta esperada.
 *
 * A leitura do outro lado não gera evento no canal · sem isto o "visto" só
 * apareceria ao reabrir a sala, que é onde ninguém está olhando.
 */
const SEEN_POLL_MS = 30_000;

/**
 * **O relógio do chamado em aberto**, e ele existe porque a sala parada não
 * repinta sozinha.
 *
 * *"chamada há 12 min"* e o botão de insistir são calculados **no render**, e
 * com o canal vivo o `POLL_MS` está desligado e o `SEEN_POLL_MS` só corre
 * enquanto há mensagem minha sem visto. Numa sala em que ninguém falou mais ·
 * que é **exatamente** o caso de quem chamou e está esperando · não havia
 * re-render nenhum: o texto congelava e o *"Chamar de novo"* nunca aparecia,
 * nem aos 5 minutos nem aos 20.
 *
 * **Ele para sozinho** quando a trava vence · o botão já está na tela, e não há
 * mais nada que o tempo mude ali.
 */
const CALL_CLOCK_MS = 30_000;

/** A última mensagem de um club de quem está lendo · é ela que leva o "visto". */
function lastMineIdOf(chat: MatchChatView): string | undefined {
  const mine = new Set(chat.myClubTags);
  return [...chat.messages]
    .reverse()
    .find((one) => one.authorClubTag && mine.has(one.authorClubTag) && !one.systemKind)?._id;
}

/** Alguém do OUTRO club já viu esta mensagem · o colega do meu lado não conta. */
function someoneElseSaw(chat: MatchChatView, messageId: string | undefined): boolean {
  if (!messageId) return false;
  const message = chat.messages.find((one) => one._id === messageId);
  if (!message) return false;
  const mine = new Set(chat.myClubTags);
  const at = (value: Date | string) => new Date(value).getTime();
  return chat.readers.some(
    (one) => !mine.has(one.clubTag) && at(one.readAt) >= at(message.createdAt),
  );
}

/** As ações da sala que vão ao servidor · o apagar tem marca própria. */
type RoomAction = 'lock' | 'callAdmin';

export function MatchChat({
  matchId,
  matchStatus,
  onUnread,
  as,
}: {
  matchId: string;
  matchStatus?: string;
  onUnread?: (n: number) => void;
  /** Por qual papel a sala foi aberta · ver o `MatchChatDialog`. */
  as?: ChatMode;
}) {
  // O provider precisa envolver quem usa o hook · daí o corpo ser um filho.
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <ChatBody matchId={matchId} matchStatus={matchStatus} onUnread={onUnread} as={as} />
    </MessageScrollerProvider>
  );
}

function ChatBody({
  matchId,
  matchStatus,
  onUnread,
  as,
}: {
  matchId: string;
  matchStatus?: string;
  onUnread?: (n: number) => void;
  as?: ChatMode;
}) {
  const { t } = useTranslation();
  /**
   * **Por qual papel a pessoa entrou nesta sala** · decisão do Eduardo em
   * 28/08/2026: *"pelo `/app/campeonatos` vê como um jogador normal; pelo
   * `/admin/campeonatos` usa os privilégios de admin apenas"*.
   *
   * A mesma conta pode ser a organização **e** um dos dois clubs, e quem
   * escolhe é **de onde a sala foi aberta**. Quem confere que ela é mesmo da
   * organização é o servidor · isto aqui só declara a intenção.
   *
   * > **A primeira versão lia o `pathname` daqui, e ele recusou** · *"acho feio
   * > de fato pegar pelo pathname"*. E a recusa é de arquitetura, não de gosto:
   * > lendo a URL, o componente passa a saber **onde ele está montado**, que é
   * > conhecimento de quem o monta. Hoje é uma prop, ela aparece na chamada, e
   * > a sala funciona igual dentro de qualquer moldura futura.
   *
   * **Omitido é `club`**, o papel mais fraco · quem não declara nada não ganha
   * nada.
   */
  const mode: ChatMode = as ?? 'club';

  const [chat, setChat] = useState<MatchChatView | null>(null);
  /**
   * **O convite pro app, ancorado na última mensagem que a pessoa perdeu** ·
   * decidido na primeira carga da sala (ver `lib/app-invite.ts`). A nota vive
   * enquanto aquela mensagem for a última: chegou outra, a conversa está viva e
   * o momento passou.
   *
   * **O `matchId` mora no estado** porque o diálogo troca de partida sem
   * remontar · um convite decidido pra sala anterior não pode aparecer na
   * seguinte, e a conferência é uma só, no render.
   */
  const [invite, setInvite] = useState<{
    matchId: string;
    anchorId: string;
    count: number;
  } | null>(null);
  /**
   * Qual âncora já foi contada como exibição · o efeito que conta roda de novo
   * a cada render em que a nota está na lista, e em desenvolvimento o
   * `StrictMode` o executa duas vezes na montagem.
   */
  const inviteCountedFor = useRef<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  /** Qual mensagem espera confirmação · apagar não tem desfazer. */
  const [removing, setRemoving] = useState<ChatMessageView | null>(null);
  /** Quais mensagens estão indo pro servidor pra virar lápide. */
  const [pending, setPending] = useState<Set<string>>(new Set());
  /** A ação da sala que está no ar · trava as duas, porque o estado é um só. */
  const [working, setWorking] = useState<RoomAction | null>(null);
  /**
   * **O print** · a mesma faixa `match_shot` da súmula, e o mesmo `picker`.
   *
   * A conversa existe pra resolver disputa, e o que resolve disputa é a súmula
   * na tela do jogo · sem anexo o club descreve o placar com palavras e a
   * organização decide no escuro.
   */
  const picker = useImagePicker('match_shot');
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const headerSlot = useChatHeaderSlot();
  const composer = useRef<HTMLTextAreaElement>(null);
  /** As minhas tags, sem entrar nas dependências do ouvinte do canal. */
  const mineRef = useRef<Set<string>>(new Set());
  const { scrollToEnd } = useMessageScroller();
  /**
   * **A conexão de verdade, e não "existe provider aqui"** · conserto de
   * 28/08/2026.
   *
   * Isto era `useHasRealtime()`, que responde sobre a **montagem** e é sempre
   * verdadeiro dentro do `/app` · então o polling de 10s logo abaixo **nunca
   * ligava**, e a promessa escrita nele (*"o WebSocket cai, a mensagem chega em
   * 10s"*) não acontecia. Com a conexão morta de vez, a sala ficava muda até
   * alguém fechar e reabrir.
   */
  const live = useRealtimeConnected();
  /**
   * **Abrir a sala marca leitura, e a bandeja precisa saber disso** · conserto
   * de 28/08/2026 (noite), achado pelo Eduardo: *"cliquei aqui e ele não saiu o
   * verdinho em si (só depois do F5)"*.
   *
   * **E era regressão da mesma noite** · a bandeja passou a andar pelo canal, e
   * **marcar leitura não publica evento nenhum** · o número dela só se
   * corrigia no tique de rede de 60s (antes eram os 10s do polling). Quem sabe
   * que a sala foi lida é esta tela, então é ela que avisa.
   *
   * **Sem provider isto é um `no-op`** · o `MyChatsContext` nasce com um
   * `reload` vazio, e a mesa do `/admin` monta a sala fora da casca do `/app`.
   */
  const { reload: reloadTray } = useMyChats();
  /**
   * **As duas pontas do "está digitando"** · o que a gente manda e o que a
   * gente mostra. Saiu daqui em 01/09/2026 · ver o `use-typing-signal.ts`.
   */
  const { typing, noteTyping, forget: forgetTyping, onLocalTyping } = useTypingSignal(matchId);

  /**
   * **A mensagem chega pelo canal, e o `data` já é a mensagem** · o evento é
   * gordo (ver o `CHAT_EVENT`), então não há um `GET` por mensagem recebida.
   *
   * **O dedupe é por `_id`** e não por ordem: quem escreveu já pôs a própria
   * mensagem na lista pela resposta do `POST`, e o evento chega pra ele
   * também.
   */
  useRealtimeTopic(matchChatTopic(matchId), (event) => {
    if (event.kind === 'changed' && event.type === CHAT_EVENT.typing) {
      const signal = event.data as ChatTypingSignal | undefined;
      // **O meu próprio sinal volta pra mim** · o tópico é um só.
      if (signal?.by && !mineRef.current.has(signal.by)) noteTyping(signal);
      return;
    }
    /**
     * **A janela mudou por fora da sala** · hoje é a edição encerrando, que faz
     * esta conversa passar a avisar que fecha em 6 horas.
     *
     * **Ele é declarado, e não cai no ramo genérico de baixo** · o
     * `scan:realtime` pergunta quem **ouve cada tipo**, e recarregar por
     * descarte não conta como ouvir · o evento apareceria pra ele como
     * publicado e sem dono. Escrever o caso aqui é o que faz o check enxergar
     * este caminho no dia em que alguém mexer nele.
     */
    if (event.kind === 'changed' && event.type === CHAT_EVENT.window) {
      void load();
      return;
    }
    if (event.kind !== 'changed' || event.type !== CHAT_EVENT.message) {
      // Reconexão perdeu evento · a página seguinte do `GET` recupera.
      void load();
      return;
    }
    const arrived = event.data as ChatMessageView | undefined;
    if (!arrived?._id) return;
    // Mensagem chegando encerra o "está digitando" antes do relógio.
    forgetTyping();
    /**
     * **Linha de sistema muda o ESTADO, e não só a lista** · trancar publica
     * uma mensagem, mas o que a pessoa precisa ver é o campo de escrever sumir
     * com o motivo certo. Sem isto a sala do club continuava dizendo "o tempo
     * passou" depois de a organização ter trancado · visto dirigindo a tela.
     */
    if (arrived.systemKind) {
      void load();
      return;
    }
    /**
     * **Substitui por `_id`, e não só acrescenta** · o mesmo evento leva a
     * mensagem nova **e** a que acabou de virar lápide. É também o que vai
     * servir a reação, se ela existir um dia.
     */
    setChat((current) => {
      if (!current) return current;
      const known = current.messages.some((m) => m._id === arrived._id);
      return {
        ...current,
        messages: known
          ? current.messages.map((m) => (m._id === arrived._id ? keepMyReactions(m, arrived) : m))
          : [...current.messages, arrived],
      };
    });
    /**
     * **A sala busca e só então assina** · o que for publicado nesse intervalo
     * passa sem inscrito, e sem polling ela ficaria com dado velho pra sempre.
     * O `syncOnSubscribe` fecha essa corrida com um `resync` quando a inscrição
     * fica pronta · achado dirigindo a tela em 27/08/2026.
     */
  }, { syncOnSubscribe: true });

  /**
   * **A caixa crescendo encolhe a lista, e a última mensagem ficava cortada.**
   *
   * O scroller re-ancora quando chega conteúdo, e **não** quando o viewport
   * muda de altura · medido em 27/08: com dez linhas digitadas a conversa
   * ficava com meia bolha visível e o botão de "ir pro fim" acendia sozinho.
   */
  useEffect(() => {
    const area = composer.current;
    if (!area || typeof ResizeObserver === 'undefined') return;
    // **Depois do quadro** · a lista só tem a altura nova no layout seguinte, e
    // rolar antes disso não encontra o fim que vai existir.
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => scrollToEnd({ behavior: 'auto' }));
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [scrollToEnd]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const { chat: fresh } = await api.matchChat(matchId, null, { signal }, mode);
        setChat((current) => {
          // **Não sobrescreve o histórico que já foi carregado pra trás** · o
          // polling traz a última página, e a pessoa pode ter subido três.
          if (!current || current.messages.length <= fresh.messages.length) return fresh;
          const known = new Set(current.messages.map((m) => m._id));
          const arrived = fresh.messages.filter((m) => !known.has(m._id));
          return { ...fresh, messages: [...current.messages, ...arrived], hasMore: current.hasMore };
        });
        // **Antes da marcação de leitura chegar aqui como zero** · o `unread`
        // desta resposta é o de antes de abrir, e é ele que prova a ausência.
        // Nas cargas seguintes ele já é zero e a decisão é não · e uma sala que
        // já tem convite decidido não é re-ancorada.
        const last = fresh.messages.at(-1);
        if (last && decideAppInvite({ unread: fresh.unread, lastMessageAt: last.createdAt })) {
          setInvite((current) =>
            current?.matchId === matchId
              ? current
              : { matchId, anchorId: last._id, count: fresh.unread },
          );
        }
        onUnread?.(0);
        /**
         * **A bandeja recarrega junto, e só quando havia o que ler** · é a
         * mesma guarda que o servidor usa pra publicar o `user.chatRead`, e o
         * `unread` que chega aqui é o de **antes** da marcação.
         *
         * **Sem a guarda isto custava duas requisições por leitura e uma por
         * tique**: o evento do servidor volta pra esta aba também (o tópico é
         * `user:{id}`, e o `publish` não exclui quem originou), e este `load`
         * roda no polling, no relógio do "visto por" e depois de toda ação da
         * sala · momentos em que leitura nenhuma aconteceu.
         *
         * **Ele continua existindo** porque é o caminho de quando o canal está
         * caído · aí o evento não chega, e a bandeja precisaria esperar a rede
         * de 60s.
         */
        if (fresh.unread > 0) reloadTray();
        setFailure(null);
      } catch (error) {
        if (signal?.aborted) return;
        setFailure(apiErrorMessage(error, t));
      }
    },
    // O `mode` entra aqui porque a busca leva ele · sem a dependência, o
    // callback congela o papel da primeira montagem e o polling reexecuta com
    // ele. Era aviso de lint, e o lint estava certo.
    [matchId, mode, onUnread, reloadTray, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    /**
     * **O polling desliga quando o canal está vivo, e continua existindo** ·
     * ele não é remendo: é o caminho degradado permanente. No dia em que o
     * WebSocket cair no meio do campeonato, "a mensagem não chegou" vira "a
     * mensagem chegou em 10s".
     */
    const timer = live ? null : setInterval(() => void load(), POLL_MS);
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [load, live, matchStatus]);

  /**
   * **O "visto por" precisa de um relógio próprio quando o canal está vivo.**
   *
   * A leitura do outro lado **não gera evento** · o `readers` só chega dentro de
   * um `GET` completo, e com o canal de pé o polling de 10s está desligado. O
   * efeito era a funcionalidade **não funcionar no ambiente normal**: quem
   * mandasse mensagem só veria o "visto" ao fechar e reabrir a sala. Achado pelo
   * `revisor` em 28/08/2026.
   *
   * **Publicar um evento de leitura seria o certo e é caro demais pro que
   * entrega:** cada abertura de sala viraria uma publicação no tópico, pra mover
   * uma linha de onze pixels. Um `GET` a cada 30 segundos **enquanto há
   * mensagem minha esperando confirmação** custa menos e responde igual.
   *
   * **Ele para sozinho** quando alguém do outro lado vê · a condição some, e o
   * efeito com ela.
   */
  const waitingForSeen = Boolean(
    live &&
      chat?.messages.length &&
      lastMineIdOf(chat) &&
      !someoneElseSaw(chat, lastMineIdOf(chat)),
  );
  useEffect(() => {
    if (!waitingForSeen) return;
    const timer = setInterval(() => void load(), SEEN_POLL_MS);
    return () => clearInterval(timer);
  }, [waitingForSeen, load]);

  /**
   * **A nota está na lista?** · é desta sala, e a mensagem que a ancora ainda
   * é a última. É a única conferência, e é ela que conta a exibição: a cota é
   * de **nota vista**, e não de decisão tomada.
   */
  const inviteVisible =
    invite !== null &&
    invite.matchId === matchId &&
    chat?.messages.at(-1)?._id === invite.anchorId;
  useEffect(() => {
    if (!inviteVisible || !invite || inviteCountedFor.current === invite.anchorId) return;
    inviteCountedFor.current = invite.anchorId;
    noteAppInviteShown();
  }, [inviteVisible, invite]);
  const closeInvite = useCallback(() => {
    dismissAppInvite();
    setInvite(null);
  }, []);

  /**
   * **Quando o chamado em aberto foi feito** · e o relógio que faz ele andar.
   *
   * Ele mora aqui em cima, e não junto do botão, porque **hook não pode nascer
   * depois do `return` de carregamento** · o resto do desenho está no
   * `CALL_CLOCK_MS`.
   *
   * **A dependência é o número, e não a data** · o campo chega como texto do
   * `JSON`, mas quem o tipa é um `Date` · comparar o valor cru faria o efeito
   * reiniciar a cada `load()` no dia em que alguém parseasse a resposta.
   *
   * **A trava é a mesma do servidor, e quem decide continua sendo ele** · aqui
   * ela só evita oferecer um botão que seria recusado.
   */
  const calledAtMs =
    chat?.adminCalled && chat.adminCalledAt ? new Date(chat.adminCalledAt).getTime() : null;
  const [clock, setClock] = useState(() => Date.now());
  /** Quanto falta pra trava vencer · `0` quando ela já venceu. */
  const waitLeftMs =
    calledAtMs === null
      ? 0
      : Math.max(0, calledAtMs + CALL_ADMIN_AGAIN_AFTER_MINUTES * 60_000 - clock);
  const canCallAgain = calledAtMs !== null && waitLeftMs === 0;
  /**
   * **O relógio se reagenda por dentro, e o efeito depende de UMA coisa só.**
   *
   * **Este efeito já entrou em laço infinito** · *"Maximum update depth
   * exceeded"*, 29/08/2026, e o Eduardo leu no terminal dele. A causa foi eu
   * pôr `clock` nas dependências **e** chamar `setClock` no corpo: cada tique
   * mudava o estado, o estado re-rodava o efeito, e o efeito tocava de novo.
   * **É o laço que o `react-hooks/exhaustive-deps` não pega**, porque a lista
   * estava tecnicamente correta.
   *
   * Hoje quem se repete é o `tick`, por dentro · o efeito nasce e morre com o
   * `calledAtMs`, e o `clock` sai da conta.
   *
   * **O último tique cai na hora exata da virada** · e não no múltiplo de 30s
   * seguinte. A janela existia e foi medida: com intervalo fixo, o botão nascia
   * até **meio minuto depois** de a trava vencer. Enquanto havia uma contagem
   * regressiva na tela isso era uma contradição visível; a contagem saiu · *"não
   * precisa desse texto né?"* · **e o atraso continuaria de pé sem isto**, agora
   * calado, que é pior.
   *
   * **Ele para sozinho** quando a trava vence · não há mais nada que o tempo
   * mude ali.
   */
  useEffect(() => {
    if (calledAtMs === null) return;
    const target = calledAtMs + CALL_ADMIN_AGAIN_AFTER_MINUTES * 60_000;
    // Acerta ao entrar · o `clock` nasce na montagem, e uma sala aberta há uma
    // hora entraria no chamado novo com um retrato velho.
    setClock(Date.now());
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const left = target - Date.now();
      if (left <= 0) return;
      timer = setTimeout(() => {
        setClock(Date.now());
        schedule();
      }, Math.max(250, Math.min(CALL_CLOCK_MS, left)));
    };
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [calledAtMs]);

  /**
   * **O fim da cortesia se busca de novo, e não se espera** · 30/08/2026, a
   * outra metade da pergunta do Eduardo sobre as 6 horas.
   *
   * O evento resolve o **começo** da janela (a edição encerrando avisa a sala
   * pelo `chat.window`), e o **fim** não tem evento nenhum: ele é só o relógio
   * chegando na hora. Sem isto a sala ficaria oferecendo o campo de escrever
   * com o servidor já recusando · a tela mentindo, que é pior que a tela
   * fechada.
   *
   * **Ele acorda no instante exato**, como o relógio do chamado · e a
   * dependência é o número, não a data, pelo mesmo motivo de lá. **Não repete**:
   * uma busca na virada basta, porque depois dela o `closedReason` já é
   * `tournamentOver` e o efeito sai de cena.
   */
  const closingAtMs =
    chat?.closedReason === 'tournamentEnding' && chat.writeClosesAt
      ? new Date(chat.writeClosesAt).getTime()
      : null;
  useEffect(() => {
    if (closingAtMs === null) return;
    const left = closingAtMs - Date.now();
    if (left <= 0) return;
    const timer = setTimeout(() => void load(), left + 1_000);
    return () => clearTimeout(timer);
  }, [closingAtMs, load]);

  async function loadOlder() {
    const oldest = chat?.messages[0]?._id;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const { chat: older } = await api.matchChat(matchId, oldest, undefined, mode);
      setChat((current) =>
        current
          ? { ...current, messages: [...older.messages, ...current.messages], hasMore: older.hasMore }
          : older,
      );
    } catch (error) {
      setFailure(apiErrorMessage(error, t));
    } finally {
      setLoadingOlder(false);
    }
  }

  /**
   * **A lápide aparece antes da resposta do servidor** · apagar é a única ação
   * da sala em que a pessoa fica olhando pro que ela quer que suma, e a volta
   * ao servidor lia como travamento · apontado pelo Eduardo em 27/08/2026.
   *
   * **O que se pinta é a lápide, e não o sumiço** · o desenho já diz que a
   * mensagem fica, então a tela pode antecipar o estado final inteiro. Se o
   * servidor recusar, o `load()` do `catch` devolve a verdade dele.
   */
  /**
   * **Reagir responde na hora** · a mesma regra do apagar, e aqui ela pesa
   * mais: um 👍 é a confirmação de um combinado, e confirmação que demora meio
   * segundo faz a pessoa clicar de novo · e o segundo clique **desfaz**.
   *
   * Aqui a tela pinta o estado final direto (e não um "reagindo"): reação é
   * reversível com o mesmo botão, então errar custa um clique · o oposto do
   * apagar, que não tem volta.
   */
  async function react(messageId: string, emoji: string) {
    setChat((current) =>
      current
        ? {
            ...current,
            messages: current.messages.map((one) =>
              one._id === messageId ? { ...one, reactions: toggled(one.reactions, emoji) } : one,
            ),
          }
        : current,
    );
    try {
      await api.reactToChatMessage(matchId, messageId, emoji, mode);
    } catch (error) {
      setFailure(apiErrorMessage(error, t));
      await load();
    }
  }

  async function remove(messageId: string) {
    /**
     * **Primeiro "apagando", depois "apagada"** · a tela responde na hora e
     * ainda assim não mente. Pintar a lápide antes da resposta afirmaria um
     * desfecho que o servidor ainda pode recusar · e não fazer nada lia como
     * travamento. As duas metades são pedido do Eduardo em 27/08/2026.
     */
    setPending((current) => new Set(current).add(messageId));
    try {
      await api.deleteChatMessage(matchId, messageId, mode);
      await load();
    } catch (error) {
      setFailure(apiErrorMessage(error, t));
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(messageId);
        return next;
      });
    }
  }

  /**
   * **Toda ação da sala responde na hora e confirma depois** · a regra que
   * nasceu no apagar, aplicada onde ela faltava · pedido do Eduardo em
   * 27/08/2026.
   *
   * O botão da tranca não mudava nada até o servidor voltar, então trancar uma
   * sala lia como clique que não pegou · e a reação de quem está moderando uma
   * discussão é clicar de novo.
   *
   * **Uma função pra as duas ações, e não a mesma lógica escrita duas vezes** ·
   * a terceira cópia é onde elas divergem. O apagar tem a **sua** marca porque
   * é por mensagem, e duas podem estar sumindo ao mesmo tempo.
   */
  async function act(what: RoomAction, run: () => Promise<unknown>) {
    if (working) return;
    setWorking(what);
    try {
      await run();
      await load();
    } catch (error) {
      setFailure(apiErrorMessage(error, t));
    } finally {
      setWorking(null);
    }
  }

  const callAdmin = () => act('callAdmin', () => api.callChatAdmin(matchId));
  const toggleLock = () => (chat ? act('lock', () => api.setChatLock(matchId, !chat.locked)) : null);

  /** Põe `@TAG` no fim do que já está escrito e devolve o foco ao campo. */
  function mention(tag: string) {
    setDraft((current) => {
      const token = '@' + tag + ' ';
      if (current.includes('@' + tag)) return current;
      const gap = current.length === 0 || current.endsWith(' ') ? '' : ' ';
      return (current + gap + token).slice(0, MESSAGE_MAX);
    });
    composer.current?.focus();
  }

  async function send() {
    const body = draft.trim();
    const hasShot = Boolean(picker.picked);
    /**
     * **A organização fala como organização** · ela não tem lado, e o valor
     * reservado é o que o servidor confere contra o papel dela.
     */
    const clubTag =
      chat?.viewerIsOrganizer ? 'admin' : chat?.myClubTags[0];
    // **Só o print basta** · o caso comum do anexo é a súmula sem legenda.
    if ((!body && !hasShot) || !chat || !clubTag || sending) return;
    setSending(true);
    try {
      /**
       * **A imagem sobe primeiro, e a mensagem só existe se ela subir** · o
       * contrário (mensagem agora, imagem depois) deixaria uma linha vazia na
       * conversa quando o upload falhasse, e numa sala que é prova isso é pior
       * que o erro.
       */
      let imageUrl: string | null = null;
      if (hasShot) {
        setUploading(true);
        imageUrl = await picker.commit(null);
      }
      // **O papel vai declarado**, como nas outras três chamadas da sala · a
      // rota deixou de derivá-lo do `clubTag` em 28/08/2026, e o porquê está no
      // `as` do `sendMessageInput`.
      await api.sendMatchMessage(matchId, { body, clubTag, imageUrl, as: mode });
      setDraft('');
      picker.clear();
      await load();
      /**
       * **Mandar mensagem desce a conversa** · pedido do Eduardo em 28/08/2026
       * (noite), e ele é o caso que o scroller sozinho não cobre.
       *
       * O `MessageScroller` **gruda na base e solta quando a pessoa sobe** ·
       * isso é o certo pra mensagem que **chega** (ninguém quer ser arrancado
       * do que está lendo, e é a razão do *"1 mensagem nova ↓"*). Mas quem
       * **escreve** está declarando onde quer estar: ela subiu pra reler
       * alguma coisa, respondeu a partir dali, e a própria mensagem ficava
       * fora da tela.
       *
       * **`smooth` e não `auto`** · aqui o movimento foi pedido por um clique,
       * então mostrá-lo é o que liga a ação ao resultado. O `auto` é pra quando
       * a caixa de escrever muda de altura, que é ajuste e não navegação.
       */
      scrollToEnd({ behavior: 'smooth' });
      composer.current?.focus();
    } catch (error) {
      setFailure(apiErrorMessage(error, t));
    } finally {
      setUploading(false);
      setSending(false);
    }
  }

  if (!chat) {
    /**
     * **A tela de erro tem saída** · 28/08/2026 (noite), pendência 157.
     *
     * Ela era um parágrafo vermelho e nada mais · a pessoa ficava olhando um
     * texto num diálogo, e **repetir aqui pode mudar o resultado** (falha de
     * rede é o caso comum). É a regra do `CLAUDE.md`, a mesma que nasceu da
     * tela de conta não carregada: *"toda tela precisa de saída, e isso inclui
     * a tela de erro"*.
     *
     * **Fechar o diálogo é a segunda saída**, e ela já existe no cabeçalho ·
     * por isso aqui basta o "tentar de novo".
     */
    return failure ? (
      <div className="flex flex-col items-center gap-3 p-6 text-center" role="alert">
        <p className="text-sm text-destructive">{failure}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFailure(null);
            void load();
          }}
        >
          {t('common.retry')}
        </Button>
      </div>
    ) : (
      <LoadingState label={t('chat.loading')} />
    );
  }

  /** Ninguém desta sala é meu club · é a organização olhando de fora. */
  const watchingBothSides = chat.myClubTags.length === 0;
  /**
   * **Conversa de partida que já acabou** · o relógio vencido não conta, porque
   * ali a partida ainda pode acontecer e a sala continua sendo a atual.
   */
  const isArchived = chat.closedReason === 'matchOver' || chat.closedReason === 'tournamentOver';
  /** As duas tags do confronto · é o universo fechado da menção. */
  const roomTags = [chat.homeTag, chat.awayTag];
  /**
   * A organização só fala como organização quando não tem club na partida ·
   * **e essa condição virou o próprio campo** (`viewerIsOrganizer`), em
   * 28/08/2026. Enquanto ela vivia só aqui, o servidor não a tinha: a tela
   * escondia a assinatura da organização de quem joga o confronto, e a rota
   * aceitava mesmo assim.
   */
  const speakingAsAdmin = chat.viewerIsOrganizer;
  const mine = new Set(chat.myClubTags);
  mineRef.current = mine;
  /**
   * A última mensagem **de um club meu** · é a única que leva o "visto por".
   *
   * **Do club, e não minha pessoalmente** · num club com dono e gerente, o que
   * importa pra quem escreveu é se o **outro lado** viu o que o club dele
   * disse. Ancorar na pessoa deixaria o gerente sem resposta quando o dono
   * falou por último.
   */
  const lastMineId = lastMineIdOf(chat);
  /**
   * **Quem sou eu vem do servidor** · a tela deduzia isso da primeira mensagem
   * de um club meu, e **num club com dono e gerente isso apontava pro colega**:
   * o botão de apagar aparecia na mensagem dele e faltava na minha. Pergunta do
   * Eduardo em 27/08/2026, e o defeito existia.
   */
  const myHandle = chat.viewerHandle;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
        {/**
         * **A sala do passado se anuncia no topo** · a leitura nunca fecha
         * (pedido do Eduardo em 27/08/2026: dá pra abrir a conversa depois de a
         * edição acabar), e sem esta faixa a única pista de que a partida já
         * era ficava **embaixo**, no lugar do campo de escrever · quem abre
         * pelo histórico lê de cima.
         */}
        {isArchived && (
          <p className="mb-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
            {t(chat.canWrite ? 'chat.resultClosedChatOpen' : 'chat.archived')}
          </p>
        )}
        <MessageScroller>
          {/* **Folga pra barra de rolagem** · colada no conteúdo ela lê como
              defeito, e colada na borda do diálogo ela some no arredondado. */}
          <MessageScrollerViewport className="scroll-thin pl-1 pr-3">
            {/**
             * **A sala anuncia mensagem nova pra quem não está olhando a tela**
             * · 28/08/2026 (noite), pendência 157.
             *
             * Sem isto, **mensagem que chega não existe** pra quem usa leitor de
             * tela: nada é lido, e o *"3 mensagens novas ↓"* também não. Numa
             * conversa em tempo real, é a funcionalidade inteira ficando muda ·
             * o `chat.typing` já tinha `sr-only`, então a preocupação existia e
             * faltou justamente no que importa.
             *
             * **`role="log"` e `aria-live="polite"`**, e não `assertive` · o
             * educado anuncia quando a pessoa terminar o que está fazendo, e o
             * assertivo interrompe a leitura no meio. Numa sala onde chegam
             * rajadas, interromper a cada linha é pior que o silêncio.
             *
             * **`aria-relevant="additions"`** · o que interessa é o que chegou.
             * Sem ele, apagar uma mensagem (que é uma remoção do DOM) também
             * seria anunciado, e a lápide já conta isso por escrito.
             */}
            <MessageScrollerContent
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label={t('chat.title')}
            >
              {chat.hasMore && (
                <div className="flex justify-center pt-2">
                  <Button variant="ghost" size="sm" disabled={loadingOlder} onClick={() => void loadOlder()}>
                    {loadingOlder ? t('chat.loadingOlder') : t('chat.loadOlder')}
                  </Button>
                </div>
              )}

              {chat.messages.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {/**
                   * **O vazio de uma sala ENCERRADA não convida a escrever** ·
                   * 29/08/2026, achado do Eduardo lendo a tela: a frase padrão
                   * é *"ninguém falou ainda · combine o horário por aqui"*, e
                   * logo abaixo dela a mesma tela dizia *"o tempo desta conversa
                   * passou"*. As duas juntas se contradizem, e a primeira manda
                   * fazer o que a segunda proíbe.
                   *
                   * **A sala aberta continua convidando** · lá a frase é o
                   * empurrão que faz a conversa começar, e é o motivo de ela
                   * existir.
                   */}
                  {isArchived ? t('chat.emptyArchived') : t('chat.empty')}
                </p>
              )}

              {chat.messages.map((one, index) => {
                const isMine = one.authorClubTag ? mine.has(one.authorClubTag) : false;
                /**
                 * **Quem não tem club na partida vê os dois lados, e não uma
                 * coluna só** · pra organização nada é "meu", então todas as
                 * bolhas caíam à esquerda e a sala lia como log de uma pessoa ·
                 * apontado pelo Eduardo em 27/08/2026 olhando a conversa de
                 * teste.
                 *
                 * Aí o lado deixa de ser "eu ou ele" e passa a ser **o do
                 * confronto**: mandante à esquerda, visitante à direita. É a
                 * ordem que a chave e o placar já usam.
                 *
                 * **E os dois continuam cinza** · verde quer dizer "sou eu", e
                 * pintar um dos clubs de verde na tela de quem julga seria a
                 * tela escolhendo um lado.
                 */
                const onTheRight = watchingBothSides
                  ? one.authorClubTag === chat.awayTag
                  : isMine;
                /**
                 * **Mensagem seguida do mesmo autor não repete o cabeçalho** ·
                 * numa conversa de combinar horário quase tudo vem em rajada, e
                 * repetir "COPA07 · 16:06" em cada linha é o ruído que faz a
                 * sala parecer log em vez de conversa.
                 */
                const previous = chat.messages[index - 1];
                const sameAuthor =
                  previous?.authorKind === one.authorKind &&
                  previous?.authorClubTag === one.authorClubTag &&
                  previous?.authorHandle === one.authorHandle;
                const variant = isMine ? 'mine' : 'theirs';

                if (one.authorKind === 'system') {
                  return (
                    <MessageScrollerItem key={one._id} messageId={one._id}>
                      {/* **A frase é do catálogo** · o servidor manda o código,
                          porque conversa de edição em espanhol não pode ter
                          linha em português. */}
                      <p className="px-3 text-center text-xs text-muted-foreground">
                        {systemText(t, one.systemKind)}
                      </p>
                    </MessageScrollerItem>
                  );
                }

                /**
                 * **Quem pode apagar esta** · o autor enquanto a sala aceita
                 * escrita, e a organização sempre. Esconder o botão é UX · o
                 * servidor recusa de novo, que é o que vale.
                 */
                const deleting = pending.has(one._id);
                /**
                 * **Reagir é falar** · mesma janela da escrita, e a organização
                 * sempre. Mensagem apagada não recebe reação · o card é
                 * lápide.
                 */
                const canReact = (chat.canWrite || chat.viewerIsOrganizer) && !one.deleted && !deleting;
                const canDelete =
                  !one.deleted &&
                  !deleting &&
                  (chat.viewerIsOrganizer ||
                    (chat.canWrite && one.authorHandle !== null && one.authorHandle === myHandle));

                /**
                 * **A organização não tem lado, e o que ela diz decide** ·
                 * bolha alinhada a um dos lados a faria parecer mais um dos
                 * dois clubs. Faixa larga, borda acesa e rótulo em verde · é o
                 * vocabulário que a casa já usa pra "isto é uma decisão".
                 */
                if (one.authorKind === 'admin') {
                  return (
                    <MessageScrollerItem key={one._id} messageId={one._id} data-message={one._id}>
                      {/**
                        * **A faixa dela É a bolha, com `w-full`** · ela nasceu
                        * como um `div` com as classes escritas à mão, e por isso
                        * **não quebrava palavra longa**: uma mensagem sem espaço
                        * vazava pro lado e o diálogo inteiro rolava na
                        * horizontal · visto pelo Eduardo em 27/08/2026. Segunda
                        * cópia do mesmo desenho é a regra da casa sendo furada,
                        * e o defeito apareceu na cópia que ninguém olhava.
                        */}
                      <BubbleContent variant="admin" className="group/message w-full p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span className="text-[11px] uppercase tracking-widest text-primary">
                            {t('chat.adminName')}
                          </span>
                          {/**
                           * **Quem falou como organização tem club nesta
                           * partida** · 28/08/2026.
                           *
                           * **É o que substitui a proibição.** Ela podia ser
                           * recusada (e foi, por um dia), mas com um
                           * organizador só isso deixa a sala do jogo dele sem
                           * moderação nenhuma. O que protege o adversário é
                           * **ver**, na própria bolha, de que lado está quem
                           * está falando com peso de decisão.
                           *
                           * Âmbar e não vermelho · é aviso, não acusação. É a
                           * mesma cor da marca na chave.
                           */}

                          <span className="text-[11px] text-muted-foreground">
                            {timeOf(one.createdAt)}
                          </span>
                          {(canDelete || canReact) && (
                            <span className="ml-auto">
                              <MessageActions
                                canDelete={canDelete}
                                canReact={canReact}
                                reactions={one.reactions}
                                labels={{
                                  open: t('chat.actions'),
                                  react: t('chat.react'),
                                  remove: t('chat.delete'),
                                }}
                                myHandle={myHandle}
                                onReact={(emoji) => void react(one._id, emoji)}
                                onRemove={() => setRemoving(one)}
                              />
                            </span>
                          )}
                        </div>
                        <Tombstone
                          deleted={one.deleted}
                          deleting={deleting}
                          labels={{
                            deleting: t('chat.deleting'),
                            byAdmin: t('chat.deletedByAdmin'),
                            byAuthor: t('chat.deletedByAuthor'),
                          }}
                        />
                        {one.body && (
                          <p className={cn('mt-1', (one.deleted || deleting) && 'opacity-50')}>
                            <MessageBody
                              body={one.body}
                              tags={roomTags}
                              more={t('chat.showMore')}
                              less={t('chat.showLess')}
                            />
                          </p>
                        )}
                        {one.imageUrl && (
                          <Shot
                            url={one.imageUrl}
                            label={t('chat.shotOpen')}
                            onOpen={() => setViewing(one.imageUrl)}
                          />
                        )}
                        <Reactions
                          list={one.reactions}
                          onPick={canReact ? (emoji) => void react(one._id, emoji) : undefined}
                        />
                      </BubbleContent>
                    </MessageScrollerItem>
                  );
                }

                return (
                  <MessageScrollerItem
                    key={one._id}
                    messageId={one._id}
                    data-message={one._id}
                    className={cn(sameAuthor && '-mt-2')}
                  >
                    <Message align={onTheRight ? 'end' : 'start'}>
                      <MessageContent>
                        {/* Aqui só chega mensagem de club · a da organização e
                            a de sistema têm ramo próprio acima. */}
                        {/**
                          * **O nome de quem falou, e não só a tag do club** ·
                          * dono e gerente falam pelo mesmo club (`SPEAKING_ROLES`
                          * na API), então só a tag deixaria duas pessoas
                          * indistinguíveis na mesma sala. Pergunta do Eduardo em
                          * 27/08/2026.
                          *
                          * A tag fica em segundo plano porque o **lado** já diz
                          * o club · o que falta na linha é a pessoa.
                          */}
                        <MessageHeader className={cn(sameAuthor && 'hidden')}>
                          <span className="text-foreground">
                            {one.authorHandle ? '@' + one.authorHandle : (one.authorName ?? '')}
                          </span>
                          {one.authorClubTag && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{one.authorClubTag}</span>
                            </>
                          )}
                          <span aria-hidden>·</span>
                          <span>{timeOf(one.createdAt)}</span>
                        </MessageHeader>
                        {/**
                          * **O apagar fica AO LADO da bolha, não embaixo** ·
                          * solto embaixo ele lia como legenda da mensagem
                          * seguinte, e ocupava uma linha por mensagem numa sala
                          * que cabe em 60dvh. Apontado pelo Eduardo em
                          * 27/08/2026 olhando a captura.
                          */}
                        <div
                          className={cn(
                            'flex min-w-0 items-center gap-1',
                            onTheRight && 'flex-row-reverse',
                          )}
                        >
                        <Bubble align={onTheRight ? 'end' : 'start'}>
                          {/**
                           * **O card não some, e a lápide diz quem apagou** ·
                           * mensagem que evapora deixa o outro lado sem saber o
                           * que houve, e a organização sem o que julgar.
                           *
                           * **Esmaecido e não riscado** · riscado lê como
                           * *corrigido*, e o que aconteceu foi *removido*.
                           */}
                          <BubbleContent
                            variant={one.deleted || deleting ? 'muted' : variant}
                            className={cn((one.deleted || deleting) && 'border-dashed border-border')}
                          >
                            <Tombstone
                              deleted={one.deleted}
                              deleting={deleting}
                              labels={{
                                deleting: t('chat.deleting'),
                                byAdmin: t('chat.deletedByAdmin'),
                                byAuthor: t('chat.deletedByAuthor'),
                              }}
                            />
                            {one.imageUrl && (
                              <Shot
                                url={one.imageUrl}
                                label={t('chat.shotOpen')}
                                onOpen={() => setViewing(one.imageUrl)}
                              />
                            )}
                            {one.body && (
                              <span className={cn('block', (one.deleted || deleting) && 'opacity-50')}>
                                <MessageBody
                                  body={one.body}
                                  tags={roomTags}
                                  more={t('chat.showMore')}
                                  less={t('chat.showLess')}
                                />
                              </span>
                            )}
                          </BubbleContent>
                        </Bubble>

                          {(canDelete || canReact) && (
                            <MessageActions
                              canDelete={canDelete}
                              canReact={canReact}
                              reactions={one.reactions}
                              labels={{
                                open: t('chat.actions'),
                                react: t('chat.react'),
                                remove: t('chat.delete'),
                              }}
                              myHandle={myHandle}
                              onReact={(emoji) => void react(one._id, emoji)}
                              onRemove={() => setRemoving(one)}
                            />
                          )}
                        </div>
                        <Reactions
                          list={one.reactions}
                          onPick={canReact ? (emoji) => void react(one._id, emoji) : undefined}
                        />
                        {/**
                          * **Só na ÚLTIMA mensagem minha** · quem leu a última
                          * leu as de cima, então repetir por linha é a mesma
                          * informação ocupando a conversa inteira.
                          */}
                        {isMine && one._id === lastMineId && (
                          <SeenBy
                            readers={chat.readers}
                            messageAt={one.createdAt}
                            myClubTags={chat.myClubTags}
                          />
                        )}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}
              {inviteVisible && invite && (
                <MessageScrollerItem>
                  {/* As duas saídas fazem a mesma coisa · baixar abre outra
                      guia, e a pessoa volta pra uma conversa sem a nota. */}
                  <AppInviteNote
                    count={invite.count}
                    onDownload={closeInvite}
                    onDismiss={closeInvite}
                  />
                </MessageScrollerItem>
              )}
              {/**
               * **"Está digitando" fecha a lista, e não flutua** · numa sala
               * pequena um balão fixo no rodapé cobriria a última mensagem, que
               * é justamente a que a pessoa está lendo enquanto o outro
               * responde.
               */}
              {typing && (
                <MessageScrollerItem>
                  <Message align="start">
                    <MessageContent>
                      <MessageHeader>
                        <span className={cn(typing.kind === 'admin' && 'text-primary')}>
                          {typing.kind === 'admin' ? t('chat.adminName') : typing.by}
                        </span>
                      </MessageHeader>
                      <Bubble align="start">
                        <BubbleContent variant="muted" className="flex items-center gap-1 py-3">
                          <span className="sr-only">{t('chat.typing', { who: typing.by })}</span>
                          {[0, 150, 300].map((delay) => (
                            <span
                              key={delay}
                              aria-hidden
                              className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                              style={{ animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          {/**
            * **O botão mudo continua, e o falante entra por cima** · o de baixo
            * responde "você subiu" e some sozinho; o `UnreadJump` só aparece
            * quando **chegou mensagem** enquanto a pessoa estava fora da base,
            * que é a informação pela qual ela desce.
            */}
          <MessageScrollerButton label={t('chat.toEnd')} />
          <UnreadJump
            messageIds={chat.messages.map((one) => one._id)}
            isMine={(id) => {
              const one = chat.messages.find((m) => m._id === id);
              return Boolean(one?.authorClubTag && mine.has(one.authorClubTag));
            }}
          />
        </MessageScroller>

        {failure && <p className="px-1 pt-2 text-xs text-destructive">{failure}</p>}

        {/**
         * **A tranca mora no CABEÇALHO do diálogo** · ela é controle da sala, e
         * não fala da conversa. Botão de largura inteira entre o histórico e o
         * campo custava uma faixa de 44px em 60dvh · apontado pelo Eduardo em
         * 27/08/2026. Aqui embaixo fica só o que **um club** faz.
         */}
        {/**
         * **Quem tem club na partida não vê a tranca** · o servidor recusa
         * (a organização não julga o próprio jogo), e um botão que sempre falha
         * é controle inerte · a mesma régua do botão desligado que não diz por
         * quê. Achado dirigindo em 27/08/2026, no probe do canal.
         */}
        {/**
         * **O papel vive no HEADER, como um micro-identificador** · pedido do
         * Eduardo em 28/08/2026 (noite): *"poderia apenas ter um badge no
         * header do dialog, tipo o header da aplicação em si"*.
         *
         * **Ele está certo, e o que existia era moldura** · uma caixa âmbar
         * permanente com duas frases longas, acima do campo de escrever, numa
         * sala que vive uma hora pra combinar horário. O papel é **estado**, e
         * estado mora na moldura · é a mesma lição do `AdminBrand`, cujo
         * docblock diz *"o selo é acesso, não aviso"*.
         *
         * **E ele NÃO marca que a pessoa tem club aqui** · decisão do Eduardo
         * na mesma noite: *"ninguém precisa saber que o admin tbm está
         * jogando"*. O elenco do club é **público**, então a marca não
         * revelava nada que não estivesse a um clique · o que ela acrescentava
         * era peso de acusação numa liga em que todo mundo se conhece.
         *
         * **O `authorInvolved` continua sendo GRAVADO** · ele custa zero e é o
         * que responde se alguém contestar depois. O que saiu foi a tela.
         *
         * **Na chave a marca fica** (`settledByInvolved`) · lá a decisão muda o
         * placar de uma partida, que é material, e não uma fala numa conversa.
         */}
        {headerSlot && (chat.viewerIsOrganizer || chat.organizerPlayingHere)
          ? createPortal(
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest',
                  chat.viewerIsOrganizer
                    ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/25'
                    : 'bg-secondary text-muted-foreground',
                )}
                title={t(
                  chat.viewerIsOrganizer
                    ? 'chat.organizerPlayingNotice'
                    : 'chat.organizerPlayingAsClub',
                )}
              >
                {t(chat.viewerIsOrganizer ? 'chat.adminName' : 'chat.roleClub')}
              </span>,
              headerSlot,
            )
          : null}

        {chat.viewerIsOrganizer && headerSlot
          ? createPortal(
              <Button
                variant="ghost"
                size="icon"
                disabled={working !== null}
                aria-label={chat.locked ? t('chat.unlock') : t('chat.lock')}
                title={chat.locked ? t('chat.unlock') : t('chat.lock')}
                onClick={() => void toggleLock()}
              >
                {working === 'lock' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                ) : chat.locked ? (
                  <Lock className="h-4 w-4 text-primary" aria-hidden />
                ) : (
                  <Unlock className="h-4 w-4" aria-hidden />
                )}
              </Button>,
              headerSlot,
            )
          : null}

        {/**
         * **A sala diz em que papel você está** · e ela diz **duas** coisas
         * diferentes, porque o mesmo organizador tem dois papéis aqui.
         *
         * | onde ele abriu | o que ele lê |
         * |---|---|
         * | pela mesa do `/admin` | *"o que você fizer como organização fica marcado"* |
         * | pelo `/app` | *"aqui você fala pelo club"*, e onde encontrar o outro papel |
         *
         * **O segundo é o que faltava**, e é o caso mais confuso do produto:
         * quem organiza e joga abria a conversa, não encontrava o cadeado nem a
         * assinatura da organização, e **não tinha como saber se aquilo era
         * regra ou defeito**. O Eduardo caiu nisso no mesmo dia em que a regra
         * entrou · *"não vejo o chat como admin/organização em si"*.
         *
         * Controle que some sem explicação lê como tela quebrada · é a mesma
         * régua do botão desligado que diz por quê.
         */}


        {/**
         * **O chamado conta o tempo, e volta a aceitar insistência** ·
         * 28/08/2026 (noite), decisão do Eduardo · *"acho que 5 min de trava já
         * está bom"*.
         *
         * **Antes ele era uma frase estática** que só sumia quando alguém da
         * organização abria a sala · e se ninguém abrisse, o club ficava olhando
         * *"A organização foi chamada"* sem saber se alguém tinha visto, **sem
         * poder pedir de novo**. O relógio é o que transforma o fato em estado:
         * *"chamada há 12 min"* diz o que a frase escondia.
         *
         * **O botão é UM só nos dois estados**, e só o rótulo muda · chamar e
         * rechamar são o mesmo gesto e a mesma chamada. Escritos como dois
         * botões eles já tinham divergido em três pontos no mesmo bloco (ícone,
         * spinner e caixa alta herdada do `span`), que é o defeito que esta casa
         * persegue · a segunda cópia se junta quando ela nasce, não depois.
         */}
        {/**
         * **Quem foi chamado precisa ver o chamado** · 29/08/2026, achado do
         * Eduardo · *"o admin já está com a conversa aberta, não aparece nada
         * claro dizendo que ele foi chamado"*.
         *
         * O bloco abaixo é `!viewerIsOrganizer` desde que nasceu, porque ele é a
         * **ação** de chamar · e a organização não chama a si mesma. Só que
         * assim a única pista que sobrava pra ela era a linha de sistema
         * **perdida no meio das mensagens**, numa sala que pode ter cinquenta.
         *
         * **É o aviso mais importante da tela pra ela**, e por isso ele carrega
         * o verde: é o motivo de ela ter vindo. Aparece na primeira abertura e
         * some nas seguintes, porque a leitura dela é o que fecha o chamado ·
         * ver a ordem no `matchChatFor`.
         */}
        {/**
         * **Um grupo com UM espaçamento, e não três margens negociadas** ·
         * 29/08/2026, e é a terceira vez que este vão é ajustado · o Eduardo
         * cortou a rodada pedindo a estrutura: *"veja todas as variações e a
         * melhor forma de resolver isso"*.
         *
         * As peças daqui aparecem em sete combinações (organização chamada, club
         * sem chamado, club com chamado dentro da trava, com a trava vencida, e
         * cada uma delas com ou sem o aviso de horário). **Enquanto cada peça
         * carregava a própria margem, cada combinação tinha um vão diferente** ·
         * e ajustar uma delas estragava a outra, que foi exatamente o que
         * aconteceu duas vezes aqui.
         *
         * `space-y-2` resolve todas de uma vez: **12px da conversa, 8px entre as
         * peças**, apareça o que aparecer.
         */}
        <div className="mt-3 space-y-2">
        {/**
         * **Ele olha o CARIMBO, e não o chamado em aberto** · e essa é a
         * diferença entre aparecer e piscar.
         *
         * Ligado ao `adminCalled`, ele se auto-destruía: **a leitura da
         * organização é o que fecha um chamado**, e todo `load()` marca leitura
         * · então ele aparecia no primeiro quadro e sumia no seguinte. O
         * Eduardo descreveu os dois sintomas exatos em 29/08/2026 · *"abro o
         * chat e ele some, e se eu já tiver com o chat aberto, aí mesmo que ele
         * nem aparece"*.
         *
         * **O `adminCalledAt` não some quando ela lê** · ele conta que esta sala
         * teve um chamado, que é o fato pelo qual ela veio. Fechar o chamado é
         * assunto do club (o botão dele volta); pra quem atende, o que importa é
         * saber que foi chamada.
         */}
        {chat.viewerIsOrganizer && chat.adminCalledAt && (
          <p className="flex flex-wrap items-center gap-x-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] uppercase tracking-widest text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t('chat.adminWasCalled')}
            {chat.adminCalledAt && (
              <span className="normal-case tracking-normal text-muted-foreground">
                {relativeTime(chat.adminCalledAt)}
              </span>
            )}
          </p>
        )}

        {!chat.viewerIsOrganizer && (
          /**
           * **A altura é reservada, e não herdada do que está dentro** ·
           * 29/08/2026, pergunta do Eduardo · *"qual é a diferença de quando tem
           * o botão pra chamar de novo?"*.
           *
           * Era a altura, e ela era acidental: com o botão o bloco mede **36px**
           * (`h-9`), e com o texto sozinho **17**. Como o conjunto é
           * `items-center`, o botão dava ao aviso um respiro que o texto sozinho
           * não tinha · e a lista de mensagens, que é `flex-1`, **crescia 19px
           * pra ocupar a sobra**. Não era o aviso subindo, era a última mensagem
           * descendo até ele.
           *
           * **E isso criava um segundo defeito que ninguém tinha pedido:** a
           * conversa **pulava** no instante em que a trava vencia e o botão
           * nascia · que hoje acontece sozinho, sem clique nenhum, por causa do
           * relógio de 30s.
           *
           * `min-h-9` é a altura do botão · com ela os dois estados ocupam o
           * mesmo espaço, o aviso fica sempre na mesma linha, e a lista para de
           * pular. **Ele vale mais desde que a contagem regressiva saiu**: sem
           * ela o estado de espera é só a frase, e sem o piso ele encolheria
           * ainda mais.
           */
          /**
           * **`gap-y-1` porque ele QUEBRA** · no diálogo estreito o texto do
           * chamado e o botão não cabem na mesma linha, e o vão de 8px entre
           * elas era o que fazia esta combinação parecer solta enquanto as
           * outras estavam boas. Na horizontal o vão continua sendo o de sempre.
           *
           * **O `min-h-9` saiu junto** · ele reservava a altura do botão pra a
           * conversa não pular quando a trava vence, e cobrava essa reserva em
           * **toda** sala com chamado aberto. O pulo é de 19px, uma vez, num
           * momento em que a pessoa está olhando justamente pra isso · a troca
           * não se paga.
           */
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {chat.adminCalled && (
              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] uppercase tracking-widest text-primary">
                {t('chat.adminCalled')}
                {chat.adminCalledAt && (
                  <span className="normal-case tracking-normal text-muted-foreground">
                    {relativeTime(chat.adminCalledAt)}
                  </span>
                )}
              </span>
            )}
            {/**
             * **Sala trancada não oferece socorro** · 03/09/2026.
             *
             * O servidor recusa com `closed` quando a janela está `locked`, e a
             * tela mostrava o botão assim mesmo: o compositor sumia, a mensagem
             * que explica também (ela depende de `canWrite`), e sobrava um botão
             * que só sabia dar erro. É o mesmo defeito que o Eduardo apontou em
             * 29/08 num caso vizinho, e ele está citado no schema do chat.
             */}
            {!chat.locked && (!chat.adminCalled || canCallAgain) && (
              <Button
                size="sm"
                variant="ghost"
                disabled={working !== null}
                onClick={() => void callAdmin()}
              >
                {working === 'callAdmin' ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden />
                )}
                {working === 'callAdmin'
                  ? t('chat.calling')
                  : chat.adminCalled
                    ? t('chat.callAdminAgain')
                    : t('chat.callAdmin')}
              </Button>
            )}
          </div>
        )}

        {/**
         * **O aviso mora ACIMA do campo quando dá pra escrever** · e essa é a
         * metade da tela que a decisão de 29/08/2026 exigiu.
         *
         * Ele sempre viveu **no lugar** do formulário, porque avisar e proibir
         * eram a mesma coisa: *"a partida acabou"* aparecia justamente onde o
         * campo teria ficado. Quando a sala passou a **avisar em vez de
         * fechar**, esse desenho apagaria o aviso no exato caso que o Eduardo
         * pediu · *"não precisamos fechar o chat de fato, **apenas deixar o
         * aviso**"*.
         *
         * **Ele é discreto de propósito** · a conversa continua sendo o
         * assunto, e o aviso é contexto: diz que o jogo já passou, e não que
         * há algo errado em falar.
         */}
        {chat.canWrite && chat.closedReason && !isArchived && (
          /**
           * **Vão curto de propósito** · o `mt-3` daqui somava com a folga que o
           * `min-h-9` do bloco de cima deixa em volta do texto, e davam **~21px**
           * entre duas linhas que falam da mesma coisa: o estado da sala. O
           * Eduardo leu isso na tela em 29/08/2026 · *"estão com muito
           * espaçamento"*.
           *
           * **Quem separa da conversa é o bloco de cima** · este aqui é irmão
           * dele, não um terceiro assunto.
           */
          <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            {closedText(t, chat.closedReason)}
          </p>
        )}
        </div>

        <ChatComposer
          canWrite={chat.canWrite}
          viewerIsOrganizer={chat.viewerIsOrganizer}
          closedReason={chat.closedReason}
          opensAt={chat.opensAt}
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          send={send}
          composer={composer}
          picker={picker}
          uploading={uploading}
          roomTags={roomTags}
          mine={mine}
          mention={mention}
          speakingAsAdmin={speakingAsAdmin}
          setFailure={setFailure}
          onLocalTyping={onLocalTyping}
        />

        {/**
         * **O print abre no visualizador da casa** · o mesmo da súmula, com
         * zoom e teclado. Uma lista de uma imagem só, porque a sala abre uma
         * por vez · quem quiser navegar entre elas abre a próxima.
         */}
        <ImageViewer
          images={viewing ? [{ url: viewing, caption: t('chat.shotAlt') }] : []}
          index={viewing ? 0 : null}
          onIndexChange={() => {}}
          onClose={() => setViewing(null)}
        />

        {/**
         * **Apagar pergunta antes** · não há desfazer, e o alvo é um botão de
         * 28px ao lado de uma bolha · o toque errado é o caso comum, não o
         * excepcional. A janela mostra **o que vai sumir**, porque numa rajada
         * de cinco mensagens "apagar a mensagem" não diz qual.
         */}
        <ConfirmDialog
          open={removing !== null}
          onOpenChange={(next) => !next && setRemoving(null)}
          tone="destructive"
          title={t('chat.deleteConfirmTitle')}
          description={
            <span className="block space-y-2">
              <span className="block">{t('chat.deleteConfirmBody')}</span>
              {removing && (
                /**
                 * **A ficha inteira, e não só o texto** · numa rajada de cinco
                 * mensagens parecidas, o corpo sozinho não diz qual delas vai
                 * sumir · e quando quem apaga é a organização, **de quem** ela
                 * é importa mais que o que ela diz. Pedido do Eduardo em
                 * 27/08/2026.
                 */
                <span className="block rounded-md border bg-muted/40 px-3 py-2">
                  <span className="flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <span className={cn(removing.authorKind === 'admin' && 'text-primary')}>
                      {removing.authorKind === 'admin'
                        ? t('chat.adminName')
                        : removing.authorHandle
                          ? '@' + removing.authorHandle
                          : (removing.authorName ?? '')}
                    </span>
                    {removing.authorClubTag && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{removing.authorClubTag}</span>
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <span>{timeOf(removing.createdAt)}</span>
                  </span>
                  {removing.body && (
                    // **A mesma peça da conversa** · a ficha mostrava a
                    // mensagem inteira, então uma de trinta linhas empurrava os
                    // botões pra fora da janela.
                    <span className="mt-1 block text-sm italic text-foreground">
                      <MessageBody
                        body={removing.body}
                        tags={roomTags}
                        more={t('chat.showMore')}
                        less={t('chat.showLess')}
                      />
                    </span>
                  )}
                </span>
              )}
            </span>
          }
          confirmLabel={t('chat.delete')}
          onConfirm={async () => {
            const target = removing;
            setRemoving(null);
            if (target) await remove(target._id);
          }}
        />
    </div>
  );
}

/**
 * **A contagem é do servidor; o "eu reagi" é meu.**
 *
 * O evento carrega a mensagem inteira, e ela foi montada **pra quem publicou** ·
 * então o `mine` que chega é o dele. Sem isto, quem recebia via a própria
 * pílula acesa por uma reação que era do outro · visto na captura em
 * 27/08/2026.
 *
 * A resposta não é mandar o `mine` de cada um (o evento é um só pra todo mundo,
 * e é isso que o faz barato) · é a tela **guardar o dela**. O número, que é o
 * que muda, continua vindo de lá.
 */
function keepMyReactions(local: ChatMessageView, arrived: ChatMessageView): ChatMessageView {
  const wasMine = new Set(local.reactions.filter((one) => one.mine).map((one) => one.emoji));
  return {
    ...arrived,
    reactions: arrived.reactions.map((one) => ({ ...one, mine: wasMine.has(one.emoji) })),
  };
}

/**
 * A lista já com o meu clique aplicado · **a mesma conta que o servidor faz**,
 * pra tela não piscar esperando a resposta.
 */
function toggled(
  list: ChatMessageView['reactions'],
  emoji: string,
): ChatMessageView['reactions'] {
  const mine = list.find((one) => one.emoji === emoji);
  // **Otimista, e com o meu nome já dentro** · sem o `who` a lista some do
  // menu até o servidor responder, e é justamente ali que ele diz quem reagiu.
  if (!mine) return [...list, { emoji, count: 1, mine: true, who: [] }];
  if (!mine.mine) {
    return list.map((one) =>
      one.emoji === emoji ? { ...one, count: one.count + 1, mine: true } : one,
    );
  }
  return list.flatMap((one) => {
    if (one.emoji !== emoji) return [one];
    return one.count <= 1 ? [] : [{ ...one, count: one.count - 1, mine: false }];
  });
}

/**
 * A frase de uma linha de sistema · **`switch` pelo mesmo motivo do fechamento**:
 * o catálogo tipado não aceita chave montada, e um `systemKind` novo sem frase
 * deixa de compilar.
 */
function systemText(t: TFunction, kind: string | null): string {
  switch (kind) {
    case 'adminCalled':
      return t('chat.system.adminCalled');
    case 'chatLocked':
      return t('chat.system.chatLocked');
    case 'chatUnlocked':
      return t('chat.system.chatUnlocked');
    default:
      return '';
  }
}
