import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { applyTheme, THEME_KEY, useTheme } from '@/hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_KEY);
    document.documentElement.removeAttribute('data-theme');
    applyTheme('light');
  });

  it('defaults to light', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('light');
  });

  it('persists dark and sets data-theme', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1]('dark'));
    expect(result.current[0]).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});
