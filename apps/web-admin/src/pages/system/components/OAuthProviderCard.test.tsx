import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OAuthProviderCard } from './OAuthProviderCard';
import { AuthProvider } from '@my-girok/types';
import type { OAuthProviderConfig } from '../../../api/oauth';

const mockProvider: OAuthProviderConfig = {
  provider: AuthProvider.GOOGLE,
  enabled: true,
  clientId: 'test-client-id',
  clientSecretMasked: '****1234',
  callbackUrl: 'https://auth-bff.girok.dev/v1/oauth/google/callback',
  displayName: 'Google',
  description: 'Sign in with Google',
  updatedAt: new Date('2024-01-01'),
  updatedBy: 'admin-123',
};

describe('OAuthProviderCard', () => {
  it('should render provider information in display mode', () => {
    const onToggle = vi.fn();
    const onUpdate = vi.fn();

    render(<OAuthProviderCard provider={mockProvider} onToggle={onToggle} onUpdate={onUpdate} />);

    // Check provider name
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();

    // Check status badge
    expect(screen.getByText('Enabled')).toBeInTheDocument();

    // Check credentials display
    expect(screen.getByText('test-client-id')).toBeInTheDocument();
    expect(screen.getByText('****1234')).toBeInTheDocument();
  });

  it('should show disabled status when provider is disabled', () => {
    const disabledProvider = { ...mockProvider, enabled: false };
    const onToggle = vi.fn();
    const onUpdate = vi.fn();

    render(
      <OAuthProviderCard provider={disabledProvider} onToggle={onToggle} onUpdate={onUpdate} />,
    );

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('should enter edit mode when clicking Edit Credentials', () => {
    const onToggle = vi.fn();
    const onUpdate = vi.fn();

    render(<OAuthProviderCard provider={mockProvider} onToggle={onToggle} onUpdate={onUpdate} />);

    const editButton = screen.getByText('Edit Credentials');
    fireEvent.click(editButton);

    // Should show form inputs
    expect(screen.getByLabelText('Client ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Client Secret')).toBeInTheDocument();
    expect(screen.getByLabelText('Callback URL')).toBeInTheDocument();

    // Should show Save and Cancel buttons
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should cancel edit mode when clicking Cancel', () => {
    const onToggle = vi.fn();
    const onUpdate = vi.fn();

    render(<OAuthProviderCard provider={mockProvider} onToggle={onToggle} onUpdate={onUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Credentials'));

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Should be back in display mode
    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Credentials')).toBeInTheDocument();
  });

  it('should call onToggle when clicking Enable/Disable button', () => {
    const onToggle = vi.fn();
    const onUpdate = vi.fn();

    render(<OAuthProviderCard provider={mockProvider} onToggle={onToggle} onUpdate={onUpdate} />);

    const toggleButton = screen.getByText('Disable');
    fireEvent.click(toggleButton);

    expect(onToggle).toHaveBeenCalledWith(AuthProvider.GOOGLE, false);
  });

  it('should show last updated information', () => {
    const onToggle = vi.fn();
    const onUpdate = vi.fn();

    render(<OAuthProviderCard provider={mockProvider} onToggle={onToggle} onUpdate={onUpdate} />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText(/admin-123/)).toBeInTheDocument();
  });

  it('should display "Not configured" when credentials are missing', () => {
    const providerWithoutCredentials: OAuthProviderConfig = {
      provider: AuthProvider.KAKAO,
      enabled: false,
      displayName: 'Kakao',
      updatedAt: new Date('2024-01-01'),
    };

    const onToggle = vi.fn();
    const onUpdate = vi.fn();

    render(
      <OAuthProviderCard
        provider={providerWithoutCredentials}
        onToggle={onToggle}
        onUpdate={onUpdate}
      />,
    );

    const notConfiguredElements = screen.getAllByText('Not configured');
    expect(notConfiguredElements.length).toBeGreaterThan(0);
  });
});
