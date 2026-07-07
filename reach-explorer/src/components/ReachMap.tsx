import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { CollisionFilterExtension } from '@deck.gl/extensions';
import { GeoJsonLayer, ScatterplotLayer, TextLayer, ColumnLayer } from '@deck.gl/layers';
import type { FeatureCollection } from 'geojson';
import { useExplorerStore } from '../store/explorerStore';
import {
  filterSchools,
  cumulativeBandColor,
  elevationFromCount,
  cumulativeElevationMax,
  getCumulativeBands,
  STATE_CUMULATIVE_BANDS,
  getSchoolValue,
  getStateCumulative,
  getZoneValue,
  labelAltitude,
  formatMapTooltip,
  truncateLabel,
  mutedZeroColor,
  normalizeGeoName,
} from '../layers/scales';
import {
  buildSchoolLabelCandidates,
  buildStateLabelCandidates,
  buildZoneLabelCandidates,
  pinnedStateIds,
  type MapLabelCandidate,
  type StateLabelAnchors,
} from '../layers/labelLayout';
import type { SchoolRecord, StateRecord } from '../types/reach';

const collisionExtension = new CollisionFilterExtension();

const BASEMAP_TILES = 'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png';
const BASEMAP_ATTRIBUTION = '© OpenStreetMap © CARTO';
const NIGERIA_ZOOM = 5.2;
const MOBILE_NIGERIA_ZOOM = 4.25;
const NIGERIA_CENTER: [number, number] = [8.675, 9.082];

function getInitialZoom() {
  if (typeof window === 'undefined') return NIGERIA_ZOOM;
  return window.innerWidth <= 700 ? MOBILE_NIGERIA_ZOOM : NIGERIA_ZOOM;
}

interface MapLabel extends MapLabelCandidate {}

function makeMapLabelLayer(
  id: string,
  labels: MapLabel[],
  use3D: boolean,
  opts: { size?: number; bold?: boolean } = {},
) {
  const floating = use3D;
  return new TextLayer({
    id,
    data: labels,
    pickable: false,
    billboard: true,
    background: true,
    characterSet: 'auto',
    extensions: [collisionExtension],
    collisionEnabled: labels.length > 1,
    getCollisionPriority: (d: MapLabel) => d.priority,
    collisionTestProps: { sizeScale: 1.1, sizeMaxPixels: 52, sizeMinPixels: 0 },
    parameters: floating ? { depthTest: false, depthMask: false } : undefined,
    getPosition: (d: MapLabel) => [d.lng, d.lat, labelAltitude(d.elevation, floating)],
    getText: (d: MapLabel) => d.text,
    getSize: opts.size ?? (floating ? 12 : 11),
    getColor: floating ? [186, 230, 253, 255] : [30, 41, 59, 255],
    getBackgroundColor: floating ? [15, 23, 42, 210] : [255, 255, 255, 225],
    getBorderColor: floating ? [94, 234, 212, 230] : [148, 163, 184, 200],
    getBorderWidth: 1,
    padding: floating ? [5, 8] : [3, 6],
    fontFamily: 'DM Sans, system-ui, sans-serif',
    fontWeight: opts.bold ? 700 : 600,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    updateTriggers: {
      getPosition: [use3D],
      getSize: [use3D],
    },
  });
}

