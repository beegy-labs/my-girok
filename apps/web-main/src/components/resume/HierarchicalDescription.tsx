import { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBulletSymbol } from '../../utils/hierarchical-renderer';

// Depth colors for visual hierarchy - WCAG AAA 7:1+ compliant
const DEPTH_COLORS = {
  1: {
    bg: 'bg-theme-level-1-bg',
    border: 'border-l-theme-level-1-border',
    text: 'text-theme-level-1-text',
  },
  2: {
    bg: 'bg-theme-level-2-bg',
    border: 'border-l-theme-level-2-border',
    text: 'text-theme-level-2-text',
  },
  3: {
    bg: 'bg-theme-level-3-bg',
    border: 'border-l-theme-level-3-border',
    text: 'text-theme-level-3-text',
  },
  4: {
    bg: 'bg-theme-level-4-bg',
    border: 'border-l-theme-level-4-border',
    text: 'text-theme-level-4-text',
  },
} as const;

// Generic type for hierarchical descriptions
export interface HierarchicalItem {
  id?: string;
  content: string;
  depth: number; // 1-4
  order: number;
  children?: HierarchicalItem[];
}

interface HierarchicalDescriptionProps {
  items: HierarchicalItem[];
  onChange: (items: HierarchicalItem[]) => void;
  label?: string;
  placeholder?: string;
  maxDepth?: number; // Default: 4
}

