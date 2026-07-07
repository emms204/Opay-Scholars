import {
  getCumulativeBands,
  STATE_CUMULATIVE_BANDS,
  ZONE_CUMULATIVE_BANDS,
} from '../layers/scales';
import { useExplorerStore } from '../store/explorerStore';

export function MapLegend() {
  const { data, layerMode } = useExplorerStore();
  if (!data) return null;

  const geoLayer = layerMode === 'zones' ? 'zones' : 'states';
  const bands = getCumulativeBands(geoLayer);

  return (
    <div className="map-legend" data-testid="map-legend">
      <div>
        <p className="legend-kicker">Cumulative applications</p>
        <h2>Fixed color bands</h2>
      </div>
      <p className="legend-note">
        Same thresholds from Week 1 through Final. Labels use polygon anchors with collision avoidance;
        zoom in to reveal more state names. In 3D, fewer floating labels — pinned selection always shown.
      </p>
      <div className="legend-bins" aria-label="Cumulative color legend">
        <div className="legend-bin">
          <span className="legend-swatch" style={{ background: 'rgb(226, 232, 240)' }} />
          <span>0</span>
        </div>
        {bands.map((band) => (
          <div key={band.label} className="legend-bin">
            <span
              className="legend-swatch"
              style={{
                background: `linear-gradient(90deg, rgb(${band.light.join(',')}), rgb(${band.dark.join(',')}))`,
              }}
            />
            <span>{band.label}</span>
          </div>
        ))}
      </div>
      <p className="legend-accounting">
        {geoLayer === 'zones'
          ? `Zone bands calibrated to final range (${ZONE_CUMULATIVE_BANDS[0].label}–${ZONE_CUMULATIVE_BANDS[ZONE_CUMULATIVE_BANDS.length - 1].label}).`
          : `State bands calibrated to final median ${36} and max ${279} (Lagos).`}
        {' '}
        {data.accounting.on_map.toLocaleString()} of {data.accounting.total.toLocaleString()} on map.
      </p>
    </div>
  );
}
