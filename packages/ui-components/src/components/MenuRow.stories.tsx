import type { Meta, StoryObj } from '@storybook/react-vite';
import { MenuRow } from './MenuRow';

/**
 * MenuRow Component - V0.0.1 AAA Workstation Design System
 *
 * Compact list row for list view with:
 * - Horizontal layout with index, icon, title, description
 * - Optional pin functionality
 * - 44px+ touch targets
 * - Hover and focus states
 */
const meta = {
  title: 'Components/MenuRow',
  component: MenuRow,
  tags: ['autodocs'],
  argTypes: {
    index: {
      control: 'number',
      description: 'Display index (shows as 01, 02, etc.)',
    },
    title: {
      control: 'text',
      description: 'Row title',
    },
    description: {
      control: 'text',
      description: 'Optional description',
    },
    isPinned: {
      control: 'boolean',
      description: 'Whether row is pinned',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Compact menu row component for list view mode. Uses rounded-widget (32px) for borders.',
      },
    },
  },
} satisfies Meta<typeof MenuRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Icon components
const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

// Default
export const Default: Story = {
  args: {
    index: 1,
    icon: <BookIcon />,
    title: 'Personal Journal',
    description: 'Record daily thoughts',
    onClick: () => {},
  },
};

// With Pin
export const WithPin: Story = {
  args: {
    index: 2,
    icon: <CalendarIcon />,
    title: 'Schedule',
    description: 'Manage appointments',
    onClick: () => {},
    onPin: () => {},
  },
};

// Pinned State
export const Pinned: Story = {
  args: {
    index: 3,
    icon: <BookIcon />,
    title: 'Library',
    description: 'Organize documents',
    onClick: () => {},
    onPin: () => {},
    isPinned: true,
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    index: 4,
    icon: <BookIcon />,
    title: 'Coming Soon',
    description: 'Under development',
  },
};

// List Layout Showcase
export const ListLayout: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted">
        MENU ROW LIST
      </h3>
      <div className="space-y-3">
        <MenuRow
          index={1}
          icon={<BookIcon />}
          title="Personal Journal"
          description="Record daily thoughts"
          onClick={() => {}}
          onPin={() => {}}
        />
        <MenuRow
          index={2}
          icon={<CalendarIcon />}
          title="Schedule"
          description="Manage appointments"
          onClick={() => {}}
          onPin={() => {}}
          isPinned
        />
        <MenuRow
          index={3}
          icon={<BookIcon />}
          title="Finance"
          description="Track expenses"
          onClick={() => {}}
          onPin={() => {}}
        />
        <MenuRow
          index={4}
          icon={<BookIcon />}
          title="Library"
          description="Organize documents"
          onClick={() => {}}
          onPin={() => {}}
        />
      </div>
    </div>
  ),
};
