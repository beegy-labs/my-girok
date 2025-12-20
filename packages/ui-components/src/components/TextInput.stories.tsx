import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextInput } from './TextInput';

/**
 * TextInput Component - 2025 Best Practices Implementation
 *
 * Flexbox-based input component with:
 * - Leading & trailing icon slots with full configuration
 * - Built-in password visibility toggle
 * - Built-in clearable input
 * - Character counter
 * - Multiple size variants (sm, default, lg, xl)
 * - Multiple visual variants (default, filled, outlined, ghost)
 * - Validation states (default, success, warning, error)
 * - WCAG 2.5.5 AAA touch targets (48px+ minimum)
 * - Design token-based styling
 */
const meta = {
  title: 'Components/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl'],
      description: 'Input size variant',
      table: {
        type: { summary: 'sm | default | lg | xl' },
        defaultValue: { summary: 'default' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'filled', 'outlined', 'ghost'],
      description: 'Visual variant',
      table: {
        type: { summary: 'default | filled | outlined | ghost' },
        defaultValue: { summary: 'default' },
      },
    },
    state: {
      control: 'select',
      options: ['default', 'success', 'warning', 'error'],
      description: 'Validation state (auto-detected from error prop)',
      table: {
        type: { summary: 'default | success | warning | error' },
        defaultValue: { summary: 'default' },
      },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'tel', 'url', 'search'],
      description: 'Input type',
    },
    label: {
      control: 'text',
      description: 'Label text',
    },
    error: {
      control: 'text',
      description: 'Error message (triggers error state)',
    },
    hint: {
      control: 'text',
      description: 'Hint text',
    },
    required: {
      control: 'boolean',
      description: 'Required field indicator',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    showPasswordToggle: {
      control: 'boolean',
      description: 'Show password visibility toggle (for password type)',
    },
    clearable: {
      control: 'boolean',
      description: 'Show clear button when has value',
    },
    showCharCount: {
      control: 'boolean',
      description: 'Show character counter',
    },
    maxLength: {
      control: 'number',
      description: 'Maximum character count',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          '2025 Best Practices: Flexbox-based layout, slot-based icons, built-in features, and full WCAG 2.1 AAA compliance.',
      },
    },
  },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic Examples
// ============================================================================

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email...',
    value: '',
    onChange: () => {},
  },
};

// ============================================================================
// Size Variants
// ============================================================================

export const SizeSmall: Story = {
  args: {
    label: 'Small Size (40px)',
    placeholder: 'Compact input...',
    size: 'sm',
    value: '',
    onChange: () => {},
  },
};

export const SizeDefault: Story = {
  args: {
    label: 'Default Size (48px)',
    placeholder: 'Standard input...',
    size: 'default',
    value: '',
    onChange: () => {},
  },
};

export const SizeLarge: Story = {
  args: {
    label: 'Large Size (56px)',
    placeholder: 'Prominent input...',
    size: 'lg',
    value: '',
    onChange: () => {},
  },
};

export const SizeXLarge: Story = {
  args: {
    label: 'XL Size (64px)',
    placeholder: 'Editorial input...',
    size: 'xl',
    value: '',
    onChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Extra large input with text-lg font-bold for editorial forms',
      },
    },
  },
};

// ============================================================================
// Visual Variants
// ============================================================================

export const VariantDefault: Story = {
  args: {
    label: 'Default Variant',
    placeholder: 'Standard background...',
    variant: 'default',
    value: '',
    onChange: () => {},
  },
};

export const VariantFilled: Story = {
  args: {
    label: 'Filled Variant',
    placeholder: 'Tertiary background...',
    variant: 'filled',
    value: '',
    onChange: () => {},
  },
};

export const VariantOutlined: Story = {
  args: {
    label: 'Outlined Variant',
    placeholder: 'Transparent with border...',
    variant: 'outlined',
    value: '',
    onChange: () => {},
  },
};

