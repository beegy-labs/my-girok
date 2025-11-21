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
import { Education, DegreeType, GpaFormat } from '../../api/resume';
import { TextInput, Select, PrimaryButton, DestructiveButton } from '../ui';

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: education.id || `edu-${index}` });

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
      className="border border-gray-200 dark:border-dark-border-subtle rounded-lg p-4 bg-white dark:bg-dark-bg-elevated transition-colors duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors duration-200"
            title="Drag to reorder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary transition-colors duration-200">🎓 Education #{index + 1}</h3>
        </div>
        <DestructiveButton onClick={onRemove} size="sm">
          Remove
        </DestructiveButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="School"
          value={education.school}
          onChange={value => onUpdate({ ...education, school: value })}
          placeholder="University name"
          required
        />

        <TextInput
          label="Major"
          value={education.major}
          onChange={value => onUpdate({ ...education, major: value })}
          placeholder="e.g., Computer Science"
          required
        />

        <Select
          label="Degree"
          value={education.degree || ''}
          onChange={value => onUpdate({ ...education, degree: value as DegreeType || undefined })}
          options={[
            { value: '', label: 'Select degree' },
            ...degreeTypes.map(degreeType => ({
              value: degreeType,
              label: t(`resume.degreeTypes.${degreeType}`)
            }))
          ]}
        />

        <Select
          label="GPA Format"
          value={education.gpaFormat || GpaFormat.SCALE_4_0}
          onChange={value => onUpdate({ ...education, gpaFormat: value as GpaFormat })}
          options={gpaFormats.map(format => ({
            value: format,
            label: t(`resume.gpaFormats.${format}`)
          }))}
        />

        <TextInput
          label="GPA"
          value={education.gpa || ''}
          onChange={value => onUpdate({ ...education, gpa: value })}
          placeholder={
            education.gpaFormat === GpaFormat.SCALE_4_5 ? 'e.g., 4.2/4.5' :
            education.gpaFormat === GpaFormat.SCALE_100 ? 'e.g., 85/100' :
            'e.g., 3.8/4.0'
          }
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={education.startDate}
            onChange={e => onUpdate({ ...education, startDate: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
            End Date
          </label>
          <input
            type="month"
            value={education.endDate || ''}
            onChange={e => onUpdate({ ...education, endDate: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            placeholder="Leave empty if current"
          />
        </div>
      </div>
    </div>
  );
}

export default function EducationSection({ educations, onChange, t }: EducationSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = educations.findIndex(edu => (edu.id || `edu-${educations.indexOf(edu)}`) === active.id);
      const newIndex = educations.findIndex(edu => (edu.id || `edu-${educations.indexOf(edu)}`) === over.id);

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
    <div className="bg-white dark:bg-dark-bg-elevated border border-gray-200 dark:border-dark-border-subtle rounded-2xl shadow-sm p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary transition-colors duration-200">🎓 {t('resume.sections.education')}</h2>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary transition-colors duration-200">{t('resume.descriptions.education')}</p>
        </div>
        <PrimaryButton onClick={handleAdd}>
          + Add Education
        </PrimaryButton>
      </div>

      {educations.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={educations.map((edu, idx) => edu.id || `edu-${idx}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
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
        <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary transition-colors duration-200">
          No education entries yet. Click "+ Add Education" to add one.
        </div>
      )}
    </div>
  );
}
