import type { Meta, StoryObj } from '@storybook/react-vite';
import { MenuCard } from './MenuCard';

/**
 * MenuCard Component - V0.0.1 AAA Workstation Design System
 *
 * Editorial-style navigation card with:
 * - 64px border radius (rounded-editorial-2xl)
 * - Index number display (01, 02, etc.)
 * - Serif title typography
 * - Hover lift effect
 * - Optional pin functionality
 */
const meta = {
  title: 'Components/MenuCard',
  component: MenuCard,
  tags: ['autodocs'],
  argTypes: {
    index: {
      control: 'number',
      description: 'Display index (shows as 01, 02, etc.)',
    },
    title: {
      control: 'text',
      description: 'Card title (displayed in serif font)',
    },
    description: {
      control: 'text',
      description: 'Card description',
    },
    isPinned: {
      control: 'boolean',
      description: 'Whether card is pinned',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler (if undefined, card is disabled)',
    },
    onPin: {
      action: 'pinned',
      description: 'Pin button click handler',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Editorial-style menu card with rounded-editorial-2xl (64px). Uses font-serif-title for headings.',
      },
    },
  },
} satisfies Meta<typeof MenuCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Icon components for stories
const BookIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const WalletIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// Default
export const Default: Story = {
  args: {
    index: 1,
    icon: <BookIcon />,
    title: 'Personal Journal',
    description: 'Record your daily thoughts and reflections in a private space.',
    onClick: () => {},
  },
};

// With Pin
export const WithPin: Story = {
  args: {
    index: 2,
    icon: <CalendarIcon />,
    title: 'Schedule',
    description: 'Manage your calendar and upcoming appointments.',
    onClick: () => {},
    onPin: () => {},
  },
};

// Pinned State
export const Pinned: Story = {
  args: {
    index: 3,
    icon: <WalletIcon />,
    title: 'Finance',
    description: 'Track your expenses, income, and financial goals.',
    onClick: () => {},
    onPin: () => {},
    isPinned: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Pinned card shows accent border and filled pin icon.',
      },
    },
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    index: 4,
    icon: <BookIcon />,
    title: 'Coming Soon',
    description: 'This feature is under development.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Card without onClick handler is disabled with reduced opacity.',
      },
    },
  },
};

// Grid Layout Showcase
export const GridLayout: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted">
        MENU CARD GRID
      </h3>
      <div className="grid gap-6 md:grid-cols-2">
        <MenuCard
          index={1}
          icon={<BookIcon />}
          title="Personal Journal"
          description="Record your daily thoughts and reflections."
          onClick={() => {}}
          onPin={() => {}}
        />
        <MenuCard
          index={2}
          icon={<CalendarIcon />}
          title="Schedule"
          description="Manage your calendar and appointments."
          onClick={() => {}}
          onPin={() => {}}
          isPinned
        />
        <MenuCard
          index={3}
          icon={<WalletIcon />}
          title="Finance"
          description="Track expenses and financial goals."
          onClick={() => {}}
          onPin={() => {}}
        />
        <MenuCard
          index={4}
          icon={<BookIcon />}
          title="Library"
          description="Organize your documents and files."
          onClick={() => {}}
          onPin={() => {}}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Typical 2-column grid layout for menu cards.',
      },
    },
  },
};