export const VariantGhost: Story = {
  args: {
    label: 'Ghost Variant',
    placeholder: 'Minimal styling...',
    variant: 'ghost',
    value: '',
    onChange: () => {},
  },
};

// ============================================================================
// With Icons
// ============================================================================

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const WithLeadingIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email...',
    type: 'email',
    size: 'lg',
    value: '',
    onChange: () => {},
    icon: <MailIcon />,
  },
};

export const WithTrailingIcon: Story = {
  args: {
    label: 'Verified Email',
    placeholder: 'Enter your email...',
    type: 'email',
    size: 'lg',
    value: 'user@example.com',
    onChange: () => {},
    icon: <MailIcon />,
    trailingIcon: <CheckCircleIcon />,
    state: 'success',
  },
};

// ============================================================================
// Built-in Features (2025)
// ============================================================================

export const PasswordWithToggle: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password...',
    size: 'lg',
    icon: <LockIcon />,
    showPasswordToggle: true,
    value: 'secretpassword',
    onChange: () => {},
    hint: 'Click the eye icon to toggle visibility',
  },
  parameters: {
    docs: {
      description: {
        story: 'Built-in password visibility toggle with accessible aria-label',
      },
    },
  },
};

export const ClearableInput: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    size: 'lg',
    icon: <SearchIcon />,
    clearable: true,
    value: 'Example search term',
    onChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows clear button when input has value',
      },
    },
  },
};

export const WithCharacterCount: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username...',
    size: 'lg',
    showCharCount: true,
    maxLength: 20,
    value: 'johndoe',
    onChange: () => {},
    hint: 'Lowercase letters and numbers only',
  },
  parameters: {
    docs: {
      description: {
        story: 'Character counter with max limit warning when approaching limit',
      },
    },
  },
};

// ============================================================================
// Validation States
// ============================================================================

export const StateSuccess: Story = {
  args: {
    label: 'Email',
    value: 'valid@example.com',
    state: 'success',
    icon: <MailIcon />,
    trailingIcon: <CheckCircleIcon />,
    onChange: () => {},
  },
};

export const StateWarning: Story = {
  args: {
    label: 'Username',
    value: 'john',
    state: 'warning',
    hint: 'Username is available but very short',
    onChange: () => {},
  },
};

export const StateError: Story = {
  args: {
    label: 'Email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
    icon: <MailIcon />,
    onChange: () => {},
  },
};

// ============================================================================
// Standard States
// ============================================================================

export const WithHint: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password...',
    value: '',
    onChange: () => {},
    hint: 'Must be at least 8 characters with one number',
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name...',
    required: true,
    value: '',
    onChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit...',
    disabled: true,
    value: 'Disabled value',
    onChange: () => {},
  },
};

// ============================================================================
// Interactive Examples
// ============================================================================

export const InteractivePassword: Story = {
  args: {
    label: 'Password',
    type: 'password',
    size: 'lg',
    icon: <LockIcon />,
    showPasswordToggle: true,
    value: '',
    onChange: () => {},
  },
  render: function InteractivePasswordInput(args) {
    const [value, setValue] = useState('');
    return (
      <TextInput
        {...args}
        value={value}
        onChange={setValue}
        hint="Type a password and click the eye icon to toggle visibility"
      />
    );
  },
};

export const InteractiveClearable: Story = {
  args: {
    label: 'Search',
    size: 'lg',
    icon: <SearchIcon />,
    clearable: true,
    value: '',
    onChange: () => {},
  },
  render: function InteractiveClearableInput(args) {
    const [value, setValue] = useState('');
    return (
      <TextInput
        {...args}
        value={value}
        onChange={setValue}
        placeholder="Type something to see the clear button..."
      />
    );
  },
};

export const InteractiveCharCount: Story = {
  args: {
    label: 'Bio',
    size: 'lg',
    showCharCount: true,
    maxLength: 50,
    value: '',
    onChange: () => {},
  },
  render: function InteractiveCharCountInput(args) {
    const [value, setValue] = useState('');
    return (
      <TextInput
        {...args}
        value={value}
        onChange={setValue}
        placeholder="Type to see character count..."
      />
    );
  },
};

