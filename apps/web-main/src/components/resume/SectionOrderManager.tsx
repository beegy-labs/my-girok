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
import { SectionType } from '../../api/resume';

interface ResumeSection {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
}

interface SectionOrderManagerProps {
  sections: ResumeSection[];
  onReorder: (sections: ResumeSection[]) => void;
}

const SECTION_LABELS: Record<SectionType, string> = {
  SKILLS: '기술 스택',
  EXPERIENCE: '경력',
  PROJECT: '프로젝트',
  EDUCATION: '학력',
  CERTIFICATE: '자격증',
};

function SortableSection({ section }: { section: ResumeSection }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-amber-400 transition-colors"
    >
      <div className="flex items-center gap-3">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded transition-colors"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span className="font-medium text-gray-900">{SECTION_LABELS[section.type]}</span>
      </div>
      <span className="text-sm text-gray-500">#{section.order + 1}</span>
    </div>
  );
}

export default function SectionOrderManager({ sections, onReorder }: SectionOrderManagerProps) {
  const [items, setItems] = useState(sections.sort((a, b) => a.order - b.order));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }));

      setItems(newItems);
      onReorder(newItems);
    }
  };

  return (
    <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-amber-900 mb-2 flex items-center gap-2">
          <span>↕️</span>
          Section Order
        </h2>
        <p className="text-sm text-gray-600">
          Drag and drop to reorder sections. Fixed sections (Header, Summary, Cover Letter, Career Goals) cannot be reordered.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((section) => (
              <SortableSection key={section.id} section={section} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Sections will appear in this order in your resume preview and PDF export.
        </p>
      </div>
    </div>
  );
}
