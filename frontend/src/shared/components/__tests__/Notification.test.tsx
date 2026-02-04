import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notification from '../Notification';

describe('Notification', () => {
  it('renders message and type icon', () => {
    render(
      <Notification message="Saved" type="success" onClose={() => undefined} />
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Notification message="Error" type="error" onClose={handleClose} />
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after duration', () => {
    vi.useFakeTimers();
    const handleClose = vi.fn();

    render(
      <Notification message="Info" type="info" onClose={handleClose} duration={1000} />
    );

    vi.advanceTimersByTime(1000);
    expect(handleClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
