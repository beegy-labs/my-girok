import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, SectionBadge } from './Badge';

/**
 * Badge Component - V0.0.1 AAA Workstation Design System
 *
 * Status indicator badges with:
 * - Multiple color variants
 * - Size options (sm, md, lg)
 * - Rounded options (default: xl, full: pill)
 * - font-black uppercase tracking
 */
const meta = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'error', 'info', 'accent'],
      description: 'Color variant',
      table: {
        type: { summary: 'default | success | warning | error | info | accent' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size',
      table: {
        type: { summary: 'sm | md | lg' },
        defaultValue: { summary: 'md' },
      },
    },
    rounded: {
      control: 'select',
      options: ['default', 'full'],
      description: 'Border radius style',
      table: {
        type: { summary: 'default | full' },
        defaultValue: { summary: 'default' },
      },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Badge component for status indicators and labels. Uses rounded-xl per SSOT policy for badges.',
      },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

// Variants
export const Default: Story = {
  args: {
    children: 'Default',
    variant: 'default',
  },
};

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    children: 'Error',
    variant: 'error',
  },
};

export const Info: Story = {
  args: {
    children: 'Info',
    variant: 'info',
  },
};

export const Accent: Story = {
  args: {
    children: 'Accent',
    variant: 'accent',
  },
};

// Sizes
export const SizeSmall: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const SizeMedium: Story = {
  args: {
    children: 'Medium',
    size: 'md',
  },
};

export const SizeLarge: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Large size with text-[14px] font-black',
      },
    },
  },
};

// Rounded Options
export const RoundedDefault: Story = {
  args: {
    children: 'Rounded XL',
    rounded: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'SSOT: Badges use rounded-xl (12px) per policy',
      },
    },
  },
};

export const RoundedFull: Story = {
  args: {
    children: 'Pill Badge',
    rounded: 'full',
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
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="accent">Accent</Badge>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">SIZES</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
          ROUNDED
        </h3>
        <div className="flex flex-wrap gap-3">
          <Badge rounded="default">Default (xl)</Badge>
          <Badge rounded="full">Full (pill)</Badge>
        </div>
      </div>
    </div>
  ),
};

// Section Badge
export const SectionBadgeStory: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
        SECTION BADGE
      </h3>
      <SectionBadge>MY ARCHIVE</SectionBadge>
      <SectionBadge>V0.0.1 AAA WORKSTATION</SectionBadge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Section badge with font-mono-brand tracking-brand for editorial headers.',
      },
    },
  },
};
