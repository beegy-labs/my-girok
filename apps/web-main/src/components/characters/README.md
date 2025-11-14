# Character Components

Theme-aware animated SVG characters for My-Girok application.

## Characters

### 🐿️ Squirrel (Light Mode)
- **Concept**: "Busy record collector during the day"
- **Personality**: Energetic, cheerful, diligent
- **Colors**: Warm amber tones (#D97706, #FEF3C7)
- **Animation**: Tail wagging, holding acorn

### 🦉 Owl (Dark Mode)
- **Concept**: "Silent library guardian at night"
- **Personality**: Wise, calm, mysterious
- **Colors**: Gray tones with amber glow (#52575F, #FBBF24)
- **Animation**: Wing flapping, glowing amber eyes, reading book

## Components

### `CharacterLoader`

Theme-aware character display that automatically switches between Squirrel and Owl.

```tsx
import { CharacterLoader } from './components/characters';

// Basic usage
<CharacterLoader state="loading" />

// With custom size
<CharacterLoader state="idle" size={150} />

// All states
<CharacterLoader state="idle" />      // Default calm state
<CharacterLoader state="loading" />   // Active animation
<CharacterLoader state="sad" />       // Error state
<CharacterLoader state="confused" />  // 404 state
<CharacterLoader state="sleeping" />  // Expired/maintenance
```

### `CharacterMessage`

Complete message component with character, title, message, and action button.

```tsx
import { CharacterMessage } from './components/characters';

// Loading state
<CharacterMessage type="loading" />

// 404 Not Found
<CharacterMessage
  type="not-found"
  action={<Button>Go Home</Button>}
/>

// Error
<CharacterMessage
  type="error"
  title="Custom error title"
  message="Custom error message"
  action={<Button>Retry</Button>}
/>

// Expired link
<CharacterMessage type="expired" />

// Deleted content
<CharacterMessage type="deleted" />

// No permission
<CharacterMessage type="no-permission" />

// Maintenance
<CharacterMessage type="maintenance" />
```

### `LoadingSpinner`

Reusable loading component with theme-aware character.

```tsx
import LoadingSpinner from './components/LoadingSpinner';

// Basic usage
<LoadingSpinner />

// With custom message
<LoadingSpinner message="Loading your resume..." />

// Full screen overlay
<LoadingSpinner fullScreen />

// Custom size
<LoadingSpinner size={150} />
```

## Usage in Pages

### Shared Resume Page (with various states)

```tsx
import { CharacterMessage } from '../components/characters';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SharedResumePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState(null);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Link expired
  if (error === 'EXPIRED') {
    return (
      <CharacterMessage
        type="expired"
        action={
          <Link to="/">
            <Button>Go to Homepage</Button>
          </Link>
        }
      />
    );
  }

  // Link deleted
  if (error === 'DELETED') {
    return <CharacterMessage type="deleted" />;
  }

  // No permission
  if (error === 'NO_PERMISSION') {
    return <CharacterMessage type="no-permission" />;
  }

  // Not found
  if (error === 'NOT_FOUND') {
    return (
      <CharacterMessage
        type="not-found"
        action={<Button>Go Home</Button>}
      />
    );
  }

  // General error
  if (error) {
    return (
      <CharacterMessage
        type="error"
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  return <div>{/* Resume content */}</div>;
}
```

### 404 Not Found Page

```tsx
import { CharacterMessage } from '../components/characters';

export default function NotFoundPage() {
  return (
    <CharacterMessage
      type="not-found"
      size={150}
      action={
        <Link to="/">
          <Button>Go to Homepage</Button>
        </Link>
      }
    />
  );
}
```

### Error Boundary

```tsx
import ErrorBoundary from './components/ErrorBoundary';

// Wrap your app
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Message Types

| Type | State | Use Case | Character Emotion |
|------|-------|----------|-------------------|
| `loading` | loading | Data fetching | Active, animated |
| `not-found` | confused | 404, resource not found | Confused, questioning |
| `error` | sad | General errors | Sad, apologetic |
| `expired` | sleeping | Expired links, sessions | Sleeping, peaceful |
| `deleted` | sad | Deleted content | Sad, regretful |
| `no-permission` | confused | Access denied | Confused, blocked |
| `maintenance` | sleeping | System maintenance | Sleeping, resting |

## Character States

| State | Description | Animation |
|-------|-------------|-----------|
| `idle` | Default calm state | Subtle movements |
| `loading` | Active fetching | Tail wag / wing flap, glowing eyes |
| `sad` | Error or negative state | Sad expression, droopy ears/wings |
| `confused` | Question or unknown state | Tilted head, question mark |
| `sleeping` | Inactive or expired state | Closed eyes, Z's floating |

## Theme Behavior

- **Light mode** → 🐿️ Squirrel appears
- **Dark mode** → 🦉 Owl appears
- **System mode** → Follows system preference

All transitions are smooth with no layout shifts.

## Messages by Theme

Each message type has different text for light/dark mode to match the character's personality:

**Light Mode (Squirrel)**:
- "기록을 부지런히 찾고 있어요!"
- Energetic, enthusiastic tone

**Dark Mode (Owl)**:
- "고요한 밤에 기록을 찾는 중이에요..."
- Calm, mysterious tone

## Styling

All components support Tailwind's dark mode:
- Background: `bg-gray-50 dark:bg-dark-bg-primary`
- Text: `text-gray-700 dark:text-dark-text-secondary`
- Buttons: `from-amber-700 dark:from-amber-400`

## Accessibility

- All text meets WCAG 2.1 AA standards
- Semantic HTML elements used
- ARIA labels for interactive elements
- Screen reader friendly
- Keyboard navigation supported
