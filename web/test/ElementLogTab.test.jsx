import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ElementLogTab from '../src/views/runDetail/ElementLogTab';

describe('ElementLogTab', () => {
  it('explains the locator workflow and opens Locators', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<ElementLogTab onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: /build more reliable selectors/i })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /how to submit an element log/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open locators/i }));

    expect(onNavigate).toHaveBeenCalledWith('locators');
  });
});
