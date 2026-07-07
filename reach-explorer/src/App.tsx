import { useReachData } from './hooks/useReachData';
import { ReachMap } from './components/ReachMap';
import { Timeline } from './components/Timeline';
import { LayerSwitcher } from './components/LayerSwitcher';
import { SidePanel } from './components/SidePanel';
import { StoryMode } from './components/StoryMode';
import { PulseOverlay } from './components/PulseOverlay';
import { MapLegend } from './components/MapLegend';
import { useExplorerStore } from './store/explorerStore';
import './styles/app.css';

export default function App() {
  useReachData();
  const { loading, error, appMode, setAppMode } = useExplorerStore();

  if (loading) {
    return (
      <div className="app loading-screen">
        <p>Loading Nigeria Innovation Reach Explorer…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app loading-screen error">
        <p>Failed to load: {error}</p>
        <p>Run <code>python geo/build_reach_data.py</code> first.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">OPay Scholars 2026</p>
          <h1>Mapped Applications Reach Explorer</h1>
        </div>
        <div className="mode-toggle">
          <button
            type="button"
            className={appMode === 'story' ? 'active' : ''}
            onClick={() => setAppMode('story')}
          >
            Story
          </button>
          <button
            type="button"
            className={appMode === 'explore' ? 'active' : ''}
            onClick={() => setAppMode('explore')}
          >
            Explore
          </button>
        </div>
      </header>
      <main className="app-main">
        <LayerSwitcher />
        <div className="map-column">
          <ReachMap />
          <MapLegend />
          <Timeline />
        </div>
        <SidePanel />
      </main>
      <StoryMode />
      <PulseOverlay />
    </div>
  );
}
