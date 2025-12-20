import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextInput } from './TextInput';

/**
 * TextInput Component - V0.0.1 AAA Workstation Design System
 *
 * WCAG 2.1 AAA compliant input with:
 * - 48px (default) or 64px (lg) height
 * - SSOT border radius tokens
 * - Focus ring for keyboard navigation
 * - Error and hint states
 */
const meta = {
  title: 'Components/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'lg'],
      description: 'Input size',
      table: {
        type: { summary: 'default | lg' },
        defaultValue: { summary: 'default' },
      },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'tel', 'url'],
      description: 'Input type',
    },
    label: {
      control: 'text',
      description: 'Label text',
    },
    error: {
      control: 'text',
      description: 'Error message',
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
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible text input with label, error, and hint support. All sizes meet WCAG touch target requirements.',
      },
    },
  },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email...',
    value: '',
    onChange: () => {},
  },
};

// Sizes
export const SizeDefault: Story = {
  args: {
    label: 'Default Size (48px)',
    placeholder: 'Enter text...',
    size: 'default',
    value: '',
    onChange: () => {},
  },
};

export const SizeLarge: Story = {
  args: {
    label: 'Large Size (64px)',
    placeholder: 'Enter text...',
    size: 'lg',
    value: '',
    onChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Large input with font-bold text and rounded-input (24px)',
      },
    },
  },
};

// With Icon
export const WithIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email...',
    type: 'email',
    size: 'lg',
    value: '',
    onChange: () => {},
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
};

// With Error
export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email...',
    value: 'invalid-email',
    onChange: () => {},
    error: 'Please enter a valid email address',
  },
};

// With Hint
export const WithHint: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password...',
    value: '',
    onChange: () => {},
    hint: 'Must be at least 8 characters',
  },
};

// Required
export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name...',
    required: true,
    value: '',
    onChange: () => {},
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit...',
    disabled: true,
    value: 'Disabled value',
    onChange: () => {},
  },
};

// Interactive Example
export const Interactive: Story = {
  render: function InteractiveInput() {
    const [value, setValue] = useState('');
    return (
      <TextInput
        label="Interactive Input"
        placeholder="Type something..."
        value={value}
        onChange={setValue}
        hint={`Character count: ${value.length}`}
      />
    );
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">SIZES</h3>
        <div className="space-y-4">
          <TextInput
            label="Default (48px)"
            size="default"
            placeholder="Enter text..."
            value=""
            onChange={() => {}}
          />
          <TextInput
            label="Large (64px)"
            size="lg"
            placeholder="Enter text..."
            value=""
            onChange={() => {}}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-mono-brand tracking-brand text-theme-text-muted mb-4">
          STATES
        </h3>
        <div className="space-y-4">
          <TextInput
            label="With Error"
            value="invalid"
            error="This field has an error"
            onChange={() => {}}
          />
          <TextInput
            label="With Hint"
            value=""
            hint="Helpful information here"
            onChange={() => {}}
            placeholder="Enter value..."
          />
          <TextInput label="Disabled" value="Cannot edit" disabled onChange={() => {}} />
        </div>
      </div>
    </div>
  ),
};
