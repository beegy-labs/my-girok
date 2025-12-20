import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

/**
 * Button Component - V0.0.1 AAA Workstation Design System
 *
 * WCAG 2.1 AAA compliant button with:
 * - 44px+ minimum touch targets
 * - 7:1+ contrast ratio
 * - SSOT border radius tokens (rounded-input: 24px)
 * - Gradient primary style with shadow
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'Visual style variant',
      table: {
        type: { summary: 'primary | secondary | danger | ghost' },
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Button size (all meet 44px+ touch target)',
      table: {
        type: { summary: 'sm | md | lg | xl' },
        defaultValue: { summary: 'md' },
      },
    },
    rounded: {
      control: 'select',
      options: ['default', 'editorial', 'full'],
      description: 'Border radius style (SSOT tokens)',
      table: {
        type: { summary: 'default | editorial | full' },
        defaultValue: { summary: 'default' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Makes button full width',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible button component with WCAG 2.1 AAA compliance. All sizes meet 44x44px minimum touch target.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Primary Variants
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

// Size Variants
export const SizeSmall: Story = {
  args: {
    children: 'Small (44px)',
    size: 'sm',
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimum touch target size (44px height)',
      },
    },
  },
};

export const SizeMedium: Story = {
  args: {
    children: 'Medium (44px)',
    size: 'md',
  },
};

export const SizeLarge: Story = {
  args: {
    children: 'Large (56px)',
    size: 'lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Editorial size with font-black uppercase tracking-brand',
      },
    },
  },
};

export const SizeXL: Story = {
  args: {
    children: 'XL (64px)',
    size: 'xl',
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero size with font-black uppercase tracking-brand',
      },
    },
  },
};

// Rounded Variants
export const RoundedDefault: Story = {
  args: {
    children: 'Default (24px)',
    rounded: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'SSOT: rounded-input (24px)',
      },
    },
  },
};

export const RoundedFull: Story = {
  args: {
    children: 'Full (pill)',
    rounded: 'full',
  },
};

// States
export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
};

// With Icon
export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 12h14m-7-7l7 7-7 7"
        />
      </svg>
    ),
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
          VARIANTS
        </h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
          SIZES (44px+ touch targets)
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">XL</Button>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
          ROUNDED (SSOT tokens)
        </h3>
        <div className="flex flex-wrap gap-4">
          <Button rounded="default">Default (24px)</Button>
          <Button rounded="editorial">Editorial</Button>
          <Button rounded="full">Full</Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete overview of all Button variants, sizes, and rounded options.',
      },
    },
  },
};