// Recursive Hierarchical Item Component (2025 best practice with memo)
const HierarchicalItemComponent = memo(function HierarchicalItemComponent({
  item,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  maxDepth = 4,
  t,
}: {
  item: HierarchicalItem;
  depth: number;
  onUpdate: (item: HierarchicalItem) => void;
  onRemove: () => void;
  onAddChild: () => void;
  maxDepth?: number;
  t: (key: string) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Memoized toggle handler (2025 best practice)
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Memoized content change handler (2025 best practice)
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...item, content: e.target.value });
    },
    [item, onUpdate],
  );

  // Curried handler for updating child (2025 React best practice)
  const handleUpdateChild = useCallback(
    (childIndex: number) => (updatedChild: HierarchicalItem) => {
      const newChildren = [...(item.children || [])];
      newChildren[childIndex] = updatedChild;
      onUpdate({ ...item, children: newChildren });
    },
    [item, onUpdate],
  );

  // Curried handler for removing child (2025 React best practice)
  const handleRemoveChild = useCallback(
    (childIndex: number) => () => {
      const newChildren = (item.children || []).filter((_, i) => i !== childIndex);
      onUpdate({ ...item, children: newChildren });
    },
    [item, onUpdate],
  );

  // Curried handler for adding child to child (2025 React best practice)
  const handleAddChildToChild = useCallback(
    (childIndex: number) => () => {
      const newChildren = [...(item.children || [])];
      const newSubChild: HierarchicalItem = {
        content: '',
        depth: depth + 2,
        order: (newChildren[childIndex].children || []).length,
        children: [],
      };
      newChildren[childIndex] = {
        ...newChildren[childIndex],
        children: [...(newChildren[childIndex].children || []), newSubChild],
      };
      onUpdate({ ...item, children: newChildren });
    },
    [item, depth, onUpdate],
  );

  // Get depth color with fallback
  const depthColor = DEPTH_COLORS[depth as keyof typeof DEPTH_COLORS] || DEPTH_COLORS[4];

  // Calculate margin based on screen size (smaller on mobile)
  const mobileMargin = (depth - 1) * 0.25; // 0.25rem per depth on mobile

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Color-coded card by depth */}
      <div
        className={`${depthColor.bg} rounded-input p-1.5 sm:p-2 border-l-4 ${depthColor.border} transition-colors duration-200`}
        style={{
          marginLeft: `${mobileMargin}rem`,
          maxWidth: `calc(100% - ${mobileMargin}rem)`,
        }}
      >
        {/* Desktop: horizontal layout */}
        <div
          className="hidden sm:flex items-start gap-2"
          style={{
            marginLeft: `${(depth - 1) * 0.75}rem`,
          }}
        >
          <div className="flex items-center gap-1 min-w-[50px] flex-shrink-0">
            <span className={`${depthColor.text} font-bold text-sm select-none`}>
              {getBulletSymbol(depth)}
            </span>
            <span className={`text-xs ${depthColor.text} opacity-70`}>({depth})</span>
          </div>

          <input
            type="text"
            value={item.content}
            onChange={handleContentChange}
            className={`flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none text-sm ${depthColor.text} min-w-0 transition-colors duration-200`}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            placeholder={t('resume.hierarchical.enterDescription')}
          />

          <div className="flex items-center gap-1 flex-shrink-0">
            {depth < maxDepth && (
              <button
                type="button"
                onClick={onAddChild}
                className="px-2 py-1 bg-theme-status-success-bg border border-theme-status-success-border text-theme-status-success-text text-xs rounded hover:opacity-80 transition-all font-semibold whitespace-nowrap touch-manipulation"
                title={t('common.addSubItem')}
              >
                {t('resume.hierarchical.addSubItem')}
              </button>
            )}

            {item.children && item.children.length > 0 && (
              <button
                type="button"
                onClick={handleToggleExpanded}
                className="px-2 py-1 text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors duration-200 touch-manipulation"
                title={isExpanded ? t('common.collapse') : t('common.expand')}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}

            <button
              type="button"
              onClick={onRemove}
              className="text-theme-status-error-text hover:opacity-80 text-xs font-semibold transition-colors duration-200 touch-manipulation"
              title={t('common.remove')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mobile: compact layout with inline action buttons */}
        <div className="sm:hidden">
          <div className="flex items-center gap-1.5">
            <span
              className={`${depthColor.text} font-bold text-[11px] select-none flex-shrink-0 transition-colors duration-200`}
            >
              {getBulletSymbol(depth)}
            </span>
            <input
              type="text"
              value={item.content}
              onChange={handleContentChange}
              className={`flex-1 px-1 py-0.5 border-0 bg-transparent focus:outline-none text-xs ${depthColor.text} min-w-0 transition-colors duration-200`}
              placeholder={t('resume.hierarchical.enterDescription')}
            />
            {/* Inline action buttons for mobile */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {depth < maxDepth && (
                <button
                  type="button"
                  onClick={onAddChild}
                  className="w-6 h-6 flex items-center justify-center bg-theme-status-success-bg text-theme-status-success-text text-[10px] rounded hover:opacity-80 transition-colors duration-200 touch-manipulation"
                  title={t('common.addSubItem')}
                >
                  +
                </button>
              )}

              {item.children && item.children.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleExpanded}
                  className="w-6 h-6 flex items-center justify-center text-[10px] text-theme-text-secondary hover:bg-theme-bg-hover rounded transition-colors duration-200 touch-manipulation"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}

              <button
                type="button"
                onClick={onRemove}
                className="w-6 h-6 flex items-center justify-center text-theme-status-error-text hover:bg-theme-status-error-bg rounded text-[10px] font-semibold transition-colors duration-200 touch-manipulation"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Render children recursively */}
      {isExpanded && item.children && item.children.length > 0 && (
        <div className="space-y-2">
          {item.children.map((child, childIndex) => (
            <HierarchicalItemComponent
              key={childIndex}
              item={child}
              depth={depth + 1}
              onUpdate={handleUpdateChild(childIndex)}
              onRemove={handleRemoveChild(childIndex)}
              onAddChild={handleAddChildToChild(childIndex)}
              maxDepth={maxDepth}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Sortable Item Component (for drag-and-drop at root level)
function SortableHierarchicalItem({
  item,
  itemIndex,
  onUpdate,
  onRemove,
  onAddChild,
  maxDepth,
  t,
}: {
  item: HierarchicalItem;
  itemIndex: number;
  onUpdate: (item: HierarchicalItem) => void;
  onRemove: () => void;
  onAddChild: () => void;
  maxDepth: number;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id || `item-${itemIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1 sm:space-y-2">
      <div className="flex items-start gap-1.5 sm:gap-2 bg-theme-bg-elevated rounded-input p-1.5 sm:p-2 border border-theme-border-default transition-colors duration-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 sm:mt-1 p-1 cursor-move text-theme-text-tertiary hover:text-theme-primary transition-colors duration-200 flex-shrink-0 touch-manipulation"
          title={t('common.dragToReorder')}
        >
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <HierarchicalItemComponent
            item={item}
            depth={1}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onAddChild={onAddChild}
            maxDepth={maxDepth}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function HierarchicalDescription({
  items,
  onChange,
  label,
  placeholder,
  maxDepth = 4,
}: HierarchicalDescriptionProps) {
  const { t } = useTranslation();
  const displayLabel = label || t('resume.hierarchical.description');
  const displayPlaceholder = placeholder || t('resume.hierarchical.placeholder');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(
      (item) => (item.id || `item-${items.indexOf(item)}`) === active.id,
    );
    const newIndex = items.findIndex(
      (item) => (item.id || `item-${items.indexOf(item)}`) === over.id,
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order: idx,
      }));
      onChange(newItems);
    }
  };

  const addItem = () => {
    const newItem: HierarchicalItem = {
      content: '',
      depth: 1,
      order: items.length,
      children: [],
    };
    onChange([...items, newItem]);
  };

  // Curried handler for updating item (2025 React best practice)
  const updateItem = useCallback(
    (index: number) => (item: HierarchicalItem) => {
      const newItems = [...items];
      newItems[index] = item;
      onChange(newItems);
    },
    [items, onChange],
  );

  // Curried handler for removing item (2025 React best practice)
  const removeItem = useCallback(
    (index: number) => () => {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
    },
    [items, onChange],
  );

  // Curried handler for adding child to item (2025 React best practice)
  const addChildToItem = useCallback(
    (index: number, item: HierarchicalItem) => () => {
      const newChild: HierarchicalItem = {
        content: '',
        depth: 2,
        order: (item.children || []).length,
        children: [],
      };
      const newItems = [...items];
      newItems[index] = {
        ...item,
        children: [...(item.children || []), newChild],
      };
      onChange(newItems);
    },
    [items, onChange],
  );

  return (
    <div className="border-t border-theme-border-default pt-4 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-theme-text-accent flex items-center gap-2">
          ⭐ {displayLabel}
          <span className="text-xs text-theme-text-tertiary font-normal">
            {t('resume.hierarchical.maxDepth', { depth: maxDepth })}
          </span>
        </label>
        <button
          type="button"
          onClick={addItem}
          className="px-2 py-1 bg-theme-primary text-white text-xs rounded-input hover:bg-theme-primary-light transition-all duration-200"
        >
          + {t('common.add')}
        </button>
      </div>

      {items && items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((item, i) => item.id || `item-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableHierarchicalItem
                  key={item.id || `item-${index}`}
                  item={item}
                  itemIndex={index}
                  onUpdate={updateItem(index)}
                  onRemove={removeItem(index)}
                  onAddChild={addChildToItem(index, item)}
                  maxDepth={maxDepth}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-xs text-theme-text-tertiary italic">{displayPlaceholder}</p>
      )}
    </div>
  );
}
