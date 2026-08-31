import { Awaiting, JsonBlock, JsonToggle, stableKey } from './shared';

export default function RequirementsTab({ run }) {
  const data = run.artifacts?.requirements;
  if (!data) return <Awaiting />;
  const items = data.requirements || data.items || (Array.isArray(data) ? data : null);
  if (!items) return <JsonBlock data={data} />;

  return (
    <div className="req-list">
      {items.map((requirement, index) => (
        <div key={requirement.id || stableKey(requirement, 'requirement')} className="req-item">
          <span className="req-num">R{String(index + 1).padStart(2, '0')}</span>
          <span className="req-text">
            {typeof requirement === 'string'
              ? requirement
              : requirement.requirement || requirement.text || JSON.stringify(requirement)}
          </span>
        </div>
      ))}
      <JsonToggle data={data} />
    </div>
  );
}
