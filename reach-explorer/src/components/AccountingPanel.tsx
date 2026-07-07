import type { ReachData } from '../types/reach';

interface Props {
  data: ReachData;
}

export function AccountingPanel({ data }: Props) {
  const { total, on_map } = data.accounting;
  const onMapPct = ((on_map / total) * 100).toFixed(1);

  return (
    <div className="accounting-panel" data-testid="accounting-panel">
      <h3>Campaign totals</h3>
      <p className="accounting-note">
        Source: form responses. The map shows <strong>{on_map.toLocaleString()}</strong> applications
        matched to a known institution location ({onMapPct}% of {total.toLocaleString()} total).
      </p>
      <div className="accounting-grid">
        <div className="accounting-item total">
          <span className="label">Total applications</span>
          <span className="value" data-testid="accounting-total">{total.toLocaleString()}</span>
        </div>
        <div className="accounting-item mapped">
          <span className="label">On map</span>
          <span className="value" data-testid="accounting-on-map">{on_map.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
