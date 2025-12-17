import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

// Section labels are now handled via i18n

function SortableSection({ section }: { section: ResumeSection }) {
  const { t } = useTranslation();
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

  const getSectionLabel = (type: SectionType): string => {
    const labelMap: Record<SectionType, string> = {
      SKILLS: t('resume.sections.skills'),
      EXPERIENCE: t('resume.sections.experience'),
      PROJECT: t('resume.sections.projects'),
      EDUCATION: t('resume.sections.education'),
      CERTIFICATE: t('resume.sections.certifications'),
    };
    return labelMap[type];
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-theme-bg-elevated border border-theme-border-subtle rounded-lg p-4 flex items-center justify-between hover:border-theme-primary transition-colors duration-200"
    >
      <div className="flex items-center gap-3">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-theme-bg-hover rounded transition-colors duration-200"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5 text-theme-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span className="font-medium text-theme-text-primary">{getSectionLabel(section.type)}</span>
      </div>
      <span className="text-sm text-theme-text-tertiary">#{section.order + 1}</span>
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
    <div className="bg-theme-bg-card border border-theme-border-subtle rounded-2xl shadow-theme-md p-6 transition-colors duration-200">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-theme-text-accent mb-2 flex items-center gap-2">
          <span>↕️</span>
          Section Order
        </h2>
        <p className="text-sm text-theme-text-secondary">
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

      <div className="mt-4 p-4 bg-theme-status-info-bg border border-theme-status-info-border rounded-lg">
        <p className="text-sm text-theme-status-info-text">
          💡 <strong>Tip:</strong> Sections will appear in this order in your resume preview and PDF export.
        </p>
      </div>
    </div>
  );
}
