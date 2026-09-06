import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { TOURNAMENT_EVENT, tournamentTopic, type MatchCorrectionView } from '@ggclubs/schemas';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogSurface } from '@/components/ui/dialog-surface';
import { MatchChatSummary } from '@/components/chat/match-chat-summary';
import { DisputeCard } from './match-decision';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useResource } from '@/lib/use-resource';
import { useLiveQuery } from '@/lib/realtime/use-live-query';
import { ImageViewer, useImageViewer } from '@/components/ui/image-viewer';

export function MatchCorrectionDialog({
  matchId,
  roundLabel,
  onClose,
  onResolved,
}: {
  matchId: string;
  roundLabel: string;
  onClose: () => void;
  onResolved: () => void;
}) {
  const { t } = useTranslation();
  const { data, error, reload, loading } = useResource(
    (signal) => api.adminMatchCorrection(matchId, signal),
    [matchId],
    { keepPrevious: true },
  );
  useLiveQuery(
    data ? tournamentTopic(data.tournamentId) : null,
    [TOURNAMENT_EVENT.matches, TOURNAMENT_EVENT.status],
    reload,
  );
  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogSurface className="max-w-2xl" bodyClassName="p-4 sm:p-6" watermark={false}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <AlertDialog.Title className="font-display uppercase">
            {t('correction.title')}
          </AlertDialog.Title>
          <AlertDialog.Cancel asChild>
            <Button size="icon" variant="ghost" aria-label={t('common.close')}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </AlertDialog.Cancel>
        </div>
        <AlertDialog.Description className="mb-3 text-xs text-muted-foreground">
          {t('correction.body')}
        </AlertDialog.Description>
        {Boolean(error) && (
          <p role="alert" className="my-3 text-sm text-destructive">
            {apiErrorMessage(error, t)}
          </p>
        )}
        {!data && (
          <Button variant="outline" disabled={loading} onClick={reload}>
            {t('correction.refresh')}
          </Button>
        )}
        {data && (
          <CorrectionEditor
            view={data}
            loading={loading}
            reload={reload}
            roundLabel={roundLabel}
            onResolved={() => {
              onResolved();
              onClose();
            }}
          />
        )}
      </DialogSurface>
    </AlertDialog.Root>
  );
}

function CorrectionEditor({
  view,
  loading,
  reload,
  roundLabel,
  onResolved,
}: {
  view: MatchCorrectionView;
  loading: boolean;
  reload: () => void;
  roundLabel: string;
  onResolved: () => void;
}) {
  const { t } = useTranslation();
  const [acceptedVersion, setAcceptedVersion] = useState(view.version);
  const [failure, setFailure] = useState<string | null>(null);
  const [shot, setShot] = useState('');
  const viewer = useImageViewer();
  const stale = acceptedVersion !== view.version;
  const match = view.match;
  return (
    <>
      <p className="mt-3 text-xs font-semibold">{t('correction.current')}</p>
      <MatchChatSummary
        status={match.status}
        homeTag={match.homeTag}
        awayTag={match.awayTag}
        result={match}
        onShot={(url) => {
          setShot(url);
          viewer.open(0);
        }}
      />
      <ImageViewer
        images={shot ? [{ url: shot, caption: t('correction.current') }] : []}
        index={viewer.index}
        onIndexChange={viewer.move}
        onClose={viewer.close}
      />
      {view.hasDependents && (
        <p className="my-3 text-xs text-muted-foreground">{t('correction.dependencies')}</p>
      )}
      {stale && (
        <div
          role="alert"
          className="my-3 rounded-md border border-amber-400/40 bg-amber-400/5 p-3 text-xs"
        >
          <p>{t('correction.stale')}</p>
          <Button
            className="mt-2"
            size="sm"
            variant="outline"
            onClick={() => {
              setAcceptedVersion(view.version);
              setFailure(null);
            }}
          >
            {t('correction.refresh')}
          </Button>
        </div>
      )}
      {failure && (
        <p role="alert" className="my-3 text-sm text-destructive">
          {failure}
        </p>
      )}
      <div className="mt-3">
        <DisputeCard
          match={{
            _id: match._id,
            phase: match.phase,
            groupIndex: match.groupIndex,
            round: match.round,
            scheduledAt: new Date(match.scheduledAt).toISOString(),
            home: { tag: match.homeTag, name: view.homeName },
            away: { tag: match.awayTag, name: view.awayName },
            homeClaim: match.homeClaim
              ? { ...match.homeClaim, noShow: match.homeClaim.noShow ?? null }
              : null,
            awayClaim: match.awayClaim
              ? { ...match.awayClaim, noShow: match.awayClaim.noShow ?? null }
              : null,
          }}
          roundLabel={roundLabel}
          correction={{ version: acceptedVersion, disabled: stale || loading }}
          onResolved={onResolved}
          onFailure={(message) => {
            setFailure(message);
            if (message) reload();
          }}
        />
      </div>
    </>
  );
}
