import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders children and default variant', () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('root');
  });

  it('applies variant, size, and fullWidth classes', () => {
    render(
      <Button variant="secondary" size="lg" fullWidth>
        Continue
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button.className).toContain('secondary');
    expect(button.className).toContain('lg');
    expect(button.className).toContain('fullWidth');
  });

  it('fires onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button', { name: 'Click' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
