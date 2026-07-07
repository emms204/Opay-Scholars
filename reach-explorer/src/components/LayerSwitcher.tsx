import type { LayerMode, TimeMode } from '../types/reach';
import { useExplorerStore } from '../store/explorerStore';

const LAYERS: { id: LayerMode; label: string; desc: string }[] = [
  { id: 'states', label: 'States', desc: '36 states + FCT' },
  { id: 'zones', label: 'Zones', desc: '6 geopolitical zones' },
  { id: 'schools', label: 'Schools', desc: 'Institution points' },
];

const APPLICATION_VIEWS: { id: TimeMode; label: string; desc: string }[] = [
  { id: 'cumulative', label: 'Cumulative', desc: 'Applications up to selected period' },
  { id: 'weekly', label: 'This period', desc: 'New applications in selected period' },
];

export function LayerSwitcher() {
  const { layerMode, timeMode, setLayerMode, setTimeMode } = useExplorerStore();

  return (
    <div className="layer-switcher">
      <h3>Geography</h3>
      {LAYERS.map((l) => (
        <button
          key={l.id}
          type="button"
          data-testid={`layer-${l.id}`}
          className={layerMode === l.id ? 'active' : ''}
          onClick={() => setLayerMode(l.id)}
        >
          <strong>{l.label}</strong>
          <span>{l.desc}</span>
        </button>
      ))}
      <h3>Application view</h3>
      {APPLICATION_VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          data-testid={`application-view-${view.id}`}
          className={timeMode === view.id ? 'active' : ''}
          onClick={() => setTimeMode(view.id)}
        >
          <strong>{view.label}</strong>
          <span>{view.desc}</span>
        </button>
      ))}
    </div>
  );
}
