import { useState, useMemo, memo } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Experience, ExperienceProject, calculateExperienceDuration } from '../../../api/resume';
import { TextInput, Button, focusClasses } from '@my-girok/ui-components';
import { ProjectCard } from './ProjectCard';
import { SENSOR_OPTIONS } from './constants';

interface ExperienceCardProps {
  experience: Experience;
  index: number;
  onUpdate: (experience: Experience) => void;
  onRemove: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Sortable Experience Card Component
 * Simplified: removed excessive useCallback, direct handlers
 */
export const ExperienceCard = memo(function ExperienceCard({
  experience,
  index,
  onUpdate,
  onRemove,
  t,
}: ExperienceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: experience.id || `exp-${index}`,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }),
    [transform, transition, isDragging],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, SENSOR_OPTIONS.pointer),
    useSensor(TouchSensor, SENSOR_OPTIONS.touch),
    useSensor(KeyboardSensor, SENSOR_OPTIONS.keyboard),
  );

  const projects = Array.isArray(experience.projects) ? experience.projects : [];
  const projectIds = projects.map((p, i) => p.id || `proj-${i}`);

  // Simple field update helper
  const updateField = <K extends keyof Experience>(field: K, value: Experience[K]) => {
    onUpdate({ ...experience, [field]: value });
  };

  // Calculate experience duration
  const durationText = useMemo(() => {
    if (!experience.startDate) return null;
    const duration = calculateExperienceDuration(
      experience.startDate,
      experience.endDate,
      experience.isCurrentlyWorking,
    );
    return t('resume.experience.duration', { years: duration.years, months: duration.months });
  }, [experience.startDate, experience.endDate, experience.isCurrentlyWorking, t]);

  const handleProjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex(
      (p) => (p.id || `proj-${projects.indexOf(p)}`) === active.id,
    );
    const newIndex = projects.findIndex((p) => (p.id || `proj-${projects.indexOf(p)}`) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newProjects = arrayMove(projects, oldIndex, newIndex).map((p, idx) => ({
        ...p,
        order: idx,
      }));
      onUpdate({ ...experience, projects: newProjects });
    }
  };

  const addProject = () => {
    const newProject: ExperienceProject = {
      name: '',
      startDate: '',
      endDate: '',
      description: '',
      role: '',
      achievements: [],
      techStack: [],
      order: projects.length,
    };
    onUpdate({ ...experience, projects: [...projects, newProject] });
    setExpandedProjects((prev) => ({ ...prev, [projects.length]: true }));
  };

  const updateProject = (projectIndex: number, project: ExperienceProject) => {
    const newProjects = [...projects];
    newProjects[projectIndex] = project;
    onUpdate({ ...experience, projects: newProjects });
  };

  const removeProject = (projectIndex: number) => {
    onUpdate({ ...experience, projects: projects.filter((_, i) => i !== projectIndex) });
  };

  const toggleProject = (projectIndex: number) => {
    setExpandedProjects((prev) => ({ ...prev, [projectIndex]: !prev[projectIndex] }));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-theme-border-default rounded-soft overflow-hidden bg-theme-bg-hover transition-colors duration-200"
    >
      {/* Company Header */}
      <div className="bg-gradient-to-r from-theme-bg-elevated to-theme-bg-card p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-move text-theme-primary hover:text-theme-primary-light flex-shrink-0 touch-manipulation"
            title={t('resume.experienceForm.dragToReorder')}
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
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

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 flex items-center gap-2 text-left min-w-0 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-theme-primary-light truncate">
                📚 {experience.company || t('resume.experienceForm.company')} #{index + 1}
              </h3>
              {!isExpanded && experience.startDate && (
                <p className="text-xs text-theme-primary truncate">
                  {experience.finalPosition} • {experience.startDate} ~{' '}
                  {experience.isCurrentlyWorking ? t('common.present') : experience.endDate}
                </p>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-theme-primary transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
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
        </div>
      </div>

      {/* Company Details */}
      {isExpanded && (
        <div className="p-4 sm:p-6">
          {/* Desktop: title bar with delete button */}
          <div className="hidden sm:flex sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-theme-primary-light">
              📚 {t('resume.experienceForm.company')} #{index + 1}
            </h3>
            <Button variant="danger" onClick={onRemove} size="sm" className="flex-shrink-0">
              {t('resume.experienceForm.removeCompany')}
            </Button>
          </div>

          {/* Mobile: Delete button only */}
          <div className="sm:hidden flex justify-end mb-4">
            <Button
              variant="danger"
              onClick={onRemove}
              size="sm"
              className="text-xs py-2 px-4 touch-manipulation min-h-[44px]"
            >
              ✕ {t('common.delete')}
            </Button>
          </div>

          {/* Company Basic Info */}
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 gap-4 mb-4">
            <TextInput
              label={t('resume.experienceForm.company')}
              value={experience.company}
              onChange={(v) => updateField('company', v)}
              placeholder={t('resume.experienceForm.companyName')}
              required
            />
            <div className="grid grid-cols-2 gap-4 sm:col-span-2">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
                  {t('resume.experienceForm.startDate')}{' '}
                  <span className="text-theme-status-error-text">*</span>
                </label>
                <input
                  type="month"
                  value={experience.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  className={`w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-card border border-theme-border-default rounded-soft text-theme-text-primary min-h-[44px] ${focusClasses}`}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
                  {t('resume.experienceForm.endDate')}
                </label>
                <input
                  type="month"
                  value={experience.endDate || ''}
                  onChange={(e) => {
                    updateField('endDate', e.target.value);
                    updateField('isCurrentlyWorking', false);
                  }}
                  disabled={experience.isCurrentlyWorking}
                  className={`w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-card border border-theme-border-default rounded-soft text-theme-text-primary min-h-[44px] disabled:bg-theme-bg-secondary disabled:cursor-not-allowed ${focusClasses}`}
                />
              </div>
            </div>
          </div>

          {/* Currently working checkbox */}
          <label className="flex items-center p-2 -mx-2 mb-4 rounded-soft hover:bg-theme-primary/10 cursor-pointer touch-manipulation min-h-[44px]">
            <input
              type="checkbox"
              checked={experience.isCurrentlyWorking || false}
              onChange={(e) => {
                updateField('isCurrentlyWorking', e.target.checked);
                if (e.target.checked) updateField('endDate', '');
              }}
              className={`w-5 h-5 text-theme-primary border-theme-border-default rounded ${focusClasses}`}
            />
            <span className="ml-3 text-xs sm:text-sm text-theme-text-secondary">
              {t('resume.experience.currentlyWorking')}
            </span>
          </label>

          {/* Experience Duration */}
          {durationText && (
            <div className="mb-4 p-2 sm:p-4 bg-theme-primary/10 border border-theme-border-default rounded-soft">
              <span className="text-xs sm:text-sm font-semibold text-theme-primary-light">
                {t('resume.experienceForm.experiencePeriod')} {durationText}
              </span>
            </div>
          )}

          {/* Position and Job Title */}
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 gap-4 mb-4">
            <TextInput
              label={t('resume.experienceForm.position')}
              value={experience.finalPosition}
              onChange={(v) => updateField('finalPosition', v)}
              placeholder={t('resume.experienceForm.positionPlaceholder')}
              required
            />
            <TextInput
              label={t('resume.experienceForm.jobTitle')}
              value={experience.jobTitle}
              onChange={(v) => updateField('jobTitle', v)}
              placeholder={t('resume.experienceForm.jobTitlePlaceholder')}
              required
            />
          </div>

          {/* Salary Section */}
          <div className="mt-4">
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-2">
              {t('resume.experienceForm.salaryOptional')}
            </label>
            <div className="flex gap-4">
              <input
                type="number"
                value={experience.salary || ''}
                onChange={(e) =>
                  updateField('salary', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className={`flex-1 px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-card border border-theme-border-default rounded-soft text-theme-text-primary min-h-[44px] ${focusClasses}`}
                placeholder={t('resume.experienceForm.salaryPlaceholder')}
                min="0"
              />
              <select
                value={experience.salaryUnit || 'KRW'}
                onChange={(e) => updateField('salaryUnit', e.target.value)}
                className={`w-24 sm:w-32 px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-card border border-theme-border-default rounded-soft text-theme-text-primary min-h-[44px] ${focusClasses}`}
              >
                <option value="KRW">{t('resume.experienceForm.salaryUnits.manwon')}</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <label className="flex items-center p-2 -mx-2 mt-1 rounded-soft hover:bg-theme-primary/10 cursor-pointer touch-manipulation min-h-[44px]">
              <input
                type="checkbox"
                checked={experience.showSalary ?? false}
                onChange={(e) => updateField('showSalary', e.target.checked)}
                className={`w-5 h-5 text-theme-primary bg-theme-bg-card border-theme-border-default rounded ${focusClasses}`}
              />
              <span className="ml-2 text-xs sm:text-sm text-theme-text-secondary">
                {t('resume.experienceForm.showSalaryInPreview')}
              </span>
            </label>
          </div>

          {/* Projects Section */}
          <div className="mt-4 lg:mt-6 border-t border-theme-border-default pt-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h4 className="text-xs sm:text-md font-bold text-theme-primary-light">
                📁 {t('resume.experienceForm.projectsCount', { count: projects.length })}
              </h4>
              <Button
                variant="secondary"
                onClick={addProject}
                size="sm"
                className="text-xs sm:text-sm py-2 px-2 min-h-[44px]"
              >
                + {t('common.add')}
              </Button>
            </div>

            {projects.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleProjectDragEnd}
              >
                <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {projects.map((project, projectIndex) => (
                      <ProjectCard
                        key={project.id || `proj-${projectIndex}`}
                        project={project}
                        index={projectIndex}
                        isExpanded={expandedProjects[projectIndex] || false}
                        onToggle={() => toggleProject(projectIndex)}
                        onUpdate={(p) => updateProject(projectIndex, p)}
                        onRemove={() => removeProject(projectIndex)}
                        t={t}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-6 text-theme-text-tertiary text-sm bg-theme-bg-card rounded-soft border border-dashed border-theme-border-default">
                <p>{t('resume.experienceForm.noProjects')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
