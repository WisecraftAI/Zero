import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, type TabDef } from '@/components/layout/Tabs';

const TABS: readonly TabDef[] = [
  { id: 'a', num: '01', label: 'Alpha' },
  { id: 'b', num: '02', label: 'Bravo' },
  { id: 'c', num: '03', label: 'Charlie' },
];

describe('Tabs', () => {
  it('renders every tab with role=tab', () => {
    render(<Tabs tabs={TABS} active="a" onSelect={vi.fn()} ariaLabel="test" />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={TABS} active="b" onSelect={vi.fn()} ariaLabel="test" />);
    const bravo = screen.getByRole('tab', { name: /02\s*bravo/i });
    expect(bravo).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onSelect on click', async () => {
    const onSelect = vi.fn();
    render(<Tabs tabs={TABS} active="a" onSelect={onSelect} ariaLabel="test" />);
    await userEvent.click(screen.getByRole('tab', { name: /03\s*charlie/i }));
    expect(onSelect).toHaveBeenCalledWith('c');
  });

  it('ArrowRight moves selection to the next tab', async () => {
    const onSelect = vi.fn();
    render(<Tabs tabs={TABS} active="a" onSelect={onSelect} ariaLabel="test" />);
    const alpha = screen.getByRole('tab', { name: /01\s*alpha/i });
    alpha.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('b');
  });

  it('ArrowLeft on the first tab wraps to last', async () => {
    const onSelect = vi.fn();
    render(<Tabs tabs={TABS} active="a" onSelect={onSelect} ariaLabel="test" />);
    const alpha = screen.getByRole('tab', { name: /01\s*alpha/i });
    alpha.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onSelect).toHaveBeenLastCalledWith('c');
  });
});
