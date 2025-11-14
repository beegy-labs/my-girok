import { useEffect, useState } from 'react';
import { SectionOrderItem, SectionType } from '../../api/userPreferences';
import { useUserPreferencesStore } from '../../stores/userPreferencesStore';

const DEFAULT_SECTION_ORDER: SectionOrderItem[] = [
  { type: SectionType.SKILLS, order: 0, visible: true },
  { type: SectionType.EXPERIENCE, order: 1, visible: true },
  { type: SectionType.PROJECT, order: 2, visible: true },
  { type: SectionType.EDUCATION, order: 3, visible: true },
  { type: SectionType.CERTIFICATE, order: 4, visible: true },
];

const SECTION_LABELS: Record<SectionType, string> = {
  [SectionType.SKILLS]: '기술 스택',
  [SectionType.EXPERIENCE]: '경력',
  [SectionType.PROJECT]: '프로젝트',
  [SectionType.EDUCATION]: '학력',
  [SectionType.CERTIFICATE]: '자격증',
};

export default function SectionOrderManager() {
  const { preferences, loadPreferences, setSectionOrder } =
    useUserPreferencesStore();

  const [sections, setSections] = useState<SectionOrderItem[]>(
    DEFAULT_SECTION_ORDER,
  );

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (preferences?.sectionOrder) {
      setSections(preferences.sectionOrder);
    }
  }, [preferences]);

  const handleVisibilityToggle = (type: SectionType) => {
    const newSections = sections.map((section) =>
      section.type === type
        ? { ...section, visible: !section.visible }
        : section,
    );
    setSections(newSections);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [
      newSections[index],
      newSections[index - 1],
    ];
    newSections.forEach((section, idx) => {
      section.order = idx;
    });
    setSections(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [
      newSections[index + 1],
      newSections[index],
    ];
    newSections.forEach((section, idx) => {
      section.order = idx;
    });
    setSections(newSections);
  };

  const handleSave = async () => {
    try {
      await setSectionOrder(sections);
      alert('설정이 저장되었습니다');
    } catch (error) {
      console.error('Failed to save section order:', error);
      alert('설정 저장에 실패했습니다');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          홈 기록 순서 관리
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          홈 화면에 표시될 기록 종류의 순서와 노출 여부를 설정합니다
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.type}
            className="flex items-center justify-between bg-white border border-amber-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-4">
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-600 hover:text-amber-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sections.length - 1}
                  className="text-gray-600 hover:text-amber-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <span className="text-gray-700 font-medium">
                {SECTION_LABELS[section.type]}
              </span>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <span className="text-sm text-gray-600">노출</span>
              <input
                type="checkbox"
                checked={section.visible}
                onChange={() => handleVisibilityToggle(section.type)}
                className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
            </label>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-amber-700/30 transform hover:scale-[1.02] transition-all"
      >
        저장
      </button>
    </div>
  );
}
