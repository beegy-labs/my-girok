import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

/**
 * Card Component - V0.0.1 AAA Workstation Design System
 *
 * Editorial card with:
 * - Multiple radius options (24px - 64px)
 * - Variant styles (primary, secondary, elevated)
 * - Interactive mode with focus states
 * - SSOT tokens from tokens.css
 */
const meta = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'elevated'],
      description: 'Card style variant',
      table: {
        type: { summary: 'primary | secondary | elevated' },
        defaultValue: { summary: 'primary' },
      },
    },
    radius: {
      control: 'select',
      options: ['default', 'lg', 'xl', '2xl'],
      description: 'Border radius (SSOT tokens)',
      table: {
        type: { summary: 'default | lg | xl | 2xl' },
        defaultValue: { summary: 'default' },
      },
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl', 'responsive'],
      description: 'Card padding',
      table: {
        type: { summary: 'none | sm | md | lg | xl | responsive' },
        defaultValue: { summary: 'lg' },
      },
    },
    interactive: {
      control: 'boolean',
      description: 'Enable interactive (clickable) mode',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible Card component with editorial radius options. Interactive mode provides proper keyboard navigation.',
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// Variants
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: (
      <div>
        <h3 className="text-xl font-semibold text-theme-text-primary mb-2">Primary Card</h3>
        <p className="text-theme-text-secondary">Default card with subtle border.</p>
      </div>
    ),
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: (
      <div>
        <h3 className="text-xl font-semibold text-theme-text-primary mb-2">Secondary Card</h3>
        <p className="text-theme-text-secondary">Card with default border.</p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-xl font-semibold text-theme-text-primary mb-2">Elevated Card</h3>
        <p className="text-theme-text-secondary">Card with larger shadow.</p>
      </div>
    ),
  },
};

// Radius Options
export const RadiusDefault: Story = {
  args: {
    radius: 'default',
    children: (
      <div className="text-center">
        <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
          rounded-input
        </p>
        <p className="text-theme-text-primary font-semibold">24px</p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'SSOT: rounded-input (24px) - default card radius',
      },
    },
  },
};

export const RadiusLg: Story = {
  args: {
    radius: 'lg',
    children: (
      <div className="text-center">
        <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
          rounded-editorial
        </p>
        <p className="text-theme-text-primary font-semibold">40px</p>
      </div>
    ),
  },
};

export const RadiusXl: Story = {
  args: {
    radius: 'xl',
    children: (
      <div className="text-center">
        <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
          rounded-editorial-lg
        </p>
        <p className="text-theme-text-primary font-semibold">48px</p>
      </div>
    ),
  },
};

export const Radius2xl: Story = {
  args: {
    radius: '2xl',
    children: (
      <div className="text-center">
        <p className="text-xs font-mono-brand tracking-brand text-theme-text-muted mb-2">
          rounded-editorial-2xl
        </p>
        <p className="text-theme-text-primary font-semibold">64px</p>
      </div>
    ),
  },
};

// Interactive
export const Interactive: Story = {
  args: {
    interactive: true,
    onClick: () => alert('Card clicked!'),
    children: (
      <div>
        <h3 className="text-xl font-semibold text-theme-text-primary mb-2">Interactive Card</h3>
        <p className="text-theme-text-secondary">Click or press Enter/Space to interact.</p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive card with hover effects, focus ring, and keyboard navigation.',
      },
    },
  },
};

// Padding Options
export const PaddingXl: Story = {
  args: {
    padding: 'xl',
    radius: 'xl',
    children: (
      <div>
        <h3 className="text-xl font-semibold text-theme-text-primary mb-2">XL Padding</h3>
        <p className="text-theme-text-secondary">p-10 md:p-14 for spacious layout.</p>
      </div>
    ),
  },
};

// All Radius Showcase
export const AllRadiusOptions: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted">
        RADIUS OPTIONS (SSOT)
      </h3>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card radius="default" padding="lg">
          <div className="text-center">
            <p className="text-xs font-mono-brand text-theme-text-muted mb-1">default</p>
            <p className="font-semibold text-theme-text-primary">24px</p>
          </div>
        </Card>
        <Card radius="lg" padding="lg">
          <div className="text-center">
            <p className="text-xs font-mono-brand text-theme-text-muted mb-1">lg</p>
            <p className="font-semibold text-theme-text-primary">40px</p>
          </div>
        </Card>
        <Card radius="xl" padding="lg">
          <div className="text-center">
            <p className="text-xs font-mono-brand text-theme-text-muted mb-1">xl</p>
            <p className="font-semibold text-theme-text-primary">48px</p>
          </div>
        </Card>
        <Card radius="2xl" padding="lg">
          <div className="text-center">
            <p className="text-xs font-mono-brand text-theme-text-muted mb-1">2xl</p>
            <p className="font-semibold text-theme-text-primary">64px</p>
          </div>
        </Card>
      </div>
    </div>
  ),
};
