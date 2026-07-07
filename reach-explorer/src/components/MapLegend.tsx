import { useExplorerStore } from '../store/explorerStore';
import { getHeatmapBins } from '../layers/scales';

export function MapLegend() {
  const { data, layerMode, timeMode } = useExplorerStore();
  if (!data) return null;

  const title = layerMode === 'zones'
    ? 'Geopolitical-zone heatmap'
    : layerMode === 'schools'
      ? 'School application pillars'
      : 'State application heatmap';
  const note = timeMode === 'weekly'
    ? 'Colour and height show applications added during the selected period.'
    : 'Colour and height show applications accumulated up to the selected period.';
  const bins = getHeatmapBins(layerMode);

  return (
    <div className="map-legend" data-testid="map-legend">
      <div>
        <p className="legend-kicker">Mapped geography</p>
        <h2>{title}</h2>
      </div>
      <p className="legend-note">{note}</p>
      <div className="legend-bins" aria-label="Application count legend">
        {bins.map((bin) => (
          <div key={bin.label} className="legend-bin">
            <span
              className="legend-swatch"
              style={{ background: `rgb(${bin.color[0]}, ${bin.color[1]}, ${bin.color[2]})` }}
            />
            <span>{bin.label}</span>
          </div>
        ))}
      </div>
      <p className="legend-accounting">
        {data.accounting.on_map.toLocaleString()} of {data.accounting.total.toLocaleString()} applications on map
      </p>
    </div>
  );
}
