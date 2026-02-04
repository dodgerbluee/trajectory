import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagInput from '../TagInput';

describe('TagInput', () => {
  it('renders tags and input', () => {
    render(
      <TagInput tags={['react', 'typescript']} onChange={() => undefined} />
    );

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('adds a new tag on Enter key', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<TagInput tags={['react']} onChange={handleChange} />);

    await user.type(screen.getByRole('textbox'), 'vite{Enter}');
    expect(handleChange).toHaveBeenCalledWith(['react', 'vite']);
  });

  it('does not add duplicate tags', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<TagInput tags={['react']} onChange={handleChange} />);

    await user.type(screen.getByRole('textbox'), 'react{Enter}');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('removes tag on button click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<TagInput tags={['react', 'vue']} onChange={handleChange} />);

    await user.click(screen.getByLabelText('Remove react'));
    expect(handleChange).toHaveBeenCalledWith(['vue']);
  });

  it('removes last tag on Backspace when input empty', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<TagInput tags={['react', 'vue']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Backspace}');
    expect(handleChange).toHaveBeenCalledWith(['react']);
  });
});
