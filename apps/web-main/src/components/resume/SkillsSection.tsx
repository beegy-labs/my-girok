import { useState, useCallback } from 'react';
import { TFunction } from 'i18next';
import {
  TextInput,
  Button,
  CollapsibleSection,
} from '@my-girok/ui-components';
import HierarchicalDescription, { HierarchicalItem } from './HierarchicalDescription';
import type { Skill, SkillItem } from '../../api/resume';

// Use Omit<Skill, 'id'> to match CreateResumeDto's skills type
type SkillWithoutId = Omit<Skill, 'id'>;

interface SkillsSectionProps {
  skills: SkillWithoutId[];
  onChange: (skills: SkillWithoutId[]) => void;
  t: TFunction;
}

export default function SkillsSection({ skills, onChange, t }: SkillsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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

  const handleDeleteCategory = useCallback((skillIndex: number) => {
    onChange(skills.filter((_, i) => i !== skillIndex));
  }, [skills, onChange]);

  const handleCategoryChange = useCallback((skillIndex: number, category: string) => {
    const newSkills = [...skills];
    newSkills[skillIndex] = { ...newSkills[skillIndex], category };
    onChange(newSkills);
  }, [skills, onChange]);

  const handleAddSkillItem = useCallback((skillIndex: number) => {
    const newSkills = [...skills];
    const currentItems = Array.isArray(newSkills[skillIndex].items)
      ? newSkills[skillIndex].items
      : [];
    newSkills[skillIndex] = {
      ...newSkills[skillIndex],
      items: [...currentItems, { name: '', description: '' }],
    };
    onChange(newSkills);
  }, [skills, onChange]);

  const handleDeleteSkillItem = useCallback((skillIndex: number, itemIndex: number) => {
    const newSkills = [...skills];
    const newItems = Array.isArray(newSkills[skillIndex].items)
      ? newSkills[skillIndex].items.filter((_, i) => i !== itemIndex)
      : [];
    newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
    onChange(newSkills);
  }, [skills, onChange]);

  const handleSkillItemNameChange = useCallback((skillIndex: number, itemIndex: number, name: string) => {
    const newSkills = [...skills];
    const newItems = [...(newSkills[skillIndex].items || [])];
    newItems[itemIndex] = typeof newItems[itemIndex] === 'string'
      ? { name, description: '' }
      : { ...newItems[itemIndex], name };
    newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
    onChange(newSkills);
  }, [skills, onChange]);

  const handleSkillItemDescriptionsChange = useCallback((
    skillIndex: number,
    itemIndex: number,
    descriptions: HierarchicalItem[]
  ) => {
    const newSkills = [...skills];
    const newItems = [...(newSkills[skillIndex].items || [])];
    const currentItem = newItems[itemIndex];
    newItems[itemIndex] = typeof currentItem === 'string'
      ? { name: currentItem, description: '', descriptions }
      : { ...currentItem, descriptions };
    newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
    onChange(newSkills);
  }, [skills, onChange]);

  const handleMoveSkillItem = useCallback((skillIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    const newSkills = [...skills];
    const newItems = [...(newSkills[skillIndex].items || [])];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];
    newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
    onChange(newSkills);
  }, [skills, onChange]);

  return (
    <CollapsibleSection
      title={t('resume.sections.skills')}
      icon="⚡"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      count={skills.length}
      variant="secondary"
      headerAction={
        <Button
          variant="primary"
          onClick={handleAddCategory}
          size="sm"
          className="py-2 touch-manipulation"
        >
          + {t('resume.form.addCategory')}
        </Button>
      }
    >
      <p className="text-xs sm:text-sm theme-text-secondary mb-3 sm:mb-4">
        {t('resume.descriptions.skills')}
      </p>

      {skills.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
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
        <div className="text-center py-8 theme-text-tertiary">
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
  onSkillItemDescriptionsChange: (skillIndex: number, itemIndex: number, descriptions: HierarchicalItem[]) => void;
  onMoveSkillItem: (skillIndex: number, itemIndex: number, direction: 'up' | 'down') => void;
}

function SkillCategory({
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
  return (
    <div className="border border-theme-border-default rounded-lg p-3 sm:p-5 bg-theme-bg-hover transition-colors duration-200">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-lg font-semibold theme-text-primary">
          {t('resume.form.categoryNumber', { index: skillIndex + 1 })}
        </h3>
        <button
          type="button"
          onClick={() => onDeleteCategory(skillIndex)}
          className="text-theme-status-error-text hover:opacity-80 text-xs sm:text-sm font-semibold px-2 py-1 hover:bg-theme-status-error-bg rounded touch-manipulation"
        >
          {t('common.delete')}
        </button>
      </div>

      {/* Category Name */}
      <div className="mb-4">
        <TextInput
          label={t('resume.form.categoryName')}
          value={skill.category}
          onChange={(value) => onCategoryChange(skillIndex, value)}
          placeholder={t('resume.form.categoryPlaceholder')}
          required
        />
      </div>

      {/* Skill Items */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs sm:text-sm font-semibold theme-text-secondary">
            {t('resume.form.skillStack')}
          </label>
          <Button
            variant="secondary"
            onClick={() => onAddSkillItem(skillIndex)}
            size="sm"
            className="py-1.5 px-2 text-xs sm:text-sm touch-manipulation"
          >
            + {t('resume.form.addSkillButton')}
          </Button>
        </div>

        {Array.isArray(skill.items) && skill.items.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
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
          <div className="text-center py-6 text-theme-text-tertiary text-sm bg-theme-bg-input rounded-lg border border-dashed border-theme-border-default transition-colors duration-200">
            <p>{t('resume.form.clickToAddSkills')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SkillItemCardProps {
  item: SkillItem | string;
  skillIndex: number;
  itemIndex: number;
  itemCount: number;
  t: TFunction;
  onDeleteSkillItem: (skillIndex: number, itemIndex: number) => void;
  onSkillItemNameChange: (skillIndex: number, itemIndex: number, name: string) => void;
  onSkillItemDescriptionsChange: (skillIndex: number, itemIndex: number, descriptions: HierarchicalItem[]) => void;
  onMoveSkillItem: (skillIndex: number, itemIndex: number, direction: 'up' | 'down') => void;
}

function SkillItemCard({
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

  return (
    <div className="border theme-border-subtle rounded-lg p-2 sm:p-4 theme-bg-card transition-colors duration-200">
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Move buttons - stacked vertically */}
          <div className="flex flex-col gap-0.5">
            {itemIndex > 0 && (
              <button
                type="button"
                onClick={() => onMoveSkillItem(skillIndex, itemIndex, 'up')}
                className="w-6 h-6 flex items-center justify-center text-theme-primary hover:text-theme-primary-light hover:bg-theme-bg-hover rounded text-xs font-semibold touch-manipulation"
                title={t('resume.form.moveUpButton')}
              >
                ▲
              </button>
            )}
            {itemIndex < itemCount - 1 && (
              <button
                type="button"
                onClick={() => onMoveSkillItem(skillIndex, itemIndex, 'down')}
                className="w-6 h-6 flex items-center justify-center text-theme-primary hover:text-theme-primary-light hover:bg-theme-bg-hover rounded text-xs font-semibold touch-manipulation"
                title={t('resume.form.moveDownButton')}
              >
                ▼
              </button>
            )}
          </div>
          <span className="text-xs sm:text-sm font-semibold theme-text-secondary">
            {t('resume.form.skillNumber', { index: itemIndex + 1 })}
          </span>
        </div>
        <Button
          variant="danger"
          onClick={() => onDeleteSkillItem(skillIndex, itemIndex)}
          size="sm"
          className="py-1.5 px-2 text-xs touch-manipulation"
        >
          <span className="hidden sm:inline">{t('common.delete')}</span>
          <span className="sm:hidden">✕</span>
        </Button>
      </div>

      <div className="mb-3">
        {/* Skill Name */}
        <TextInput
          label={t('resume.form.skillName')}
          value={itemData.name}
          onChange={(value) => onSkillItemNameChange(skillIndex, itemIndex, value)}
          placeholder={t('resume.form.skillPlaceholder')}
          required
        />
      </div>

      {/* Hierarchical Description */}
      <HierarchicalDescription
        items={(itemData.descriptions || []) as HierarchicalItem[]}
        onChange={(descriptions) => onSkillItemDescriptionsChange(skillIndex, itemIndex, descriptions)}
        label="활용 경험 / 세부 설명"
        placeholder="활용 경험이나 세부 설명을 추가하려면 '+ 추가' 버튼을 클릭하세요"
        maxDepth={4}
      />

      {/* Legacy Description (for backward compatibility) */}
      {itemData.description && !itemData.descriptions?.length && (
        <div className="mt-3 p-3 bg-theme-status-warning-bg border border-theme-status-warning-border rounded-lg">
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
}
