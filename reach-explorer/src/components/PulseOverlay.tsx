import { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExplorerStore } from '../store/explorerStore';
import { isStateNewlyReached } from '../layers/scales';

function PulseRing({ delay = 0 }: { delay?: number }) {
  const ref = useMemo(() => ({ current: null as THREE.Mesh | null }), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = (clock.getElapsedTime() + delay) % 2.2;
    const scale = 0.6 + t * 1.4;
    mesh.scale.set(scale, scale, 1);
    (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - t / 2.2);
  });
  return (
    <mesh ref={(m) => { ref.current = m; }}>
      <ringGeometry args={[0.7, 1, 48]} />
      <meshBasicMaterial color="#ffb540" transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

function StoryPulseCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }} className="story-pulse-canvas">
      <PulseRing delay={0} />
      <PulseRing delay={0.7} />
      <PulseRing delay={1.4} />
    </Canvas>
  );
}

/** Cinematic pulse overlay during Story beats and timeline play. */
export function PulseOverlay() {
  const { playing, appMode, data, storyIndex, periodIndex } = useExplorerStore();

  const beat = appMode === 'story' ? data?.story_beats?.[storyIndex] : null;
  const showPulse = playing
    || (beat?.effects?.includes('pulse_new_states') ?? false)
    || (beat?.effects?.includes('surge') ?? false);

  if (!showPulse) return null;

  const period = data?.periods[periodIndex];
  const newStateCount = period && data
    ? data.states.filter((s) => isStateNewlyReached(s, data.periods, period)).length
    : 0;

  return (
    <div className="pulse-overlay" aria-hidden data-testid="pulse-overlay">
      <StoryPulseCanvas />
      {appMode === 'story' && newStateCount > 0 && (
        <span className="pulse-badge">+{newStateCount} new</span>
      )}
    </div>
  );
}
