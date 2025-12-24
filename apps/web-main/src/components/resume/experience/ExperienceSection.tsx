import { useMemo, memo } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Experience } from '../../../api/resume';
import { Button, CollapsibleSection } from '@my-girok/ui-components';
import { ExperienceCard } from './ExperienceCard';
import { useDndSensors } from './hooks';

interface ExperienceSectionProps {
  experiences: Experience[];
  onChange: (experiences: Experience[]) => void;
  t: (key: string) => string;
  isExpanded: boolean;
  onToggle: () => void;
  headerAction?: React.ReactNode;
}

/**
 * Main Experience Section Component
 * Simplified: removed internal/external state duplication, direct handlers
 */
const ExperienceSection = memo(function ExperienceSection({
  experiences,
  onChange,
  t,
  isExpanded,
  onToggle,
  headerAction,
}: ExperienceSectionProps) {
  const sensors = useDndSensors();

  const experienceIds = useMemo(
    () => experiences.map((exp, i) => exp.id || `exp-${i}`),
    [experiences],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = experiences.findIndex(
      (exp) => (exp.id || `exp-${experiences.indexOf(exp)}`) === active.id,
    );
    const newIndex = experiences.findIndex(
      (exp) => (exp.id || `exp-${experiences.indexOf(exp)}`) === over.id,
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const newExperiences = arrayMove(experiences, oldIndex, newIndex).map((exp, idx) => ({
        ...exp,
        order: idx,
      }));
      onChange(newExperiences);
    }
  };

  const addExperience = () => {
    const newExperience: Experience = {
      company: '',
      startDate: '',
      endDate: '',
      finalPosition: '',
      jobTitle: '',
      projects: [],
      order: experiences.length,
      visible: true,
    };
    onChange([...experiences, newExperience]);
  };

  const updateExperience = (index: number, experience: Experience) => {
    const newExperiences = [...experiences];
    newExperiences[index] = experience;
    onChange(newExperiences);
  };

  const removeExperience = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleSection
      title={t('resume.sections.experience')}
      icon="💼"
      isExpanded={isExpanded}
      onToggle={onToggle}
      count={experiences.length}
      variant="primary"
      collapsibleOnDesktop
      headerAction={
        <div className="flex items-center gap-2">
          {headerAction}
          <Button
            variant="primary"
            onClick={addExperience}
            size="sm"
            className="py-2 touch-manipulation"
          >
            + {t('common.add')}
          </Button>
        </div>
      }
    >
      <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
        {t('resume.descriptions.experience')}
      </p>

      {experiences.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={experienceIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4 lg:space-y-6">
              {experiences.map((exp, index) => (
                <ExperienceCard
                  key={exp.id || `exp-${index}`}
                  experience={exp}
                  index={index}
                  onUpdate={(e) => updateExperience(index, e)}
                  onRemove={() => removeExperience(index)}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-6 sm:py-12 text-theme-text-tertiary text-sm sm:text-base">
          <p>{t('resume.experienceForm.noExperience')}</p>
        </div>
      )}
    </CollapsibleSection>
  );
});

export default ExperienceSection;
