// apps/web-admin/src/components/atoms/Spinner.tsx
import { memo } from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 16, md: 24, lg: 32 };

export const Spinner = memo<SpinnerProps>(({ size = 'md', className = '' }) => (
  <Loader2 size={sizes[size]} className={`animate-spin text-theme-primary ${className}`} />
));

Spinner.displayName = 'Spinner';
