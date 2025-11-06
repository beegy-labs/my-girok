# Web Admin App

> Admin dashboard for content moderation and user management

## Purpose

Internal admin dashboard for managing users, content, and system settings. Restricted to admin users only.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Tables**: TanStack Table
- **Charts**: Recharts

## Key Features

- User management (list, view, suspend, delete)
- Content moderation (posts, notes, files)
- System metrics and analytics
- Configuration management

## API Integration

```typescript
// lib/api/admin-client.ts
const ADMIN_API = `${process.env.NEXT_PUBLIC_WEB_BFF_URL}/api/admin`;

export const adminClient = {
  // Users
  async getUsers(params?: { page?: number; limit?: number }) {
    return apiClient.get(`${ADMIN_API}/users`, params);
  },

  async getUserById(id: string) {
    return apiClient.get(`${ADMIN_API}/users/${id}`);
  },

  async suspendUser(id: string, reason: string) {
    return apiClient.post(`${ADMIN_API}/users/${id}/suspend`, { reason });
  },

  // Content
  async getPosts(params?: { status?: string; page?: number }) {
    return apiClient.get(`${ADMIN_API}/posts`, params);
  },

  async moderatePost(id: string, action: 'approve' | 'reject', reason?: string) {
    return apiClient.post(`${ADMIN_API}/posts/${id}/moderate`, { action, reason });
  },

  // Metrics
  async getMetrics() {
    return apiClient.get(`${ADMIN_API}/metrics`);
  },
};
```

## Key Pages

### Users Management

```typescript
// app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    adminClient.getUsers().then(setUsers);
  }, []);

  const columns = [
    { header: 'Email', accessorKey: 'email' },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Role', accessorKey: 'role' },
    { header: 'Status', accessorKey: 'status' },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div>
          <button onClick={() => handleSuspend(row.original.id)}>
            Suspend
          </button>
          <button onClick={() => handleDelete(row.original.id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1>Users Management</h1>
      <DataTable data={users} columns={columns} />
    </div>
  );
}
```

### Dashboard (Metrics)

```typescript
// app/admin/page.tsx
import { Suspense } from 'react';
import { MetricsCards } from '@/components/MetricsCards';
import { UserGrowthChart } from '@/components/UserGrowthChart';

export default async function AdminDashboard() {
  const metrics = await adminClient.getMetrics();

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <MetricsCards
        users={metrics.totalUsers}
        posts={metrics.totalPosts}
        activeUsers={metrics.activeUsers}
      />

      <Suspense fallback={<ChartSkeleton />}>
        <UserGrowthChart data={metrics.userGrowth} />
      </Suspense>
    </div>
  );
}
```

## Authentication

### Admin Guard

```typescript
// app/admin/layout.tsx
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

## Integration Points

### Outgoing
- **web-bff**: `/api/admin/*` endpoints
- **api-gateway**: Alternative routing

### Environment Variables

```bash
NEXT_PUBLIC_WEB_BFF_URL=https://web-bff.mygirok.dev
```
