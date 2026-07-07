import {
  filterSchools,
  getSchoolValue,
  getStateCumulative,
  getStateValue,
  getStateWeekly,
  getZoneValue,
  getZoneWeekly,
} from '../layers/scales';
import { AccountingPanel } from './AccountingPanel';
import { useExplorerStore } from '../store/explorerStore';
import { PERIOD_LABELS } from '../types/reach';

export function SidePanel() {
  const {
    data,
    selectedState,
    selectedZone,
    selectedSchool,
    compareState,
    setCompareState,
    timeMode,
    schoolFilter,
    setSchoolFilter,
    searchQuery,
    setSearchQuery,
    setSelectedSchool,
    setSelectedState,
    setSelectedZone,
    setLayerMode,
    currentPeriod,
    layerMode,
  } = useExplorerStore();

  if (!data) return null;

  const period = currentPeriod();
  const formatValue = (value: number) => (
    timeMode === 'weekly' ? `+${value.toLocaleString()}` : value.toLocaleString()
  );
  const visibleSchools = filterSchools(data, {
    state: selectedState?.name ?? null,
    zone: selectedZone ?? null,
    filter: schoolFilter,
    query: searchQuery,
  })
    .sort((a, b) => getSchoolValue(b, period, timeMode) - getSchoolValue(a, period, timeMode))
    .slice(0, 15);

  const exploreTools = (
    <div className="explore-tools">
      <h4>Explore tools</h4>
      <input
        type="search"
        placeholder="Search school..."
        value={searchQuery}
        onFocus={() => setLayerMode('schools')}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setLayerMode('schools');
        }}
      />
      <div className="filter-row">
        {(['all', 'partner', 'nonpartner'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={schoolFilter === f ? 'active' : ''}
            onClick={() => {
              setSchoolFilter(f);
              setLayerMode('schools');
            }}
          >
            {f === 'all' ? 'All' : f === 'partner' ? 'Partner' : 'Non-partner'}
          </button>
        ))}
      </div>
    </div>
  );

  const schoolRows = (schools = visibleSchools) => (
    <ul className="school-list">
      {schools.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            className="school-row-button"
            onClick={() => {
              setSelectedSchool(s);
              setLayerMode('schools');
            }}
          >
            <span>{s.name}</span>
            <span>{formatValue(getSchoolValue(s, period, timeMode))}</span>
            <span className={`badge ${s.kind}`}>{s.kind === 'partner' ? 'Partner' : 'Non-partner'}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const rankedStates = [...data.states]
    .map((state) => ({
      state,
      value: getStateValue(state, period, timeMode),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const rankedZones = [...data.zones]
    .map((zone) => ({
      zone,
      value: getZoneValue(data, zone.name, period, timeMode),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const stateRanking = (
    <div className="ranking-panel" data-testid="state-ranking">
      <h4>{timeMode === 'weekly' ? 'Largest contributors this period' : 'Highest-volume states so far'}</h4>
      <ol className="ranking-list">
        {rankedStates.map(({ state, value }, index) => (
          <li key={state.id}>
            <button
              type="button"
              data-testid={`state-rank-${index + 1}`}
              onClick={() => {
                setSelectedState(state);
                setLayerMode('states');
              }}
            >
              <span>{state.name}</span>
              <strong>{formatValue(value)}</strong>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );

  const zoneRanking = (
    <div className="ranking-panel" data-testid="zone-ranking">
      <h4>{timeMode === 'weekly' ? 'Largest zone contributors' : 'Highest-volume zones so far'}</h4>
      <ol className="ranking-list">
        {rankedZones.map(({ zone, value }, index) => (
          <li key={zone.id}>
            <button
              type="button"
              data-testid={`zone-rank-${index + 1}`}
              onClick={() => {
                setSelectedZone(zone.name);
                setLayerMode('zones');
              }}
            >
              <span>{zone.name}</span>
              <strong>{formatValue(value)}</strong>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );

  if (compareState && selectedState) {
    const period = currentPeriod();
    return (
      <aside className="side-panel" data-testid="side-panel">
        <AccountingPanel data={data} />
        <h3>State comparison</h3>
        <div className="compare-grid">
          {[selectedState, compareState].map((s) => (
            <div key={s.name} className="compare-card">
              <h4>{s.name}</h4>
              <p>{getStateCumulative(s, period).toLocaleString()} cumulative</p>
              <p>+{getStateWeekly(s, period).toLocaleString()} this period</p>
              <p>{s.zone}</p>
              <p>{s.schools_count} institutions</p>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setCompareState(null)}>Clear comparison</button>
      </aside>
    );
  }

  if (selectedSchool) {
    const periodValue = getSchoolValue(selectedSchool, period, timeMode);
    const state = data.states.find((s) => s.name === selectedSchool.state);

    return (
      <aside className="side-panel" data-testid="side-panel">
        <AccountingPanel data={data} />
        <h3>{selectedSchool.name}</h3>
        <p className="zone-tag">
          {selectedSchool.state ?? 'Unmapped'} · {selectedSchool.zone ?? 'No zone'}
        </p>
        <div className="stat-row">
          <div><span>Total</span><strong>{selectedSchool.applications.toLocaleString()}</strong></div>
          <div><span>{timeMode === 'weekly' ? 'This period' : 'Cumulative'}</span><strong>{formatValue(periodValue)}</strong></div>
          <div><span>Share</span><strong>{selectedSchool.share}%</strong></div>
          <div><span>Type</span><strong>{selectedSchool.kind === 'partner' ? 'Partner' : 'Non-partner'}</strong></div>
        </div>
        <p className="confidence-note">Location quality: {selectedSchool.confidence}</p>
        <h4>Period history</h4>
        <ul className="period-list">
          <li className="period-list-header">
            <span>Period</span>
            <span>Weekly</span>
            <span>Cumulative</span>
          </li>
          {data.periods.map((p) => (
            <li key={p}>
              <span>{PERIOD_LABELS[p]}</span>
              <span>{selectedSchool.by_period[p].weekly.toLocaleString()}</span>
              <span>{selectedSchool.by_period[p].cumulative.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <div className="panel-actions">
          {state && (
            <button
              type="button"
              onClick={() => {
                setSelectedState(state);
                setSelectedSchool(null);
                setLayerMode('schools');
              }}
            >
              View state
            </button>
          )}
          <button type="button" onClick={() => setSelectedSchool(null)}>Close school</button>
        </div>
      </aside>
    );
  }

  if (selectedState) {
    const weekly = getStateWeekly(selectedState, period);
    const cumulative = getStateCumulative(selectedState, period);

    return (
      <aside className="side-panel" data-testid="side-panel">
        <AccountingPanel data={data} />
        <h3>{selectedState.name}</h3>
        <p className="zone-tag">{selectedState.zone}</p>
        <div className="stat-row">
          <div><span>Cumulative</span><strong>{cumulative.toLocaleString()}</strong></div>
          <div><span>This period</span><strong>+{weekly.toLocaleString()}</strong></div>
          <div><span>Final mapped total</span><strong>{selectedState.applications.toLocaleString()}</strong></div>
          <div><span>Final share</span><strong>{selectedState.share}%</strong></div>
          <div><span>Schools</span><strong>{selectedState.schools_count}</strong></div>
        </div>
        {exploreTools}
        <h4>Top institutions</h4>
        {schoolRows()}
        <button
          type="button"
          className="compare-btn"
          onClick={() => {
            if (compareState) setCompareState(null);
            else setCompareState(selectedState);
          }}
        >
          {compareState ? 'Clear comparison' : 'Pin for comparison'}
        </button>
      </aside>
    );
  }

  if (selectedZone) {
    const zone = data.zones.find((z) => z.name === selectedZone);
    if (!zone) return null;
    const cumulative = getZoneValue(data, zone.name, period, 'cumulative');
    const weekly = getZoneWeekly(data, zone.name, period);
    const selectedValue = getZoneValue(data, zone.name, period, timeMode);
    return (
      <aside className="side-panel" data-testid="side-panel">
        <AccountingPanel data={data} />
        <h3>{zone.name}</h3>
        <p>
          {formatValue(selectedValue)} {timeMode === 'weekly' ? 'applications this period' : 'cumulative mapped applications'}
          {' '}· {cumulative.toLocaleString()} cumulative · +{weekly.toLocaleString()} this period · {zone.applications.toLocaleString()} final
        </p>
        {exploreTools}
        {layerMode === 'schools' && (
          <>
            <h4>Top institutions</h4>
            {schoolRows()}
          </>
        )}
        <h4>States</h4>
        <ul className="state-list">
          {zone.states.map((sn) => {
            const st = data.states.find((s) => s.name === sn);
            const value = st ? getStateValue(st, period, timeMode) : 0;
            return (
              <li key={sn}>
                <span>{sn}</span>
                <span>{formatValue(value)}</span>
              </li>
            );
          })}
        </ul>
      </aside>
    );
  }

  return (
    <aside className="side-panel" data-testid="side-panel">
      <AccountingPanel data={data} />
      {layerMode === 'zones' ? zoneRanking : stateRanking}
      {exploreTools}
      {searchQuery.trim() && (
        <>
          <h4>Matching schools</h4>
          {schoolRows(filterSchools(data, {
            filter: schoolFilter,
            query: searchQuery,
          }).slice(0, 12))}
        </>
      )}
      <p className="hint">Click a state on the map to drill down into institutions.</p>
    </aside>
  );
}
