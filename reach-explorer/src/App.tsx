import { useReachData } from './hooks/useReachData';
import { ReachMap } from './components/ReachMap';
import { MapLegend } from './components/MapLegend';
import { Timeline } from './components/Timeline';
import { LayerSwitcher } from './components/LayerSwitcher';
import { SidePanel } from './components/SidePanel';
import { StoryMode } from './components/StoryMode';
import { useExplorerStore } from './store/explorerStore';
import './styles/app.css';

export default function App() {
  useReachData();
  const { loading, error, appMode, setAppMode } = useExplorerStore();

  if (loading) {
    return (
      <div className="app loading-screen">
        <p>Loading OPay Scholars 2026…</p>
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
          <h1>OPay Scholars 2026</h1>
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
    </div>
  );
}
