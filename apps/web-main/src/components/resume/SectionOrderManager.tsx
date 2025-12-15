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
      className="bg-vintage-bg-card dark:bg-dark-bg-elevated border border-vintage-border-subtle dark:border-dark-border-subtle rounded-lg p-4 flex items-center justify-between hover:border-vintage-primary transition-colors duration-200"
    >
      <div className="flex items-center gap-3">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-vintage-bg-hover dark:hover:bg-dark-bg-hover rounded transition-colors duration-200"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5 text-vintage-text-tertiary dark:text-dark-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span className="font-medium text-vintage-text-primary dark:text-dark-text-primary">{getSectionLabel(section.type)}</span>
      </div>
      <span className="text-sm text-vintage-text-tertiary dark:text-dark-text-tertiary">#{section.order + 1}</span>
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
    <div className="bg-vintage-bg-card dark:bg-dark-bg-card border border-vintage-border-subtle dark:border-dark-border-subtle rounded-2xl shadow-vintage-md dark:shadow-dark-md p-6 transition-colors duration-200">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-vintage-text-accent dark:text-dark-text-accent mb-2 flex items-center gap-2">
          <span>↕️</span>
          Section Order
        </h2>
        <p className="text-sm text-vintage-text-secondary dark:text-dark-text-secondary">
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

      <div className="mt-4 p-4 bg-blue-900/20 dark:bg-blue-900/20 border border-blue-800 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-300 dark:text-blue-300">
          💡 <strong>Tip:</strong> Sections will appear in this order in your resume preview and PDF export.
        </p>
      </div>
    </div>
  );
}
