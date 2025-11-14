import { useState, useEffect } from 'react';
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
import { Experience, ExperienceProject, ProjectAchievement, calculateExperienceDuration } from '../../api/resume';
import { getBulletSymbol } from '../../utils/hierarchical-renderer';

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
}: {
  experience: Experience;
  index: number;
  onUpdate: (exp: Experience) => void;
  onRemove: () => void;
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

  // Ensure projects is always an array (handle undefined from API)
  const projects = experience.projects || [];

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
    const oldIndex = project.achievements.findIndex(a => (a.id || `ach-${project.achievements.indexOf(a)}`) === active.id);
    const newIndex = project.achievements.findIndex(a => (a.id || `ach-${project.achievements.indexOf(a)}`) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newAchievements = arrayMove(project.achievements, oldIndex, newIndex).map((a, idx) => ({
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
    const newAchievement: ProjectAchievement = {
      content: '',
      depth: 1,
      order: project.achievements.length,
    };
    updateProject(projectIndex, {
      ...project,
      achievements: [...project.achievements, newAchievement],
    });
  };

  const updateAchievement = (projectIndex: number, achievementIndex: number, achievement: ProjectAchievement) => {
    const project = projects[projectIndex];
    const newAchievements = [...project.achievements];
    newAchievements[achievementIndex] = achievement;
    updateProject(projectIndex, { ...project, achievements: newAchievements });
  };

  const removeAchievement = (projectIndex: number, achievementIndex: number) => {
    const project = projects[projectIndex];
    const newAchievements = project.achievements.filter((_, i) => i !== achievementIndex);
    updateProject(projectIndex, { ...project, achievements: newAchievements });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div ref={setNodeRef} style={style} className="border border-amber-200 dark:border-dark-border-default rounded-xl p-6 bg-amber-50/30 dark:bg-dark-bg-card transition-colors duration-200">
      {/* Company Header with Drag Handle */}
      <div className="flex items-start gap-4 mb-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-2 cursor-move text-gray-400 dark:text-dark-text-tertiary hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200"
          title="Drag to reorder"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300 transition-colors duration-200">📚 Company #{index + 1}</h3>
            <button
              type="button"
              onClick={onRemove}
              className="text-red-600 hover:text-red-800 text-sm font-semibold transition-colors duration-200"
            >
              Remove Company
            </button>
          </div>

          {/* Company Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={experience.company}
                onChange={e => onUpdate({ ...experience, company: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                placeholder="Company name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                value={experience.startDate}
                onChange={e => onUpdate({ ...experience, startDate: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                End Date
              </label>
              <input
                type="month"
                value={experience.endDate || ''}
                onChange={e => onUpdate({ ...experience, endDate: e.target.value, isCurrentlyWorking: false })}
                disabled={experience.isCurrentlyWorking}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-dark-text-primary disabled:bg-gray-100 dark:disabled:bg-dark-bg-secondary disabled:cursor-not-allowed transition-colors duration-200"
                placeholder="Leave empty if current"
              />
              <label className="flex items-center mt-2 text-sm text-gray-700 dark:text-dark-text-secondary cursor-pointer transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={experience.isCurrentlyWorking || false}
                  onChange={e => onUpdate({ ...experience, isCurrentlyWorking: e.target.checked, endDate: e.target.checked ? '' : experience.endDate })}
                  className="mr-2 w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-400"
                />
                재직중 (Currently Working)
              </label>
            </div>
          </div>

          {/* Experience Duration */}
          {experience.startDate && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-dark-bg-card border border-amber-200 dark:border-dark-border-default rounded-lg transition-colors duration-200">
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-300 transition-colors duration-200">
                경력 기간: {(() => {
                  const duration = calculateExperienceDuration(
                    experience.startDate,
                    experience.endDate,
                    experience.isCurrentlyWorking
                  );
                  return `${duration.years}년 ${duration.months}개월`;
                })()}
              </span>
            </div>
          )}

          {/* Final Position and Job Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                직책 / Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={experience.finalPosition}
                onChange={e => onUpdate({ ...experience, finalPosition: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                placeholder="e.g., Backend Team Lead"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                직급 / Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={experience.jobTitle}
                onChange={e => onUpdate({ ...experience, jobTitle: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                placeholder="e.g., Senior Developer"
              />
            </div>
          </div>

          {/* Projects Section */}
          <div className="mt-6 border-t border-amber-200 dark:border-dark-border-default pt-4 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 transition-colors duration-200">
                📁 Projects at this company
              </h4>
              <button
                type="button"
                onClick={addProject}
                className="px-3 py-1.5 bg-amber-600 dark:bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors duration-200 font-semibold"
              >
                + Add Project
              </button>
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
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-dark-text-tertiary text-sm bg-white dark:bg-dark-bg-elevated rounded-lg border border-dashed border-amber-200 dark:border-dark-border-default transition-colors duration-200">
                <p>No projects added yet. Click "Add Project" to add projects at this company.</p>
              </div>
            )}
          </div>
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
}) {
  // Local state for tech stack input to allow free-form typing
  const [techStackInput, setTechStackInput] = useState(project.techStack.join(', '));

  // Update local state when project changes externally
  useEffect(() => {
    setTechStackInput(project.techStack.join(', '));
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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div ref={setNodeRef} style={style} className="border border-amber-300 dark:border-dark-border-strong rounded-lg bg-white dark:bg-dark-bg-elevated transition-colors duration-200">
      {/* Project Header */}
      <div className="flex items-center gap-3 p-4 bg-amber-50/50 dark:bg-dark-bg-card transition-colors duration-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-400 dark:text-dark-text-tertiary hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center justify-between text-left transition-colors duration-200"
        >
          <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2 transition-colors duration-200">
            📖 Project #{projectIndex + 1}
            {project.name && <span className="font-normal text-gray-700 dark:text-dark-text-secondary transition-colors duration-200">- {project.name}</span>}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-dark-text-tertiary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-xs font-semibold transition-colors duration-200"
        >
          Remove
        </button>
      </div>

      {/* Project Details (Collapsible) */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Project Basic Info */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={project.name}
                onChange={e => onUpdate({ ...project, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                placeholder="e.g., E-Commerce Platform Rebuild"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={project.startDate}
                  onChange={e => onUpdate({ ...project, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                  End Date
                </label>
                <input
                  type="month"
                  value={project.endDate || ''}
                  onChange={e => onUpdate({ ...project, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                  placeholder="Leave empty if ongoing"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={project.description}
                onChange={e => onUpdate({ ...project, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                placeholder="Brief project description..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                Your Role
              </label>
              <input
                type="text"
                value={project.role || ''}
                onChange={e => onUpdate({ ...project, role: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                placeholder="e.g., Lead Backend Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                Tech Stack (comma-separated)
              </label>
              <input
                type="text"
                value={techStackInput}
                onChange={e => setTechStackInput(e.target.value)}
                onBlur={e => {
                  const parsed = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  onUpdate({ ...project, techStack: parsed });
                  setTechStackInput(parsed.join(', '));
                }}
                className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                placeholder="e.g., NestJS, React, PostgreSQL"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                  Project URL
                </label>
                <input
                  type="url"
                  value={project.url || ''}
                  onChange={e => onUpdate({ ...project, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 transition-colors duration-200">
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={project.githubUrl || ''}
                  onChange={e => onUpdate({ ...project, githubUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 dark:text-dark-text-primary transition-colors duration-200"
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
          </div>

          {/* Key Achievements */}
          <div className="border-t border-amber-200 dark:border-dark-border-default pt-4 transition-colors duration-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 transition-colors duration-200">
                ⭐ Key Achievements
                <span className="text-xs text-gray-500 dark:text-dark-text-tertiary font-normal transition-colors duration-200">(4 depth levels)</span>
              </label>
              <button
                type="button"
                onClick={onAddAchievement}
                className="px-2 py-1 bg-amber-600 dark:bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors duration-200"
              >
                + Add Achievement
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
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary italic transition-colors duration-200">No achievements yet. Click "Add Achievement" to add.</p>
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
}: {
  achievement: ProjectAchievement;
  depth: number;
  onUpdate: (achievement: ProjectAchievement) => void;
  onRemove: () => void;
  onAddChild: () => void;
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

  return (
    <div className="space-y-2">
      <div
        className="flex items-start gap-2 bg-amber-50/30 dark:bg-dark-bg-card rounded-lg p-2 border border-amber-100 dark:border-dark-border-subtle transition-colors duration-200"
        style={{
          marginLeft: `${(depth - 1) * 1.5}rem`,
          maxWidth: `calc(100% - ${(depth - 1) * 1.5}rem)`
        }}
      >
        <div className="flex items-center gap-1 min-w-[60px] flex-shrink-0">
          <span className="text-gray-600 dark:text-dark-text-secondary font-bold text-sm select-none transition-colors duration-200">
            {getBulletSymbol(depth)}
          </span>
          <span className="text-xs text-gray-500 dark:text-dark-text-tertiary transition-colors duration-200">({depth})</span>
        </div>

        <input
          type="text"
          value={achievement.content}
          onChange={e => onUpdate({ ...achievement, content: e.target.value })}
          className="flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none text-sm text-gray-900 dark:text-dark-text-primary min-w-0 transition-colors duration-200"
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          placeholder="Achievement description..."
        />

        <div className="flex items-center gap-1">
          {depth < 4 && (
            <button
              type="button"
              onClick={onAddChild}
              className="px-2 py-1 bg-green-50 border border-green-300 text-green-700 text-xs rounded hover:bg-green-100 transition-colors duration-200 font-semibold whitespace-nowrap"
              title="Add sub-item"
            >
              + 하위
            </button>
          )}

          {(achievement.children && achievement.children.length > 0) && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 text-xs text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary transition-colors duration-200"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 text-xs font-semibold transition-colors duration-200"
            title="Remove"
          >
            ✕
          </button>
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
}: {
  achievement: ProjectAchievement;
  achIndex: number;
  onUpdate: (achievement: ProjectAchievement) => void;
  onRemove: () => void;
  onAddChild: () => void;
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
      <div className="flex items-start gap-2 bg-white dark:bg-dark-bg-elevated rounded-lg p-2 border border-amber-200 dark:border-dark-border-default transition-colors duration-200">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-move text-gray-400 dark:text-dark-text-tertiary hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200 flex-shrink-0"
          title="Drag to reorder"
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
          />
        </div>
      </div>
    </div>
  );
}

// Main Experience Section Component
export default function ExperienceSection({ experiences, onChange, t }: ExperienceSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
    <div className="bg-white dark:bg-dark-bg-elevated border border-gray-200 dark:border-dark-border-subtle rounded-2xl shadow-sm p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-2 transition-colors duration-200">
            💼 {t('resume.sections.experience')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1 transition-colors duration-200">{t('resume.descriptions.experience')}</p>
        </div>
        <button
          type="button"
          onClick={addExperience}
          className="px-4 py-2 bg-amber-700 dark:bg-amber-600 text-white rounded-lg hover:bg-amber-800 dark:hover:bg-amber-700 transition-colors duration-200 font-semibold"
        >
          + Add Experience
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
            <div className="space-y-6">
              {experiences.map((exp, index) => (
                <SortableExperienceCard
                  key={exp.id || `exp-${index}`}
                  experience={exp}
                  index={index}
                  onUpdate={(e) => updateExperience(index, e)}
                  onRemove={() => removeExperience(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-dark-text-tertiary transition-colors duration-200">
          <p>No work experience added yet. Click "Add Experience" to get started.</p>
        </div>
      )}
    </div>
  );
}
