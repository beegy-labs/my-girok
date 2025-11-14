# @my-girok/ui-components

Shared UI components for my-girok frontend applications.

## Overview

This package provides reusable React components with consistent styling across all my-girok frontend apps to:
- Reduce code duplication (~900 lines saved)
- Standardize UI patterns across web and mobile
- Speed up development with ready-to-use components
- Ensure consistency in user experience

## Features

### 📝 Form Components
- `TextInput` - Text, email, password inputs with validation
- `SelectInput` - Dropdown select with options

### 🎨 UI Components
- `Button` - Multi-variant buttons with loading states
- `Alert` - Success, error, warning, info notifications

## Installation

This package is automatically available in the monorepo workspace:

```bash
pnpm install
```

## Usage

### TextInput

```tsx
import { TextInput } from '@my-girok/ui-components';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <TextInput
      label="Email Address"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="you@example.com"
      error={error}
      required
      variant="amber"
    />
  );
}
```

**Props:**
- `label?: string` - Label text
- `error?: string` - Error message
- `required?: boolean` - Shows asterisk
- `variant?: 'amber' | 'gray'` - Color theme
- All standard HTML input props

### SelectInput

```tsx
import { SelectInput } from '@my-girok/ui-components';

function DegreeSelector() {
  const [degree, setDegree] = useState('');

  const options = [
    { value: 'bachelor', label: 'Bachelor\'s Degree' },
    { value: 'master', label: 'Master\'s Degree' },
    { value: 'phd', label: 'PhD' },
  ];

  return (
    <SelectInput
      label="Degree"
      options={options}
      value={degree}
      onChange={(e) => setDegree(e.target.value)}
      placeholder="Select degree"
      required
    />
  );
}
```

**Props:**
- `label?: string` - Label text
- `options: SelectOption[]` - Array of `{value, label}` objects
- `placeholder?: string` - Empty option text
- `error?: string` - Error message
- `required?: boolean` - Shows asterisk
- `variant?: 'amber' | 'gray'` - Color theme
- All standard HTML select props

### Button

```tsx
import { Button } from '@my-girok/ui-components';

function SubmitButton() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      {/* Primary button */}
      <Button
        variant="primary"
        size="lg"
        loading={loading}
        fullWidth
        onClick={handleSubmit}
      >
        Submit
      </Button>

      {/* Secondary button */}
      <Button variant="secondary" size="md">
        Cancel
      </Button>

      {/* Danger button */}
      <Button variant="danger" size="sm">
        Delete
      </Button>

      {/* Ghost button */}
      <Button variant="ghost">
        More Options
      </Button>

      {/* With icon */}
      <Button icon={<PlusIcon />}>
        Add Item
      </Button>
    </>
  );
}
```

**Props:**
- `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` - Button style
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `loading?: boolean` - Shows spinner
- `fullWidth?: boolean` - Full width
- `icon?: ReactNode` - Icon before text
- All standard HTML button props

### Alert

```tsx
import { Alert } from '@my-girok/ui-components';

function Messages() {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {/* Error alert */}
      <Alert variant="error" onClose={() => setError(null)}>
        Invalid email or password
      </Alert>

      {/* Success alert */}
      <Alert variant="success" title="Success!">
        Your account has been created
      </Alert>

      {/* Warning alert */}
      <Alert variant="warning">
        This action cannot be undone
      </Alert>

      {/* Info alert */}
      <Alert variant="info" title="Did you know?">
        You can use keyboard shortcuts to navigate faster
      </Alert>
    </>
  );
}
```

**Props:**
- `variant?: 'success' | 'error' | 'warning' | 'info'` - Alert type
- `title?: string` - Alert title
- `onClose?: () => void` - Close button callback
- `children: ReactNode` - Alert content

## Design System

### Colors
- **Primary**: Amber (700-800 for buttons, 200-400 for focus)
- **Danger**: Red (600-700)
- **Success**: Green (600-700)
- **Warning**: Yellow (600-700)
- **Info**: Blue (600-700)
- **Neutral**: Gray (200-900)

### Spacing
- Padding: `px-4 py-3` for inputs/selects
- Margin: `mb-2` for labels, `mt-1` for errors
- Gap: `space-y-4` for form groups

### Borders
- Default: `border border-gray-300`
- Focus: `focus:ring-2 focus:ring-amber-400`
- Error: `border-red-500 focus:ring-red-500`

### Typography
- Label: `text-sm font-semibold text-gray-700`
- Input: `text-gray-900`
- Error: `text-sm text-red-600`

## Benefits

### Before (per component)

```tsx
// LoginPage.tsx - Input field (~15 lines)
<div>
  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
    placeholder="you@example.com"
  />
</div>

// Repeated 40+ times across the codebase
```

### After (per component)

```tsx
// LoginPage.tsx - Input field (~6 lines)
<TextInput
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="you@example.com"
  required
/>

// Total savings: ~400-500 lines across 40+ occurrences
```

## Migration Guide

### Replacing inline inputs

**Before:**
```tsx
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Email
  </label>
  <input
    type="email"
    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg..."
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>
```

**After:**
```tsx
<TextInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### Replacing inline buttons

**Before:**
```tsx
<button
  type="submit"
  disabled={loading}
  className="w-full bg-gradient-to-r from-amber-700 to-amber-600..."
>
  {loading ? <Spinner /> : 'Submit'}
</button>
```

**After:**
```tsx
<Button
  type="submit"
  loading={loading}
  fullWidth
>
  Submit
</Button>
```

### Replacing inline alerts

**Before:**
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
    <svg className="w-5 h-5 mr-2" fill="currentColor">...</svg>
    <span className="text-sm">{error}</span>
  </div>
)}
```

**After:**
```tsx
{error && (
  <Alert variant="error" onClose={() => setError(null)}>
    {error}
  </Alert>
)}
```

## Development

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check

# Clean build artifacts
pnpm clean
```

## Related Issues

- Epic: #56 - Codebase Consolidation and Standardization
- Phase 2: #58 - Frontend Common Components & Hooks

## License

Private package for my-girok project
