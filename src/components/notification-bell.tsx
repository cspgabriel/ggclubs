import {
  notificationCountEvent,
  notificationEvent,
  NOTIFICATION_EVENT,
  NOTIFICATION_READ_EVENT,
  userTopic,
} from '@ggclubs/schemas';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api, type NotificationRecord } from '@/lib/api';
import { notifyDesktop, onFocusChange, setUnreadBadge } from '@/lib/desktop';
import { notificationText, notificationTarget } from '@/lib/notification-text';
import { relativeTime } from '@/lib/relative-time';
import { useRealtimeTopic } from '@/lib/realtime/use-realtime-topic';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

/**
 * O sininho · **o primeiro consumidor de tempo real do produto.**
 *
 * ## O que ele é, e o que ele não é
 *
 * Ele mostra a caixa que o servidor gravou · a caixa é a fonte da verdade, e o
 * canal é só entrega. Quem estava offline encontra tudo aqui ao voltar, e quem
 * está conectado vê chegar sem recarregar nada.
 *
 * **Uma requisição por carregamento do app, e só.** Depois dela o número vem do
 * evento, que **carrega o contador novo** · é a exceção do evento magro, e é ela
 * que impede o sininho de virar um `GET` por notificação multiplicado pelo
 * número de conectados.
 *
 * ## Por que o texto não vem do servidor
 *
 * O que chega é a chave (`club.invited`) e os parâmetros; a frase mora no
 * catálogo. Decisão do Eduardo em 11/08/2026, e o efeito é que **a caixa inteira
 * muda de idioma junto com a pessoa** em vez de guardar o português de quando
 * cada linha foi escrita.
 *
 * ## O que ele faz de propósito
 *
 * - **Falhar é silêncio** · a caixa vazia é indistinguível da caixa que não
 *   carregou pra quem está olhando o header, e um erro em vermelho ao lado do
 *   avatar seria a coisa mais barulhenta da tela por uma consulta secundária.
 *   Mesma regra do botão de convite na página do player.
 * - **Abrir marca como lida** · quem abriu viu. O contador some na hora e as
 *   linhas continuam ali, com o ponto de não lida apagando · a caixa não é uma
 *   fila de tarefas.
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const { account } = useAuth();
  const navigate = useNavigate();
  const accountId = account?._id ?? null;

  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);

  /**
   * **O balão nativo do desktop · um por ausência, não por aviso.**
   *
   * A regra está no `docs/produto.md` e ela é sobre o que o balão **é**: uma
   * interrupção. Ela acontece **uma vez** · quem foi interrompido às 10h e não
   * voltou já sabe que tem coisa esperando, e o segundo balão não acrescenta
   * informação. O vigésimo acrescenta uma coisa só: o motivo pra desligar a
   * notificação do app · e aí a gente perde o canal inteiro e pra sempre.
   *
   * **O contador reseta quando a pessoa volta pra janela**, não num relógio ·
   * relógio traria o mesmo barulho de volta com um número inventado no meio.
   *
   * **E "visível" aqui não é `document.visibilityState`** · a janela pode estar
   * aberta atrás de outra ou minimizada na bandeja, e o WebView nem sempre conta
   * isso como oculto. Quem sabe é o shell.
   */
  const windowFocused = useRef(true);
  const rangWhileAway = useRef(false);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void onFocusChange((focused) => {
      windowFocused.current = focused;
      // Voltar pra janela **é** a interação que zera o contador de balões.
      if (focused) rangWhileAway.current = false;
    }).then((off) => {
      stop = off;
    });
    return () => stop?.();
  }, []);

  /** Na web isto não faz nada · o `notifyDesktop` sai fora sozinho. */
  function ringOnce(text: string, imageUrl?: string | null) {
    if (windowFocused.current || rangWhileAway.current) return;
    rangWhileAway.current = true;
    // O balão passa e o botão da barra de tarefas pisca até o foco voltar · os
    // dois saem do `notifyDesktop`, pra todo balão.
    void notifyDesktop(t('notifications.toastTitle'), text, imageUrl ?? undefined);
  }

  /**
   * **A marca no ícone segue o contador, e só ele.** Com a janela escondida na
   * bandeja o ícone é a única presença do app, e sem isto ele é idêntico com ou
   * sem novidade · e a barra de tarefas é onde a pessoa olha. A marca some
   * quando a caixa é aberta, junto com o contador · "tem aviso esperando" é
   * verdade até ler, não até voltar pra janela. Na web não faz nada.
   */
  useEffect(() => {
    void setUnreadBadge(unread, unread > 0 ? t('desktop.trayUnread', { count: unread }) : null);
  }, [unread, t]);

  // **Sair limpa a marca.** O sininho desmonta no logout e ao navegar pra uma
  // rota pública, e a bandeja ficaria com o ponto e "3 avisos não lidos" num
  // app deslogado. É um efeito à parte, e não a limpeza do de cima: lá cada
  // mudança do contador passaria por zero antes do número novo, e o ícone
  // piscaria a cada aviso.
  useEffect(() => () => void setUnreadBadge(0, null), []);

  /**
   * O `snapshot` · **e ele vem antes do stream, sempre.**
   *
   * `AbortController` no cleanup pelo motivo de sempre: o `StrictMode` monta
   * duas vezes em desenvolvimento, e em produção ele impede uma resposta
   * atrasada de sobrescrever um estado mais novo quando a conta troca.
   */
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accountId) return;
      try {
        const box = await api.listNotifications(undefined, { signal });
        setItems(box.notifications);
        setUnread(box.unread);
      } catch {
        // Silêncio · ver o comentário do componente.
      }
    },
    [accountId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * O stream.
   *
   * **`resync` refaz a busca e `changed` não** · é a diferença que o cliente do
   * canal existe pra contar. Quando o evento chega inteiro, ele traz a linha
   * nova e o contador; quando ficou buraco na sequência, o payload do último
   * evento não conta o que se perdeu, e a resposta certa é buscar.
   */
  useRealtimeTopic(accountId ? userTopic(accountId) : null, (event) => {
    if (event.kind === 'resync') {
      void load();
      return;
    }

    if (event.type === NOTIFICATION_EVENT) {
      const parsed = notificationEvent.safeParse(event.data);
      if (!parsed.success) {
        // Evento de uma versão que esta tela não conhece · a caixa é a verdade.
        void load();
        return;
      }
      const { unread: count, ...view } = parsed.data;
      const record = { ...view, createdAt: view.createdAt.toISOString() };
      setItems((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      setUnread(count);
      // **O texto sai do catálogo aqui**, e é o preço aceito da decisão de
      // gravar chave + parâmetros · o balão precisa da frase pronta, e quem
      // sabe o idioma é o cliente.
      ringOnce(notificationText(t, record), record.imageUrl);
      return;
    }

    if (event.type === NOTIFICATION_READ_EVENT) {
      const parsed = notificationCountEvent.safeParse(event.data);
      if (!parsed.success) return;
      setUnread(parsed.data.unread);
      // Sobrou alguma não lida, então **outra aba marcou uma linha específica**
      // e esta não tem como saber qual · a caixa se busca de novo, que é raro.
      // Zerado não busca nada: quem zerou foi quem abriu, e os pontos ficam (ver
      // o `onOpenChange`).
      if (parsed.data.unread > 0) void load();
    }
  });

  /**
   * Abrir marca como lida · **o contador some, os pontos ficam.**
   *
   * Os dois respondem perguntas diferentes: o contador diz *tem coisa nova pra
   * ver* e o ponto diz *esta aqui é a nova*. Apagar os dois no clique tira da
   * pessoa exatamente a marca que ela abriu pra procurar · a lista fica igual à
   * de uma semana atrás no instante em que ela olha.
   *
   * Os pontos apagam no próximo carregamento, quando o servidor responde o que
   * já é verdade lá · quem manda continua sendo ele.
   */
  async function onOpenChange(open: boolean) {
    if (!open || unread === 0) return;
    // Otimista: o contador some no clique. Se a chamada falhar, o próximo
    // carregamento devolve a verdade.
    setUnread(0);
    try {
      await api.markNotificationsRead();
    } catch {
      // Silêncio, como o resto da peça.
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => void onOpenChange(open)}>
      {/* **`touch-target` mantém o alvo de 44px sem inflar o botão** · a regra
          de altura mínima em ponteiro grosso transformaria este ícone num
          retângulo dentro do header, que foi o defeito de 10/08 no avatar ao
          lado. */}
      <DropdownMenuTrigger
        className="touch-target relative rounded-md p-2 text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={
          unread > 0 ? t('notifications.openWithCount', { count: unread }) : t('notifications.open')
        }
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          /* O contador é **verde chapado**, e é o único da casca · ele é a
             resposta que a peça existe pra dar. Acima de 9 vira "9+", porque
             três dígitos deformam o disco e o número exato não muda nada do que
             a pessoa vai fazer. */
          <span
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
            aria-hidden
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <p className="border-b px-4 py-3 font-display text-sm uppercase tracking-tight">
          {t('notifications.title')}
        </p>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t('notifications.empty')}
          </p>
        ) : (
          /* A rolagem é interna e o teto é em `rem`, nunca em `vh` · no app
             instalado a barra de título come 40px da janela, e `vh` mede outra
             coisa. */
          <ul className="max-h-[22rem] overflow-y-auto overscroll-contain py-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void navigate(notificationTarget(item))}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  {/* O ponto de não lida ocupa lugar sempre · sem o espaço
                      reservado, a linha lida e a não lida começam em colunas
                      diferentes e a lista fica serrilhada. */}
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      item.read ? 'bg-transparent' : 'bg-primary',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground">
                      {notificationText(t, item)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {relativeTime(item.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
