export function stableKey(value, prefix = 'item') {
  const source = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  return `${prefix}-${Math.abs(hash)}`;
}

export function Awaiting({ msg = 'Awaiting…' }) {
  return <div className="tab-awaiting">{msg}</div>;
}

export function Section({ title, children }) {
  return (
    <div className="report-section">
      <div className="report-section-title">{title}</div>
      {children}
    </div>
  );
}

export function JsonBlock({ data }) {
  return <pre className="code-block json-block">{JSON.stringify(data, null, 2)}</pre>;
}

export function JsonToggle({ data }) {
  return (
    <details className="json-toggle">
      <summary>Raw JSON</summary>
      <pre className="code-block json-block">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

export function CodeSection({ title, code }) {
  return (
    <div className="code-section">
      <div className="code-section-title">{title}</div>
      <pre className="code-block">{code}</pre>
    </div>
  );
}

export function CollapsibleCodeSection({ title, code }) {
  return (
    <details className="json-toggle">
      <summary>{title}</summary>
      <pre className="code-block">{code}</pre>
    </details>
  );
}

export function PriorityBadge({ p }) {
  const cls = p === 'High' || p === 'Critical'
    ? 'priority-high'
    : p === 'Medium'
      ? 'priority-med'
      : 'priority-low';
  return <span className={`priority-badge ${cls}`}>{p}</span>;
}

export function VitalCard({ label, value }) {
  return (
    <div className="vital-card">
      <div className="vital-label">{label}</div>
      <div className="vital-value">{value || '—'}</div>
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return (
    <svg className="rdt-spinner" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TabLoading({ title, detail, queued = false }) {
  return (
    <div className={`tab-loading${queued ? ' tab-loading--queued' : ''}`} role="status" aria-live="polite">
      <div className="tab-loading-head">
        {queued ? <span className="tab-loading-dots"><i /><i /><i /></span> : <Spinner />}
        <div>
          <div className="tab-loading-title">{title}</div>
          {detail && <div className="tab-loading-detail">{detail}</div>}
        </div>
      </div>
      <div className="tab-skeleton">
        <span className="tab-skeleton-line" />
        <span className="tab-skeleton-line" />
        <span className="tab-skeleton-line" />
      </div>
    </div>
  );
}
