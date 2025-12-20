import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ViewToggle, ViewMode } from './ViewToggle';

/**
 * ViewToggle Component - V0.0.1 AAA Workstation Design System
 *
 * Grid/List view toggle with:
 * - 56x56px touch targets
 * - Clear active/inactive states
 * - WCAG AAA focus ring
 * - Keyboard navigation (radio group pattern)
 */
const meta = {
  title: 'Components/ViewToggle',
  component: ViewToggle,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'radio',
      options: ['grid', 'list'],
      description: 'Current view mode',
    },
    onChange: {
      action: 'changed',
      description: 'View mode change handler',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Toggle between grid and list view modes. Uses 56x56px touch targets for excellent accessibility.',
      },
    },
  },
} satisfies Meta<typeof ViewToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// Grid Mode
export const GridMode: Story = {
  args: {
    value: 'grid',
    onChange: () => {},
  },
};

// List Mode
export const ListMode: Story = {
  args: {
    value: 'list',
    onChange: () => {},
  },
};

// Interactive
export const Interactive: Story = {
  render: function InteractiveToggle() {
    const [mode, setMode] = useState<ViewMode>('grid');
    return (
      <div className="space-y-4">
        <ViewToggle value={mode} onChange={setMode} />
        <p className="text-sm text-theme-text-secondary">
          Current mode: <span className="font-bold">{mode}</span>
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example showing state changes.',
      },
    },
  },
};
