import { useEffect, useRef } from 'react';
import { useExplorerStore } from '../store/explorerStore';
import type { StoryBeat } from '../types/reach';

function applyBeat(beat: StoryBeat) {
  const store = useExplorerStore.getState();
  if (beat.layer) store.setLayerMode(beat.layer);
  if (beat.period_index != null) store.setPeriodIndex(beat.period_index);
  if (beat.time_mode) store.setTimeMode(beat.time_mode);
  if (beat.use_3d != null) store.setUse3D(beat.use_3d);
  store.setPlaying(Boolean(beat.playing));
}

/** Applies story beat config and auto-advances after each beat duration. */
export function useStoryDirector() {
  const {
    data,
    appMode,
    storyIndex,
    storyAutoPlay,
    setStoryIndex,
    setStoryAutoPlay,
    setAppMode,
    setPeriodIndex,
    setTimeMode,
  } = useExplorerStore();

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (appMode !== 'story' || !data?.story_beats?.length) return;

    const beat = data.story_beats[storyIndex];
    if (!beat) return;

    applyBeat(beat);

    if (!storyAutoPlay) return;

    const duration = beat.duration_ms ?? 7000;
    timerRef.current = window.setTimeout(() => {
      const next = storyIndex + 1;
      if (next >= data.story_beats.length) {
        setStoryAutoPlay(false);
        const exit = beat.on_exit;
        if (exit?.app_mode) setAppMode(exit.app_mode);
        if (exit?.period_index != null) setPeriodIndex(exit.period_index);
        if (exit?.time_mode) setTimeMode(exit.time_mode);
        return;
      }
      setStoryIndex(next);
    }, duration);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [
    appMode,
    data,
    storyIndex,
    storyAutoPlay,
    setStoryIndex,
    setStoryAutoPlay,
    setAppMode,
    setPeriodIndex,
    setTimeMode,
  ]);
}