// ============================================================================
// Showcase
// ============================================================================

export const AllSizes: Story = {
  args: {
    label: 'Size Comparison',
    value: '',
    onChange: () => {},
  },
  render: () => (
    <div className="space-y-6 max-w-md">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
        SIZE VARIANTS
      </h3>
      <TextInput
        label="Small (40px)"
        size="sm"
        placeholder="Compact UI..."
        value=""
        onChange={() => {}}
      />
      <TextInput
        label="Default (48px)"
        size="default"
        placeholder="Standard forms..."
        value=""
        onChange={() => {}}
      />
      <TextInput
        label="Large (56px)"
        size="lg"
        placeholder="Prominent fields..."
        value=""
        onChange={() => {}}
      />
      <TextInput
        label="XL (64px)"
        size="xl"
        placeholder="Editorial style..."
        value=""
        onChange={() => {}}
      />
    </div>
  ),
};

export const AllVariants: Story = {
  args: {
    label: 'Variant Comparison',
    value: '',
    onChange: () => {},
  },
  render: () => (
    <div className="space-y-6 max-w-md">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
        VISUAL VARIANTS
      </h3>
      <TextInput
        label="Default"
        variant="default"
        size="lg"
        placeholder="Standard background..."
        value=""
        onChange={() => {}}
      />
      <TextInput
        label="Filled"
        variant="filled"
        size="lg"
        placeholder="Tertiary background..."
        value=""
        onChange={() => {}}
      />
      <TextInput
        label="Outlined"
        variant="outlined"
        size="lg"
        placeholder="Transparent with border..."
        value=""
        onChange={() => {}}
      />
      <TextInput
        label="Ghost"
        variant="ghost"
        size="lg"
        placeholder="Minimal styling..."
        value=""
        onChange={() => {}}
      />
    </div>
  ),
};

export const AllStates: Story = {
  args: {
    label: 'State Comparison',
    value: '',
    onChange: () => {},
  },
  render: () => (
    <div className="space-y-6 max-w-md">
      <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
        VALIDATION STATES
      </h3>
      <TextInput
        label="Default"
        size="lg"
        value="Normal input"
        onChange={() => {}}
        icon={<MailIcon />}
      />
      <TextInput
        label="Success"
        size="lg"
        state="success"
        value="valid@example.com"
        onChange={() => {}}
        icon={<MailIcon />}
        trailingIcon={<CheckCircleIcon />}
      />
      <TextInput
        label="Warning"
        size="lg"
        state="warning"
        value="john"
        onChange={() => {}}
        hint="Username is very short"
      />
      <TextInput
        label="Error"
        size="lg"
        value="invalid"
        error="This field has an error"
        onChange={() => {}}
        icon={<MailIcon />}
      />
    </div>
  ),
};

export const LoginFormExample: Story = {
  args: {
    label: 'Login Form',
    value: '',
    onChange: () => {},
  },
  render: function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
      <div className="space-y-6 max-w-md p-8 bg-theme-bg-card rounded-editorial-lg border-2 border-theme-border-default">
        <h2 className="text-2xl font-serif-title text-theme-text-primary mb-6">Login</h2>
        <TextInput
          label="Email"
          type="email"
          size="lg"
          icon={<MailIcon />}
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
        />
        <TextInput
          label="Password"
          type="password"
          size="lg"
          icon={<LockIcon />}
          showPasswordToggle
          value={password}
          onChange={setPassword}
          placeholder="Enter password..."
          required
          hint="Minimum 8 characters"
        />
        <button className="w-full h-14 bg-theme-primary text-white font-bold rounded-input hover:opacity-90 transition-opacity">
          Sign In
        </button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete login form example using 2025 TextInput features',
      },
    },
  },
};
