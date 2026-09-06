import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { matchChatTopic, USER_EVENT, userTopic, type MyChatsView } from '@ggclubs/schemas';
import { api } from '@/lib/api';
import { MyChatsContext } from '@/lib/my-chats-context';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useRealtimeConnected, useRealtimeTopic } from '@/lib/realtime/use-realtime-topic';
import { useAuth } from '@/lib/use-auth';

/**
 * **O contador anda pelo canal, e o relógio virou rede** · 28/08/2026 (noite),
 * pendência 153.
 *
 * **O que era:** um `setInterval` de 10s montado na casca do `/app` inteira,
 * **sem olhar o canal e sem parar com a aba escondida** · 6 requisições por
 * minuto, por aba, pra sempre, e cada uma custa ~8 consultas ao Mongo. Com 100
 * abas abertas isso é ~10 req/s e ~80 consultas/s no Atlas, numa API em
 * `scale: 1`, por um número que muda algumas vezes por hora. **É exatamente o
 * custo que o canal de tempo real existe pra evitar.**
 */

/** Quando não há canal · é o comportamento antigo, e ele continua sendo o certo ali. */
const POLL_MS = 10_000;

/**
 * **A rede, com o canal de pé** · uma por minuto em vez de seis.
 *
 * Ela não é desconfiança do canal: é o buraco conhecido do teto abaixo · sala
 * fora das 12 mais recentes não é ouvida, e sem isto o número dela só apareceria
 * na próxima navegação.
 */
const SAFETY_POLL_MS = 60_000;

/**
 * Quantas salas a bandeja ouve · **o teto da conexão é 20 tópicos**, e ela
 * divide esse orçamento com o `user:`, os clubs e a edição aberta.
 *
 * Doze cobre com folga quem tem conversa de verdade acontecendo · a lista vem
 * ordenada por atividade, então o que sobra do teto é o que menos importa.
 */
const MAX_WATCHED_ROOMS = 12;

/**
 * **A rajada vira um `load` só** · numa sala ativa chegam dez mensagens por
 * minuto, e recarregar a bandeja a cada uma seria trocar um polling previsível
 * por um pior. O número é curto porque o que se está atualizando é um contador.
 */
const BURST_MS = 2_000;

export function MyChatsProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<MyChatsView>({ total: 0, rooms: [] });
  const connected = useRealtimeConnected();
  const { account, accountStatus } = useAuth();
  const accountId = accountStatus === 'ready' ? (account?._id ?? null) : null;

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setChats(await api.myChats({ signal }));
    } catch {
      /**
       * **Falhar é silêncio** · a mesma regra do sininho, e pelo mesmo motivo:
       * um erro em vermelho ao lado do avatar seria a coisa mais barulhenta da
       * tela por uma consulta secundária.
       */
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * **As salas que a bandeja ouve** · a chave de dependência é a lista achatada
   * pelo próprio hook, então ela só re-assina quando as salas mudam de verdade,
   * e não a cada resposta do `GET`.
   */
  const topics = useMemo(
    () =>
      chats.rooms
        .slice(0, MAX_WATCHED_ROOMS)
        .map((room) => matchChatTopic(room.matchId))
        /**
         * **Ordenado, e é isso que impede uma reassinatura por mensagem** ·
         * achado pelo `revisor` em 28/08/2026 (noite).
         *
         * A chave de dependência do `useRealtimeTopic` é a lista **achatada**,
         * então ela muda quando a **ordem** muda · e o servidor devolve as
         * salas por *não lida primeiro, depois a mais recente*, que é uma ordem
         * que se reescreve a cada mensagem e a cada leitura.
         *
         * Sem o `sort`, uma mensagem numa sala que não estava no topo mandava
         * **12 `unsub` e 12 `sub`** · cada `sub` custa a autorização no banco e
         * um balde do rate limit de inscrição, que é 60 por minuto. Numa noite
         * de campeonato isso chega ao teto, e o `denied` que vem depois é
         * **grudento**: o próximo tópico que o app pedir (o club, a edição)
         * também é recusado, e ninguém vê.
         *
         * Com a ordem estável, a chave só muda quando **o conjunto** muda ·
         * sala nova entrando ou saindo das doze.
         */
        .sort(),
    [chats.rooms],
  );

  const burst = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => (burst.current ? clearTimeout(burst.current) : undefined), []);

  useRealtimeTopic(topics, () => {
    if (burst.current) return;
    burst.current = setTimeout(() => {
      burst.current = null;
      void load();
    }, BURST_MS);
  });

  /**
   * **Ler numa tela apaga o ponto nas outras** · e sem isto a bandeja zerava
   * **só na aba que abriu a sala**, enquanto o sininho ao lado dela já zerava
   * em todas desde que nasceu.
   *
   * **Não passa pela rajada de propósito** · o `BURST_MS` existe pra juntar dez
   * mensagens de uma sala ativa num `load` só, e leitura acontece uma vez por
   * abertura. Segurar dois segundos aqui seria o ponto verde demorando pra sair
   * justamente na tela que a pessoa está olhando.
   */
  useRealtimeRefresh(accountId ? userTopic(accountId) : null, [USER_EVENT.chatRead], () => {
    void load();
  });

  /**
   * **O relógio, e ele tem duas velocidades e uma pausa.**
   *
   * | situação | o que acontece |
   * |---|---|
   * | canal de pé | uma busca por minuto, só de rede · quem avisa é o evento |
   * | canal fora do ar | os 10s de sempre · é o caminho degradado, e ele existe |
   * | **aba escondida** | **nada** · guia esquecida aberta a noite inteira parava de pedir |
   *
   * **Voltar pra aba busca na hora** · sem isso, quem volta depois de uma hora
   * olharia um número velho até o próximo tique.
   */
  useEffect(() => {
    const every = connected ? SAFETY_POLL_MS : POLL_MS;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => void load(), every);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
        return;
      }
      void load();
      start();
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [connected, load]);

  const value = useMemo(() => ({ chats, reload: () => void load() }), [chats, load]);
  return <MyChatsContext.Provider value={value}>{children}</MyChatsContext.Provider>;
}
