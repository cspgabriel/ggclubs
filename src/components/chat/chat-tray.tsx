import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CHAT_PARAM } from '@/lib/chat-link';
import { appTournamentPath } from '@/lib/paths';
import { relativeTime } from '@/lib/relative-time';
import { useMyChats } from '@/lib/use-my-chats';
import { cn } from '@/lib/utils';

/**
 * **A bandeja de conversas** · ao lado do sininho, e pelo mesmo motivo dele.
 *
 * O número da sala **só existia dentro da página da edição**: quem estivesse em
 * qualquer outra tela não descobria que tinha mensagem. Este é o furo que
 * sobrava depois da fatia 4 · pergunta do Eduardo em 27/08/2026.
 *
 * **Ela não é uma tela, e isso é decisão dele** · *"não é pra tirar a pessoa da
 * tela da edição/campeonato em si"*. Cada linha leva pra
 * `/app/campeonatos/<slug>?conversa=<matchId>`, ou seja: **a página da edição,
 * com a sala aberta**. A conversa continua acontecendo onde ela pertence, e a
 * bandeja é só o caminho até lá.
 *
 * **Ela some quando não há conversa nenhuma.** Ícone permanente pra uma lista
 * vazia é moldura · a mesma razão de a faixa do jogo só existir na janela dele.
 */
export function ChatTray() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { chats } = useMyChats();

  if (chats.rooms.length === 0) return null;

  return (
    <DropdownMenu>
      {/* `touch-target` pelo mesmo motivo do sininho · alvo de 44px sem inflar
          o botão dentro do header. */}
      <DropdownMenuTrigger
        className="touch-target relative rounded-md p-2 text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={
          chats.total > 0 ? t('chat.trayWithCount', { count: chats.total }) : t('chat.tray')
        }
      >
        <MessageSquare className="h-5 w-5" aria-hidden />
        {chats.total > 0 && (
          <span
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
            aria-hidden
          >
            {chats.total > 9 ? '9+' : chats.total}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <p className="border-b px-4 py-3 font-display text-sm uppercase tracking-tight">
          {t('chat.trayTitle')}
        </p>

        {/* Teto em `rem` e nunca em `vh` · no app instalado a barra de título
            come 40px da janela, e `vh` mede outra coisa. */}
        <ul className="max-h-[22rem] overflow-y-auto overscroll-contain py-1">
          {chats.rooms.map((room) => {
            const rivalTag = room.myTag === room.homeTag ? room.awayTag : room.homeTag;
            return (
              <li key={room.matchId}>
                <button
                  type="button"
                  data-chat-tray-row={room.matchId}
                  onClick={() =>
                    void navigate(
                      `${appTournamentPath(room.tournamentSlug)}?${CHAT_PARAM}=${room.matchId}`,
                    )
                  }
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  {/* O ponto ocupa lugar sempre · sem o espaço reservado a
                      linha com e sem não lida começam em colunas diferentes. */}
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      room.unread > 0 ? 'bg-primary' : 'bg-transparent',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="truncate font-display text-sm uppercase text-foreground">
                        {rivalTag}
                      </span>
                      {room.unread > 0 && (
                        <span className="shrink-0 text-[11px] font-semibold text-primary">
                          {room.unread}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{room.tournamentName}</span>
                      {room.lastMessageAt && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="shrink-0">{relativeTime(room.lastMessageAt)}</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
