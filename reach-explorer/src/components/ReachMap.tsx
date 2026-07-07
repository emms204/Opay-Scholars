import { useEffect, useRef, useCallback } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { FeatureCollection } from 'geojson';
import { useExplorerStore } from '../store/explorerStore';
import {
  filterSchools,
  getSchoolValue,
  getSchoolScaleMax,
  getStateCumulative,
  getStateValue,
  getStateScaleMax,
  getStateWeekly,
  getZoneValue,
  getZoneWeekly,
  getZoneScaleMax,
  mutedZeroColor,
  normalizeGeoName,
  tealFromCount,
} from '../layers/scales';
import type { SchoolRecord, StateRecord } from '../types/reach';

const NIGERIA_CENTER: [number, number] = [8.675, 9.082];
const NIGERIA_ZOOM = 5.2;
const MOBILE_NIGERIA_ZOOM = 4.25;

function getInitialZoom() {
  if (typeof window === 'undefined') return NIGERIA_ZOOM;
  return window.innerWidth <= 700 ? MOBILE_NIGERIA_ZOOM : NIGERIA_ZOOM;
}

export function ReachMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const geoRef = useRef<FeatureCollection | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
  } = useExplorerStore();

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
      pitch: 0,
      duration: 1800,
    });
  }, []);

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
    map.fitBounds(bounds, { padding: 80, pitch: 0, duration: 1800 });
  }, [data]);

  const buildLayers = useCallback(() => {
    if (!data || !geoRef.current) return [];

    const period = data.periods[periodIndex];
    const scaleMax = layerMode === 'zones'
      ? getZoneScaleMax(data, timeMode)
      : getStateScaleMax(data, timeMode);
    const stateForFeature = (f: { properties: { name: string } }) => {
      const name = normalizeGeoName(f.properties.name);
      return data.states.find((s) => s.name === name);
    };

    const featureCumulative = (state: StateRecord) => (
      layerMode === 'zones'
        ? getZoneValue(data, state.zone, period, 'cumulative')
        : getStateCumulative(state, period)
    );
    const featureValue = (state: StateRecord) => (
      layerMode === 'zones'
        ? getZoneValue(data, state.zone, period, timeMode)
        : getStateValue(state, period, timeMode)
    );
    const featureWeekly = (state: StateRecord) => (
      layerMode === 'zones'
        ? getZoneWeekly(data, state.zone, period)
        : getStateWeekly(state, period)
    );
    const featureFinal = (state: StateRecord) => (
      layerMode === 'zones'
        ? data.zones.find((z) => z.name === state.zone)?.applications ?? 0
        : state.applications
    );
    const layers: (GeoJsonLayer | ScatterplotLayer)[] = [];

    if (layerMode === 'states' || layerMode === 'zones') {
      layers.push(
        new GeoJsonLayer({
          id: 'states-fill',
          data: geoRef.current,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
          wireframe: false,
          getFillColor: (f: { properties: { name: string } }) => {
            const state = stateForFeature(f);
            if (!state) return mutedZeroColor();
            return tealFromCount(featureValue(state), scaleMax);
          },
          getLineColor: (f: { properties: { name: string } }) => {
            const state = stateForFeature(f);
            if (!state) return [107, 114, 128, 120];
            return [75, 85, 99, 145];
          },
          lineWidthMinPixels: 0.75,
          transitions: {
            getFillColor: 700,
          },
          updateTriggers: {
            getFillColor: [periodIndex, timeMode, layerMode],
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
            const weekly = featureWeekly(state);
            const cumulative = featureCumulative(state);
            const finalTotal = featureFinal(state);
            setHoveredState(name);
            showTooltip(
              info.x,
              info.y,
              `<strong>${name}</strong><br/>This period applications: +${weekly.toLocaleString()}<br/>Cumulative applications: ${cumulative.toLocaleString()}<br/>Final mapped applications: ${finalTotal.toLocaleString()}<br/>${state.zone}`,
            );
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
    }

    if (layerMode === 'schools') {
      const schoolTimeMode = timeMode;
      const candidateSchools = filterSchools(data, {
        state: selectedState?.name ?? null,
        zone: selectedZone ?? null,
        filter: schoolFilter,
        query: searchQuery,
      });
      const schoolMax = getSchoolScaleMax(candidateSchools, data.periods, schoolTimeMode);
      const schools = candidateSchools.filter((s) => getSchoolValue(s, period, schoolTimeMode) > 0);
      const schoolTooltip = (school: SchoolRecord) => {
        const weekly = getSchoolValue(school, period, 'weekly');
        const cumulative = getSchoolValue(school, period, 'cumulative');
        return `<strong>${school.name}</strong><br/>This period applications: +${weekly.toLocaleString()}<br/>Cumulative applications: ${cumulative.toLocaleString()}<br/>${school.state ?? 'Unmapped'} · ${school.kind === 'partner' ? 'Partner' : 'Non-partner'}`;
      };

      layers.push(
        new ScatterplotLayer({
          id: 'schools-points',
          data: schools,
          pickable: true,
          getPosition: (d) => [d.lng!, d.lat!],
          getRadius: (d) => 8000 + (getSchoolValue(d, period, schoolTimeMode) / schoolMax) * 20000,
          getFillColor: (d) =>
            d.kind === 'partner' ? [0, 82, 74, 210] : [13, 148, 136, 195],
          getLineColor: [255, 255, 255, 220],
          stroked: true,
          lineWidthMinPixels: 1,
          radiusMinPixels: 4,
          radiusMaxPixels: 40,
          onHover: (info) => {
            if (!info.object) {
              hideTooltip();
              return;
            }
            showTooltip(info.x, info.y, schoolTooltip(info.object as SchoolRecord));
          },
          onClick: (info) => {
            if (info.object) setSelectedSchool(info.object as SchoolRecord);
          },
        }),
      );
    }

    return layers;
  }, [
    data, layerMode, timeMode, periodIndex, selectedState, selectedZone,
    schoolFilter, searchQuery, setSelectedState, setSelectedZone, setSelectedSchool,
    setHoveredState, flyToState, flyToZone, compareState, showTooltip, hideTooltip,
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
            tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap © CARTO',
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
