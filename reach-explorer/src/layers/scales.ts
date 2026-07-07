import { scalePow, scaleSqrt } from 'd3-scale';
import type { PeriodId, ReachData, SchoolRecord, StateRecord, TimeMode } from '../types/reach';

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

function interpolateChannel(start: number, end: number, t: number) {
  return Math.round(start + (end - start) * t);
}

/** Fixed cumulative bands — derived from final-period state/zone distributions (p25≈17, median≈36, p75≈72, max≈279 states). */
export interface CumulativeColorBand {
  min: number;
  max: number;
  label: string;
  light: [number, number, number];
  dark: [number, number, number];
}

export const STATE_CUMULATIVE_BANDS: CumulativeColorBand[] = [
  { min: 1, max: 10, label: '1–10', light: [253, 224, 71], dark: [161, 98, 7] },
  { min: 11, max: 25, label: '11–25', light: [216, 180, 254], dark: [107, 33, 168] },
  { min: 26, max: 50, label: '26–50', light: [147, 197, 253], dark: [29, 78, 216] },
  { min: 51, max: 100, label: '51–100', light: [56, 189, 248], dark: [7, 89, 133] },
  { min: 101, max: 200, label: '101–200', light: [129, 140, 248], dark: [67, 56, 202] },
  { min: 201, max: 280, label: '201+', light: [192, 132, 252], dark: [59, 7, 100] },
];

/** Zone bands — final range 132–637; Week 1 zones (12–34) land in the lightest band. */
export const ZONE_CUMULATIVE_BANDS: CumulativeColorBand[] = [
  { min: 1, max: 50, label: '1–50', light: [254, 249, 195], dark: [202, 138, 4] },
  { min: 51, max: 150, label: '51–150', light: [243, 232, 255], dark: [126, 34, 206] },
  { min: 151, max: 300, label: '151–300', light: [219, 234, 254], dark: [29, 78, 216] },
  { min: 301, max: 500, label: '301–500', light: [186, 230, 253], dark: [3, 105, 161] },
  { min: 501, max: 700, label: '501+', light: [167, 139, 250], dark: [46, 16, 101] },
];

export const STATE_CUMULATIVE_CEILING = 280;
export const ZONE_CUMULATIVE_CEILING = 700;

export function getCumulativeBands(layerMode: 'states' | 'zones'): CumulativeColorBand[] {
  return layerMode === 'zones' ? ZONE_CUMULATIVE_BANDS : STATE_CUMULATIVE_BANDS;
}

export function cumulativeBandColor(
  count: number,
  bands: CumulativeColorBand[],
  alpha = 255,
): [number, number, number, number] {
  if (count <= 0) return mutedZeroColor(alpha);

  for (const band of bands) {
    if (count < band.min) continue;
    if (count > band.max && band !== bands[bands.length - 1]) continue;

    const span = Math.max(band.max - band.min, 1);
    const rawT = Math.max(0, Math.min(1, (count - band.min) / span));
    // Keep fills saturated — avoid near-white washes at the low end of each band.
    const t = 0.3 + rawT * 0.7;
    return [
      interpolateChannel(band.light[0], band.dark[0], t),
      interpolateChannel(band.light[1], band.dark[1], t),
      interpolateChannel(band.light[2], band.dark[2], t),
      alpha,
    ];
  }

  const last = bands[bands.length - 1];
  return [...last.dark, alpha] as [number, number, number, number];
}

export function mutedZeroColor(alpha = 135): [number, number, number, number] {
  return [226, 232, 240, alpha];
}

export function tealFromCount(
  count: number,
  max: number,
  alpha = 215,
): [number, number, number, number] {
  if (count <= 0) return mutedZeroColor();
  const t = scaleSqrt().domain([0, Math.max(max, 1)]).range([0.12, 1])(count);
  return [
    interpolateChannel(209, 0, t),
    interpolateChannel(250, 82, t),
    interpolateChannel(229, 74, t),
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

export const LABEL_ALTITUDE_LIFT = 55_000;

const ELEVATION_FLOOR = 12_000;
const ELEVATION_CEILING = 480_000;

export function elevationFromCount(count: number, max: number): number {
  if (count <= 0) return 0;
  const t = scalePow().exponent(0.5).domain([0, Math.max(max, 1)]).range([0, 1])(count);
  return ELEVATION_FLOOR + t * (ELEVATION_CEILING - ELEVATION_FLOOR);
}

export function labelAltitude(elevation: number, use3D: boolean): number {
  return use3D ? elevation + LABEL_ALTITUDE_LIFT : 0;
}

export function formatMapTooltip(label: string, cumulative: number): string {
  return `<strong>${label}</strong><br/>${cumulative.toLocaleString()} cumulative`;
}

export function truncateLabel(text: string, max = 22): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function cumulativeElevationMax(layerMode: 'states' | 'zones'): number {
  return layerMode === 'zones' ? ZONE_CUMULATIVE_CEILING : STATE_CUMULATIVE_CEILING;
}

export function getZoneCentroid(
  data: ReachData,
  zoneName: string,
): { lng: number; lat: number } | null {
  const zone = data.zones.find((z) => z.name === zoneName);
  if (!zone) return null;
  const states = data.states.filter((s) => zone.states.includes(s.name));
  if (!states.length) return null;
  return {
    lng: states.reduce((sum, s) => sum + s.centroid.lng, 0) / states.length,
    lat: states.reduce((sum, s) => sum + s.centroid.lat, 0) / states.length,
  };
}
