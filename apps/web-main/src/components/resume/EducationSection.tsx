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
import { Education, DegreeType } from '../../api/resume';

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-200 rounded-lg p-4 bg-white"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            title="Drag to reorder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-gray-900">🎓 Education #{index + 1}</h3>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm font-semibold"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            School <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={education.school}
            onChange={e => onUpdate({ ...education, school: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="University name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Major <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={education.major}
            onChange={e => onUpdate({ ...education, major: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="e.g., Computer Science"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Degree
          </label>
          <select
            value={education.degree || ''}
            onChange={e => onUpdate({ ...education, degree: e.target.value as DegreeType || undefined })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
          >
            <option value="">Select degree</option>
            {degreeTypes.map(degreeType => (
              <option key={degreeType} value={degreeType}>
                {t(`resume.degreeTypes.${degreeType}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            GPA
          </label>
          <input
            type="text"
            value={education.gpa || ''}
            onChange={e => onUpdate({ ...education, gpa: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="e.g., 3.8/4.0"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={education.startDate}
            onChange={e => onUpdate({ ...education, startDate: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="month"
            value={education.endDate || ''}
            onChange={e => onUpdate({ ...education, endDate: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
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
        order: educations.length,
        visible: true,
      },
    ]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🎓 {t('resume.sections.education')}</h2>
          <p className="text-sm text-gray-600">{t('resume.descriptions.education')}</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-all font-semibold"
        >
          + Add Education
        </button>
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
        <div className="text-center py-8 text-gray-500">
          No education entries yet. Click "+ Add Education" to add one.
        </div>
      )}
    </div>
  );
}
