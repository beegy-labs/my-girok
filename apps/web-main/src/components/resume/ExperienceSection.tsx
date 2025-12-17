import { useState, useEffect, useCallback } from 'react';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Experience, ExperienceProject, ProjectAchievement, calculateExperienceDuration } from '../../api/resume';
import { getBulletSymbol } from '../../utils/hierarchical-renderer';
import { TextInput, TextArea, Button } from '@my-girok/ui-components';

// Depth colors for visual hierarchy in achievements
const DEPTH_COLORS = {
  1: { bg: 'bg-theme-level-1-bg', border: 'border-l-theme-level-1-border' },
  2: { bg: 'bg-theme-level-2-bg', border: 'border-l-theme-level-2-border' },
  3: { bg: 'bg-theme-level-3-bg', border: 'border-l-theme-level-3-border' },
  4: { bg: 'bg-theme-level-4-bg', border: 'border-l-theme-level-4-border' },
} as const;

interface ExperienceSectionProps {
  experiences: Experience[];
  onChange: (experiences: Experience[]) => void;
  t: (key: string) => string;
}

// Sortable Experience Card Component
function SortableExperienceCard({
  experience,
  index,
  onUpdate,
  onRemove,
  t,
}: {
  experience: Experience;
  index: number;
  onUpdate: (exp: Experience) => void;
  onRemove: () => void;
  t: (key: string, params?: any) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: experience.id || `exp-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [expandedProjects, setExpandedProjects] = useState<{ [key: number]: boolean }>({});
  // Mobile: collapse company details by default for existing items
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(true);

  // Ensure projects is always an array (handle undefined from API)
  const projects = experience.projects || [];

  const toggleCompanyExpand = useCallback(() => {
    setIsCompanyExpanded(prev => !prev);
  }, []);

  const toggleProject = (projectIndex: number) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectIndex]: !prev[projectIndex],
    }));
  };

  const handleProjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex(p => (p.id || `proj-${projects.indexOf(p)}`) === active.id);
    const newIndex = projects.findIndex(p => (p.id || `proj-${projects.indexOf(p)}`) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newProjects = arrayMove(projects, oldIndex, newIndex).map((p, idx) => ({
        ...p,
        order: idx,
      }));
      onUpdate({ ...experience, projects: newProjects });
    }
  };

  const handleAchievementDragEnd = (projectIndex: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const project = projects[projectIndex];
    const achievements = project.achievements || [];
    const oldIndex = achievements.findIndex(a => (a.id || `ach-${achievements.indexOf(a)}`) === active.id);
    const newIndex = achievements.findIndex(a => (a.id || `ach-${achievements.indexOf(a)}`) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newAchievements = arrayMove(achievements, oldIndex, newIndex).map((a, idx) => ({
        ...a,
        order: idx,
      }));

      const newProjects = [...projects];
      newProjects[projectIndex] = { ...project, achievements: newAchievements };
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
    setExpandedProjects(prev => ({ ...prev, [projects.length]: true }));
  };

  const updateProject = (projectIndex: number, project: ExperienceProject) => {
    const newProjects = [...projects];
    newProjects[projectIndex] = project;
    onUpdate({ ...experience, projects: newProjects });
  };

  const removeProject = (projectIndex: number) => {
    const newProjects = projects.filter((_, i) => i !== projectIndex);
    onUpdate({ ...experience, projects: newProjects });
  };

  const addAchievement = (projectIndex: number) => {
    const project = projects[projectIndex];
    const achievements = project.achievements || [];
    const newAchievement: ProjectAchievement = {
      content: '',
      depth: 1,
      order: achievements.length,
    };
    updateProject(projectIndex, {
      ...project,
      achievements: [...achievements, newAchievement],
    });
  };

  const updateAchievement = (projectIndex: number, achievementIndex: number, achievement: ProjectAchievement) => {
    const project = projects[projectIndex];
    const newAchievements = [...(project.achievements || [])];
    newAchievements[achievementIndex] = achievement;
    updateProject(projectIndex, { ...project, achievements: newAchievements });
  };

  const removeAchievement = (projectIndex: number, achievementIndex: number) => {
    const project = projects[projectIndex];
    const newAchievements = (project.achievements || []).filter((_, i) => i !== achievementIndex);
    updateProject(projectIndex, { ...project, achievements: newAchievements });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div ref={setNodeRef} style={style} className="border theme-border-default rounded-xl overflow-hidden bg-theme-bg-hover transition-colors duration-200">
      {/* Mobile-optimized Company Header */}
      <div className="bg-gradient-to-r from-theme-bg-hover to-theme-bg-card dark:from-theme-primary/20 dark:to-theme-primary/10 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Drag Handle - larger touch target */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-2 -m-1 cursor-move text-theme-primary hover:text-theme-primary-light transition-colors duration-200 flex-shrink-0 touch-manipulation"
            title={t('resume.experienceForm.dragToReorder')}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>

          {/* Company Title - clickable on mobile to expand/collapse */}
          <button
            type="button"
            onClick={toggleCompanyExpand}
            className="flex-1 flex items-center gap-2 text-left min-w-0 sm:cursor-default"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-theme-primary-light truncate transition-colors duration-200">
                📚 {experience.company || t('resume.experienceForm.company')} #{index + 1}
              </h3>
              {/* Show summary when collapsed on mobile */}
              {!isCompanyExpanded && experience.startDate && (
                <p className="text-xs text-theme-primary truncate sm:hidden">
                  {experience.finalPosition} • {experience.startDate} ~ {experience.isCurrentlyWorking ? '현재' : experience.endDate}
                </p>
              )}
            </div>
            {/* Expand/collapse indicator - mobile only */}
            <svg
              className={`w-5 h-5 text-theme-primary transition-transform duration-200 sm:hidden flex-shrink-0 ${isCompanyExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Company Details - collapsible on mobile */}
      <div className={`${isCompanyExpanded ? 'block' : 'hidden'} sm:block p-3 sm:p-6`}>
        {/* Desktop: title bar with delete button */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-theme-primary-light transition-colors duration-200">
            📚 {t('resume.experienceForm.company')} #{index + 1}
          </h3>
          <Button variant="danger" onClick={onRemove} size="sm" className="flex-shrink-0">
            {t('resume.experienceForm.removeCompany')}
          </Button>
        </div>

        {/* Mobile: Delete button */}
        <div className="sm:hidden flex justify-end mb-3">
          <Button variant="danger" onClick={onRemove} size="sm" className="text-xs py-1.5 px-3 touch-manipulation">
            ✕ 삭제
          </Button>
        </div>

        {/* Company Basic Info - Mobile optimized */}
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 mb-4">
          <TextInput
            label={t('resume.experienceForm.company')}
            value={experience.company}
            onChange={value => onUpdate({ ...experience, company: value })}
            placeholder={t('resume.experienceForm.companyName')}
            required
          />

          {/* Date fields - side by side on mobile for better UX */}
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold theme-text-secondary mb-1 sm:mb-2 transition-colors duration-200">
                <span className="hidden sm:inline">{t('resume.experienceForm.startDate')}</span>
                <span className="sm:hidden">시작일</span>
                <span className="text-theme-status-error-text ml-1">*</span>
              </label>
              <input
                type="month"
                value={experience.startDate}
                onChange={e => onUpdate({ ...experience, startDate: e.target.value })}
                className="w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base theme-bg-card border theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary theme-text-primary transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold theme-text-secondary mb-1 sm:mb-2 transition-colors duration-200">
                <span className="hidden sm:inline">{t('resume.experienceForm.endDate')}</span>
                <span className="sm:hidden">종료일</span>
              </label>
              <input
                type="month"
                value={experience.endDate || ''}
                onChange={e => onUpdate({ ...experience, endDate: e.target.value, isCurrentlyWorking: false })}
                disabled={experience.isCurrentlyWorking}
                className="w-full px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base theme-bg-card border theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary theme-text-primary disabled:bg-theme-bg-secondary disabled:cursor-not-allowed transition-colors duration-200"
              />
            </div>
          </div>
        </div>

        {/* Currently working checkbox - larger touch target */}
        <label className="flex items-center p-2 -mx-2 mb-3 rounded-lg hover:bg-theme-primary/10 cursor-pointer transition-colors duration-200 touch-manipulation">
          <input
            type="checkbox"
            checked={experience.isCurrentlyWorking || false}
            onChange={e => onUpdate({ ...experience, isCurrentlyWorking: e.target.checked, endDate: e.target.checked ? '' : experience.endDate })}
            className="w-5 h-5 text-theme-primary border-theme-border-default rounded focus:ring-theme-primary"
          />
          <span className="ml-3 text-xs sm:text-sm theme-text-secondary">
            <span className="hidden sm:inline">{t('resume.experience.currentlyWorking')}</span>
            <span className="sm:hidden">현재 재직 중</span>
          </span>
        </label>

        {/* Experience Duration */}
        {experience.startDate && (
          <div className="mb-3 p-2 sm:p-3 bg-theme-primary/10 border theme-border-default rounded-lg transition-colors duration-200">
            <span className="text-xs sm:text-sm font-semibold text-theme-primary-light transition-colors duration-200">
              {t('resume.experienceForm.experiencePeriod')} {(() => {
                const duration = calculateExperienceDuration(
                  experience.startDate,
                  experience.endDate,
                  experience.isCurrentlyWorking
                );
                return t('resume.experience.duration', { years: duration.years, months: duration.months });
              })()}
            </span>
          </div>
        )}

        {/* Final Position and Job Title */}
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 mb-3">
          <TextInput
            label={t('resume.experienceForm.position')}
            value={experience.finalPosition}
            onChange={value => onUpdate({ ...experience, finalPosition: value })}
            placeholder={t('resume.experienceForm.positionPlaceholder')}
            required
          />

          <TextInput
            label={t('resume.experienceForm.jobTitle')}
            value={experience.jobTitle}
            onChange={value => onUpdate({ ...experience, jobTitle: value })}
            placeholder={t('resume.experienceForm.jobTitlePlaceholder')}
            required
          />
        </div>

        {/* Salary Section - Compact on mobile */}
        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-semibold theme-text-secondary mb-1 sm:mb-2 transition-colors duration-200">
            <span className="hidden sm:inline">연봉 / Salary (Optional)</span>
            <span className="sm:hidden">연봉 (선택)</span>
          </label>
          <div className="flex gap-2 sm:gap-4">
            <input
              type="number"
              value={experience.salary || ''}
              onChange={e => onUpdate({ ...experience, salary: e.target.value ? parseInt(e.target.value) : undefined })}
              className="flex-1 px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base theme-bg-card border theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary theme-text-primary transition-colors duration-200"
              placeholder="5000"
              min="0"
            />
            <select
              value={experience.salaryUnit || '만원'}
              onChange={e => onUpdate({ ...experience, salaryUnit: e.target.value })}
              className="w-24 sm:w-32 px-2 py-2 sm:px-4 sm:py-3 text-sm sm:text-base theme-bg-card border theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary theme-text-primary transition-colors duration-200"
            >
              <option value="만원">만원</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <label className="flex items-center p-2 -mx-2 mt-1 rounded-lg hover:bg-theme-primary/10 cursor-pointer transition-colors duration-200 touch-manipulation">
            <input
              type="checkbox"
              checked={experience.showSalary ?? false}
              onChange={e => onUpdate({ ...experience, showSalary: e.target.checked })}
              className="w-4 h-4 sm:w-5 sm:h-5 text-theme-primary theme-bg-card border-theme-border-default rounded focus:ring-theme-primary focus:ring-2"
            />
            <span className="ml-2 text-xs sm:text-sm theme-text-secondary">
              <span className="hidden sm:inline">Show salary in preview (미리보기에 표시)</span>
              <span className="sm:hidden">미리보기에 표시</span>
            </span>
          </label>
        </div>

        {/* Projects Section */}
        <div className="mt-3 sm:mt-6 border-t theme-border-default pt-3 sm:pt-4 transition-colors duration-200">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <h4 className="text-xs sm:text-md font-bold text-theme-primary-light transition-colors duration-200">
              <span className="hidden sm:inline">📁 Projects at this company</span>
              <span className="sm:hidden">📁 프로젝트 ({projects.length})</span>
            </h4>
            <Button variant="secondary" onClick={addProject} size="sm" className="text-xs sm:text-sm py-1.5 px-2 sm:py-2 sm:px-3 touch-manipulation">
              <span className="hidden sm:inline">+ Add Project</span>
              <span className="sm:hidden">+ 추가</span>
            </Button>
          </div>

          {projects && projects.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleProjectDragEnd}
            >
              <SortableContext
                items={projects.map((p, i) => p.id || `proj-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {projects.map((project, projectIndex) => (
                    <SortableProject
                      key={project.id || `proj-${projectIndex}`}
                      project={project}
                      projectIndex={projectIndex}
                      isExpanded={expandedProjects[projectIndex] || false}
                      onToggle={() => toggleProject(projectIndex)}
                      onUpdate={(p) => updateProject(projectIndex, p)}
                      onRemove={() => removeProject(projectIndex)}
                      onAddAchievement={() => addAchievement(projectIndex)}
                      onUpdateAchievement={(achIndex, ach) => updateAchievement(projectIndex, achIndex, ach)}
                      onRemoveAchievement={(achIndex) => removeAchievement(projectIndex, achIndex)}
                      onAchievementDragEnd={(e) => handleAchievementDragEnd(projectIndex, e)}
                      t={t}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-6 theme-text-tertiary text-sm theme-bg-card rounded-lg border border-dashed theme-border-default transition-colors duration-200">
              <p>{t('resume.experienceForm.noProjects')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sortable Project Component
function SortableProject({
  project,
  projectIndex,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onAddAchievement,
  onUpdateAchievement,
  onRemoveAchievement,
  onAchievementDragEnd,
  t,
}: {
  project: ExperienceProject;
  projectIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (project: ExperienceProject) => void;
  onRemove: () => void;
  onAddAchievement: () => void;
  onUpdateAchievement: (index: number, achievement: ProjectAchievement) => void;
  onRemoveAchievement: (index: number) => void;
  onAchievementDragEnd: (event: DragEndEvent) => void;
  t: (key: string) => string;
}) {
  // Local state for tech stack input to allow free-form typing
  // Safe access with fallback to empty array to prevent undefined.join() crash
  const [techStackInput, setTechStackInput] = useState((project.techStack || []).join(', '));

  // Update local state when project changes externally
  useEffect(() => {
    setTechStackInput((project.techStack || []).join(', '));
  }, [project.techStack]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id || `proj-${projectIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div ref={setNodeRef} style={style} className="border theme-border-strong rounded-lg theme-bg-card transition-colors duration-200">
      {/* Project Header */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 theme-bg-hover transition-colors duration-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 cursor-move theme-text-tertiary hover:text-theme-primary transition-colors duration-200 flex-shrink-0 touch-manipulation"
          title={t('resume.experienceForm.dragToReorder')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center justify-between text-left transition-colors duration-200 min-w-0 overflow-hidden"
        >
          <span className="font-semibold text-theme-primary-light flex items-center gap-1 sm:gap-2 transition-colors duration-200 min-w-0">
            <span className="flex-shrink-0">📖</span>
            <span className="flex-shrink-0 hidden sm:inline">{t('resume.experienceForm.project')}</span>
            <span className="flex-shrink-0">#{projectIndex + 1}</span>
            {project.name && <span className="font-normal theme-text-secondary transition-colors duration-200 truncate">- {project.name}</span>}
          </span>
          <svg
            className={`w-5 h-5 theme-text-tertiary transition-transform duration-200 flex-shrink-0 ml-1 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Button variant="danger" onClick={onRemove} size="sm" className="flex-shrink-0">
          <span className="hidden sm:inline">{t('resume.experienceForm.remove')}</span>
          <span className="sm:hidden">✕</span>
        </Button>
      </div>

      {/* Project Details (Collapsible) */}
      {isExpanded && (
        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
          {/* Project Basic Info */}
          <div className="grid grid-cols-1 gap-3">
            <TextInput
              label={t('resume.experienceForm.projectName')}
              value={project.name}
              onChange={value => onUpdate({ ...project, name: value })}
              placeholder={t('resume.experienceForm.projectNamePlaceholder')}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 transition-colors duration-200">
                  {t('resume.experienceForm.startDate')} <span className="text-theme-status-error-text">*</span>
                </label>
                <input
                  type="month"
                  value={project.startDate}
                  onChange={e => onUpdate({ ...project, startDate: e.target.value })}
                  className="w-full px-3 py-2 theme-bg-card border theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary text-sm theme-text-primary transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 transition-colors duration-200">
                  {t('resume.experienceForm.endDate')}
                </label>
                <input
                  type="month"
                  value={project.endDate || ''}
                  onChange={e => onUpdate({ ...project, endDate: e.target.value })}
                  className="w-full px-3 py-2 theme-bg-card border theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary text-sm theme-text-primary transition-colors duration-200"
                  placeholder={t('resume.experienceForm.ongoingProject')}
                />
              </div>
            </div>

            <TextArea
              label={t('resume.experienceForm.description')}
              value={project.description}
              onChange={value => onUpdate({ ...project, description: value })}
              rows={3}
              placeholder={t('resume.experienceForm.projectDescription')}
              required
            />

            <TextInput
              label={t('resume.experienceForm.yourRole')}
              value={project.role || ''}
              onChange={value => onUpdate({ ...project, role: value })}
              placeholder={t('resume.experienceForm.rolePlaceholder')}
            />

            <TextInput
              label={t('resume.experienceForm.techStack')}
              value={techStackInput}
              onChange={value => setTechStackInput(value)}
              onBlur={() => {
                const parsed = techStackInput.split(',').map(s => s.trim()).filter(Boolean);
                onUpdate({ ...project, techStack: parsed });
                setTechStackInput(parsed.join(', '));
              }}
              placeholder={t('resume.experienceForm.techStackPlaceholder')}
            />

            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label={t('resume.experienceForm.projectUrl')}
                type="url"
                value={project.url || ''}
                onChange={value => onUpdate({ ...project, url: value })}
                placeholder={t('resume.experienceForm.urlPlaceholder')}
              />

              <TextInput
                label={t('resume.experienceForm.githubUrl')}
                type="url"
                value={project.githubUrl || ''}
                onChange={value => onUpdate({ ...project, githubUrl: value })}
                placeholder={t('resume.experienceForm.githubUrlPlaceholder')}
              />
            </div>
          </div>

          {/* Key Achievements */}
          <div className="border-t theme-border-default pt-4 transition-colors duration-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-theme-primary-light flex items-center gap-2 transition-colors duration-200">
                ⭐ {t('resume.experienceForm.keyAchievements')}
                <span className="text-xs theme-text-tertiary font-normal transition-colors duration-200">{t('resume.experienceForm.depthLevels')}</span>
              </label>
              <button
                type="button"
                onClick={onAddAchievement}
                className="px-2 py-1 bg-theme-primary text-white text-xs rounded-lg hover:bg-theme-primary-light transition-colors duration-200"
              >
                {t('resume.experienceForm.addAchievement')}
              </button>
            </div>

            {project.achievements && project.achievements.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onAchievementDragEnd}
              >
                <SortableContext
                  items={project.achievements.map((a, i) => a.id || `ach-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {project.achievements.map((achievement, achIndex) => (
                      <SortableAchievement
                        key={achievement.id || `ach-${achIndex}`}
                        achievement={achievement}
                        achIndex={achIndex}
                        onUpdate={(ach) => onUpdateAchievement(achIndex, ach)}
                        onRemove={() => onRemoveAchievement(achIndex)}
                        onAddChild={() => {
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
                          onUpdateAchievement(achIndex, updatedAchievement);
                        }}
                        t={t}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-xs theme-text-tertiary italic transition-colors duration-200">{t('resume.experienceForm.noAchievements')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Recursive Hierarchical Achievement Component
function HierarchicalAchievement({
  achievement,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  t,
}: {
  achievement: ProjectAchievement;
  depth: number;
  onUpdate: (achievement: ProjectAchievement) => void;
  onRemove: () => void;
  onAddChild: () => void;
  t: (key: string) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleUpdateChild = (childIndex: number, updatedChild: ProjectAchievement) => {
    const newChildren = [...(achievement.children || [])];
    newChildren[childIndex] = updatedChild;
    onUpdate({ ...achievement, children: newChildren });
  };

  const handleRemoveChild = (childIndex: number) => {
    const newChildren = (achievement.children || []).filter((_, i) => i !== childIndex);
    onUpdate({ ...achievement, children: newChildren });
  };

  const handleAddChildToChild = (childIndex: number) => {
    const newChildren = [...(achievement.children || [])];
    const newSubChild: ProjectAchievement = {
      content: '',
      depth: depth + 2,
      order: (newChildren[childIndex].children || []).length,
      children: [],
    };
    newChildren[childIndex] = {
      ...newChildren[childIndex],
      children: [...(newChildren[childIndex].children || []), newSubChild],
    };
    onUpdate({ ...achievement, children: newChildren });
  };

  // Get depth color with fallback
  const depthColor = DEPTH_COLORS[depth as keyof typeof DEPTH_COLORS] || DEPTH_COLORS[4];

  // Calculate margin based on screen size (smaller on mobile)
  const mobileMargin = (depth - 1) * 0.25; // 0.25rem per depth on mobile

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Color-coded card by depth */}
      <div
        className={`${depthColor.bg} rounded-lg p-1.5 sm:p-2 border-l-4 ${depthColor.border} transition-colors duration-200`}
        style={{
          marginLeft: `${mobileMargin}rem`,
          maxWidth: `calc(100% - ${mobileMargin}rem)`
        }}
      >
        {/* Desktop: horizontal layout */}
        <div className="hidden sm:flex items-start gap-2" style={{
          marginLeft: `${(depth - 1) * 0.75}rem`,
        }}>
          <div className="flex items-center gap-1 min-w-[30px] flex-shrink-0">
            <span className="theme-text-secondary font-bold text-sm select-none">
              {getBulletSymbol(depth)}
            </span>
          </div>

          <input
            type="text"
            value={achievement.content}
            onChange={e => onUpdate({ ...achievement, content: e.target.value })}
            className="flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none text-sm theme-text-primary min-w-0 transition-colors duration-200"
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            placeholder={t('resume.experienceForm.achievementPlaceholder')}
          />

          <div className="flex items-center gap-1">
            {depth < 4 && (
              <button
                type="button"
                onClick={onAddChild}
                className="px-2 py-1 bg-theme-status-success-bg border border-theme-status-success-border text-theme-status-success-text text-xs rounded hover:opacity-80 transition-colors duration-200 font-semibold whitespace-nowrap"
                title={t('resume.experienceForm.addSubItem')}
              >
                {t('resume.experienceForm.addSubItem')}
              </button>
            )}

            {(achievement.children && achievement.children.length > 0) && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2 py-1 text-xs theme-text-secondary hover:text-theme-text-primary transition-colors duration-200"
                title={isExpanded ? t('resume.experienceForm.collapse') : t('resume.experienceForm.expand')}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}

            <button
              type="button"
              onClick={onRemove}
              className="text-theme-status-error-text hover:opacity-80 text-xs font-semibold transition-colors duration-200"
              title={t('resume.experienceForm.remove')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mobile: compact layout with inline action buttons */}
        <div className="sm:hidden">
          <div className="flex items-center gap-1.5">
            <span className="theme-text-secondary font-bold text-[11px] select-none flex-shrink-0 transition-colors duration-200">
              {getBulletSymbol(depth)}
            </span>
            <input
              type="text"
              value={achievement.content}
              onChange={e => onUpdate({ ...achievement, content: e.target.value })}
              className="flex-1 px-1 py-0.5 border-0 bg-transparent focus:outline-none text-xs theme-text-primary min-w-0 transition-colors duration-200"
              placeholder={t('resume.experienceForm.achievementPlaceholder')}
            />
            {/* Inline action buttons for mobile */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {depth < 4 && (
                <button
                  type="button"
                  onClick={onAddChild}
                  className="w-6 h-6 flex items-center justify-center bg-theme-status-success-bg text-theme-status-success-text text-[10px] rounded hover:opacity-80 transition-colors duration-200 touch-manipulation"
                  title={t('resume.experienceForm.addSubItem')}
                >
                  +
                </button>
              )}

              {(achievement.children && achievement.children.length > 0) && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-6 h-6 flex items-center justify-center text-[10px] theme-text-secondary hover:bg-theme-bg-hover rounded transition-colors duration-200 touch-manipulation"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}

              <button
                type="button"
                onClick={onRemove}
                className="w-6 h-6 flex items-center justify-center text-theme-status-error-text hover:bg-theme-status-error-bg rounded text-[10px] font-semibold transition-colors duration-200 touch-manipulation"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Render children recursively */}
      {isExpanded && achievement.children && achievement.children.length > 0 && (
        <div className="space-y-2">
          {achievement.children.map((child, childIndex) => (
            <HierarchicalAchievement
              key={childIndex}
              achievement={child}
              depth={depth + 1}
              onUpdate={(updatedChild) => handleUpdateChild(childIndex, updatedChild)}
              onRemove={() => handleRemoveChild(childIndex)}
              onAddChild={() => handleAddChildToChild(childIndex)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sortable Achievement Component (for drag-and-drop at root level)
function SortableAchievement({
  achievement,
  achIndex,
  onUpdate,
  onRemove,
  onAddChild,
  t,
}: {
  achievement: ProjectAchievement;
  achIndex: number;
  onUpdate: (achievement: ProjectAchievement) => void;
  onRemove: () => void;
  onAddChild: () => void;
  t: (key: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: achievement.id || `ach-${achIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="flex items-start gap-2 theme-bg-card rounded-lg p-2 border theme-border-default transition-colors duration-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-move theme-text-tertiary hover:text-theme-primary transition-colors duration-200 flex-shrink-0"
          title={t('resume.experienceForm.dragToReorder')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <div className="flex-1">
          <HierarchicalAchievement
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
}

// Main Experience Section Component
export default function ExperienceSection({ experiences, onChange, t }: ExperienceSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = experiences.findIndex(exp => (exp.id || `exp-${experiences.indexOf(exp)}`) === active.id);
    const newIndex = experiences.findIndex(exp => (exp.id || `exp-${experiences.indexOf(exp)}`) === over.id);

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
    const newExperiences = experiences.filter((_, i) => i !== index);
    onChange(newExperiences);
  };

  return (
    <div className="theme-bg-card border theme-border-subtle rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-sm p-3 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3 sm:mb-6 lg:mb-8">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl lg:text-2xl font-bold theme-text-primary flex items-center gap-2 transition-colors duration-200">
            💼 {t('resume.sections.experience')}
          </h2>
          <p className="text-xs sm:text-sm lg:text-base theme-text-secondary mt-1 transition-colors duration-200 hidden sm:block">{t('resume.descriptions.experience')}</p>
        </div>
        <button
          type="button"
          onClick={addExperience}
          className="px-2 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-light transition-colors duration-200 font-semibold text-xs sm:text-sm lg:text-base flex-shrink-0"
        >
          {t('resume.experienceForm.addExperience')}
        </button>
      </div>

      {experiences && experiences.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={experiences.map((exp, i) => exp.id || `exp-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 sm:space-y-6 lg:space-y-8">
              {experiences.map((exp, index) => (
                <SortableExperienceCard
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
        <div className="text-center py-6 sm:py-12 theme-text-tertiary transition-colors duration-200 text-sm sm:text-base">
          <p>{t('resume.experienceForm.noExperience')}</p>
        </div>
      )}
    </div>
  );
}
