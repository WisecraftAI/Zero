import { Awaiting, CollapsibleCodeSection, JsonToggle } from './shared';

export default function RecordingTab({ run }) {
  const recording = run.artifacts?.recording || run.input?.recording;
  if (!recording) return <Awaiting msg="No recording attached to this run." />;
  const events = recording.events || [];

  return (
    <div className="recording-panel">
      <div className="recording-meta">
        Source: <strong>{recording.source || 'session'}</strong> · {events.length} events
        {recording.ottUrl && (
          <> · URL: <a href={recording.ottUrl} target="_blank" rel="noreferrer">{recording.ottUrl}</a></>
        )}
      </div>
      {events.length > 0 && (
        <CollapsibleCodeSection
          title={`Events (${events.length})`}
          code={JSON.stringify(events, null, 2)}
        />
      )}
      <JsonToggle data={recording} />
    </div>
  );
}
