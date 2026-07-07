import { scaleSqrt } from 'd3-scale';
import type { LayerMode, PeriodId, ReachData, SchoolRecord, StateRecord, TimeMode } from '../types/reach';

export interface HeatmapBin {
  label: string;
  min: number;
  max?: number;
  color: [number, number, number];
}

export const STATE_HEATMAP_BINS: HeatmapBin[] = [
  { label: '0', min: 0, max: 0, color: [49, 61, 83] },
  { label: '1-5', min: 1, max: 5, color: [204, 251, 241] },
  { label: '6-20', min: 6, max: 20, color: [153, 246, 228] },
  { label: '21-50', min: 21, max: 50, color: [94, 234, 212] },
  { label: '51-100', min: 51, max: 100, color: [20, 184, 166] },
  { label: '101+', min: 101, color: [4, 120, 110] },
];

export const ZONE_HEATMAP_BINS: HeatmapBin[] = [
  { label: '0', min: 0, max: 0, color: [49, 61, 83] },
  { label: '1-50', min: 1, max: 50, color: [204, 251, 241] },
  { label: '51-100', min: 51, max: 100, color: [153, 246, 228] },
  { label: '101-200', min: 101, max: 200, color: [94, 234, 212] },
  { label: '201-400', min: 201, max: 400, color: [20, 184, 166] },
  { label: '401+', min: 401, color: [4, 120, 110] },
];

export function getHeatmapBins(layerMode: LayerMode): HeatmapBin[] {
  return layerMode === 'zones' ? ZONE_HEATMAP_BINS : STATE_HEATMAP_BINS;
}

export function getStateValue(
  state: StateRecord,
  period: PeriodId,
  timeMode: TimeMode,
): number {
  const bp = state.by_period[period];
  return timeMode === 'weekly' ? bp.weekly : bp.cumulative;
}

export function getStateWeekly(state: StateRecord, period: PeriodId): number {
  return state.by_period[period]?.weekly ?? 0;
}

export function getStateCumulative(state: StateRecord, period: PeriodId): number {
  return state.by_period[period]?.cumulative ?? 0;
}

export function getPreviousPeriod(periods: PeriodId[], period: PeriodId): PeriodId | null {
  const index = periods.indexOf(period);
  if (index <= 0) return null;
  return periods[index - 1];
}

export function isStateNewlyReached(
  state: StateRecord,
  periods: PeriodId[],
  period: PeriodId,
): boolean {
  const previous = getPreviousPeriod(periods, period);
  return getStateCumulative(state, period) > 0
    && (!previous || getStateCumulative(state, previous) === 0);
}

export function getSchoolValue(
  school: SchoolRecord,
  period: PeriodId,
  timeMode: TimeMode,
): number {
  const bp = school.by_period[period];
  if (!bp) return 0;
  return timeMode === 'weekly' ? bp.weekly : bp.cumulative;
}

export function getZoneValue(data: ReachData, zoneName: string, period: PeriodId, timeMode: TimeMode): number {
  const zone = data.zones.find((z) => z.name === zoneName);
  const bp = zone?.by_period[period];
  if (!bp) return 0;
  return timeMode === 'weekly' ? bp.weekly : bp.cumulative;
}

export function getZoneWeekly(data: ReachData, zoneName: string, period: PeriodId): number {
  const zone = data.zones.find((z) => z.name === zoneName);
  return zone?.by_period[period]?.weekly ?? 0;
}

export function getStateScaleMax(data: ReachData, timeMode: TimeMode): number {
  if (timeMode === 'cumulative') {
    return Math.max(...data.states.map((state) => state.applications), 1);
  }

  return Math.max(
    ...data.states.flatMap((state) =>
      data.periods.map((period) => state.by_period[period]?.weekly ?? 0),
    ),
    1,
  );
}

