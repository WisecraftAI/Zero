import { Sankey } from 'recharts';
import './FlowCoverageSankey.scss';

const CHART_WIDTH = 760;
const CHART_HEIGHT = 280;

const OUTCOME_FILL = {
  passed: 'var(--green)',
  failed: 'var(--red)',
  skipped: 'var(--amber)',
  queued: 'var(--surface-2)'
};

function CoverageNode({ x, y, width, height, payload }) {
  const isOutcome = payload.kind === 'outcome';
  const fill = isOutcome ? OUTCOME_FILL[payload.status] : 'var(--surface-2)';
  const labelX = isOutcome ? x - 8 : x + width + 8;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="3"
        fill={fill}
        stroke="var(--border-md)"
      />
      <text
        x={labelX}
        y={y + height / 2}
        dy="0.35em"
        textAnchor={isOutcome ? 'end' : 'start'}
        fill="var(--text-2)"
      >
        {payload.name}
      </text>
    </g>
  );
}

function CoverageLink({
  sourceX,
  sourceY,
  sourceControlX,
  targetX,
  targetY,
  targetControlX,
  linkWidth,
  payload
}) {
  const stroke = OUTCOME_FILL[payload.target.status] || 'var(--border-md)';
  const path = [
    `M${sourceX},${sourceY}`,
    `C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`
  ].join(' ');

  return (
    <path
      className="flow-coverage__link"
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={linkWidth}
    />
  );
}

export default function FlowCoverageSankey({ data }) {
  return (
    <section className="flow-coverage" aria-labelledby="flow-coverage-title">
      <div className="fd-section-head">
        <h3 id="flow-coverage-title">Journey coverage</h3>
        <p>Journey groups flowing into outcomes. Running and unrecorded journeys are grouped as queued.</p>
      </div>

      <div className="flow-coverage__body">
        <div className="flow-coverage__chart-wrap" aria-hidden="true">
          <Sankey
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            data={data}
            node={<CoverageNode />}
            link={<CoverageLink />}
            nodePadding={24}
            nodeWidth={14}
            margin={{ top: 20, right: 124, bottom: 20, left: 124 }}
            accessibilityLayer={false}
            isAnimationActive={false}
          />
        </div>

        <ul className="flow-coverage__summary" aria-label="Journey coverage summary">
          {data.summary.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.group}</strong>
                <span aria-hidden="true"> → </span>
                <span className={`flow-coverage__outcome flow-coverage__outcome--${item.outcome}`}>
                  {item.outcomeLabel}
                </span>
              </span>
              <span>{item.count} journey{item.count === 1 ? '' : 's'}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
