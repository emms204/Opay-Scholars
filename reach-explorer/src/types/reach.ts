export type PeriodId = 'Week1' | 'Week2' | 'Week3' | 'Week4' | 'Week5' | 'FinalDays';

export interface PeriodBreakdown {
  weekly: number;
  cumulative: number;
}

export interface StateRecord {
  id: string;
  name: string;
  zone: string;
  centroid: { lng: number; lat: number };
  applications: number;
  share: number;
  by_period: Record<PeriodId, PeriodBreakdown>;
  schools_count: number;
}

export interface ZoneRecord {
  id: string;
  name: string;
  states: string[];
  applications: number;
  share: number;
  by_period: Record<PeriodId, PeriodBreakdown>;
}

export interface SchoolRecord {
  id: string;
  name: string;
  state: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  kind: 'partner' | 'nonpartner';
  applications: number;
  share: number;
  by_period: Record<PeriodId, PeriodBreakdown>;
  confidence: string;
  on_map: boolean;
}

export type StoryEffect = 'pulse_new_states' | 'surge';

export interface StoryBeat {
  id: string;
  text: string;
  duration_ms?: number;
  camera: { center: [number, number]; zoom: number; pitch?: number };
  layer?: LayerMode;
  period_index?: number;
  time_mode?: TimeMode;
  use_3d?: boolean;
  playing?: boolean;
  highlight_states?: string[];
  highlight_growth_states?: string[];
  effects?: StoryEffect[];
  on_exit?: {
    app_mode?: AppMode;
    period_index?: number;
    time_mode?: TimeMode;
  };
}

export interface ReachData {
  meta: {
    generated_at: string;
    total_applications: number;
    on_map_applications: number;
    data_through: string | null;
    source?: string;
  };
  accounting: {
    total: number;
    on_map: number;
  };
  periods: PeriodId[];
  period_summary: {
    id: PeriodId;
    weekly: number;
    cumulative: number;
    mapped_weekly?: number;
    states_active?: number;
    states_reached?: number;
    states_new?: number;
    institutions_active?: number;
  }[];
  states: StateRecord[];
  zones: ZoneRecord[];
  schools: SchoolRecord[];
  story_beats: StoryBeat[];
}

export type LayerMode = 'states' | 'zones' | 'schools';
export type TimeMode = 'weekly' | 'cumulative';
export type AppMode = 'explore' | 'story';

export const PERIOD_LABELS: Record<PeriodId, string> = {
  Week1: 'Week 1 (25 May – 1 Jun)',
  Week2: 'Week 2 (2 – 8 Jun)',
  Week3: 'Week 3 (9 – 15 Jun)',
  Week4: 'Week 4 (16 – 22 Jun)',
  Week5: 'Week 5 (23 – 29 Jun)',
  FinalDays: 'Final Days (30 Jun – 3 Jul)',
};

export const ZONE_COLORS: Record<string, string> = {
  'South West': '#1a73e8',
  'North Central': '#34a853',
  'North West': '#ea4335',
  'South South': '#fbbc04',
  'South East': '#9334e6',
  'North East': '#ff6d01',
};
