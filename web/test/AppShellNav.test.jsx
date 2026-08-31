import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AppShell from '../src/layouts/AppShell';

function renderShell(onNavigate = () => {}) {
  return render(
    <AppShell activeView="dashboard" onNavigate={onNavigate} topbarProps={{ title: 'Dashboard' }}>
      <p>Page content</p>
    </AppShell>,
  );
}

const menuButton = () => screen.getByRole('button', { name: 'Menu' });
const sidebar = (container) => container.querySelector('.sidebar');

describe('AppShell navigation drawer', () => {
  it('opens the drawer from the topbar so touch devices can reach the nav', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    const trigger = menuButton();
    expect(trigger).toHaveAttribute('aria-controls', 'app-sidebar');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(sidebar(container)).not.toHaveClass('sidebar--open');

    await user.click(trigger);

    expect(sidebar(container)).toHaveClass('sidebar--open');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    expect(document.body).toHaveClass('nav-open');
  });

  it('closes the drawer on Escape and releases the page scroll lock', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    await user.click(menuButton());
    expect(document.body).toHaveClass('nav-open');

    await user.keyboard('{Escape}');

    expect(sidebar(container)).not.toHaveClass('sidebar--open');
    expect(document.body).not.toHaveClass('nav-open');
  });

  it('closes the drawer when a destination is chosen', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { container } = renderShell(onNavigate);

    await user.click(menuButton());
    await user.click(screen.getByRole('button', { name: 'Runs' }));

    expect(onNavigate).toHaveBeenCalledWith('runs');
    expect(sidebar(container)).not.toHaveClass('sidebar--open');
    expect(document.body).not.toHaveClass('nav-open');
  });

  it('closes the drawer from the dismiss layer', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    await user.click(menuButton());
    await user.click(container.querySelector('.app-scrim'));

    expect(sidebar(container)).not.toHaveClass('sidebar--open');
  });
});
