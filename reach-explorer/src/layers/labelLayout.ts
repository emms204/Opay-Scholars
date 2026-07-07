import type { PeriodId, ReachData, StateRecord } from '../types/reach';
import { getStateCumulative, getZoneValue } from './scales';

export interface LabelAnchor {
  lng: number;
  lat: number;
}

export interface MapLabelCandidate {
  id: string;
  lng: number;
  lat: number;
  text: string;
  elevation: number;
  priority: number;
  cumulative: number;
}

export type StateLabelAnchors = Record<string, LabelAnchor>;

/** How many state labels to attempt at a given zoom (before collision culling). */
export function stateLabelBudget(zoom: number, use3D: boolean): number {
  if (use3D) {
    if (zoom < 5.25) return 6;
    if (zoom < 5.75) return 10;
    if (zoom < 6.5) return 16;
    if (zoom < 7.5) return 24;
    return 37;
  }
  if (zoom < 5.25) return 10;
  if (zoom < 5.75) return 16;
  if (zoom < 6.5) return 24;
  if (zoom < 7.5) return 32;
  return 37;
}

export function schoolLabelBudget(zoom: number, use3D: boolean): number {
  if (use3D) {
    if (zoom < 6) return 12;
    if (zoom < 7) return 25;
    return 45;
  }
  if (zoom < 6) return 20;
  if (zoom < 7) return 35;
  return 50;
}

export function zoneLabelAnchor(
  data: ReachData,
  zoneName: string,
  stateAnchors: StateLabelAnchors,
): LabelAnchor | null {
  const zone = data.zones.find((z) => z.name === zoneName);
  if (!zone) return null;
  const points = zone.states
    .map((name) => stateAnchors[name])
    .filter((p): p is LabelAnchor => !!p);
  if (!points.length) return null;
  return {
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
  };
}

export function buildStateLabelCandidates(
  data: ReachData,
  period: PeriodId,
  stateAnchors: StateLabelAnchors,
  elevFor: (cumulative: number) => number,
  opts: {
    zoom: number;
    use3D: boolean;
    pinnedIds?: string[];
  },
): MapLabelCandidate[] {
  const budget = stateLabelBudget(opts.zoom, opts.use3D);
  const pinned = new Set(opts.pinnedIds ?? []);

  const candidates = data.states
    .map((state) => {
      const cumulative = getStateCumulative(state, period);
      if (cumulative <= 0) return null;
      const anchor = stateAnchors[state.name] ?? state.centroid;
      const isPinned = pinned.has(state.name);
      return {
        id: state.name,
        lng: anchor.lng,
        lat: anchor.lat,
        text: state.name,
        elevation: elevFor(cumulative),
        cumulative,
        priority: isPinned ? 1_000_000 + cumulative : cumulative,
      };
    })
    .filter((row): row is MapLabelCandidate => row !== null)
    .sort((a, b) => b.priority - a.priority);

  const pinnedRows = candidates.filter((c) => pinned.has(c.id));
  const rest = candidates.filter((c) => !pinned.has(c.id)).slice(0, Math.max(0, budget - pinnedRows.length));
  return [...pinnedRows, ...rest];
}

export function buildZoneLabelCandidates(
  data: ReachData,
  period: PeriodId,
  stateAnchors: StateLabelAnchors,
  elevFor: (cumulative: number) => number,
): MapLabelCandidate[] {
  return data.zones
    .map((zone) => {
      const cumulative = getZoneValue(data, zone.name, period, 'cumulative');
      if (cumulative <= 0) return null;
      const anchor = zoneLabelAnchor(data, zone.name, stateAnchors);
      if (!anchor) return null;
      return {
        id: zone.name,
        lng: anchor.lng,
        lat: anchor.lat,
        text: zone.name.toUpperCase(),
        elevation: elevFor(cumulative),
        cumulative,
        priority: cumulative,
      };
    })
    .filter((row): row is MapLabelCandidate => row !== null);
}

export function buildSchoolLabelCandidates(
  schools: { id: string; name: string; lng: number; lat: number; cumulative: number }[],
  elevFor: (cumulative: number) => number,
  opts: { zoom: number; use3D: boolean; truncate: (name: string, max?: number) => string },
): MapLabelCandidate[] {
  const budget = schoolLabelBudget(opts.zoom, opts.use3D);
  return [...schools]
    .sort((a, b) => b.cumulative - a.cumulative)
    .slice(0, budget)
    .map((school) => ({
      id: school.id,
      lng: school.lng,
      lat: school.lat,
      text: opts.truncate(school.name, opts.use3D ? 22 : 18),
      elevation: elevFor(school.cumulative),
      cumulative: school.cumulative,
      priority: school.cumulative,
    }));
}

export function pinnedStateIds(
  selectedState: StateRecord | null,
  hoveredState: string | null,
  compareState: StateRecord | null,
): string[] {
  return [selectedState?.name, hoveredState ?? undefined, compareState?.name].filter(
    (name): name is string => !!name,
  );
}
