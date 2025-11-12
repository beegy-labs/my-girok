import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

  const getBulletSymbol = (d: number) => {
    switch (d) {
      case 1: return '•';
      case 2: return '◦';
      case 3: return '▪';
      case 4: return '▫';
      default: return '•';
    }
  };

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

  return (
    <div className="space-y-2">
      <div
        className="flex items-start gap-2 bg-amber-50/30 rounded-lg p-2 border border-amber-100"
        style={{
          marginLeft: `${(depth - 1) * 1.5}rem`,
          maxWidth: `calc(100% - ${(depth - 1) * 1.5}rem)`
        }}
      >
        <div className="flex items-center gap-1 min-w-[60px] flex-shrink-0">
          <span className="text-gray-600 font-bold text-sm select-none">
            {getBulletSymbol(depth)}
          </span>
          <span className="text-xs text-gray-500">({depth})</span>
        </div>

        <input
          type="text"
          value={item.content}
          onChange={e => onUpdate({ ...item, content: e.target.value })}
          className="flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none text-sm text-gray-900 min-w-0"
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          placeholder="설명을 입력하세요..."
        />

        <div className="flex items-center gap-1 flex-shrink-0">
          {depth < maxDepth && (
            <button
              type="button"
              onClick={onAddChild}
              className="px-2 py-1 bg-green-50 border border-green-300 text-green-700 text-xs rounded hover:bg-green-100 transition-all font-semibold whitespace-nowrap"
              title="Add sub-item"
            >
              + 하위
            </button>
          )}

          {(item.children && item.children.length > 0) && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 text-xs font-semibold"
            title="Remove"
          >
            ✕
          </button>
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
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="flex items-start gap-2 bg-white rounded-lg p-2 border border-amber-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-move text-gray-400 hover:text-amber-600 transition-colors flex-shrink-0"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
    <div className="border-t border-amber-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-amber-900 flex items-center gap-2">
          ⭐ {label}
          <span className="text-xs text-gray-500 font-normal">(최대 {maxDepth}단계)</span>
        </label>
        <button
          type="button"
          onClick={addItem}
          className="px-2 py-1 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-all"
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
        <p className="text-xs text-gray-500 italic">{placeholder}</p>
      )}
    </div>
  );
}
