// apps/web-admin/src/components/molecules/Modal.tsx
import { memo, useCallback, useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Card } from '../atoms/Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export const Modal = memo<ModalProps>(({ isOpen, onClose, title, children, className = '' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <Card
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-theme-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-theme-text-tertiary hover:text-theme-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
});

Modal.displayName = 'Modal';
