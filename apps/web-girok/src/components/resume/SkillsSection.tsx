import { useState, useCallback, memo } from 'react';
import { TFunction } from 'i18next';
import { TextInput, Button, CollapsibleSection } from '@my-girok/ui-components';
import HierarchicalDescription, { HierarchicalItem } from './HierarchicalDescription';
import type { Skill, SkillItem } from '../../api/resume';

// Use Omit<Skill, 'id'> to match CreateResumeDto's skills type
type SkillWithoutId = Omit<Skill, 'id'>;

interface SkillsSectionProps {
  skills: SkillWithoutId[];
  onChange: (skills: SkillWithoutId[]) => void;
  t: TFunction;
  /** External control for category-level collapse (SSOT pattern) */
  isExpanded?: boolean;
  /** External toggle handler (SSOT pattern) */
  onToggle?: () => void;
  /** Additional header action (e.g., visibility toggle) */
  headerAction?: React.ReactNode;
}

export default function SkillsSection({
  skills,
  onChange,
  t,
  isExpanded: externalExpanded,
  onToggle: externalToggle,
  headerAction: externalHeaderAction,
}: SkillsSectionProps) {
  // Use external state if provided (SSOT), otherwise fallback to internal state
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleToggleExpanded = useCallback(() => {
    if (externalToggle) {
      externalToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  }, [externalToggle]);

  const handleAddCategory = useCallback(() => {
    onChange([
      ...skills,
      {
        category: '',
        items: [],
        order: skills.length,
        visible: true,
      },
    ]);
  }, [skills, onChange]);

  const handleDeleteCategory = useCallback(
    (skillIndex: number) => {
      onChange(skills.filter((_, i) => i !== skillIndex));
    },
    [skills, onChange],
  );

  const handleCategoryChange = useCallback(
    (skillIndex: number, category: string) => {
      const newSkills = [...skills];
      newSkills[skillIndex] = { ...newSkills[skillIndex], category };
      onChange(newSkills);
    },
    [skills, onChange],
  );

  const handleAddSkillItem = useCallback(
    (skillIndex: number) => {
      const newSkills = [...skills];
      const currentItems = Array.isArray(newSkills[skillIndex].items)
        ? newSkills[skillIndex].items
        : [];
      newSkills[skillIndex] = {
        ...newSkills[skillIndex],
        items: [...currentItems, { name: '', description: '' }],
      };
      onChange(newSkills);
    },
    [skills, onChange],
  );

  const handleDeleteSkillItem = useCallback(
    (skillIndex: number, itemIndex: number) => {
      const newSkills = [...skills];
      const newItems = Array.isArray(newSkills[skillIndex].items)
        ? newSkills[skillIndex].items.filter((_, i) => i !== itemIndex)
        : [];
      newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
      onChange(newSkills);
    },
    [skills, onChange],
  );

  const handleSkillItemNameChange = useCallback(
    (skillIndex: number, itemIndex: number, name: string) => {
      const newSkills = [...skills];
      const newItems = [...(newSkills[skillIndex].items || [])];
      newItems[itemIndex] =
        typeof newItems[itemIndex] === 'string'
          ? { name, description: '' }
          : { ...newItems[itemIndex], name };
      newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
      onChange(newSkills);
    },
    [skills, onChange],
  );

  const handleSkillItemDescriptionsChange = useCallback(
    (skillIndex: number, itemIndex: number, descriptions: HierarchicalItem[]) => {
      const newSkills = [...skills];
      const newItems = [...(newSkills[skillIndex].items || [])];
      const currentItem = newItems[itemIndex];
      newItems[itemIndex] =
        typeof currentItem === 'string'
          ? { name: currentItem, description: '', descriptions }
          : { ...currentItem, descriptions };
      newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
      onChange(newSkills);
    },
    [skills, onChange],
  );

  const handleMoveSkillItem = useCallback(
    (skillIndex: number, itemIndex: number, direction: 'up' | 'down') => {
      const newSkills = [...skills];
      const newItems = [...(newSkills[skillIndex].items || [])];
      const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];
      newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
      onChange(newSkills);
    },
    [skills, onChange],
  );

  return (
    <CollapsibleSection
      title={t('resume.sections.skills')}
      icon="⚡"
      isExpanded={isExpanded}
      onToggle={handleToggleExpanded}
      count={skills.length}
      variant="secondary"
      collapsibleOnDesktop
      headerAction={
        <div className="flex items-center gap-2">
          {externalHeaderAction}
          <Button
            variant="primary"
            onClick={handleAddCategory}
            size="sm"
            className="py-2 touch-manipulation"
          >
            + {t('common.add')}
          </Button>
        </div>
      }
    >
      <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
        {t('resume.descriptions.skills')}
      </p>

      {skills.length > 0 ? (
        <div className="space-y-4 lg:space-y-6">
          {skills.map((skill, skillIndex) => (
            <SkillCategory
              key={skillIndex}
              skill={skill}
              skillIndex={skillIndex}
              t={t}
              onCategoryChange={handleCategoryChange}
              onDeleteCategory={handleDeleteCategory}
              onAddSkillItem={handleAddSkillItem}
              onDeleteSkillItem={handleDeleteSkillItem}
              onSkillItemNameChange={handleSkillItemNameChange}
              onSkillItemDescriptionsChange={handleSkillItemDescriptionsChange}
              onMoveSkillItem={handleMoveSkillItem}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-theme-text-tertiary">
          <p>{t('resume.form.clickToAddCategory')}</p>
        </div>
      )}
    </CollapsibleSection>
  );
}

interface SkillCategoryProps {
  skill: SkillWithoutId;
  skillIndex: number;
  t: TFunction;
  onCategoryChange: (skillIndex: number, category: string) => void;
  onDeleteCategory: (skillIndex: number) => void;
  onAddSkillItem: (skillIndex: number) => void;
  onDeleteSkillItem: (skillIndex: number, itemIndex: number) => void;
  onSkillItemNameChange: (skillIndex: number, itemIndex: number, name: string) => void;
  onSkillItemDescriptionsChange: (
    skillIndex: number,
    itemIndex: number,
    descriptions: HierarchicalItem[],
  ) => void;
  onMoveSkillItem: (skillIndex: number, itemIndex: number, direction: 'up' | 'down') => void;
}

// Memoized SkillCategory component (2025 best practice)
const SkillCategory = memo(function SkillCategory({
  skill,
  skillIndex,
  t,
  onCategoryChange,
  onDeleteCategory,
  onAddSkillItem,
  onDeleteSkillItem,
  onSkillItemNameChange,
  onSkillItemDescriptionsChange,
  onMoveSkillItem,
}: SkillCategoryProps) {
  // Default collapsed state
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Memoized handlers (2025 best practice)
  const handleDeleteCategory = useCallback(() => {
    onDeleteCategory(skillIndex);
  }, [onDeleteCategory, skillIndex]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      onCategoryChange(skillIndex, value);
    },
    [onCategoryChange, skillIndex],
  );

  const handleAddSkillItem = useCallback(() => {
    onAddSkillItem(skillIndex);
  }, [onAddSkillItem, skillIndex]);

  return (
    <div className="border border-theme-border-default rounded-soft bg-theme-bg-hover transition-colors duration-200 overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-theme-bg-hover to-theme-bg-card">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleExpand}
            className="flex-1 flex items-center gap-2 text-left cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-semibold text-theme-text-primary">
                ⚡ {skill.category || t('resume.form.categoryNumber', { index: skillIndex + 1 })}
              </h3>
              {!isExpanded && Array.isArray(skill.items) && skill.items.length > 0 && (
                <p className="text-xs text-theme-text-tertiary truncate">
                  {skill.items.length} {t('resume.form.skillsCount')}
                </p>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-theme-text-tertiary transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
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
          <button
            type="button"
            onClick={handleDeleteCategory}
            className="text-theme-status-error-text hover:opacity-80 text-xs sm:text-sm font-semibold px-2 py-1 hover:bg-theme-status-error-bg rounded touch-manipulation flex-shrink-0"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={`${isExpanded ? 'block' : 'hidden'} p-4 sm:p-6 pt-0`}>
        {/* Category Name */}
        <div className="mb-4">
          <TextInput
            label={t('resume.form.categoryName')}
            value={skill.category}
            onChange={handleCategoryChange}
            placeholder={t('resume.form.categoryPlaceholder')}
            required
          />
        </div>

        {/* Skill Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs sm:text-sm font-semibold text-theme-text-secondary">
              {t('resume.form.skillStack')}
            </label>
            <Button
              variant="secondary"
              onClick={handleAddSkillItem}
              size="sm"
              className="py-1.5 px-2 text-xs sm:text-sm touch-manipulation"
            >
              + {t('common.add')}
            </Button>
          </div>

          {Array.isArray(skill.items) && skill.items.length > 0 ? (
            <div className="space-y-4">
              {skill.items.map((item, itemIndex) => (
                <SkillItemCard
                  key={itemIndex}
                  item={item}
                  skillIndex={skillIndex}
                  itemIndex={itemIndex}
                  itemCount={skill.items.length}
                  t={t}
                  onDeleteSkillItem={onDeleteSkillItem}
                  onSkillItemNameChange={onSkillItemNameChange}
                  onSkillItemDescriptionsChange={onSkillItemDescriptionsChange}
                  onMoveSkillItem={onMoveSkillItem}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-theme-text-tertiary text-sm bg-theme-bg-input rounded-soft border border-dashed border-theme-border-default transition-colors duration-200">
              <p>{t('resume.form.clickToAddSkills')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface SkillItemCardProps {
  item: SkillItem | string;
  skillIndex: number;
  itemIndex: number;
  itemCount: number;
  t: TFunction;
  onDeleteSkillItem: (skillIndex: number, itemIndex: number) => void;
  onSkillItemNameChange: (skillIndex: number, itemIndex: number, name: string) => void;
  onSkillItemDescriptionsChange: (
    skillIndex: number,
    itemIndex: number,
    descriptions: HierarchicalItem[],
  ) => void;
  onMoveSkillItem: (skillIndex: number, itemIndex: number, direction: 'up' | 'down') => void;
}

// Memoized SkillItemCard component (2025 best practice)
const SkillItemCard = memo(function SkillItemCard({
  item,
  skillIndex,
  itemIndex,
  itemCount,
  t,
  onDeleteSkillItem,
  onSkillItemNameChange,
  onSkillItemDescriptionsChange,
  onMoveSkillItem,
}: SkillItemCardProps) {
  const itemData = typeof item === 'string' ? { name: item, description: '' } : item;

  // Memoized handlers (2025 best practice)
  const handleMoveUp = useCallback(() => {
    onMoveSkillItem(skillIndex, itemIndex, 'up');
  }, [onMoveSkillItem, skillIndex, itemIndex]);

  const handleMoveDown = useCallback(() => {
    onMoveSkillItem(skillIndex, itemIndex, 'down');
  }, [onMoveSkillItem, skillIndex, itemIndex]);

  const handleDelete = useCallback(() => {
    onDeleteSkillItem(skillIndex, itemIndex);
  }, [onDeleteSkillItem, skillIndex, itemIndex]);

  const handleNameChange = useCallback(
    (value: string) => {
      onSkillItemNameChange(skillIndex, itemIndex, value);
    },
    [onSkillItemNameChange, skillIndex, itemIndex],
  );

  const handleDescriptionsChange = useCallback(
    (descriptions: HierarchicalItem[]) => {
      onSkillItemDescriptionsChange(skillIndex, itemIndex, descriptions);
    },
    [onSkillItemDescriptionsChange, skillIndex, itemIndex],
  );

  return (
    <div className="border border-theme-border-subtle rounded-soft p-4 bg-theme-bg-card transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Move buttons - stacked vertically */}
          <div className="flex flex-col gap-0.5">
            {itemIndex > 0 && (
              <button
                type="button"
                onClick={handleMoveUp}
                className="w-6 h-6 flex items-center justify-center text-theme-primary hover:text-theme-primary-light hover:bg-theme-bg-hover rounded text-xs font-semibold touch-manipulation"
                title={t('resume.form.moveUpButton')}
              >
                ▲
              </button>
            )}
            {itemIndex < itemCount - 1 && (
              <button
                type="button"
                onClick={handleMoveDown}
                className="w-6 h-6 flex items-center justify-center text-theme-primary hover:text-theme-primary-light hover:bg-theme-bg-hover rounded text-xs font-semibold touch-manipulation"
                title={t('resume.form.moveDownButton')}
              >
                ▼
              </button>
            )}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-theme-text-secondary">
            {t('resume.form.skillNumber', { index: itemIndex + 1 })}
          </span>
        </div>
        <Button
          variant="danger"
          onClick={handleDelete}
          size="sm"
          className="py-1.5 px-2 text-xs touch-manipulation"
        >
          <span className="hidden sm:inline">{t('common.delete')}</span>
          <span className="sm:hidden">✕</span>
        </Button>
      </div>

      <div className="mb-4">
        {/* Skill Name */}
        <TextInput
          label={t('resume.form.skillName')}
          value={itemData.name}
          onChange={handleNameChange}
          placeholder={t('resume.form.skillPlaceholder')}
          required
        />
      </div>

      {/* Hierarchical Description */}
      <HierarchicalDescription
        items={(itemData.descriptions || []) as HierarchicalItem[]}
        onChange={handleDescriptionsChange}
        label={t('resume.form.experience')}
        placeholder={t('resume.form.experiencePlaceholder')}
        maxDepth={4}
      />

      {/* Legacy Description (for backward compatibility) */}
      {itemData.description && !itemData.descriptions?.length && (
        <div className="mt-3 p-3 bg-theme-status-warning-bg border border-theme-status-warning-border rounded-soft">
          <p className="text-xs text-theme-status-warning-text mb-2">
            <strong>{t('resume.form.legacyDescriptionTitle')}</strong> {itemData.description}
          </p>
          <p className="text-xs text-theme-status-warning-text opacity-80">
            {t('resume.form.legacyDescriptionMigration')}
          </p>
        </div>
      )}
    </div>
  );
});
