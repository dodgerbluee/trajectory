import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkbox from '../Checkbox';

describe('Checkbox', () => {
  it('renders label and checked state', () => {
    render(
      <Checkbox label="Accept terms" checked={true} onChange={() => undefined} />
    );

    expect(screen.getByText('Accept terms')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('renders unchecked state', () => {
    render(
      <Checkbox label="Subscribe" checked={false} onChange={() => undefined} />
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('fires onChange on click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Checkbox label="Enable notifications" checked={false} onChange={handleChange} />
    );

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('respects disabled prop', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Checkbox label="Disabled" checked={false} onChange={handleChange} disabled />
    );

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});