export function ReachMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const geoRef = useRef<FeatureCollection | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [labelAnchors, setLabelAnchors] = useState<StateLabelAnchors>({});
  const [mapZoom, setMapZoom] = useState(getInitialZoom);

  const {
    data,
    layerMode,
    timeMode,
    periodIndex,
    selectedState,
    selectedZone,
    setSelectedState,
    setSelectedZone,
    setSelectedSchool,
    setHoveredState,
    schoolFilter,
    searchQuery,
    appMode,
    storyIndex,
    playing,
    setPeriodIndex,
    compareState,
    use3D,
    selectedSchool,
    hoveredState,
  } = useExplorerStore();

  useEffect(() => {
    fetch('./data/state_label_anchors.json')
      .then((r) => r.json())
      .then((anchors: StateLabelAnchors) => setLabelAnchors(anchors))
      .catch(() => setLabelAnchors({}));
  }, []);

  const showTooltip = useCallback((x: number, y: number, html: string) => {
    const tip = tooltipRef.current;
    if (!tip) return;
    tip.style.display = 'block';
    tip.style.left = `${x + 12}px`;
    tip.style.top = `${y + 12}px`;
    tip.innerHTML = html;
  }, []);

  const hideTooltip = useCallback(() => {
    const tip = tooltipRef.current;
    if (tip) tip.style.display = 'none';
    setHoveredState(null);
  }, [setHoveredState]);

  const flyToState = useCallback((state: StateRecord) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [state.centroid.lng, state.centroid.lat],
      zoom: 7.5,
      pitch: use3D ? 45 : 0,
      duration: 1800,
    });
  }, [use3D]);

  const flyToZone = useCallback((zoneName: string) => {
    const map = mapRef.current;
    if (!data || !map) return;
    const zone = data.zones.find((z) => z.name === zoneName);
    if (!zone) return;
    const states = data.states.filter((s) => zone.states.includes(s.name));
    if (!states.length) return;
    const lngs = states.map((s) => s.centroid.lng);
    const lats = states.map((s) => s.centroid.lat);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs) - 0.5, Math.min(...lats) - 0.5],
      [Math.max(...lngs) + 0.5, Math.max(...lats) + 0.5],
    ];
    map.fitBounds(bounds, { padding: 80, pitch: use3D ? 45 : 0, duration: 1800 });
  }, [data, use3D]);

  const buildLayers = useCallback(() => {
    if (!data || !geoRef.current) return [];

    const period = data.periods[periodIndex];
    const geoLayer = layerMode === 'zones' ? 'zones' : 'states';
    const colorBands = getCumulativeBands(geoLayer);
    const elevMax = cumulativeElevationMax(geoLayer);
    const stateForFeature = (f: { properties: { name: string } }) => {
      const name = normalizeGeoName(f.properties.name);
      return data.states.find((s) => s.name === name);
    };

    const featureCumulative = (state: StateRecord) => (
      layerMode === 'zones'
        ? getZoneValue(data, state.zone, period, 'cumulative')
        : getStateCumulative(state, period)
    );
    const layers: (GeoJsonLayer | ScatterplotLayer | TextLayer | ColumnLayer)[] = [];

    if (layerMode === 'states' || layerMode === 'zones') {
      layers.push(
        new GeoJsonLayer({
          id: 'states-fill',
          data: geoRef.current,
          pickable: true,
          stroked: !use3D,
          filled: true,
          extruded: use3D,
          wireframe: false,
          material: false,
          getElevation: (f: { properties: { name: string } }) => {
            const state = stateForFeature(f);
            if (!state || !use3D) return 0;
            return elevationFromCount(featureCumulative(state), elevMax);
          },
          getFillColor: (f: { properties: { name: string } }) => {
            const state = stateForFeature(f);
            if (!state) return mutedZeroColor();
            return cumulativeBandColor(featureCumulative(state), colorBands);
          },
          getLineColor: (f: { properties: { name: string } }) => {
            const state = stateForFeature(f);
            if (!state) return [107, 114, 128, 80];
            if (use3D) {
              const fill = cumulativeBandColor(featureCumulative(state), colorBands);
              return [fill[0], fill[1], fill[2], 255];
            }
            return [75, 85, 99, 120];
          },
          lineWidthMinPixels: use3D ? 0 : 0.75,
          updateTriggers: {
            getFillColor: [periodIndex, layerMode],
            getElevation: [periodIndex, layerMode, use3D],
            getLineColor: [periodIndex, layerMode, use3D],
          },
          onHover: (info) => {
            if (!info.object) {
              hideTooltip();
              return;
            }
            const name = normalizeGeoName(info.object.properties.name);
            const state = data.states.find((s) => s.name === name);
            if (!state) {
              hideTooltip();
              return;
            }
            const cumulative = featureCumulative(state);
            setHoveredState(name);
            const label = layerMode === 'zones' ? state.zone : name;
            showTooltip(info.x, info.y, formatMapTooltip(label, cumulative));
          },
          onClick: (info) => {
            if (!info.object) return;
            const name = normalizeGeoName(info.object.properties.name);
            const state = data.states.find((s) => s.name === name);
            if (!state) return;
            if (layerMode === 'zones') {
              setSelectedZone(state.zone);
              setSelectedState(null);
              setSelectedSchool(null);
              flyToZone(state.zone);
            } else if (compareState && state.name !== compareState.name) {
              setSelectedState(state);
              setSelectedZone(null);
              flyToState(state);
            } else {
              setSelectedState(state);
              setSelectedZone(null);
              flyToState(state);
            }
          },
        }),
      );

      if (layerMode === 'states') {
        const elevFn = (cumulative: number) => elevationFromCount(cumulative, elevMax);
        const stateLabels = buildStateLabelCandidates(data, period, labelAnchors, elevFn, {
          zoom: mapZoom,
          use3D,
          pinnedIds: pinnedStateIds(selectedState, hoveredState, compareState),
        });
        layers.push(makeMapLabelLayer('state-labels', stateLabels, use3D));
      }

      if (layerMode === 'zones') {
        const elevFn = (cumulative: number) => elevationFromCount(cumulative, elevMax);
        const zoneLabels = buildZoneLabelCandidates(data, period, labelAnchors, elevFn);
        layers.push(makeMapLabelLayer('zone-labels', zoneLabels, use3D, {
          size: use3D ? 15 : 14,
          bold: true,
        }));
      }
    }

    if (layerMode === 'schools') {
      const candidateSchools = filterSchools(data, {
        state: selectedState?.name ?? null,
        zone: selectedZone ?? null,
        filter: schoolFilter,
        query: searchQuery,
      });
      const schools = candidateSchools.filter((s) => getSchoolValue(s, period, 'cumulative') > 0);
      const schoolElevMax = Math.max(
        ...candidateSchools.map((s) => s.applications),
        1,
      );
      const elevFn = (cumulative: number) => elevationFromCount(cumulative, schoolElevMax);

      // Flat state context under school pillars
      layers.push(
        new GeoJsonLayer({
          id: 'states-underlay',
          data: geoRef.current,
          pickable: false,
          stroked: true,
          filled: true,
          extruded: false,
          getFillColor: () => mutedZeroColor(90),
          getLineColor: [148, 163, 184, 80],
          lineWidthMinPixels: 0.5,
        }),
      );

      if (use3D) {
        layers.push(
          new ColumnLayer({
            id: 'schools-columns',
            data: schools,
            diskResolution: 10,
            radius: 3200,
            extruded: true,
            pickable: true,
            material: false,
            getPosition: (d) => [d.lng!, d.lat!],
            getFillColor: (d) => cumulativeBandColor(
              getSchoolValue(d, period, 'cumulative'),
              STATE_CUMULATIVE_BANDS,
            ),
            getElevation: (d) => elevationFromCount(
              getSchoolValue(d, period, 'cumulative'),
              schoolElevMax,
            ),
            updateTriggers: {
              getFillColor: [periodIndex],
              getElevation: [periodIndex, use3D],
            },
            onHover: (info) => {
              if (!info.object) {
                hideTooltip();
                return;
              }
              const school = info.object as SchoolRecord;
              showTooltip(
                info.x,
                info.y,
                formatMapTooltip(school.name, getSchoolValue(school, period, 'cumulative')),
              );
            },
            onClick: (info) => {
              if (info.object) setSelectedSchool(info.object as SchoolRecord);
            },
          }),
        );

        const schoolLabels = buildSchoolLabelCandidates(
          schools.map((school) => ({
            id: school.id,
            name: school.name,
            lng: school.lng!,
            lat: school.lat!,
            cumulative: getSchoolValue(school, period, 'cumulative'),
          })),
          elevFn,
          { zoom: mapZoom, use3D, truncate: truncateLabel },
        );
        layers.push(makeMapLabelLayer('school-labels-3d', schoolLabels, true, { size: 10 }));
      } else {
        layers.push(
          new ScatterplotLayer({
            id: 'schools-points',
            data: schools,
            pickable: true,
            getPosition: (d) => [d.lng!, d.lat!],
            getRadius: (d) => 6000 + (getSchoolValue(d, period, 'cumulative') / schoolElevMax) * 14000,
            getFillColor: (d) => cumulativeBandColor(
              getSchoolValue(d, period, 'cumulative'),
              STATE_CUMULATIVE_BANDS,
            ),
            getLineColor: [255, 255, 255, 180],
            stroked: true,
            lineWidthMinPixels: 1,
            radiusMinPixels: 4,
            radiusMaxPixels: 28,
            updateTriggers: {
              getFillColor: [periodIndex],
              getRadius: [periodIndex],
            },
            onHover: (info) => {
              if (!info.object) {
                hideTooltip();
                return;
              }
              const school = info.object as SchoolRecord;
              showTooltip(
                info.x,
                info.y,
                formatMapTooltip(school.name, getSchoolValue(school, period, 'cumulative')),
              );
            },
            onClick: (info) => {
              if (info.object) setSelectedSchool(info.object as SchoolRecord);
            },
          }),
        );

        const schoolLabels = buildSchoolLabelCandidates(
          schools.map((school) => ({
            id: school.id,
            name: school.name,
            lng: school.lng!,
            lat: school.lat!,
            cumulative: getSchoolValue(school, period, 'cumulative'),
          })),
          () => 0,
          { zoom: mapZoom, use3D: false, truncate: truncateLabel },
        );
        layers.push(makeMapLabelLayer('school-labels-2d', schoolLabels, false, { size: 10 }));
      }
    }

    return layers;
  }, [
    data, layerMode, timeMode, periodIndex, selectedState, selectedZone,
    schoolFilter, searchQuery, setSelectedState, setSelectedZone, setSelectedSchool,
    setHoveredState, flyToState, flyToZone, compareState, showTooltip, hideTooltip, use3D,
    mapZoom, labelAnchors, hoveredState,
  ]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          base: {
            type: 'raster',
            tiles: [BASEMAP_TILES],
            tileSize: 256,
            attribution: BASEMAP_ATTRIBUTION,
          },
        },
        layers: [{ id: 'base', type: 'raster', source: 'base' }],
      },
      center: NIGERIA_CENTER,
      zoom: getInitialZoom(),
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const syncZoom = () => setMapZoom(map.getZoom());
    map.on('zoom', syncZoom);
    map.on('moveend', syncZoom);

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);
    overlayRef.current = overlay;
    mapRef.current = map;

    fetch('./geo/nigeria-states.geojson')
      .then((r) => r.json())
      .then((geo) => {
        geoRef.current = geo;
        overlay.setProps({ layers: buildLayers() });
      });

    return () => {
      map.off('zoom', syncZoom);
      map.off('moveend', syncZoom);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers
  useEffect(() => {
    overlayRef.current?.setProps({ layers: buildLayers() });
  }, [buildLayers]);

  // Dark basemap without baked-in labels — we render our own
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyTiles = () => {
      const source = map.getSource('base') as maplibregl.RasterTileSource | undefined;
      source?.setTiles?.([BASEMAP_TILES]);
    };
    if (map.isStyleLoaded()) applyTiles();
    else map.once('load', applyTiles);
  }, []);

  // 2.5D camera pitch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: use3D ? 45 : 0, duration: 800 });
  }, [use3D]);

  // Return to national view when drill-down is cleared
  const hadSelectionRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    const hasSelection = !!(selectedState || selectedZone || selectedSchool);
    if (hadSelectionRef.current && !hasSelection && map) {
      map.flyTo({
        center: NIGERIA_CENTER,
        zoom: getInitialZoom(),
        pitch: use3D ? 45 : 0,
        duration: 1200,
      });
    }
    hadSelectionRef.current = hasSelection;
  }, [selectedState, selectedZone, selectedSchool, use3D]);

  // Timeline play
  useEffect(() => {
    if (!playing || !data) return;
    const id = window.setInterval(() => {
      const next = periodIndex + 1;
      if (next >= data.periods.length) {
        useExplorerStore.getState().setPlaying(false);
      } else {
        setPeriodIndex(next);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [playing, data, periodIndex, setPeriodIndex]);

  // Story mode camera (beat visual config applied by useStoryDirector)
  useEffect(() => {
    if (appMode !== 'story' || !data?.story_beats?.[storyIndex]) return;
    const beat = data.story_beats[storyIndex];
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: beat.camera.center as [number, number],
      zoom: beat.camera.zoom,
      pitch: 0,
      duration: 2000,
    });
  }, [appMode, storyIndex, data]);

  return (
    <div className="map-wrap" data-testid="reach-map">
      <div ref={containerRef} className="map-container" />
      <div ref={tooltipRef} className="map-tooltip" data-testid="map-tooltip" />
    </div>
  );
}
