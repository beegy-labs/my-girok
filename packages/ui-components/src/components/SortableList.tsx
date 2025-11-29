import { ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

export interface SortableListProps<T> {
  /**
   * Array of items to render
   */
  items: T[];
  /**
   * Callback when items are reordered
   */
  onReorder: (items: T[]) => void;
  /**
   * Function to extract unique ID from each item
   */
  getItemId: (item: T, index: number) => string;
  /**
   * Render function for each item
   */
  renderItem: (item: T, index: number) => ReactNode;
  /**
   * Strategy for sorting (vertical or horizontal)
   */
  strategy?: 'vertical' | 'horizontal';
  /**
   * Custom drag overlay (optional)
   */
  renderDragOverlay?: (item: T | null) => ReactNode;
  /**
   * Container className
   */
  className?: string;
}

/**
 * Reusable sortable list component using @dnd-kit
 *
 * @example
 * ```tsx
 * <SortableList
 *   items={experiences}
 *   onReorder={setExperiences}
 *   getItemId={(exp) => exp.id}
 *   renderItem={(exp, index) => (
 *     <SortableItem id={exp.id}>
 *       <ExperienceCard experience={exp} />
 *     </SortableItem>
 *   )}
 * />
 * ```
 */
export function SortableList<T>({
  items,
  onReorder,
  getItemId,
  renderItem,
  strategy = 'vertical',
  renderDragOverlay,
  className = '',
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item, idx) => getItemId(item, idx) === active.id);
      const newIndex = items.findIndex((item, idx) => getItemId(item, idx) === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...items];
        const [movedItem] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, movedItem);
        onReorder(reordered);
      }
    }
  };

  const strategyMap = {
    vertical: verticalListSortingStrategy,
    horizontal: horizontalListSortingStrategy,
  };

  const ids = items.map((item, idx) => getItemId(item, idx));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={strategyMap[strategy]}>
        <div className={className}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </SortableContext>

      {renderDragOverlay && (
        <DragOverlay>
          {renderDragOverlay(null)}
        </DragOverlay>
      )}
    </DndContext>
  );
}
