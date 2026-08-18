import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../apiBase';
import {
  RUN_STREAM_ARTIFACT_DEBOUNCE_MS,
  RUN_STREAM_MAX_SSE_FAILURES,
  RUN_STREAM_POLL_MS
} from './runStream';

/**
 * Live run updates via EventSource on GET /runs/:id/stream.
 * Falls back to polling after repeated SSE connection failures.
 */
export function useRunStream(runId, { enabled, terminal, onPatch, onRefresh }) {
  const [transport, setTransport] = useState('idle');
  const onPatchRef = useRef(onPatch);
  const onRefreshRef = useRef(onRefresh);

  onPatchRef.current = onPatch;
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || !runId || terminal) {
      setTransport('idle');
      return undefined;
    }

    let closed = false;
    let es = null;
    let pollTimer = null;
    let refreshTimer = null;
    let failures = 0;

    function cleanup() {
      closed = true;
      if (es) {
        es.close();
        es = null;
      }
      if (pollTimer) clearInterval(pollTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
    }

    function scheduleArtifactRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        onRefreshRef.current?.('refresh');
      }, RUN_STREAM_ARTIFACT_DEBOUNCE_MS);
    }

    function startPolling() {
      if (closed) return;
      setTransport('poll');
      if (es) {
        es.close();
        es = null;
      }
      onRefreshRef.current?.('poll');
      pollTimer = setInterval(() => onRefreshRef.current?.('poll'), RUN_STREAM_POLL_MS);
    }

    function handleTerminal() {
      onRefreshRef.current?.('refresh');
      cleanup();
      setTransport('idle');
    }

    setTransport('sse');
    es = new EventSource(apiUrl(`/runs/${runId}/stream`));

    es.addEventListener('open', () => {
      failures = 0;
    });

    es.addEventListener('state', (event) => {
      failures = 0;
      try {
        const patch = JSON.parse(event.data);
        onPatchRef.current?.(patch);
        if (patch.status === 'completed' || patch.status === 'failed') {
          handleTerminal();
          return;
        }
        scheduleArtifactRefresh();
      } catch {
        // ignore malformed SSE payloads
      }
    });

    es.addEventListener('done', () => {
      handleTerminal();
    });

    es.onerror = () => {
      if (closed) return;
      failures += 1;
      if (failures >= RUN_STREAM_MAX_SSE_FAILURES) {
        startPolling();
      }
    };

    return cleanup;
  }, [enabled, runId, terminal]);

  return { transport };
}
