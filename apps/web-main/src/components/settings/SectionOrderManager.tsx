import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@my-girok/ui-components';
import { SectionOrderItem, SectionType } from '../../api/userPreferences';
import { useUserPreferencesStore } from '../../stores/userPreferencesStore';

// Memoized SectionItem component (2025 React best practice)
interface SectionItemProps {
  section: SectionOrderItem;
  index: number;
  totalCount: number;
  label: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onVisibilityToggle: () => void;
  t: (key: string) => string;
}

const SectionItem = memo(function SectionItem({
  section,
  index,
  totalCount,
  label,
  onMoveUp,
  onMoveDown,
  onVisibilityToggle,
  t,
}: SectionItemProps) {
  return (
    <div className="flex items-center justify-between bg-theme-bg-elevated border border-theme-border-default rounded-xl p-4 transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <div className="flex flex-col space-y-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-theme-text-secondary hover:text-theme-primary disabled:text-theme-text-muted disabled:cursor-not-allowed transition-colors"
            aria-label={t('aria.moveUp')}
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalCount - 1}
            className="text-theme-text-secondary hover:text-theme-primary disabled:text-theme-text-muted disabled:cursor-not-allowed transition-colors"
            aria-label={t('aria.moveDown')}
          >
            ▼
          </button>
        </div>
        <span className="text-theme-text-primary font-medium">{label}</span>
      </div>

      <label className="flex items-center space-x-2 cursor-pointer">
        <span className="text-sm text-theme-text-secondary">{t('settings.visibility')}</span>
        <input
          type="checkbox"
          checked={section.visible}
          onChange={onVisibilityToggle}
          className="w-5 h-5 text-theme-primary bg-theme-bg-card border-theme-border-default rounded focus:ring-theme-primary"
        />
      </label>
    </div>
  );
});

const DEFAULT_SECTION_ORDER: SectionOrderItem[] = [
  { type: SectionType.SKILLS, order: 0, visible: true },
  { type: SectionType.EXPERIENCE, order: 1, visible: true },
  { type: SectionType.PROJECT, order: 2, visible: true },
  { type: SectionType.EDUCATION, order: 3, visible: true },
  { type: SectionType.CERTIFICATE, order: 4, visible: true },
];

export default function SectionOrderManager() {
  const { t } = useTranslation();
  const { preferences, loadPreferences, setSectionOrder } = useUserPreferencesStore();

  const [sections, setSections] = useState<SectionOrderItem[]>(DEFAULT_SECTION_ORDER);

  // Memoized section label lookup (2025 best practice)
  const keyMap = useMemo<Record<SectionType, string>>(
    () => ({
      [SectionType.SKILLS]: 'skills',
      [SectionType.EXPERIENCE]: 'experience',
      [SectionType.PROJECT]: 'projects',
      [SectionType.EDUCATION]: 'education',
      [SectionType.CERTIFICATE]: 'certifications',
    }),
    [],
  );

  const getSectionLabel = useCallback(
    (type: SectionType): string => t(`settings.sections.${keyMap[type]}`),
    [t, keyMap],
  );

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (preferences?.sectionOrder) {
      setSections(preferences.sectionOrder);
    }
  }, [preferences]);

  // Curried handlers (2025 best practice - no inline functions in map)
  const handleVisibilityToggle = useCallback(
    (type: SectionType) => () => {
      setSections((prev) =>
        prev.map((section) =>
          section.type === type ? { ...section, visible: !section.visible } : section,
        ),
      );
    },
    [],
  );

  const handleMoveUp = useCallback(
    (index: number) => () => {
      if (index === 0) return;
      setSections((prev) => {
        const newSections = [...prev];
        [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
        newSections.forEach((section, idx) => {
          section.order = idx;
        });
        return newSections;
      });
    },
    [],
  );

  const handleMoveDown = useCallback(
    (index: number) => () => {
      setSections((prev) => {
        if (index === prev.length - 1) return prev;
        const newSections = [...prev];
        [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        newSections.forEach((section, idx) => {
          section.order = idx;
        });
        return newSections;
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    try {
      await setSectionOrder(sections);
      alert(t('settings.saved'));
    } catch (error) {
      console.error('Failed to save section order:', error);
      alert(t('settings.saveFailed'));
    }
  }, [sections, setSectionOrder, t]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-theme-text-primary mb-2">
          {t('settings.sectionOrder')}
        </h3>
        <p className="text-sm text-theme-text-secondary mb-4">
          {t('settings.sectionOrderDescription')}
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <SectionItem
            key={section.type}
            section={section}
            index={index}
            totalCount={sections.length}
            label={getSectionLabel(section.type)}
            onMoveUp={handleMoveUp(index)}
            onMoveDown={handleMoveDown(index)}
            onVisibilityToggle={handleVisibilityToggle(section.type)}
            t={t}
          />
        ))}
      </div>

      <Button variant="primary" onClick={handleSave} fullWidth size="lg" rounded="editorial">
        {t('common.save')}
      </Button>
    </div>
  );
}
