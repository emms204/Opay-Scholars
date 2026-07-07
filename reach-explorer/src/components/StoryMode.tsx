import { useExplorerStore } from '../store/explorerStore';
import { useStoryDirector } from '../hooks/useStoryDirector';

export function StoryMode() {
  useStoryDirector();

  const {
    data,
    storyIndex,
    setStoryIndex,
    setAppMode,
    setStoryAutoPlay,
    appMode,
    storyAutoPlay,
    setTimeMode,
  } = useExplorerStore();

  if (!data || appMode !== 'story') return null;

  const beat = data.story_beats[storyIndex];
  if (!beat) return null;

  const exitStory = () => {
    setStoryAutoPlay(false);
    const exit = beat.on_exit ?? { app_mode: 'explore', period_index: 5, time_mode: 'cumulative' };
    setAppMode(exit.app_mode ?? 'explore');
    if (exit.period_index != null) useExplorerStore.getState().setPeriodIndex(exit.period_index);
    setTimeMode(exit.time_mode ?? 'cumulative');
  };

  return (
    <div className="story-overlay" data-testid="story-overlay">
      <div className="story-card">
        <span className="story-step" data-testid="story-step">
          {storyIndex + 1} / {data.story_beats.length}
        </span>
        <p data-testid="story-caption">{beat.text}</p>
        <div className="story-nav">
          <button
            type="button"
            disabled={storyIndex === 0}
            onClick={() => {
              setStoryAutoPlay(false);
              setStoryIndex(storyIndex - 1);
            }}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={storyIndex >= data.story_beats.length - 1}
            onClick={() => {
              setStoryAutoPlay(false);
              setStoryIndex(storyIndex + 1);
            }}
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setStoryAutoPlay(!storyAutoPlay)}
          >
            {storyAutoPlay ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={exitStory}>
            Explore on your own
          </button>
        </div>
      </div>
    </div>
  );
}
