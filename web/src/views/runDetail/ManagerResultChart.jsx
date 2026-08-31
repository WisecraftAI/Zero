import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import './ManagerResultChart.scss';

// SVG `fill` resolves CSS custom properties at paint time, so the donut
// follows the operator palette that ThemePicker swaps on <html data-theme>.
const STATUS_FILL = {
  passed: 'var(--green)',
  failed: 'var(--red)',
  skipped: 'var(--amber)',
};

const CHART_SIZE = 188;

function statusActionLabel(segment) {
  if (segment.count === 0) return `No ${segment.label.toLowerCase()} tests`;
  return `Filter by ${segment.label.toLowerCase()} tests: ${segment.count}`;
}

function ResultTooltip({ active, payload }) {
  const slice = active ? payload?.[0]?.payload : null;
  if (!slice) return null;
  return (
    <div className="manager-results__tip">
      <span className="manager-results__tip-swatch" style={{ background: STATUS_FILL[slice.key] }} />
      {slice.label}: <strong>{slice.count}</strong> ({slice.percentage}%)
    </div>
  );
}

export default function ManagerResultChart({
  segments,
  selectedStatus,
  onStatusChange,
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const slices = segments.filter((segment) => segment.count > 0);
  const selectedSegment = segments.find((segment) => segment.key === selectedStatus);
  const toggle = (statusKey) => onStatusChange(selectedStatus === statusKey ? 'all' : statusKey);

  return (
    <section className="manager-results" aria-labelledby="manager-results-title">
      <div className="manager-results__header">
        <div>
          <h2 id="manager-results-title">Test results</h2>
          <p>{total} total test case{total === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button"
          className={`manager-results__all${selectedStatus === 'all' ? ' is-selected' : ''}`}
          aria-pressed={selectedStatus === 'all'}
          onClick={() => onStatusChange('all')}
        >
          Show all
        </button>
      </div>

      <div className="manager-results__body">
        {/* The donut is the pointer surface only. Screen readers and keyboard
            users drive the same state through the legend buttons below. */}
        <div className="manager-results__donut" aria-hidden="true">
          <PieChart width={CHART_SIZE} height={CHART_SIZE}>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--surface-2)"
              strokeWidth={2}
              isAnimationActive={false}
              onClick={(slice) => toggle(slice?.key ?? slice?.payload?.key)}
            >
              {slices.map((slice) => (
                <Cell
                  key={slice.key}
                  fill={STATUS_FILL[slice.key]}
                  fillOpacity={selectedStatus === 'all' || selectedStatus === slice.key ? 1 : 0.28}
                />
              ))}
            </Pie>
            <Tooltip content={<ResultTooltip />} />
          </PieChart>
          <div className="manager-results__center">
            <strong>{selectedSegment ? selectedSegment.count : total}</strong>
            <span>{selectedSegment ? selectedSegment.label : 'Total'}</span>
          </div>
        </div>

        <ul className="manager-results__legend" aria-label="Test result filters">
          {segments.map((segment) => {
            const selected = selectedStatus === segment.key;
            const tooltip = `${segment.label}: ${segment.count} (${segment.percentage}%)`;
            const tooltipId = `manager-result-${segment.key}-tooltip`;

            return (
              <li key={segment.key}>
                <button
                  type="button"
                  className={`manager-results__segment manager-results__segment--${segment.key}${selected ? ' is-selected' : ''}`}
                  aria-label={statusActionLabel(segment)}
                  aria-describedby={tooltipId}
                  aria-pressed={selected}
                  disabled={segment.count === 0}
                  title={tooltip}
                  onClick={() => toggle(segment.key)}
                >
                  <span className="manager-results__symbol" aria-hidden="true">{segment.symbol}</span>
                  <span className="manager-results__label">{segment.label}</span>
                  <strong>{segment.count}</strong>
                  <span className="manager-results__percentage">{segment.percentage}%</span>
                  <span id={tooltipId} role="tooltip" className="manager-results__tooltip">
                    {tooltip}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
