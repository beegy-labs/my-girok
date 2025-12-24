import { useState, useEffect, useMemo, memo } from 'react';
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
import { ExperienceProject, ProjectAchievement } from '../../../api/resume';
import { TextInput, TextArea, Button } from '@my-girok/ui-components';
import { SortableAchievement } from './AchievementItem';
import { SENSOR_OPTIONS } from './constants';

interface ProjectCardProps {
  project: ExperienceProject;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (project: ExperienceProject) => void;
  onRemove: () => void;
  t: (key: string) => string;
}

/**
 * Sortable Project Card Component
 * Simplified: removed excessive useCallback, direct handlers
 */
export const ProjectCard = memo(function ProjectCard({
  project,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  t,
}: ProjectCardProps) {
  // Local state for tech stack input
  const [techStackInput, setTechStackInput] = useState((project.techStack || []).join(', '));

  useEffect(() => {
    setTechStackInput((project.techStack || []).join(', '));
  }, [project.techStack]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id || `proj-${index}`,
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

  const achievements = project.achievements || [];
  const achievementIds = achievements.map((a, i) => a.id || `ach-${i}`);

  // Simple field update helper
  const updateField = <K extends keyof ExperienceProject>(
    field: K,
    value: ExperienceProject[K],
  ) => {
    onUpdate({ ...project, [field]: value });
  };

  const handleTechStackBlur = () => {
    const parsed = techStackInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onUpdate({ ...project, techStack: parsed });
    setTechStackInput(parsed.join(', '));
  };

  const handleAchievementDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = achievements.findIndex(
      (a) => (a.id || `ach-${achievements.indexOf(a)}`) === active.id,
    );
    const newIndex = achievements.findIndex(
      (a) => (a.id || `ach-${achievements.indexOf(a)}`) === over.id,
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const newAchievements = arrayMove(achievements, oldIndex, newIndex).map((a, idx) => ({
        ...a,
        order: idx,
      }));
      onUpdate({ ...project, achievements: newAchievements });
    }
  };

  const addAchievement = () => {
    const newAchievement: ProjectAchievement = {
      content: '',
      depth: 1,
      order: achievements.length,
    };
    onUpdate({ ...project, achievements: [...achievements, newAchievement] });
  };

  const updateAchievement = (index: number, achievement: ProjectAchievement) => {
    const newAchievements = [...achievements];
    newAchievements[index] = achievement;
    onUpdate({ ...project, achievements: newAchievements });
  };

  const removeAchievement = (index: number) => {
    onUpdate({ ...project, achievements: achievements.filter((_, i) => i !== index) });
  };

  const addChildToAchievement = (achIndex: number) => {
    const achievement = achievements[achIndex];
    const newChild: ProjectAchievement = {
      content: '',
      depth: 2,
      order: (achievement.children || []).length,
      children: [],
    };
    const updatedAchievement = {
      ...achievement,
      children: [...(achievement.children || []), newChild],
    };
    updateAchievement(achIndex, updatedAchievement);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-theme-border-strong rounded-soft bg-theme-bg-card transition-colors duration-200"
    >
      {/* Project Header */}
      <div className="flex items-center gap-2 sm:gap-4 p-4 bg-theme-bg-hover transition-colors duration-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 cursor-move text-theme-text-tertiary hover:text-theme-primary flex-shrink-0 touch-manipulation"
          title={t('resume.experienceForm.dragToReorder')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          onClick={onToggle}
          className="flex-1 flex items-center justify-between text-left min-w-0"
        >
          <span className="font-semibold text-theme-primary-light flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="flex-shrink-0">📖</span>
            <span className="flex-shrink-0 hidden sm:inline">
              {t('resume.experienceForm.project')}
            </span>
            <span className="flex-shrink-0">#{index + 1}</span>
            {project.name && (
              <span className="font-normal text-theme-text-secondary truncate">
                - {project.name}
              </span>
            )}
          </span>
          <svg
            className={`w-5 h-5 text-theme-text-tertiary transition-transform duration-200 flex-shrink-0 ml-1 ${isExpanded ? 'rotate-180' : ''}`}
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

        <Button variant="danger" onClick={onRemove} size="sm" className="flex-shrink-0">
          <span className="hidden sm:inline">{t('resume.experienceForm.remove')}</span>
          <span className="sm:hidden">✕</span>
        </Button>
      </div>

      {/* Project Details */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <TextInput
            label={t('resume.experienceForm.projectName')}
            value={project.name}
            onChange={(v) => updateField('name', v)}
            placeholder={t('resume.experienceForm.projectNamePlaceholder')}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-theme-text-secondary mb-2">
                {t('resume.experienceForm.startDate')}{' '}
                <span className="text-theme-status-error-text">*</span>
              </label>
              <input
                type="month"
                value={project.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-theme-bg-card border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary text-sm text-theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-theme-text-secondary mb-2">
                {t('resume.experienceForm.endDate')}
              </label>
              <input
                type="month"
                value={project.endDate || ''}
                onChange={(e) => updateField('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-theme-bg-card border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary text-sm text-theme-text-primary"
                placeholder={t('resume.experienceForm.ongoingProject')}
              />
            </div>
          </div>

          <TextArea
            label={t('resume.experienceForm.description')}
            value={project.description}
            onChange={(v) => updateField('description', v)}
            rows={3}
            placeholder={t('resume.experienceForm.projectDescription')}
            required
          />

          <TextInput
            label={t('resume.experienceForm.yourRole')}
            value={project.role || ''}
            onChange={(v) => updateField('role', v)}
            placeholder={t('resume.experienceForm.rolePlaceholder')}
          />

          <TextInput
            label={t('resume.experienceForm.techStack')}
            value={techStackInput}
            onChange={setTechStackInput}
            onBlur={handleTechStackBlur}
            placeholder={t('resume.experienceForm.techStackPlaceholder')}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label={t('resume.experienceForm.projectUrl')}
              type="url"
              value={project.url || ''}
              onChange={(v) => updateField('url', v)}
              placeholder={t('resume.experienceForm.urlPlaceholder')}
            />
            <TextInput
              label={t('resume.experienceForm.githubUrl')}
              type="url"
              value={project.githubUrl || ''}
              onChange={(v) => updateField('githubUrl', v)}
              placeholder={t('resume.experienceForm.githubUrlPlaceholder')}
            />
          </div>

          {/* Key Achievements */}
          <div className="border-t border-theme-border-default pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-theme-primary-light flex items-center gap-2">
                ⭐ {t('resume.experienceForm.keyAchievements')}
                <span className="text-xs text-theme-text-tertiary font-normal">
                  {t('resume.experienceForm.depthLevels')}
                </span>
              </label>
              <Button
                variant="secondary"
                onClick={addAchievement}
                size="sm"
                className="py-1.5 px-2 text-xs sm:text-sm"
              >
                + {t('common.add')}
              </Button>
            </div>

            {achievements.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleAchievementDragEnd}
              >
                <SortableContext items={achievementIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {achievements.map((achievement, achIndex) => (
                      <SortableAchievement
                        key={achievement.id || `ach-${achIndex}`}
                        achievement={achievement}
                        index={achIndex}
                        onUpdate={(a) => updateAchievement(achIndex, a)}
                        onRemove={() => removeAchievement(achIndex)}
                        onAddChild={() => addChildToAchievement(achIndex)}
                        t={t}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-xs text-theme-text-tertiary italic">
                {t('resume.experienceForm.noAchievements')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
