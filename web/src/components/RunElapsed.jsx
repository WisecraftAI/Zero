import { useEffect, useState } from 'react';
import { formatDuration, runElapsedMs, stageDurationMs } from '../lib/runProgress';

function isActive({ run, stage }) {
  if (stage) return stage.status === 'running' && !stage.finishedAt;
  return run?.status === 'running' || run?.status === 'stopping';
}

export default function RunElapsed({
  run,
  stage,
  className,
  prefix = '',
  suffix = '',
  fallback = '—'
}) {
  const active = isActive({ run, stage });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const elapsedMs = stage
    ? stageDurationMs(stage, now)
    : runElapsedMs(run, now);
  const value = elapsedMs == null ? fallback : formatDuration(elapsedMs);

  return (
    <span className={className}>
      {prefix}{value}{elapsedMs == null ? '' : suffix}
    </span>
  );
}
