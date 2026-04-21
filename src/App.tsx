import PocketOperator from "./components/PocketOperator";
import classes from "./App.module.scss";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePatterns } from "@/hooks/usePattern";
import useCurrentBeat from "@/hooks/useCurrentBeat";

import { SelectingMode } from "@/lib/utils";
import InstructionsModal from "@/components/InstructionsPaper/InstructionsModal";
import HelpButton from "@/components/HelpButton/HelpButton";
import useIsTouchDevice from "@/hooks/useIsTouchDevice";
import ProductTour from "@/components/ProductTour";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import useSelectedPattern from "@/hooks/useSelectedPattern";
import useBPM from "@/hooks/useBPM";
import useRealtime from "@/hooks/useRealtime";
import type { RealtimeAction } from "@/lib/realtime";
import { getNextBPM } from "@/lib/bpm";

const defaultTilt = { x: 0, y: 0 };

function App() {
  const onTouchDevice = useIsTouchDevice();

  const [show, setShowing] = useState(false);

  const [productTourMode, setProductTourMode] = useLocalStorage<
    "finished" | "intro" | "tour" | undefined
  >("pocketOperatorProductTourMode", undefined);

  // right when we start, transition in to showing the intro mode.
  // this makes sure the intro doesn't show up in the preview
  useEffect(() => {
    setTimeout(() => setProductTourMode((curMode) => curMode ?? "intro"), 100);
  }, [setProductTourMode]);

  const {
    patterns,
    supportedPatternIndices,
    togglePatternNote,
    setPatternsFromFile,
    setUploadFailed,
    uploadingState,
    resetPatterns,
  } = usePatterns();

  const { bpm, setBPM, goToNextBPM, resetBPM } = useBPM();

  const [selectedSound, setSelectedSound] = useLocalStorage(
    "pocketOperatorSelectedSound",
    1,
  );

  const resetSelectedSound = () => setSelectedSound(1);

  const [selectingMode, setSelectingMode] = useState<SelectingMode>(
    SelectingMode.DEFAULT,
  );
  const resetSelectingMode = () => setSelectingMode(SelectingMode.DEFAULT);

  // are we currently recording?
  const [recording, setRecording] = useState<boolean>(false);

  const { currentBeat, playing, togglePlaying, pause } = useCurrentBeat(bpm);

  // the current index of the beat, or -1 if not playing
  // used to show how the beat progresses across the device
  const currentBeatIndex = useMemo(
    () => (playing ? Math.floor(currentBeat) % 16 : -1),
    [currentBeat, playing],
  );

  const {
    currentPattern,
    selectedPattern,
    queueSelectedPattern,
    queuedSelectedPattern,
  } = useSelectedPattern({
    currentBeatIndex,
    patterns,
    playing,
    bpm,
  });

  // Ref to the remote button press handler registered by PocketOperator.
  const remoteButtonPressRef = useRef<((buttonNumber: number) => void) | null>(null);

  const handleRemoteAction = useCallback(
    (action: RealtimeAction) => {
      switch (action.type) {
        case "button_press":
          remoteButtonPressRef.current?.(action.buttonNumber);
          break;
        case "pattern_toggle":
          togglePatternNote(action.patternIndex, action.beatIndex, action.note);
          break;
        case "bpm_change":
          setBPM(action.bpm);
          break;
        case "sound_select":
          setSelectedSound(action.sound);
          break;
        case "pattern_queue":
          queueSelectedPattern(action.pattern);
          break;
        case "play_toggle":
          if (action.playing !== playing) togglePlaying();
          break;
        case "record_toggle":
          if (action.recording !== recording) setRecording(action.recording);
          break;
      }
    },
    [
      togglePatternNote,
      setBPM,
      setSelectedSound,
      queueSelectedPattern,
      playing,
      togglePlaying,
      recording,
      setRecording,
    ],
  );

  const { peerCount, sendAction } = useRealtime(handleRemoteAction);

  return (
    <div className={classes.pocketOperatorPageContainer}>
      <div className={classes.container}>
        <div className={classes.pocketOperatorInTotal}>
          <PocketOperator
            className={classes.body}
            onBroadcastButtonPress={(buttonNumber) =>
              sendAction({ type: "button_press", buttonNumber })
            }
            remoteButtonPress={(fn) => {
              remoteButtonPressRef.current = fn;
            }}
            patternConfig={{
              patterns,
              supportedPatternIndices,
              togglePatternNote: (patternIndex, beatIndex, note) => {
                togglePatternNote(patternIndex, beatIndex, note);
                sendAction({ type: "pattern_toggle", patternIndex, beatIndex, note });
              },
              setPatternsFromFile,
              setUploadFailed,
              uploadingState,
              bpm,
              setBPM: (newBpm) => {
                setBPM(newBpm);
                sendAction({ type: "bpm_change", bpm: newBpm });
              },
              goToNextBPM: () => {
                goToNextBPM();
                sendAction({ type: "bpm_change", bpm: getNextBPM(bpm) });
              },
              selectedSound,
              setSelectedSound: (sound) => {
                setSelectedSound(sound);
                sendAction({ type: "sound_select", sound });
              },
              selectingMode,
              setSelectingMode,
              recording,
              setRecording,
              currentBeat,
              playing,
              togglePlaying: () => {
                togglePlaying();
                sendAction({ type: "play_toggle", playing: !playing });
              },
              currentBeatIndex,
              currentPattern,
              selectedPattern,
              queueSelectedPattern: (pattern) => {
                queueSelectedPattern(pattern);
                sendAction({ type: "pattern_queue", pattern });
              },
              queuedSelectedPattern,
            }}
          />
        </div>
      </div>

      {peerCount > 0 && (
        <div className={classes.onlineUsers} aria-label={`${peerCount} online`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="white"
            aria-hidden="true"
          >
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
          <span>{peerCount}</span>
        </div>
      )}

      {productTourMode === "finished" && (
        <>
          <HelpButton
            onClick={() => setShowing(true)}
            onTouchDevice={onTouchDevice}
          />
          <InstructionsModal
            showing={show}
            setShowing={setShowing}
            takeTour={() => {
              setShowing(false);
              setProductTourMode("intro");
            }}
          />
        </>
      )}

      <ProductTour
        productTourMode={productTourMode}
        setProductTourMode={setProductTourMode}
        onTourStart={() => {
          resetPatterns();
          resetBPM();
          resetSelectedSound();
          resetSelectingMode();
          setRecording(false);
          pause();
        }}
        tilt={defaultTilt}
      />
    </div>
  );
}

export default App;
