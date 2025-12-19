import { useState, useCallback } from 'react';
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
import { TextInput, SelectInput, Button } from '@my-girok/ui-components';

interface EducationSectionProps {
  educations: Education[];
  onChange: (educations: Education[]) => void;
  t: (key: string) => string;
}

// Sortable Education Card Component
function SortableEducationCard({
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
  const [isExpanded, setIsExpanded] = useState(true);
  const toggleExpand = useCallback(() => setIsExpanded((prev) => !prev), []);

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
      className="border border-theme-border-subtle rounded-xl overflow-hidden bg-theme-bg-elevated transition-colors duration-200"
    >
      {/* Mobile-optimized Header */}
      <div className="bg-gradient-to-r from-theme-bg-hover to-theme-bg-card p-2 sm:p-4">
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
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </button>

          {/* Title - clickable on mobile */}
          <button
            type="button"
            onClick={toggleExpand}
            className="flex-1 flex items-center gap-2 text-left min-w-0 sm:cursor-default"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-semibold text-theme-text-primary transition-colors duration-200 truncate">
                🎓 {education.school || 'Education'} #{index + 1}
              </h3>
              {!isExpanded && education.major && (
                <p className="text-xs text-theme-text-tertiary truncate sm:hidden">
                  {education.major} • {education.startDate}
                </p>
              )}
            </div>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 text-theme-text-tertiary transition-transform duration-200 sm:hidden ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
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
      <div className={`${isExpanded ? 'block' : 'hidden'} sm:block p-3 sm:p-4`}>
        {/* Mobile delete button */}
        <div className="sm:hidden flex justify-end mb-2">
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
        <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 mb-3">
          <TextInput
            label="School"
            value={education.school}
            onChange={(value: string) => onUpdate({ ...education, school: value })}
            placeholder={t('resume.education.universityPlaceholder')}
            required
          />

          <TextInput
            label="Major"
            value={education.major}
            onChange={(value: string) => onUpdate({ ...education, major: value })}
            placeholder={t('resume.education.majorPlaceholder')}
            required
          />
        </div>

        {/* Degree and GPA Format */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
          <SelectInput
            label="Degree"
            value={education.degree || ''}
            onChange={(value: string) =>
              onUpdate({ ...education, degree: (value as DegreeType) || undefined })
            }
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
            onChange={(value: string) => onUpdate({ ...education, gpaFormat: value as GpaFormat })}
            options={gpaFormats.map((format) => ({
              value: format,
              label: t(`resume.gpaFormats.${format}`),
            }))}
          />
        </div>

        {/* GPA */}
        <div className="mb-3">
          <TextInput
            label="GPA"
            value={education.gpa || ''}
            onChange={(value: string) => onUpdate({ ...education, gpa: value })}
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
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2 transition-colors duration-200">
              <span className="hidden sm:inline">{t('resume.experienceForm.startDate')}</span>
              <span className="sm:hidden">{t('common.startDate')}</span>
              <span className="text-theme-status-error-text ml-0.5">*</span>
            </label>
            <input
              type="month"
              value={education.startDate}
              onChange={(e) => onUpdate({ ...education, startDate: e.target.value })}
              className="w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-elevated border border-theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
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
              onChange={(e) => onUpdate({ ...education, endDate: e.target.value })}
              className="w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-elevated border border-theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EducationSection({ educations, onChange, t }: EducationSectionProps) {
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

  const handleUpdate = (index: number, updated: Education) => {
    const newEducations = [...educations];
    newEducations[index] = updated;
    onChange(newEducations);
  };

  const handleRemove = (index: number) => {
    const newEducations = educations.filter((_, i) => i !== index);
    onChange(newEducations);
  };

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
    <div className="bg-theme-bg-elevated border border-theme-border-subtle rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-sm p-3 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 lg:mb-6">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-theme-text-primary transition-colors duration-200">
            🎓 {t('resume.sections.education')}
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-theme-text-secondary transition-colors duration-200 hidden sm:block">
            {t('resume.descriptions.education')}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleAdd}
          className="text-xs sm:text-sm lg:text-base px-3 py-2 lg:px-5 lg:py-2.5 flex-shrink-0 touch-manipulation"
        >
          + <span className="hidden sm:inline">{t('resume.form.addEducation')}</span>
          <span className="sm:hidden">{t('common.add')}</span>
        </Button>
      </div>

      {educations.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={educations.map((edu, idx) => edu.id || `edu-${idx}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              {educations.map((edu, index) => (
                <SortableEducationCard
                  key={edu.id || `edu-${index}`}
                  education={edu}
                  index={index}
                  onUpdate={(updated) => handleUpdate(index, updated)}
                  onRemove={() => handleRemove(index)}
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
    </div>
  );
}
