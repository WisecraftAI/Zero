import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHashTab } from '@/hooks/useHashTab';

const IDS = ['overview', 'today', 'v3'] as const;

describe('useHashTab', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/');
  });

  it('falls back when hash is empty', () => {
    const { result } = renderHook(() => useHashTab(IDS, 'overview'));
    expect(result.current[0]).toBe('overview');
  });

  it('picks up a valid hash on mount', () => {
    history.replaceState(null, '', '#today');
    const { result } = renderHook(() => useHashTab(IDS, 'overview'));
    expect(result.current[0]).toBe('today');
  });

  it('resolves deep anchor (v3-lld) to parent tab (v3)', () => {
    history.replaceState(null, '', '#v3-lld');
    const { result } = renderHook(() => useHashTab(IDS, 'overview'));
    expect(result.current[0]).toBe('v3');
  });

  it('updates location.hash and state when select is called', () => {
    const { result } = renderHook(() => useHashTab(IDS, 'overview'));
    act(() => result.current[1]('v3'));
    expect(result.current[0]).toBe('v3');
    expect(window.location.hash).toBe('#v3');
  });

  it('ignores unknown hashes', () => {
    history.replaceState(null, '', '#nope');
    const { result } = renderHook(() => useHashTab(IDS, 'overview'));
    expect(result.current[0]).toBe('overview');
  });
});
