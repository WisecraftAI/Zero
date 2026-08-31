import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RUN_STREAM_MAX_SSE_FAILURES,
  RUN_STREAM_POLL_MS,
} from '../src/data/runStream';
import { useRunStream } from '../src/data/useRunStream';

class FakeEventSource {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.close = vi.fn();
    FakeEventSource.instances.push(this);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
}

afterEach(() => {
  FakeEventSource.instances = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useRunStream', () => {
  it('streams over SSE and polls only after repeated connection failures', () => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FakeEventSource);
    const onPatch = vi.fn();
    const onRefresh = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRunStream('run-42', {
        enabled: true,
        terminal: false,
        onPatch,
        onRefresh,
      }));

    const source = FakeEventSource.instances[0];
    expect(source.url).toBe('http://localhost:3001/runs/run-42/stream');
    expect(result.current.transport).toBe('sse');

    act(() => {
      for (let attempt = 1; attempt < RUN_STREAM_MAX_SSE_FAILURES; attempt += 1) {
        source.onerror();
      }
    });
    expect(result.current.transport).toBe('sse');
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      source.onerror();
    });
    expect(result.current.transport).toBe('poll');
    expect(source.close).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledWith('poll');

    act(() => {
      vi.advanceTimersByTime(RUN_STREAM_POLL_MS);
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);

    unmount();
  });
});
