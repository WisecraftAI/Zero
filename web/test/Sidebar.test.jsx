import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Sidebar from '../src/components/Sidebar';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('Sidebar', () => {
  it('opens Appearance as a compact, anchored flyout', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const user = userEvent.setup();
    render(<Sidebar activeView="dashboard" onNavigate={() => {}} />);

    const trigger = screen.getByRole('button', {
      name: 'Choose theme, currently Dark',
    });
    trigger.getBoundingClientRect = () => ({
      bottom: 700,
      height: 38,
      left: 60,
      right: 120,
      top: 662,
      width: 60,
      x: 60,
      y: 662,
      toJSON: () => {},
    });
    await user.click(trigger);

    const menu = screen.getByRole('radiogroup', { name: 'Color theme' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(menu.parentElement).toBe(document.body);
    expect(menu).toHaveStyle({
      left: '128px',
      bottom: '68px',
      width: '252px',
      maxHeight: '420px',
    });
    expect(screen.getByRole('radio', { name: 'Switch to dark mode' }))
      .toHaveAttribute('aria-checked', 'true');
  });

  it('responds to hover, focus-within, and explicit expansion', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Sidebar activeView="dashboard" onNavigate={() => {}} />,
    );
    const sidebar = container.querySelector('aside');
    const home = screen.getByRole('button', { name: 'Home' });

    await user.hover(sidebar);
    expect(sidebar.matches(':hover')).toBe(true);

    home.focus();
    expect(sidebar.matches(':focus-within')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Expand menu' }));
    expect(sidebar).toHaveClass('sidebar--expanded');
    expect(screen.getByRole('button', { name: 'Collapse menu' }))
      .toHaveAttribute('aria-expanded', 'true');
  });
});
