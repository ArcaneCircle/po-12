import { useEffect, useRef, useState, useCallback } from "react";
import { RealTime, type Peer } from "@webxdc/realtime";
import type { RealtimeAction, PeerState } from "@/lib/realtime";

/**
 * Custom hook that joins the webxdc realtime channel, tracks peer count,
 * and exposes sendAction / onRemoteAction.
 *
 * If window.webxdc is undefined (plain browser / dev preview), the hook
 * returns peerCount=0 and a no-op sendAction so the rest of the app works
 * without changes.
 */
const useRealtime = (onRemoteAction: (action: RealtimeAction) => void) => {
  const [peerCount, setPeerCount] = useState(0);

  // Keep a stable ref to the callback so the channel subscription never
  // needs to be torn down just because the callback identity changed.
  const onRemoteActionRef = useRef(onRemoteAction);
  useEffect(() => {
    onRemoteActionRef.current = onRemoteAction;
  });

  // Map of peerId -> last processed ts, to avoid re-running the same action.
  const processedTs = useRef<Map<string, number>>(new Map());

  // Ref to the RealTime instance.
  const rtRef = useRef<RealTime<PeerState, RealtimeAction> | null>(null);

  useEffect(() => {
    // Guard: only join when running inside a webxdc context.
    if (
      typeof window === "undefined" ||
      !(window as unknown as Record<string, unknown>).webxdc
    ) {
      return;
    }

    const rt = new RealTime<PeerState, RealtimeAction>({
      state: { action: null, ts: 0 },
      onPeersChanged: (peers: Peer<PeerState>[]) => {
        setPeerCount(peers.length);

        for (const peer of peers) {
          const { state, id } = peer;
          if (!state || state.action === null) continue;

          const lastTs = processedTs.current.get(id) ?? -1;
          if (state.ts > lastTs) {
            processedTs.current.set(id, state.ts);
            onRemoteActionRef.current(state.action);
          }
        }
      },
      onPayload: (_deviceId: string, action: RealtimeAction) => {
        onRemoteActionRef.current(action);
      },
    });

    rt.connect();
    rtRef.current = rt;

    return () => {
      rt.disconnect();
      rtRef.current = null;
    };
  }, []);

  const sendAction = useCallback((action: RealtimeAction) => {
    const rt = rtRef.current;
    if (!rt) return;
    rt.setState({ action, ts: Date.now() });
    rt.sendPayload(action);
  }, []);

  return { peerCount, sendAction };
};

export default useRealtime;
