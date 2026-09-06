import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { ChatMode, TournamentChatRow } from '@ggclubs/schemas';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatHeaderSlotContext } from '@/components/chat/chat-header-slot';
import { MatchChat } from '@/components/chat/match-chat';
import { MatchChatSummary } from '@/components/chat/match-chat-summary';
import { ClubCrest } from '@/components/club/club-crest';
import { Button } from '@/components/ui/button';
import { ImageViewer } from '@/components/ui/image-viewer';
import { DialogSurface } from '@/components/ui/dialog-surface';

export function MatchChatDialog({
  matchId,
  open,
  onOpenChange,
  home,
  away,
  about,
  as,
  resultAction,
}: {
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Quem monta declara o papel; a autorização continua sendo do servidor.
  as?: ChatMode;
  resultAction?: { label: string; onClick: () => void };
  home: { tag: string; crestUrl: string | null };
  away: { tag: string; crestUrl: string | null };
  about?: {
    round: string;
    scheduledAt: Date | string;
    status: string;
    result?: TournamentChatRow['result'];
    claims?: TournamentChatRow['claims'];
  };
}) {
  const { t, i18n } = useTranslation();
  // O portal precisa repintar quando o nó existe; ref sozinho não avisa.
  const [actions, setActions] = useState<HTMLDivElement | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <DialogSurface
        className="h-[min(90dvh,56rem)] max-w-lg sm:max-w-xl lg:max-w-3xl"
        bodyClassName="chat-dialog-body flex flex-1 flex-col overflow-hidden p-4 sm:p-6"
        watermark={false}
      >
        <div
          data-chat-header
          className="-m-2 max-h-[45dvh] shrink-0 overflow-y-auto overscroll-contain p-2"
        >
          <div className="flex items-center justify-between gap-2">
            <AlertDialog.Title className="min-w-0 font-display text-sm uppercase leading-tight sm:text-lg">
              <span className="sm:hidden">{t('chat.shortTitle')}</span>
              <span className="hidden sm:inline">{t('chat.title')}</span>
            </AlertDialog.Title>
            <div className="flex shrink-0 items-center gap-1">
              <div ref={setActions} className="flex items-center gap-1" />
              <AlertDialog.Cancel asChild>
                <Button variant="ghost" size="icon" aria-label={t('common.close')}>
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </AlertDialog.Cancel>
            </div>
          </div>
          <AlertDialog.Description asChild>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm font-semibold uppercase">
              <div className="flex min-w-0 items-center gap-2">
                <ClubCrest
                  tag={home.tag}
                  crestUrl={home.crestUrl}
                  className="hidden h-7 w-7 shrink-0 text-[8px] min-[360px]:block"
                />
                <span className="break-all">{home.tag}</span>
              </div>
              <span className="text-xs text-muted-foreground" aria-hidden>
                ×
              </span>
              <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                <span className="break-all">{away.tag}</span>
                <ClubCrest
                  tag={away.tag}
                  crestUrl={away.crestUrl}
                  className="hidden h-7 w-7 shrink-0 text-[8px] min-[360px]:block"
                />
              </div>
            </div>
          </AlertDialog.Description>
          {about && (
            <>
              <p className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{about.round}</span>
                <span>
                  {new Date(about.scheduledAt).toLocaleString(i18n.language, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  })}{' '}
                  · {t('chat.brasiliaTime')}
                </span>
              </p>
              <MatchChatSummary
                status={about.status}
                result={about.result}
                claims={about.claims}
                homeTag={home.tag}
                awayTag={away.tag}
                onShot={setShot}
              />
              {resultAction && (
                <Button
                  className="mt-2 w-full sm:w-auto"
                  size="sm"
                  variant="ctaOutline"
                  onClick={resultAction.onClick}
                >
                  {resultAction.label}
                </Button>
              )}
            </>
          )}
        </div>
        <ImageViewer
          images={shot ? [{ url: shot, caption: t('chat.reportedShotCaption') }] : []}
          index={shot ? 0 : null}
          onIndexChange={() => {}}
          onClose={() => setShot(null)}
        />
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          <ChatHeaderSlotContext.Provider value={actions}>
            <MatchChat matchId={matchId} matchStatus={about?.status} as={as} />
          </ChatHeaderSlotContext.Provider>
        </div>
      </DialogSurface>
    </AlertDialog.Root>
  );
}
