# Web Main App

> Public-facing web application

## Purpose

Main web application for end users. Built with Next.js 15 App Router for optimal performance and SEO.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Hooks + Server State
- **API**: Fetch wrapper + GraphQL client (optional)

## Project Structure

```
apps/web/main/
├── app/                    # App Router
│   ├── (auth)/            # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (main)/            # Main route group
│   │   ├── page.tsx       # Home
│   │   ├── dashboard/
│   │   ├── posts/
│   │   └── profile/
│   ├── layout.tsx         # Root layout (with Rybbit)
│   └── api/               # API routes (if needed)
├── components/
│   ├── auth/              # Login, Register forms
│   ├── layout/            # Header, Footer, Sidebar
│   ├── posts/             # Post components
│   └── shared/            # Buttons, Inputs, Cards
└── lib/
    ├── api/               # API client
    ├── auth/              # Auth helpers
    └── utils/
```

## API Integration

### API Client

```typescript
// lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_WEB_BFF_URL || 'http://localhost:3001';

export const apiClient = {
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try refresh
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return this.request(endpoint, options); // Retry
      }
      // Redirect to login
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  },

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
```

### GraphQL Client (Optional)

```typescript
// lib/api/graphql-client.ts
import { GraphQLClient } from 'graphql-request';

const endpoint = `${process.env.NEXT_PUBLIC_WEB_BFF_URL}/graphql`;

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: () => ({
    Authorization: `Bearer ${getAccessToken()}`,
  }),
});

// Usage
import { gql } from 'graphql-request';

const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboard {
      user {
        name
        avatar
      }
      recentPosts {
        id
        title
        createdAt
      }
      stats {
        totalPosts
        totalViews
      }
    }
  }
`;

const data = await graphqlClient.request(DASHBOARD_QUERY);
```

## Key Pages

### Home Page

```typescript
// app/(main)/page.tsx
export default async function HomePage() {
  const posts = await getPosts({ limit: 10 });

  return (
    <main>
      <h1>Welcome to My Girok</h1>
      <PostList posts={posts} />
    </main>
  );
}

// ISR: Revalidate every 60 seconds
export const revalidate = 60;
```

### Dashboard Page

```typescript
// app/(main)/dashboard/page.tsx
import { Suspense } from 'react';

export default async function DashboardPage() {
  // Server Component - fetch on server
  const user = await getCurrentUser();

  return (
    <div>
      <h1>Dashboard</h1>
      <UserProfile user={user} />

      {/* Streaming with Suspense */}
      <Suspense fallback={<PostsSkeleton />}>
        <RecentPosts userId={user.id} />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <UserStats userId={user.id} />
      </Suspense>
    </div>
  );
}
```

### Login Page

```typescript
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      const { accessToken, refreshToken } = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      // Store tokens
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Authentication

### Token Storage

```typescript
// lib/auth/tokens.ts

// Access token in localStorage (client-side only)
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setAccessToken(token: string) {
  localStorage.setItem('accessToken', token);
}

// Refresh token in HttpOnly cookie (set by BFF)
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send HttpOnly cookie
    });

    if (response.ok) {
      const { accessToken } = await response.json();
      setAccessToken(accessToken);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
```

### Protected Route

```typescript
// app/(main)/dashboard/layout.tsx
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

## Root Layout (CRITICAL)

```typescript
// app/layout.tsx
import Script from 'next/script';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Rybbit Analytics (REQUIRED) */}
        <Script
          src="https://rybbit.girok.dev/api/script.js"
          data-site-id="7a5f53c5f793"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

## Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src={post.coverImage}
  alt={post.title}
  width={1200}
  height={630}
  priority // For above-the-fold images
  placeholder="blur"
/>
```

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-side only
});
```

### Data Fetching

```typescript
// Server Component (default)
async function getData() {
  const res = await fetch('https://api.mygirok.dev/posts', {
    next: { revalidate: 60 }, // ISR
  });
  return res.json();
}

// Client Component
'use client';
import { useEffect, useState } from 'react';

function ClientComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(setData);
  }, []);
}
```

## Integration Points

### Outgoing (This app calls)
- **web-bff**: Primary API for data
- **api-gateway**: Alternative routing

### Environment Variables

```bash
NEXT_PUBLIC_WEB_BFF_URL=https://web-bff.mygirok.dev
NEXT_PUBLIC_API_GATEWAY_URL=https://api.mygirok.dev
```

## Common Patterns

### Server Action (Form Submission)

```typescript
// app/actions/posts.ts
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title');
  const content = formData.get('content');

  const post = await apiClient.post('/api/posts', { title, content });

  revalidatePath('/posts');
  return post;
}

// Usage in component
'use client';
import { createPost } from '@/app/actions/posts';

<form action={createPost}>
  <input name="title" />
  <textarea name="content" />
  <button type="submit">Create</button>
</form>
```

### Error Handling

```typescript
// app/error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

## Testing

```typescript
// __tests__/LoginPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';

test('login form submission', async () => {
  render(<LoginPage />);

  fireEvent.change(screen.getByPlaceholderText('Email'), {
    target: { value: 'test@example.com' },
  });

  fireEvent.click(screen.getByText('Login'));

  // Assert...
});
```

## Deployment

- Build: `pnpm build`
- Output: `.next/` directory
- Deploy: Vercel, Docker, or static export
