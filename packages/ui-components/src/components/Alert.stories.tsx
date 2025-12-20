import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

/**
 * Alert Component - V0.0.1 AAA Workstation Design System
 *
 * Notification component with:
 * - Four status variants (success, error, warning, info)
 * - Optional title
 * - Dismissible with close button
 * - 44px+ touch target for close button
 */
const meta = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Alert style variant',
      table: {
        type: { summary: 'success | error | warning | info' },
        defaultValue: { summary: 'info' },
      },
    },
    title: {
      control: 'text',
      description: 'Optional title text',
    },
    onClose: {
      action: 'closed',
      description: 'Close button click handler',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible alert component for notifications and messages. Close button meets 44x44px touch target.',
      },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

// Variants
export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Your changes have been saved successfully.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Failed to save changes. Please try again.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Your session will expire in 5 minutes.',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'New features are available in the latest update.',
  },
};

// With Title
export const WithTitle: Story = {
  args: {
    variant: 'error',
    title: 'Authentication Error',
    children: 'Invalid email or password. Please check your credentials and try again.',
  },
};

// Dismissible
export const Dismissible: Story = {
  args: {
    variant: 'success',
    children: 'Click the X button to dismiss this alert.',
    onClose: () => {},
  },
};

// Dismissible with Title
export const DismissibleWithTitle: Story = {
  args: {
    variant: 'warning',
    title: 'Important Notice',
    children: 'Please review the updated terms of service before continuing.',
    onClose: () => {},
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
        ALL VARIANTS
      </h3>
      <Alert variant="success" onClose={() => {}}>
        Success! Your changes have been saved.
      </Alert>
      <Alert variant="error" title="Error" onClose={() => {}}>
        Failed to save changes. Please try again.
      </Alert>
      <Alert variant="warning">Warning: Your session will expire soon.</Alert>
      <Alert variant="info">Info: New features are available.</Alert>
    </div>
  ),
};

// Long Content
export const LongContent: Story = {
  args: {
    variant: 'info',
    title: 'System Maintenance',
    children:
      'The system will be undergoing scheduled maintenance on Saturday, December 21st from 2:00 AM to 6:00 AM EST. During this time, some features may be unavailable. We apologize for any inconvenience this may cause.',
    onClose: () => {},
  },
};