export function getZoneScaleMax(data: ReachData, timeMode: TimeMode): number {
  if (timeMode === 'cumulative') {
    return Math.max(...data.zones.map((zone) => zone.applications), 1);
  }

  return Math.max(
    ...data.zones.flatMap((zone) =>
      data.periods.map((period) => zone.by_period[period]?.weekly ?? 0),
    ),
    1,
  );
}

export function getSchoolScaleMax(
  schools: SchoolRecord[],
  periods: PeriodId[],
  timeMode: TimeMode,
): number {
  if (!schools.length) return 1;

  if (timeMode === 'cumulative') {
    return Math.max(...schools.map((school) => school.applications), 1);
  }

  return Math.max(
    ...schools.flatMap((school) =>
      periods.map((period) => school.by_period[period]?.weekly ?? 0),
    ),
    1,
  );
}

export function createElevationScale(max: number) {
  return scaleSqrt().domain([0, Math.max(max, 1)]).range([0, 80000]);
}

function interpolateChannel(start: number, end: number, t: number) {
  return Math.round(start + (end - start) * t);
}

export function mutedZeroColor(alpha = 105): [number, number, number, number] {
  return [49, 61, 83, alpha];
}

export function tealFromCount(
  count: number,
  _max: number,
  alpha = 235,
  layerMode: LayerMode = 'states',
): [number, number, number, number] {
  if (count <= 0) return mutedZeroColor();
  const bins = getHeatmapBins(layerMode).filter((bin) => bin.min > 0);
  const bin = bins.find((candidate) =>
    count >= candidate.min && (candidate.max == null || count <= candidate.max),
  ) ?? bins[bins.length - 1];
  return [bin.color[0], bin.color[1], bin.color[2], alpha];
}

export function goldFromCount(count: number, max: number, alpha = 235): [number, number, number, number] {
  if (count <= 0) return [0, 0, 0, 0];
  const t = scaleSqrt().domain([0, Math.max(max, 1)]).range([0.35, 1])(count);
  return [
    255,
    interpolateChannel(214, 157, t),
    interpolateChannel(102, 24, t),
    alpha,
  ];
}

export function partnerShareColor(partnerApps: number, total: number): [number, number, number, number] {
  const share = total ? partnerApps / total : 0;
  const r = Math.round(255 * (1 - share));
  const g = Math.round(180 + 75 * share);
  const b = Math.round(100 + 80 * share);
  return [r, g, b, 220];
}

export function normalizeGeoName(name: string): string {
  const aliases: Record<string, string> = {
    'Federal Capital Territory': 'Abuja (FCT)',
    Abuja: 'Abuja (FCT)',
    Nassarawa: 'Nasarawa',
  };
  return aliases[name] ?? name;
}

export function filterSchools(
  data: ReachData,
  opts: {
    state?: string | null;
    zone?: string | null;
    filter: 'all' | 'partner' | 'nonpartner';
    query: string;
    onMapOnly?: boolean;
  },
) {
  let schools = data.schools.filter((s) => s.on_map && s.lat != null && s.lng != null);
  if (opts.onMapOnly !== false) {
    schools = schools.filter((s) => s.state && s.state !== 'Online');
  }
  if (opts.state) schools = schools.filter((s) => s.state === opts.state);
  if (opts.zone) schools = schools.filter((s) => s.zone === opts.zone);
  if (opts.filter === 'partner') schools = schools.filter((s) => s.kind === 'partner');
  if (opts.filter === 'nonpartner') schools = schools.filter((s) => s.kind === 'nonpartner');
  if (opts.query.trim()) {
    const q = opts.query.toLowerCase();
    schools = schools.filter((s) => s.name.toLowerCase().includes(q));
  }
  return schools;
}

export function getPeriodTotal(data: ReachData, periodIndex: number, timeMode: TimeMode): number {
  const period = data.periods[periodIndex];
  const row = data.period_summary.find((p) => p.id === period);
  if (!row) return 0;
  return timeMode === 'weekly' ? row.weekly : row.cumulative;
}
