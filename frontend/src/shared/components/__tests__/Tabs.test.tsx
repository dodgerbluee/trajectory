import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tabs from '../Tabs';

describe('Tabs', () => {
  const tabs = [
    { id: 'profile', label: 'Profile', content: <div>Profile Content</div> },
    { id: 'settings', label: 'Settings', content: <div>Settings Content</div> },
  ];

  it('renders tab buttons and active content', () => {
    render(<Tabs tabs={tabs} activeTab="profile" onTabChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Profile Content')).toBeInTheDocument();
    expect(screen.queryByText('Settings Content')).not.toBeInTheDocument();
  });

  it('calls onTabChange when tab clicked', async () => {
    const user = userEvent.setup();
    const handleTabChange = vi.fn();

    render(<Tabs tabs={tabs} activeTab="profile" onTabChange={handleTabChange} />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(handleTabChange).toHaveBeenCalledWith('settings');
  });

  it('applies active class to active tab', () => {
    render(<Tabs tabs={tabs} activeTab="settings" onTabChange={() => undefined} />);

    const settingsButton = screen.getByRole('button', { name: 'Settings' });
    expect(settingsButton.className).toContain('tabButtonActive');
  });
});
