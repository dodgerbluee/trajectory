import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormField, { FormFieldGroup } from '../FormField';

describe('FormField', () => {
  it('renders a labeled input with required indicator', () => {
    render(
      <FormField
        label="Email"
        type="email"
        value=""
        onChange={() => undefined}
        required
      />
    );

    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows hint when provided and no error', () => {
    render(
      <FormField
        label="Username"
        type="text"
        value=""
        onChange={() => undefined}
        hint="Must be at least 2 characters"
      />
    );

    expect(screen.getByText('Must be at least 2 characters')).toBeInTheDocument();
  });

  it('shows error instead of hint', () => {
    render(
      <FormField
        label="Username"
        type="text"
        value=""
        onChange={() => undefined}
        hint="Must be at least 2 characters"
        error="Required"
      />
    );

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Must be at least 2 characters')).not.toBeInTheDocument();
  });

  it('renders select options', () => {
    render(
      <FormField
        label="Role"
        type="select"
        value="user"
        onChange={() => undefined}
        options={[
          { value: 'user', label: 'User' },
          { value: 'admin', label: 'Admin' },
        ]}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
  });

  it('fires onChange for inputs', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <FormField
        label="Name"
        type="text"
        value=""
        onChange={handleChange}
      />
    );

    await user.type(screen.getByLabelText('Name'), 'A');
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('FormFieldGroup', () => {
  it('renders custom children with label and hint', () => {
    render(
      <FormFieldGroup label="Gender" hint="Required">
        <div>Custom control</div>
      </FormFieldGroup>
    );

    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Custom control')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
