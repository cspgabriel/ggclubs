import { useEffect } from 'react';
import { useRealtimeConnected, useRealtimeTopic } from './use-realtime-topic';

/** Snapshot on subscription/reconnection; polling only while the socket is unavailable. */
export function useLiveQuery(topic: string | null, types: readonly string[], reload: () => void) {
  const connected = useRealtimeConnected();
  useRealtimeTopic(
    topic,
    (event) => {
      if (event.kind === 'resync' || types.includes(event.type)) reload();
    },
    { syncOnSubscribe: true },
  );
  useEffect(() => {
    if (!topic || connected) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [topic, connected, reload]);
}
