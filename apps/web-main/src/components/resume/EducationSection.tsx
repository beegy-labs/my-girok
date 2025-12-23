import { useState, useCallback, memo } from 'react';
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
import { Education, DegreeType, GpaFormat } from '../../api/resume';
import { TextInput, SelectInput, Button, CollapsibleSection } from '@my-girok/ui-components';

interface EducationSectionProps {
  educations: Education[];
  onChange: (educations: Education[]) => void;
  t: (key: string) => string;
  /** External control for category-level collapse (SSOT pattern) */
  isExpanded?: boolean;
  /** External toggle handler (SSOT pattern) */
  onToggle?: () => void;
  /** Additional header action (e.g., visibility toggle) */
  headerAction?: React.ReactNode;
}

/**
 * Sortable Education Card Component
 * Memoized to prevent unnecessary re-renders (rules.md:275)
 */
const SortableEducationCard = memo(function SortableEducationCard({
  education,
  index,
  onUpdate,
  onRemove,
  t,
}: {
  education: Education;
  index: number;
  onUpdate: (edu: Education) => void;
  onRemove: () => void;
  t: (key: string) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpand = useCallback(() => setIsExpanded((prev) => !prev), []);

  // Memoized education date handlers (2025 React best practice)
  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...education, startDate: e.target.value });
    },
    [education, onUpdate],
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...education, endDate: e.target.value });
    },
    [education, onUpdate],
  );

  // Curried handler for TextInput/SelectInput fields (2025 React best practice)
  const handleFieldChange = useCallback(
    <K extends keyof Education>(field: K) =>
      (value: string) => {
        onUpdate({ ...education, [field]: value || undefined });
      },
    [education, onUpdate],
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: education.id || `edu-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const degreeTypes = Object.values(DegreeType);
  const gpaFormats = Object.values(GpaFormat);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-theme-border-subtle rounded-soft overflow-hidden bg-theme-bg-elevated transition-colors duration-200"
    >
      {/* Mobile-optimized Header */}
      <div className="bg-gradient-to-r from-theme-bg-hover to-theme-bg-card p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1.5 cursor-grab active:cursor-grabbing text-theme-text-tertiary hover:text-theme-text-secondary transition-colors duration-200 touch-manipulation"
            title={t('common.dragToReorder')}
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
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

          {/* Title - clickable to expand/collapse */}
          <button
            type="button"
            onClick={toggleExpand}
            className="flex-1 flex items-center gap-2 text-left min-w-0 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-semibold text-theme-text-primary transition-colors duration-200 truncate">
                🎓 {education.school || 'Education'} #{index + 1}
              </h3>
              {!isExpanded && education.major && (
                <p className="text-xs text-theme-text-tertiary truncate">
                  {education.major} • {education.startDate}
                </p>
              )}
            </div>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 text-theme-text-tertiary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Desktop delete button */}
          <Button
            variant="danger"
            onClick={onRemove}
            size="sm"
            className="hidden sm:flex flex-shrink-0"
          >
            Remove
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={`${isExpanded ? 'block' : 'hidden'} p-4`}>
        {/* Mobile delete button */}
        <div className="sm:hidden flex justify-end mb-4">
          <Button
            variant="danger"
            onClick={onRemove}
            size="sm"
            className="text-xs py-1.5 px-2 touch-manipulation"
          >
            ✕ {t('common.delete')}
          </Button>
        </div>

        {/* School and Major */}
        <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 gap-4 mb-4">
          <TextInput
            label="School"
            value={education.school}
            onChange={handleFieldChange('school')}
            placeholder={t('resume.education.universityPlaceholder')}
            required
          />

          <TextInput
            label="Major"
            value={education.major}
            onChange={handleFieldChange('major')}
            placeholder={t('resume.education.majorPlaceholder')}
            required
          />
        </div>

        {/* Degree and GPA Format */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <SelectInput
            label="Degree"
            value={education.degree || ''}
            onChange={handleFieldChange('degree')}
            options={[
              { value: '', label: 'Select degree' },
              ...degreeTypes.map((degreeType) => ({
                value: degreeType,
                label: t(`resume.degreeTypes.${degreeType}`),
              })),
            ]}
          />

          <SelectInput
            label="GPA Format"
            value={education.gpaFormat || GpaFormat.SCALE_4_0}
            onChange={handleFieldChange('gpaFormat')}
            options={gpaFormats.map((format) => ({
              value: format,
              label: t(`resume.gpaFormats.${format}`),
            }))}
          />
        </div>

        {/* GPA */}
        <div className="mb-4">
          <TextInput
            label="GPA"
            value={education.gpa || ''}
            onChange={handleFieldChange('gpa')}
            placeholder={
              education.gpaFormat === GpaFormat.SCALE_4_5
                ? 'e.g., 4.2/4.5'
                : education.gpaFormat === GpaFormat.SCALE_100
                  ? 'e.g., 85/100'
                  : 'e.g., 3.8/4.0'
            }
          />
        </div>

        {/* Dates - side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2 transition-colors duration-200">
              <span className="hidden sm:inline">{t('resume.experienceForm.startDate')}</span>
              <span className="sm:hidden">{t('common.startDate')}</span>
              <span className="text-theme-status-error-text ml-0.5">*</span>
            </label>
            <input
              type="month"
              value={education.startDate}
              onChange={handleStartDateChange}
              className="w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-elevated border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2 transition-colors duration-200">
              <span className="hidden sm:inline">{t('resume.experienceForm.endDate')}</span>
              <span className="sm:hidden">{t('common.endDate')}</span>
            </label>
            <input
              type="month"
              value={education.endDate || ''}
              onChange={handleEndDateChange}
              className="w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-elevated border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function EducationSection({
  educations,
  onChange,
  t,
  isExpanded: externalExpanded,
  onToggle: externalToggle,
  headerAction: externalHeaderAction,
}: EducationSectionProps) {
  // Use external state if provided (SSOT), otherwise fallback to internal state
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleToggle = useCallback(() => {
    if (externalToggle) {
      externalToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  }, [externalToggle]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = educations.findIndex(
        (edu) => (edu.id || `edu-${educations.indexOf(edu)}`) === active.id,
      );
      const newIndex = educations.findIndex(
        (edu) => (edu.id || `edu-${educations.indexOf(edu)}`) === over.id,
      );

      const reordered = arrayMove(educations, oldIndex, newIndex).map((edu, idx) => ({
        ...edu,
        order: idx,
      }));
      onChange(reordered);
    }
  };

  // Curried handler for updating education (2025 React best practice)
  const handleUpdate = useCallback(
    (index: number) => (updated: Education) => {
      const newEducations = [...educations];
      newEducations[index] = updated;
      onChange(newEducations);
    },
    [educations, onChange],
  );

  // Curried handler for removing education (2025 React best practice)
  const handleRemove = useCallback(
    (index: number) => () => {
      const newEducations = educations.filter((_, i) => i !== index);
      onChange(newEducations);
    },
    [educations, onChange],
  );

  const handleAdd = () => {
    onChange([
      ...educations,
      {
        school: '',
        major: '',
        degree: undefined,
        startDate: '',
        endDate: '',
        gpa: '',
        gpaFormat: GpaFormat.SCALE_4_0,
        order: educations.length,
        visible: true,
      },
    ]);
  };

  return (
    <CollapsibleSection
      title={t('resume.sections.education')}
      icon="🎓"
      isExpanded={isExpanded}
      onToggle={handleToggle}
      count={educations.length}
      variant="secondary"
      collapsibleOnDesktop
      headerAction={
        <div className="flex items-center gap-2">
          {externalHeaderAction}
          <Button
            variant="primary"
            onClick={handleAdd}
            size="sm"
            className="py-2 touch-manipulation"
          >
            + {t('common.add')}
          </Button>
        </div>
      }
    >
      <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
        {t('resume.descriptions.education')}
      </p>

      {educations.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={educations.map((edu, idx) => edu.id || `edu-${idx}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4 lg:space-y-6">
              {educations.map((edu, index) => (
                <SortableEducationCard
                  key={edu.id || `edu-${index}`}
                  education={edu}
                  index={index}
                  onUpdate={handleUpdate(index)}
                  onRemove={handleRemove(index)}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-6 sm:py-8 text-theme-text-tertiary transition-colors duration-200 text-xs sm:text-base">
          {t('resume.emptyStates.education')}
        </div>
      )}
    </CollapsibleSection>
  );
}
