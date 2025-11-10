import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Resume,
  CreateResumeDto,
  PaperSize,
  AttachmentType,
  ResumeAttachment,
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  SectionType,
} from '../../api/resume';
import SectionOrderManager from './SectionOrderManager';

interface ResumeFormProps {
  resume: Resume | null;
  onSubmit: (data: CreateResumeDto) => Promise<void>;
  onChange?: (data: CreateResumeDto) => void;
}

export default function ResumeForm({ resume, onSubmit, onChange }: ResumeFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateResumeDto>({
    title: resume?.title || 'My Resume',
    description: resume?.description || '',
    isDefault: resume?.isDefault || false,
    paperSize: resume?.paperSize || 'A4',
    name: resume?.name || '',
    email: resume?.email || '',
    phone: resume?.phone || '',
    github: resume?.github || '',
    blog: resume?.blog || '',
    linkedin: resume?.linkedin || '',
    portfolio: resume?.portfolio || '',
    summary: resume?.summary || '',
    profileImage: resume?.profileImage || '',
    militaryService: resume?.militaryService,
    militaryDischarge: resume?.militaryDischarge || '',
    coverLetter: resume?.coverLetter || '',
    careerGoals: resume?.careerGoals || '',
    skills: resume?.skills?.map(s => ({ category: s.category, items: s.items, order: s.order, visible: s.visible })) || [],
    experiences: resume?.experiences?.map(e => ({
      company: e.company,
      startDate: e.startDate,
      endDate: e.endDate,
      roles: e.roles?.map(r => ({
        title: r.title,
        tasks: r.tasks || [],
        order: r.order,
      })) || [],
      order: e.order,
      visible: e.visible,
    })) || [],
    projects: resume?.projects?.map(p => ({
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      description: p.description,
      role: p.role,
      achievements: p.achievements,
      techStack: p.techStack,
      url: p.url,
      githubUrl: p.githubUrl,
      order: p.order,
      visible: p.visible,
    })) || [],
    educations: resume?.educations?.map(e => ({
      school: e.school,
      major: e.major,
      degree: e.degree,
      startDate: e.startDate,
      endDate: e.endDate,
      gpa: e.gpa,
      order: e.order,
      visible: e.visible,
    })) || [],
    certificates: resume?.certificates?.map(c => ({
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
      order: c.order,
      visible: c.visible,
    })) || [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<ResumeAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Section ordering
  const [sections, setSections] = useState(
    resume?.sections?.sort((a, b) => a.order - b.order) || [
      { id: '1', type: SectionType.SKILLS, order: 0, visible: true },
      { id: '2', type: SectionType.EXPERIENCE, order: 1, visible: true },
      { id: '3', type: SectionType.PROJECT, order: 2, visible: true },
      { id: '4', type: SectionType.EDUCATION, order: 3, visible: true },
      { id: '5', type: SectionType.CERTIFICATE, order: 4, visible: true },
    ]
  );

  // Trigger onChange when formData or sections change
  useEffect(() => {
    if (onChange) {
      onChange(formData);
    }
  }, [formData, sections, onChange]);

  // Load attachments if resume exists
  useEffect(() => {
    if (resume?.id) {
      loadAttachments();
    }
  }, [resume?.id]);

  const loadAttachments = async () => {
    if (!resume?.id) return;
    try {
      const data = await getAttachments(resume.id);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleFileUpload = async (file: File, type: AttachmentType) => {
    if (!resume?.id) {
      setUploadError('Please save the resume first before uploading files');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const attachment = await uploadAttachment(resume.id, file, type);
      setAttachments([...attachments, attachment]);
    } catch (error: any) {
      setUploadError(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!resume?.id) return;

    try {
      await deleteAttachment(resume.id, attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  };

  const getAttachmentsByType = (type: AttachmentType) =>
    attachments.filter(a => a.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resume Settings */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ {t('resume.sections.settings')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Resume Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="e.g., For Tech Companies, For Startups"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Paper Size <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paperSize}
              onChange={e => setFormData({ ...formData, paperSize: e.target.value as PaperSize })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="LETTER">Letter (8.5 × 11 in)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="Brief description of this resume"
          />
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-amber-900 mb-4">📋 {t('resume.sections.basicInfo')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="Hong Gildong"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="hong@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="010-1234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              GitHub
            </label>
            <input
              type="url"
              value={formData.github || ''}
              onChange={e => setFormData({ ...formData, github: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="https://github.com/username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Blog
            </label>
            <input
              type="url"
              value={formData.blog || ''}
              onChange={e => setFormData({ ...formData, blog: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="https://blog.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.linkedin || ''}
              onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="https://linkedin.com/in/username"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Profile Photo URL
          </label>
          <input
            type="url"
            value={formData.profileImage || ''}
            onChange={e => setFormData({ ...formData, profileImage: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="https://example.com/photo.jpg (or upload below)"
          />
          <p className="text-xs text-gray-500 mt-1">
            You can also upload a photo in the Attachments section below
          </p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Military Service (Korean)
          </label>
          <select
            value={formData.militaryService || ''}
            onChange={e => setFormData({ ...formData, militaryService: e.target.value as any })}
            className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
          >
            <option value="">Select status</option>
            <option value="COMPLETED">Completed (군필)</option>
            <option value="EXEMPTED">Exempted (면제)</option>
            <option value="NOT_APPLICABLE">Not Applicable (해당없음)</option>
          </select>
        </div>
        {formData.militaryService === 'COMPLETED' && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Military Discharge Details
            </label>
            <input
              type="text"
              value={formData.militaryDischarge || ''}
              onChange={e => setFormData({ ...formData, militaryDischarge: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
              placeholder="예: 병장 제대, 2020.01 - 2021.10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter rank and service period (e.g., "병장 제대", "2020.01 - 2021.10")
            </p>
          </div>
        )}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Summary
          </label>
          <textarea
            value={formData.summary || ''}
            onChange={e => setFormData({ ...formData, summary: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="Brief introduction about yourself..."
          />
        </div>
      </div>

      {/* Korean-specific sections */}
      <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-amber-900 mb-4">📝 Korean Resume Sections</h2>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cover Letter (자기소개서)
          </label>
          <textarea
            value={formData.coverLetter || ''}
            onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
            rows={8}
            className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="Write about your background, strengths, and why you're a good fit for this position..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Describe your background, experiences, and what makes you unique
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Career Goals (입사 후 포부)
          </label>
          <textarea
            value={formData.careerGoals || ''}
            onChange={e => setFormData({ ...formData, careerGoals: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
            placeholder="Describe what you want to achieve after joining the company..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Share your aspirations and what you hope to accomplish in this role
          </p>
        </div>
      </div>

      {/* Work Experience Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">💼 {t('resume.sections.experience')}</h2>
            <p className="text-sm text-gray-600">{t('resume.descriptions.experience')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                experiences: [
                  ...(formData.experiences || []),
                  {
                    company: '',
                    startDate: '',
                    endDate: '',
                    roles: [],
                    order: formData.experiences?.length || 0,
                    visible: true,
                  },
                ],
              });
            }}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-all font-semibold"
          >
            + Add Experience
          </button>
        </div>

        {formData.experiences && formData.experiences.length > 0 ? (
          <div className="space-y-6">
            {formData.experiences.map((exp, expIndex) => (
              <div key={expIndex} className="border border-gray-200 rounded-lg p-4 bg-amber-50/30">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Company #{expIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newExperiences = formData.experiences?.filter((_, i) => i !== expIndex);
                      setFormData({ ...formData, experiences: newExperiences });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove Company
                  </button>
                </div>

                {/* Company Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={e => {
                        const newExperiences = [...(formData.experiences || [])];
                        newExperiences[expIndex] = { ...newExperiences[expIndex], company: e.target.value };
                        setFormData({ ...formData, experiences: newExperiences });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="Company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={exp.startDate}
                      onChange={e => {
                        const newExperiences = [...(formData.experiences || [])];
                        newExperiences[expIndex] = { ...newExperiences[expIndex], startDate: e.target.value };
                        setFormData({ ...formData, experiences: newExperiences });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="month"
                      value={exp.endDate || ''}
                      onChange={e => {
                        const newExperiences = [...(formData.experiences || [])];
                        newExperiences[expIndex] = { ...newExperiences[expIndex], endDate: e.target.value };
                        setFormData({ ...formData, experiences: newExperiences });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="Leave empty if current"
                    />
                  </div>
                </div>

                {/* Roles Section */}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-amber-900">Roles / Positions</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newExperiences = [...(formData.experiences || [])];
                        const currentRoles = newExperiences[expIndex].roles || [];
                        newExperiences[expIndex] = {
                          ...newExperiences[expIndex],
                          roles: [
                            ...currentRoles,
                            {
                              title: '',
                              tasks: [],
                              order: currentRoles.length,
                            },
                          ],
                        };
                        setFormData({ ...formData, experiences: newExperiences });
                      }}
                      className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-all"
                    >
                      + Add Role
                    </button>
                  </div>

                  {exp.roles && exp.roles.length > 0 ? (
                    <div className="space-y-4">
                      {exp.roles.map((role, roleIndex) => (
                        <div key={roleIndex} className="border border-amber-200 rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Role Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={role.title}
                                onChange={e => {
                                  const newExperiences = [...(formData.experiences || [])];
                                  const newRoles = [...(newExperiences[expIndex].roles || [])];
                                  newRoles[roleIndex] = { ...newRoles[roleIndex], title: e.target.value };
                                  newExperiences[expIndex] = { ...newExperiences[expIndex], roles: newRoles };
                                  setFormData({ ...formData, experiences: newExperiences });
                                }}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900"
                                placeholder="e.g., Senior Backend Developer"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newExperiences = [...(formData.experiences || [])];
                                const newRoles = newExperiences[expIndex].roles?.filter((_, i) => i !== roleIndex);
                                newExperiences[expIndex] = { ...newExperiences[expIndex], roles: newRoles };
                                setFormData({ ...formData, experiences: newExperiences });
                              }}
                              className="ml-2 text-red-600 hover:text-red-800 text-sm font-semibold"
                            >
                              Remove Role
                            </button>
                          </div>

                          {/* Tasks - Hierarchical Structure */}
                          <div className="mt-3 border-t border-gray-200 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Tasks (use depth 1-4 for indentation)
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newExperiences = [...(formData.experiences || [])];
                                  const newRoles = [...(newExperiences[expIndex].roles || [])];
                                  const currentTasks = newRoles[roleIndex].tasks || [];
                                  newRoles[roleIndex] = {
                                    ...newRoles[roleIndex],
                                    tasks: [
                                      ...currentTasks,
                                      {
                                        content: '',
                                        depth: 1,
                                        order: currentTasks.length,
                                      },
                                    ],
                                  };
                                  newExperiences[expIndex] = { ...newExperiences[expIndex], roles: newRoles };
                                  setFormData({ ...formData, experiences: newExperiences });
                                }}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                + Add Task
                              </button>
                            </div>

                            {role.tasks && role.tasks.length > 0 ? (
                              <div className="space-y-2">
                                {role.tasks.map((task: any, taskIndex: number) => (
                                  <div key={taskIndex} className="flex items-start gap-2">
                                    <select
                                      value={task.depth}
                                      onChange={e => {
                                        const newExperiences = [...(formData.experiences || [])];
                                        const newRoles = [...(newExperiences[expIndex].roles || [])];
                                        const newTasks = [...(newRoles[roleIndex].tasks || [])];
                                        newTasks[taskIndex] = { ...newTasks[taskIndex], depth: parseInt(e.target.value) };
                                        newRoles[roleIndex] = { ...newRoles[roleIndex], tasks: newTasks };
                                        newExperiences[expIndex] = { ...newExperiences[expIndex], roles: newRoles };
                                        setFormData({ ...formData, experiences: newExperiences });
                                      }}
                                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                                      title="Indentation depth"
                                    >
                                      <option value="1">-</option>
                                      <option value="2">--</option>
                                      <option value="3">---</option>
                                      <option value="4">----</option>
                                    </select>
                                    <input
                                      type="text"
                                      value={task.content}
                                      onChange={e => {
                                        const newExperiences = [...(formData.experiences || [])];
                                        const newRoles = [...(newExperiences[expIndex].roles || [])];
                                        const newTasks = [...(newRoles[roleIndex].tasks || [])];
                                        newTasks[taskIndex] = { ...newTasks[taskIndex], content: e.target.value };
                                        newRoles[roleIndex] = { ...newRoles[roleIndex], tasks: newTasks };
                                        newExperiences[expIndex] = { ...newExperiences[expIndex], roles: newRoles };
                                        setFormData({ ...formData, experiences: newExperiences });
                                      }}
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                      placeholder="Task description"
                                      style={{ marginLeft: `${(task.depth - 1) * 1.5}rem` }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newExperiences = [...(formData.experiences || [])];
                                        const newRoles = [...(newExperiences[expIndex].roles || [])];
                                        const newTasks = newRoles[roleIndex].tasks?.filter((_: any, i: number) => i !== taskIndex);
                                        newRoles[roleIndex] = { ...newRoles[roleIndex], tasks: newTasks };
                                        newExperiences[expIndex] = { ...newExperiences[expIndex], roles: newRoles };
                                        setFormData({ ...formData, experiences: newExperiences });
                                      }}
                                      className="text-red-600 hover:text-red-800 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">No tasks yet. Click "Add Task" to add work details.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <p>No roles added yet. Click "Add Role" to add your positions at this company.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No work experience added yet. Click "Add Experience" to get started.</p>
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🚀 {t('resume.sections.projects')}</h2>
            <p className="text-sm text-gray-600">{t('resume.descriptions.projects')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                projects: [
                  ...(formData.projects || []),
                  {
                    name: '',
                    startDate: '',
                    endDate: '',
                    description: '',
                    role: '',
                    achievements: [],
                    techStack: [],
                    url: '',
                    githubUrl: '',
                    order: formData.projects?.length || 0,
                    visible: true,
                  },
                ],
              });
            }}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-all font-semibold"
          >
            + Add Project
          </button>
        </div>

        {formData.projects && formData.projects.length > 0 ? (
          <div className="space-y-4">
            {formData.projects.map((project, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Project #{index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newProjects = formData.projects?.filter((_, i) => i !== index);
                      setFormData({ ...formData, projects: newProjects });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={e => {
                        const newProjects = [...(formData.projects || [])];
                        newProjects[index] = { ...newProjects[index], name: e.target.value };
                        setFormData({ ...formData, projects: newProjects });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., E-commerce Platform"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Role
                    </label>
                    <input
                      type="text"
                      value={project.role || ''}
                      onChange={e => {
                        const newProjects = [...(formData.projects || [])];
                        newProjects[index] = { ...newProjects[index], role: e.target.value };
                        setFormData({ ...formData, projects: newProjects });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., Lead Developer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={project.startDate}
                      onChange={e => {
                        const newProjects = [...(formData.projects || [])];
                        newProjects[index] = { ...newProjects[index], startDate: e.target.value };
                        setFormData({ ...formData, projects: newProjects });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="month"
                      value={project.endDate || ''}
                      onChange={e => {
                        const newProjects = [...(formData.projects || [])];
                        newProjects[index] = { ...newProjects[index], endDate: e.target.value };
                        setFormData({ ...formData, projects: newProjects });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="Leave empty if ongoing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Demo URL
                    </label>
                    <input
                      type="url"
                      value={project.url || ''}
                      onChange={e => {
                        const newProjects = [...(formData.projects || [])];
                        newProjects[index] = { ...newProjects[index], url: e.target.value };
                        setFormData({ ...formData, projects: newProjects });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="https://demo.example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      value={project.githubUrl || ''}
                      onChange={e => {
                        const newProjects = [...(formData.projects || [])];
                        newProjects[index] = { ...newProjects[index], githubUrl: e.target.value };
                        setFormData({ ...formData, projects: newProjects });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="https://github.com/username/repo"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={project.description}
                    onChange={e => {
                      const newProjects = [...(formData.projects || [])];
                      newProjects[index] = { ...newProjects[index], description: e.target.value };
                      setFormData({ ...formData, projects: newProjects });
                    }}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                    placeholder="Brief description of the project"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tech Stack
                  </label>
                  <input
                    type="text"
                    value={project.techStack?.join(', ') || ''}
                    onChange={e => {
                      const newProjects = [...(formData.projects || [])];
                      newProjects[index] = {
                        ...newProjects[index],
                        techStack: e.target.value.split(',').map(s => s.trim()).filter(s => s),
                      };
                      setFormData({ ...formData, projects: newProjects });
                    }}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                    placeholder="React, Node.js, MongoDB (comma-separated)"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Key Achievements (one per line)
                  </label>
                  <textarea
                    value={project.achievements?.join('\n') || ''}
                    onChange={e => {
                      const newProjects = [...(formData.projects || [])];
                      newProjects[index] = {
                        ...newProjects[index],
                        achievements: e.target.value.split('\n').filter(s => s.trim()),
                      };
                      setFormData({ ...formData, projects: newProjects });
                    }}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                    placeholder="Reduced load time by 40%&#10;Implemented real-time features&#10;10,000+ active users"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No projects added yet. Click "Add Project" to get started.</p>
          </div>
        )}
      </div>

      {/* Skills Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">⚡ {t('resume.sections.skills')}</h2>
            <p className="text-sm text-gray-600">{t('resume.descriptions.skills')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                skills: [
                  ...(formData.skills || []),
                  {
                    category: '',
                    items: [],
                    order: formData.skills?.length || 0,
                    visible: true,
                  },
                ],
              });
            }}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-all font-semibold"
          >
            + Add Skill Category
          </button>
        </div>

        {formData.skills && formData.skills.length > 0 ? (
          <div className="space-y-4">
            {formData.skills.map((skill, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Skill Category #{index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newSkills = formData.skills?.filter((_, i) => i !== index);
                      setFormData({ ...formData, skills: newSkills });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={skill.category}
                      onChange={e => {
                        const newSkills = [...(formData.skills || [])];
                        newSkills[index] = { ...newSkills[index], category: e.target.value };
                        setFormData({ ...formData, skills: newSkills });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., Frontend, Backend, DevOps"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Skills <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={skill.items?.join(', ') || ''}
                      onChange={e => {
                        const newSkills = [...(formData.skills || [])];
                        newSkills[index] = {
                          ...newSkills[index],
                          items: e.target.value.split(',').map(s => s.trim()).filter(s => s),
                        };
                        setFormData({ ...formData, skills: newSkills });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="React, TypeScript, Next.js (comma-separated)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No skills added yet. Click "Add Skill Category" to get started.</p>
          </div>
        )}
      </div>

      {/* Education Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🎓 {t('resume.sections.education')}</h2>
            <p className="text-sm text-gray-600">{t('resume.descriptions.education')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                educations: [
                  ...(formData.educations || []),
                  {
                    school: '',
                    major: '',
                    degree: '',
                    startDate: '',
                    endDate: '',
                    gpa: '',
                    order: formData.educations?.length || 0,
                    visible: true,
                  },
                ],
              });
            }}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-all font-semibold"
          >
            + Add Education
          </button>
        </div>

        {formData.educations && formData.educations.length > 0 ? (
          <div className="space-y-4">
            {formData.educations.map((edu, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Education #{index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newEducations = formData.educations?.filter((_, i) => i !== index);
                      setFormData({ ...formData, educations: newEducations });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      School <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={edu.school}
                      onChange={e => {
                        const newEducations = [...(formData.educations || [])];
                        newEducations[index] = { ...newEducations[index], school: e.target.value };
                        setFormData({ ...formData, educations: newEducations });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="University name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Major <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={edu.major}
                      onChange={e => {
                        const newEducations = [...(formData.educations || [])];
                        newEducations[index] = { ...newEducations[index], major: e.target.value };
                        setFormData({ ...formData, educations: newEducations });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., Computer Science"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Degree <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={e => {
                        const newEducations = [...(formData.educations || [])];
                        newEducations[index] = { ...newEducations[index], degree: e.target.value };
                        setFormData({ ...formData, educations: newEducations });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., Bachelor, Master, PhD"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      GPA
                    </label>
                    <input
                      type="text"
                      value={edu.gpa || ''}
                      onChange={e => {
                        const newEducations = [...(formData.educations || [])];
                        newEducations[index] = { ...newEducations[index], gpa: e.target.value };
                        setFormData({ ...formData, educations: newEducations });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., 3.8/4.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={edu.startDate}
                      onChange={e => {
                        const newEducations = [...(formData.educations || [])];
                        newEducations[index] = { ...newEducations[index], startDate: e.target.value };
                        setFormData({ ...formData, educations: newEducations });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="month"
                      value={edu.endDate || ''}
                      onChange={e => {
                        const newEducations = [...(formData.educations || [])];
                        newEducations[index] = { ...newEducations[index], endDate: e.target.value };
                        setFormData({ ...formData, educations: newEducations });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="Leave empty if current"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No education added yet. Click "Add Education" to get started.</p>
          </div>
        )}
      </div>

      {/* Certificates Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🏆 {t('resume.sections.certifications')}</h2>
            <p className="text-sm text-gray-600">{t('resume.descriptions.certifications')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                certificates: [
                  ...(formData.certificates || []),
                  {
                    name: '',
                    issuer: '',
                    issueDate: '',
                    expiryDate: '',
                    credentialId: '',
                    credentialUrl: '',
                    order: formData.certificates?.length || 0,
                    visible: true,
                  },
                ],
              });
            }}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-all font-semibold"
          >
            + Add Certificate
          </button>
        </div>

        {formData.certificates && formData.certificates.length > 0 ? (
          <div className="space-y-4">
            {formData.certificates.map((cert, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Certificate #{index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newCertificates = formData.certificates?.filter((_, i) => i !== index);
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Certificate Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cert.name}
                      onChange={e => {
                        const newCertificates = [...(formData.certificates || [])];
                        newCertificates[index] = { ...newCertificates[index], name: e.target.value };
                        setFormData({ ...formData, certificates: newCertificates });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., AWS Certified Solutions Architect"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Issuer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cert.issuer}
                      onChange={e => {
                        const newCertificates = [...(formData.certificates || [])];
                        newCertificates[index] = { ...newCertificates[index], issuer: e.target.value };
                        setFormData({ ...formData, certificates: newCertificates });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="e.g., Amazon Web Services"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Issue Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={cert.issueDate}
                      onChange={e => {
                        const newCertificates = [...(formData.certificates || [])];
                        newCertificates[index] = { ...newCertificates[index], issueDate: e.target.value };
                        setFormData({ ...formData, certificates: newCertificates });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="month"
                      value={cert.expiryDate || ''}
                      onChange={e => {
                        const newCertificates = [...(formData.certificates || [])];
                        newCertificates[index] = { ...newCertificates[index], expiryDate: e.target.value };
                        setFormData({ ...formData, certificates: newCertificates });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="Leave empty if no expiry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Credential ID
                    </label>
                    <input
                      type="text"
                      value={cert.credentialId || ''}
                      onChange={e => {
                        const newCertificates = [...(formData.certificates || [])];
                        newCertificates[index] = { ...newCertificates[index], credentialId: e.target.value };
                        setFormData({ ...formData, certificates: newCertificates });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="Credential ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Credential URL
                    </label>
                    <input
                      type="url"
                      value={cert.credentialUrl || ''}
                      onChange={e => {
                        const newCertificates = [...(formData.certificates || [])];
                        newCertificates[index] = { ...newCertificates[index], credentialUrl: e.target.value };
                        setFormData({ ...formData, certificates: newCertificates });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                      placeholder="https://verify.example.com"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No certifications added yet. Click "Add Certificate" to get started.</p>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">📎 Attachments</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload profile photo (grayscale), portfolios, and certificates. Max size: 10MB per file.
        </p>

        {!resume?.id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              💡 Please save your resume first to enable file uploads.
            </p>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              ⚠️ {uploadError}
            </p>
          </div>
        )}

        {/* Profile Photo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📷 Profile Photo</h3>
          <p className="text-sm text-gray-600 mb-3">
            Professional photo (automatically converted to grayscale)
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PROFILE_PHOTO).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {attachment.fileUrl && (
                    <img
                      src={attachment.fileUrl}
                      alt="Profile"
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            <label className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*"
                disabled={!resume?.id || uploading}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], AttachmentType.PROFILE_PHOTO)}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
                <p className="text-sm text-gray-600">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload profile photo'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Portfolio Files */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🎨 Portfolio</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload your project screenshots, designs, or PDF documents
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PORTFOLIO).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
                  {attachment.title && <p className="text-xs text-gray-700 mt-1">{attachment.title}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            <label className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!resume?.id || uploading}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], AttachmentType.PORTFOLIO)}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
                <p className="text-sm text-gray-600">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload portfolio file'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Certificate Files */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🏆 Certificates</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload your certification or award documents
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.CERTIFICATE).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
                  {attachment.title && <p className="text-xs text-gray-700 mt-1">{attachment.title}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            <label className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!resume?.id || uploading}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], AttachmentType.CERTIFICATE)}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
                <p className="text-sm text-gray-600">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload certificate'}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Section Order Manager */}
      {resume?.id && (
        <SectionOrderManager
          sections={sections}
          onReorder={(newSections) => {
            setSections(newSections);
            // Update will be saved when form is submitted
          }}
        />
      )}

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold border border-gray-300 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '💾 Saving...' : '💾 Save & Preview'}
        </button>
      </div>
    </form>
  );
}
