import { useState, useMemo, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProjectAchievement } from '../../../api/resume';
import { getBulletSymbol } from '../../../utils/hierarchical-renderer';
import { DEPTH_COLORS, DepthLevel } from './constants';

interface AchievementItemProps {
  achievement: ProjectAchievement;
  depth: number;
  onUpdate: (achievement: ProjectAchievement) => void;
  onRemove: () => void;
  onAddChild: () => void;
  t: (key: string) => string;
}

/**
 * Recursive Hierarchical Achievement Component
 * Simplified: removed excessive useCallback, direct handlers
 */
export const AchievementItem = memo(function AchievementItem({
  achievement,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  t,
}: AchievementItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const depthColor = DEPTH_COLORS[depth as DepthLevel] || DEPTH_COLORS[4];
  const mobileMargin = (depth - 1) * 0.25;
  const hasChildren = achievement.children && achievement.children.length > 0;

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...achievement, content: e.target.value });
  };

  const updateChild = (index: number, child: ProjectAchievement) => {
    const newChildren = [...(achievement.children || [])];
    newChildren[index] = child;
    onUpdate({ ...achievement, children: newChildren });
  };

  const removeChild = (index: number) => {
    const newChildren = (achievement.children || []).filter((_, i) => i !== index);
    onUpdate({ ...achievement, children: newChildren });
  };

  const addChildToChild = (index: number) => {
    const newChildren = [...(achievement.children || [])];
    const newSubChild: ProjectAchievement = {
      content: '',
      depth: depth + 2,
      order: (newChildren[index].children || []).length,
      children: [],
    };
    newChildren[index] = {
      ...newChildren[index],
      children: [...(newChildren[index].children || []), newSubChild],
    };
    onUpdate({ ...achievement, children: newChildren });
  };

  return (
    <div className="space-y-1 sm:space-y-2">
      <div
        className={`${depthColor.bg} rounded-soft p-2 border-l-4 ${depthColor.border} transition-colors duration-200`}
        style={{ marginLeft: `${mobileMargin}rem`, maxWidth: `calc(100% - ${mobileMargin}rem)` }}
      >
        {/* Desktop layout */}
        <div
          className="hidden sm:flex items-start gap-2"
          style={{ marginLeft: `${(depth - 1) * 0.75}rem` }}
        >
          <span className={`${depthColor.text} font-bold text-sm select-none min-w-[30px]`}>
            {getBulletSymbol(depth)}
          </span>
          <input
            type="text"
            value={achievement.content}
            onChange={handleContentChange}
            className={`flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none text-sm ${depthColor.text}`}
            placeholder={t('resume.experienceForm.achievementPlaceholder')}
          />
          <div className="flex items-center gap-1">
            {depth < 4 && (
              <button
                type="button"
                onClick={onAddChild}
                className="px-2 py-1 bg-theme-status-success-bg border border-theme-status-success-border text-theme-status-success-text text-xs rounded hover:opacity-80 font-semibold"
              >
                +
              </button>
            )}
            {hasChildren && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2 py-1 text-xs text-theme-text-secondary hover:text-theme-text-primary"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="text-theme-status-error-text hover:opacity-80 text-xs font-semibold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="sm:hidden flex items-center gap-2">
          <span className={`${depthColor.text} font-bold text-brand-xs select-none flex-shrink-0`}>
            {getBulletSymbol(depth)}
          </span>
          <input
            type="text"
            value={achievement.content}
            onChange={handleContentChange}
            className={`flex-1 px-1 py-1 border-0 bg-transparent focus:outline-none text-xs ${depthColor.text} min-w-0`}
            placeholder={t('resume.experienceForm.achievementPlaceholder')}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            {depth < 4 && (
              <button
                type="button"
                onClick={onAddChild}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-theme-status-success-bg text-theme-status-success-text text-xs rounded touch-manipulation"
              >
                +
              </button>
            )}
            {hasChildren && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs text-theme-text-secondary touch-manipulation"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-theme-status-error-text text-xs font-semibold touch-manipulation"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Render children recursively */}
      {isExpanded && hasChildren && (
        <div className="space-y-2">
          {achievement.children!.map((child, childIndex) => (
            <AchievementItem
              key={child.id || `child-${depth}-${childIndex}`}
              achievement={child}
              depth={depth + 1}
              onUpdate={(c) => updateChild(childIndex, c)}
              onRemove={() => removeChild(childIndex)}
              onAddChild={() => addChildToChild(childIndex)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface SortableAchievementProps {
  achievement: ProjectAchievement;
  index: number;
  onUpdate: (achievement: ProjectAchievement) => void;
  onRemove: () => void;
  onAddChild: () => void;
  t: (key: string) => string;
}

/**
 * Sortable wrapper for root-level achievements
 */
export const SortableAchievement = memo(function SortableAchievement({
  achievement,
  index,
  onUpdate,
  onRemove,
  onAddChild,
  t,
}: SortableAchievementProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: achievement.id || `ach-${index}`,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }),
    [transform, transition, isDragging],
  );

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="flex items-start gap-2 bg-theme-bg-card rounded-soft p-2 border border-theme-border-default">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-move text-theme-text-tertiary hover:text-theme-primary flex-shrink-0"
          title={t('resume.experienceForm.dragToReorder')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>
        <div className="flex-1">
          <AchievementItem
            achievement={achievement}
            depth={1}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onAddChild={onAddChild}
            t={t}
          />
        </div>
      </div>
    </div>
  );
});
