import { useState, useCallback, memo } from 'react';
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
import { CollapsibleSection } from '@my-girok/ui-components';
import { FormSectionType, FormSection } from './ResumeForm';

// Module-scope constants (2025 best practice - avoids recreation on every render)
const SECTION_ICONS: Record<FormSectionType, string> = {
  EXPERIENCE: '💼',
  EDUCATION: '🎓',
  SKILLS: '⚡',
  CERTIFICATE: '🏆',
  KEY_ACHIEVEMENTS: '🏅',
  APPLICATION_REASON: '💡',
  ATTACHMENTS: '📎',
  COVER_LETTER: '📝',
};

// i18n keys for section labels
const SECTION_LABEL_KEYS: Record<FormSectionType, string> = {
  EXPERIENCE: 'resume.sections.experience',
  EDUCATION: 'resume.sections.education',
  SKILLS: 'resume.sections.skills',
  CERTIFICATE: 'resume.sections.certifications',
  KEY_ACHIEVEMENTS: 'resume.form.keyAchievements',
  APPLICATION_REASON: 'resume.form.applicationReason',
  ATTACHMENTS: 'resume.form.attachments',
  COVER_LETTER: 'resume.form.coverLetter',
};

interface SectionOrderManagerProps {
  sections: FormSection[];
  onReorder: (sections: FormSection[]) => void;
  /** External control for collapse (SSOT pattern) */
  isExpanded?: boolean;
  /** External toggle handler (SSOT pattern) */
  onToggle?: () => void;
  /** When true, renders content only without CollapsibleSection wrapper */
  embedded?: boolean;
}

interface SortableSectionProps {
  section: FormSection;
  onToggleVisibility: (id: string) => void;
}

// Memoized SortableSection component
const SortableSection = memo(function SortableSection({
  section,
  onToggleVisibility,
}: SortableSectionProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggle = useCallback(() => {
    onToggleVisibility(section.id);
  }, [onToggleVisibility, section.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-soft p-2 sm:p-4 flex items-center justify-between transition-all duration-200 ${
        section.visible
          ? 'bg-theme-bg-elevated border-theme-border-subtle hover:border-theme-primary'
          : 'bg-theme-bg-hover border-theme-border-default opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Drag handle - uses activator node ref for proper isolation */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-1.5 sm:p-2 hover:bg-theme-bg-hover rounded transition-colors duration-200 flex-shrink-0 touch-none select-none"
          title={t('common.dragToReorder')}
          style={{ touchAction: 'none' }}
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-theme-text-tertiary pointer-events-none"
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

        {/* Section icon and label */}
        <span className="text-base sm:text-lg flex-shrink-0">{SECTION_ICONS[section.type]}</span>
        <span
          className={`font-medium text-sm sm:text-base truncate ${
            section.visible ? 'text-theme-text-primary' : 'text-theme-text-tertiary line-through'
          }`}
        >
          {t(SECTION_LABEL_KEYS[section.type])}
        </span>
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <span className="text-xs text-theme-text-tertiary hidden sm:inline">
          #{section.order + 1}
        </span>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 ${
            section.visible ? 'bg-theme-primary' : 'bg-theme-bg-input'
          }`}
          role="switch"
          aria-checked={section.visible}
          title={section.visible ? t('resume.sectionOrder.hide') : t('resume.sectionOrder.show')}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
              section.visible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
});

export default function SectionOrderManager({
  sections,
  onReorder,
  isExpanded: externalExpanded,
  onToggle: externalToggle,
  embedded = false,
}: SectionOrderManagerProps) {
  const { t } = useTranslation();

  // Use external state if provided (SSOT), otherwise fallback to internal state
  // Default: expanded (true) on first access
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleToggleExpanded = useCallback(() => {
    if (externalToggle) {
      externalToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  }, [externalToggle]);

  const [items, setItems] = useState(sections.sort((a, b) => a.order - b.order));

  // DnD sensors with strict activation constraints to prevent accidental form submission
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Must move 10px before drag starts
        delay: 150, // 150ms delay before drag activates
        tolerance: 5, // 5px tolerance during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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
    },
    [items, onReorder],
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const newItems = items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      );
      setItems(newItems);
      onReorder(newItems);
    },
    [items, onReorder],
  );

  const visibleCount = items.filter((item) => item.visible).length;

  // Content to render (shared between embedded and standalone modes)
  const content = (
    <>
      <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
        {t('resume.sectionOrder.description')}
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 p-2 sm:p-4 bg-theme-status-info-bg border border-theme-status-info-border rounded-soft">
        <p className="text-xs sm:text-sm text-theme-status-info-text">
          💡 <strong>{t('resume.sectionOrder.tipTitle')}</strong>{' '}
          {t('resume.sectionOrder.tipDescription')}
        </p>
      </div>
    </>
  );

  // Embedded mode: render content with collapsible section header
  if (embedded) {
    return (
      <div className="mt-6 pt-6 border-t border-theme-border-subtle">
        <button
          type="button"
          onClick={handleToggleExpanded}
          className="w-full flex items-center justify-between cursor-pointer group"
        >
          <h3 className="text-sm sm:text-base font-semibold text-theme-text-primary flex items-center gap-2">
            <span>↕️</span>
            {t('resume.sectionOrder.title')}
            <span className="text-xs text-theme-text-tertiary font-normal">({visibleCount})</span>
          </h3>
          <svg
            className={`w-5 h-5 text-theme-text-muted transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div className={`${isExpanded ? 'block' : 'hidden'} mt-3`}>{content}</div>
      </div>
    );
  }

  // Standalone mode: render with CollapsibleSection wrapper
  return (
    <CollapsibleSection
      title={t('resume.sectionOrder.title')}
      icon="↕️"
      isExpanded={isExpanded}
      onToggle={handleToggleExpanded}
      count={visibleCount}
      variant="secondary"
      collapsibleOnDesktop
    >
      {content}
    </CollapsibleSection>
  );
}
