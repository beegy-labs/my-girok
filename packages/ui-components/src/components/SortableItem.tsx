import { ReactNode, CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';

export interface SortableItemProps {
  /**
   * Unique identifier for the sortable item
   */
  id: string;
  /**
   * Content to render inside the sortable wrapper
   */
  children: ReactNode;
  /**
   * Custom className for the wrapper
   */
  className?: string;
  /**
   * Opacity when dragging (default: 0.5)
   */
  dragOpacity?: number;
  /**
   * Whether to show drag handle (default: false)
   * If true, only the handle will be draggable
   */
  useDragHandle?: boolean;
  /**
   * Custom drag handle element (optional)
   */
  renderDragHandle?: (
    listeners: SyntheticListenerMap | undefined,
    attributes: DraggableAttributes
  ) => ReactNode;
}

/**
 * Reusable sortable item component using @dnd-kit
 *
 * @example
 * ```tsx
 * <SortableItem id={item.id}>
 *   <div className="card">
 *     {item.title}
 *   </div>
 * </SortableItem>
 * ```
 *
 * @example With drag handle
 * ```tsx
 * <SortableItem
 *   id={item.id}
 *   useDragHandle
 *   renderDragHandle={(listeners, attributes) => (
 *     <button {...listeners} {...attributes}>
 *       ⋮⋮
 *     </button>
 *   )}
 * >
 *   <div>{item.title}</div>
 * </SortableItem>
 * ```
 */
export function SortableItem({
  id,
  children,
  className = '',
  dragOpacity = 0.5,
  useDragHandle = false,
  renderDragHandle,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? dragOpacity : 1,
  };

  // If using drag handle, don't apply listeners to the container
  const containerProps = useDragHandle
    ? { ref: setNodeRef, style }
    : { ref: setNodeRef, style, ...attributes, ...listeners };

  return (
    <div className={className} {...containerProps}>
      {useDragHandle && renderDragHandle?.(listeners, attributes)}
      {children}
    </div>
  );
}

export interface DragHandleProps {
  listeners: SyntheticListenerMap | undefined;
  attributes: DraggableAttributes;
  className?: string;
}

/**
 * Default drag handle component
 *
 * @example
 * ```tsx
 * <SortableItem
 *   id={item.id}
 *   useDragHandle
 *   renderDragHandle={(listeners, attributes) => (
 *     <DragHandle listeners={listeners} attributes={attributes} />
 *   )}
 * >
 *   <div>{item.title}</div>
 * </SortableItem>
 * ```
 */
export function DragHandle({
  listeners,
  attributes,
  className = '',
}: DragHandleProps) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing text-theme-text-muted hover:text-theme-text-secondary ${className}`}
      aria-label="Drag to reorder"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>
    </button>
  );
}
