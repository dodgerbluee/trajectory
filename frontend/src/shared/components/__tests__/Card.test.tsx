import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../Card';

describe('Card', () => {
  it('renders title and content', () => {
    render(
      <Card title="Profile">
        <p>Body content</p>
      </Card>
    );

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    render(
      <Card title="Settings" icon={<span data-testid="icon" />}>
        <span>Content</span>
      </Card>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
