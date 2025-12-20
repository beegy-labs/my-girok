import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopWidget } from './TopWidget';

/**
 * TopWidget Component - V0.0.1 AAA Workstation Design System
 *
 * Pinned dashboard widget with:
 * - min-h-[280px] for consistent layout
 * - rounded-editorial-lg (48px)
 * - Primary border accent
 * - Serif title typography
 */
const meta = {
  title: 'Components/TopWidget',
  component: TopWidget,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Widget title (serif font)',
    },
    badgeText: {
      control: 'text',
      description: 'Badge text below title',
    },
    changeFocusText: {
      control: 'text',
      description: 'Change focus button text',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Pinned widget for dashboard focus area. Uses rounded-editorial-lg (48px) with primary border.',
      },
    },
  },
} satisfies Meta<typeof TopWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

// Icon component
const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const BookIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

// Default
export const Default: Story = {
  args: {
    icon: <CalendarIcon />,
    title: "Today's Schedule",
    badgeText: 'Active Focus',
    onChangeFocus: () => {},
    changeFocusText: 'Change Focus',
    children: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-theme-bg-secondary rounded-input">
          <span className="text-theme-primary font-bold">09:00</span>
          <span className="text-theme-text-primary">Team standup meeting</span>
        </div>
        <div className="flex items-center gap-4 p-4 bg-theme-bg-secondary rounded-input">
          <span className="text-theme-primary font-bold">14:00</span>
          <span className="text-theme-text-primary">Project review</span>
        </div>
      </div>
    ),
  },
};

// With Journal Content
export const JournalWidget: Story = {
  args: {
    icon: <BookIcon />,
    title: 'Personal Journal',
    badgeText: 'Daily Reflection',
    onChangeFocus: () => {},
    changeFocusText: 'Switch Widget',
    children: (
      <div className="space-y-4">
        <p className="text-theme-text-secondary">
          Today was a productive day. Completed the design system documentation and started
          implementing the new features.
        </p>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-theme-status-success-bg text-theme-status-success-text text-xs rounded-xl font-bold">
            Productive
          </span>
          <span className="px-3 py-1 bg-theme-status-info-bg text-theme-status-info-text text-xs rounded-xl font-bold">
            Focused
          </span>
        </div>
      </div>
    ),
  },
};

// Without Change Focus Button
export const WithoutChangeFocus: Story = {
  args: {
    icon: <CalendarIcon />,
    title: 'Fixed Widget',
    badgeText: 'Always Visible',
    children: (
      <p className="text-theme-text-secondary">This widget does not have a change focus button.</p>
    ),
  },
};

// Empty State
export const EmptyState: Story = {
  args: {
    icon: <CalendarIcon />,
    title: 'No Events Today',
    badgeText: 'All Clear',
    onChangeFocus: () => {},
    children: (
      <div className="text-center py-8">
        <p className="text-theme-text-muted mb-4">You have no scheduled events for today.</p>
        <button className="px-4 py-2 bg-theme-primary text-btn-primary-text rounded-input font-bold">
          Add Event
        </button>
      </div>
    ),
  },
};
