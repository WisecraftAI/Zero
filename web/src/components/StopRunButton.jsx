import { isStoppableStatus } from '../lib/runControl';

export default function StopRunButton({ run, onStop, className = '' }) {
  const status = run?.status;
  if (!isStoppableStatus(status) || !onStop) return null;
  const stopping = status === 'stopping';
  const id = run.id || run.runId;
  return (
    <button
      type="button"
      className={`btn btn-danger btn-sm ${className}`.trim()}
      disabled={stopping || !id}
      aria-label={stopping ? 'Stopping run' : 'Stop run'}
      onClick={(e) => {
        e.stopPropagation();
        onStop(id);
      }}
    >
      {stopping ? 'Stopping…' : 'Stop'}
    </button>
  );
}
