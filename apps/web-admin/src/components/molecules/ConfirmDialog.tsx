// apps/web-admin/src/components/molecules/ConfirmDialog.tsx
import { memo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog = memo<ConfirmDialogProps>(
  ({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'danger',
    onConfirm,
    onCancel,
    loading = false,
  }) => {
    const { t } = useTranslation();
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isOpen) dialogRef.current?.focus();
    }, [isOpen]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      },
      [onCancel],
    );

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onCancel}
      >
        <Card
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              ${variant === 'danger' ? 'bg-theme-error/10 text-theme-error' : ''}
              ${variant === 'warning' ? 'bg-theme-status-warning-bg text-theme-status-warning-text' : ''}
              ${variant === 'info' ? 'bg-theme-primary/10 text-theme-primary' : ''}`}
            >
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-theme-text-primary">{title}</h3>
              <p className="mt-2 text-sm text-theme-text-secondary">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-theme-text-tertiary hover:text-theme-text-primary"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {cancelLabel || t('common.cancel')}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel || t('common.confirm')}
            </Button>
          </div>
        </Card>
      </div>
    );
  },
);

ConfirmDialog.displayName = 'ConfirmDialog';
