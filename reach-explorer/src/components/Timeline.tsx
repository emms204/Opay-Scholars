import { PERIOD_LABELS } from '../types/reach';
import { useExplorerStore } from '../store/explorerStore';
import { getPeriodTotal } from '../layers/scales';

export function Timeline() {
  const {
    data,
    periodIndex,
    timeMode,
    playing,
    setPeriodIndex,
    setPlaying,
    setTimeMode,
  } = useExplorerStore();

  if (!data) return null;

  const total = getPeriodTotal(data, periodIndex, timeMode);
  const period = data.periods[periodIndex];
  const summary = data.period_summary.find((p) => p.id === period);
  const isAtEnd = periodIndex >= data.periods.length - 1;
  const maxWeekly = Math.max(...data.period_summary.map((p) => p.weekly), 1);
  const countLabel = timeMode === 'weekly' ? 'applications this period' : 'applications cumulative';

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (isAtEnd) setPeriodIndex(0);
    setPlaying(true);
  };

  return (
    <div className="timeline" data-testid="timeline">
      <div className="timeline-header">
        <div className="timeline-stats">
          <span className="timeline-period">{PERIOD_LABELS[period]}</span>
          <span className="timeline-count" data-testid="timeline-count">
            {total.toLocaleString()} {countLabel}
          </span>
          {summary && (
            <span className="timeline-context" data-testid="timeline-context">
              {timeMode === 'weekly'
                ? `+${(summary.mapped_weekly ?? 0).toLocaleString()} on-map applications · ${summary.states_active ?? 0} active states`
                : `${summary.states_reached ?? 0}/37 states reached · ${(summary.mapped_weekly ?? 0).toLocaleString()} on-map applications added this period`}
            </span>
          )}
        </div>
        <div className="timeline-controls">
          <button
            type="button"
            className={timeMode === 'weekly' ? 'active' : ''}
            data-testid="timeline-mode-weekly"
            onClick={() => setTimeMode('weekly')}
          >
            This period
          </button>
          <button
            type="button"
            className={timeMode === 'cumulative' ? 'active' : ''}
            data-testid="timeline-mode-cumulative"
            onClick={() => setTimeMode('cumulative')}
          >
            Cumulative
          </button>
          <button type="button" className="play-btn" data-testid="timeline-play" onClick={togglePlay}>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={data.periods.length - 1}
        value={periodIndex}
        onChange={(e) => setPeriodIndex(Number(e.target.value))}
        className="timeline-slider"
        data-testid="timeline-slider"
      />
      <div className="timeline-labels">
        {data.periods.map((p, i) => (
          <button
            key={p}
            type="button"
            className={`timeline-tick ${i === periodIndex ? 'active' : ''}`}
            onClick={() => setPeriodIndex(i)}
          >
            {p === 'FinalDays' ? 'Final' : p.replace('Week', 'W')}
          </button>
        ))}
      </div>
      <div className="timeline-bars" data-testid="weekly-bars" aria-label="Weekly application volume">
        {data.period_summary.map((row, i) => (
          <button
            key={row.id}
            type="button"
            className={`timeline-bar ${i === periodIndex ? 'active' : ''}`}
            style={{ height: `${Math.max(12, (row.weekly / maxWeekly) * 64)}px` }}
            onClick={() => setPeriodIndex(i)}
            title={`${PERIOD_LABELS[row.id]}: ${row.weekly.toLocaleString()} applications`}
          >
            <span>{row.weekly.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
