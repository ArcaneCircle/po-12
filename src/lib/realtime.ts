export type RealtimeAction =
  | { type: "button_press"; buttonNumber: number }
  | { type: "pattern_toggle"; patternIndex: number; beatIndex: number; note: number }
  | { type: "bpm_change"; bpm: number }
  | { type: "sound_select"; sound: number }
  | { type: "pattern_queue"; pattern: number }
  | { type: "play_toggle"; playing: boolean }
  | { type: "record_toggle"; recording: boolean };

/** The state each peer broadcasts on the channel. */
export type PeerState = {
  action: RealtimeAction | null;
  ts: number; // monotonically increasing so peers can detect new actions
};
