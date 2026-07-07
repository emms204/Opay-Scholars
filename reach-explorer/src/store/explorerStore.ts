import { create } from 'zustand';
import type {
  AppMode,
  LayerMode,
  PeriodId,
  ReachData,
  SchoolRecord,
  StateRecord,
  TimeMode,
} from '../types/reach';

interface ExplorerState {
  data: ReachData | null;
  loading: boolean;
  error: string | null;
  layerMode: LayerMode;
  timeMode: TimeMode;
  periodIndex: number;
  playing: boolean;
  appMode: AppMode;
  storyIndex: number;
  storyAutoPlay: boolean;
  selectedState: StateRecord | null;
  selectedZone: string | null;
  selectedSchool: SchoolRecord | null;
  compareState: StateRecord | null;
  schoolFilter: 'all' | 'partner' | 'nonpartner';
  searchQuery: string;
  hoveredState: string | null;
  use3D: boolean;
  setData: (data: ReachData) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setLayerMode: (m: LayerMode) => void;
  setTimeMode: (m: TimeMode) => void;
  setPeriodIndex: (i: number) => void;
  setPlaying: (v: boolean) => void;
  setAppMode: (m: AppMode) => void;
  setStoryIndex: (i: number) => void;
  setStoryAutoPlay: (v: boolean) => void;
  setSelectedState: (s: StateRecord | null) => void;
  setSelectedZone: (z: string | null) => void;
  setSelectedSchool: (s: SchoolRecord | null) => void;
  setCompareState: (s: StateRecord | null) => void;
  setSchoolFilter: (f: 'all' | 'partner' | 'nonpartner') => void;
  setSearchQuery: (q: string) => void;
  setHoveredState: (name: string | null) => void;
  setUse3D: (v: boolean) => void;
  clearSelection: () => void;
  currentPeriod: () => PeriodId;
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  data: null,
  loading: true,
  error: null,
  layerMode: 'states',
  timeMode: 'cumulative',
  periodIndex: 5,
  playing: false,
  appMode: 'explore',
  storyIndex: 0,
  storyAutoPlay: false,
  selectedState: null,
  selectedZone: null,
  selectedSchool: null,
  compareState: null,
  schoolFilter: 'all',
  searchQuery: '',
  hoveredState: null,
  use3D: true,
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLayerMode: (layerMode) => set((state) => ({
    layerMode,
    selectedState: layerMode === 'zones' ? null : state.selectedState,
    selectedZone: layerMode === 'states' ? null : state.selectedZone,
    selectedSchool: null,
  })),
  setTimeMode: (timeMode) => set({ timeMode }),
  setPeriodIndex: (periodIndex) => set({ periodIndex }),
  setPlaying: (playing) => set({ playing }),
  setAppMode: (appMode) => set({
    appMode,
    playing: false,
    storyAutoPlay: appMode === 'story',
    storyIndex: appMode === 'story' ? 0 : get().storyIndex,
  }),
  setStoryIndex: (storyIndex) => set({ storyIndex }),
  setStoryAutoPlay: (storyAutoPlay) => set({ storyAutoPlay }),
  setSelectedState: (selectedState) => set({ selectedState, selectedSchool: null }),
  setSelectedZone: (selectedZone) => set({ selectedZone }),
  setSelectedSchool: (selectedSchool) => set({ selectedSchool }),
  setCompareState: (compareState) => set({ compareState }),
  setSchoolFilter: (schoolFilter) => set({ schoolFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setHoveredState: (hoveredState) => set({ hoveredState }),
  setUse3D: (use3D) => set({ use3D }),
  clearSelection: () => set({
    selectedState: null,
    selectedZone: null,
    selectedSchool: null,
  }),
  currentPeriod: () => {
    const { data, periodIndex } = get();
    return data?.periods[periodIndex] ?? 'FinalDays';
  },
}));
