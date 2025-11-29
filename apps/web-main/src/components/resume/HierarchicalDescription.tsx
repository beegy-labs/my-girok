import { useState } from 'react';
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

// Depth colors for visual hierarchy
const DEPTH_COLORS = {
  1: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500' },
  2: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500' },
  3: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-l-purple-500' },
  4: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-l-orange-500' },
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

// Recursive Hierarchical Item Component
function HierarchicalItemComponent({
  item,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  maxDepth = 4,
}: {
  item: HierarchicalItem;
  depth: number;
  onUpdate: (item: HierarchicalItem) => void;
  onRemove: () => void;
  onAddChild: () => void;
  maxDepth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleUpdateChild = (childIndex: number, updatedChild: HierarchicalItem) => {
    const newChildren = [...(item.children || [])];
    newChildren[childIndex] = updatedChild;
    onUpdate({ ...item, children: newChildren });
  };

  const handleRemoveChild = (childIndex: number) => {
    const newChildren = (item.children || []).filter((_, i) => i !== childIndex);
    onUpdate({ ...item, children: newChildren });
  };

  const handleAddChildToChild = (childIndex: number) => {
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
  };

  // Get depth color with fallback
  const depthColor = DEPTH_COLORS[depth as keyof typeof DEPTH_COLORS] || DEPTH_COLORS[4];

  // Calculate margin based on screen size (smaller on mobile)
  const mobileMargin = (depth - 1) * 0.25; // 0.25rem per depth on mobile

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Color-coded card by depth */}
      <div
        className={`${depthColor.bg} rounded-lg p-1.5 sm:p-2 border-l-4 ${depthColor.border} transition-colors duration-200`}
        style={{
          marginLeft: `${mobileMargin}rem`,
          maxWidth: `calc(100% - ${mobileMargin}rem)`
        }}
      >
        {/* Desktop: horizontal layout */}
        <div className="hidden sm:flex items-start gap-2" style={{
          marginLeft: `${(depth - 1) * 0.75}rem`,
        }}>
          <div className="flex items-center gap-1 min-w-[50px] flex-shrink-0">
            <span className="text-gray-600 dark:text-dark-text-secondary font-bold text-sm select-none">
              {getBulletSymbol(depth)}
            </span>
            <span className="text-xs text-gray-500 dark:text-dark-text-tertiary">({depth})</span>
          </div>

          <input
            type="text"
            value={item.content}
            onChange={e => onUpdate({ ...item, content: e.target.value })}
            className="flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none text-sm text-gray-900 dark:text-dark-text-primary min-w-0 transition-colors duration-200"
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            placeholder="설명을 입력하세요..."
          />

          <div className="flex items-center gap-1 flex-shrink-0">
            {depth < maxDepth && (
              <button
                type="button"
                onClick={onAddChild}
                className="px-2 py-1 bg-green-50 border border-green-300 text-green-700 text-xs rounded hover:bg-green-100 transition-all font-semibold whitespace-nowrap touch-manipulation"
                title="Add sub-item"
              >
                + 하위
              </button>
            )}

            {(item.children && item.children.length > 0) && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2 py-1 text-xs text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary transition-colors duration-200 touch-manipulation"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}

            <button
              type="button"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 text-xs font-semibold transition-colors duration-200 touch-manipulation"
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mobile: compact layout with inline action buttons */}
        <div className="sm:hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 dark:text-dark-text-secondary font-bold text-[11px] select-none flex-shrink-0 transition-colors duration-200">
              {getBulletSymbol(depth)}
            </span>
            <input
              type="text"
              value={item.content}
              onChange={e => onUpdate({ ...item, content: e.target.value })}
              className="flex-1 px-1 py-0.5 border-0 bg-transparent focus:outline-none text-xs text-gray-900 dark:text-dark-text-primary min-w-0 transition-colors duration-200"
              placeholder="설명 입력..."
            />
            {/* Inline action buttons for mobile */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {depth < maxDepth && (
                <button
                  type="button"
                  onClick={onAddChild}
                  className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 text-[10px] rounded hover:bg-green-200 transition-colors duration-200 touch-manipulation"
                  title="Add sub-item"
                >
                  +
                </button>
              )}

              {(item.children && item.children.length > 0) && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-6 h-6 flex items-center justify-center text-[10px] text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200 touch-manipulation"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}

              <button
                type="button"
                onClick={onRemove}
                className="w-6 h-6 flex items-center justify-center text-red-600 hover:bg-red-50 rounded text-[10px] font-semibold transition-colors duration-200 touch-manipulation"
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
              onUpdate={(updatedChild) => handleUpdateChild(childIndex, updatedChild)}
              onRemove={() => handleRemoveChild(childIndex)}
              onAddChild={() => handleAddChildToChild(childIndex)}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sortable Item Component (for drag-and-drop at root level)
function SortableHierarchicalItem({
  item,
  itemIndex,
  onUpdate,
  onRemove,
  onAddChild,
  maxDepth,
}: {
  item: HierarchicalItem;
  itemIndex: number;
  onUpdate: (item: HierarchicalItem) => void;
  onRemove: () => void;
  onAddChild: () => void;
  maxDepth: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id || `item-${itemIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1 sm:space-y-2">
      <div className="flex items-start gap-1.5 sm:gap-2 bg-white dark:bg-dark-bg-elevated rounded-lg p-1.5 sm:p-2 border border-amber-200 dark:border-dark-border-default transition-colors duration-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 sm:mt-1 p-1 cursor-move text-gray-400 dark:text-dark-text-tertiary hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200 flex-shrink-0 touch-manipulation"
          title="Drag to reorder"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
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
  label = "설명",
  placeholder = "설명을 추가하려면 아래 버튼을 클릭하세요",
  maxDepth = 4,
}: HierarchicalDescriptionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => (item.id || `item-${items.indexOf(item)}`) === active.id);
    const newIndex = items.findIndex(item => (item.id || `item-${items.indexOf(item)}`) === over.id);

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

  const updateItem = (index: number, item: HierarchicalItem) => {
    const newItems = [...items];
    newItems[index] = item;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="border-t border-amber-200 dark:border-dark-border-default pt-4 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
          ⭐ {label}
          <span className="text-xs text-gray-500 dark:text-dark-text-tertiary font-normal">(최대 {maxDepth}단계)</span>
        </label>
        <button
          type="button"
          onClick={addItem}
          className="px-2 py-1 bg-amber-600 dark:bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition-all transition-colors duration-200"
        >
          + 추가
        </button>
      </div>

      {items && items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
                  onUpdate={(updatedItem) => updateItem(index, updatedItem)}
                  onRemove={() => removeItem(index)}
                  onAddChild={() => {
                    const newChild: HierarchicalItem = {
                      content: '',
                      depth: 2,
                      order: (item.children || []).length,
                      children: [],
                    };
                    updateItem(index, {
                      ...item,
                      children: [...(item.children || []), newChild],
                    });
                  }}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-xs text-gray-500 dark:text-dark-text-tertiary italic">{placeholder}</p>
      )}
    </div>
  );
}
