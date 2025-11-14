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
import ExperienceSection from './ExperienceSection';
import EducationSection from './EducationSection';
import HierarchicalDescription, { HierarchicalItem } from './HierarchicalDescription';

interface ResumeFormProps {
  resume: Resume | null;
  onSubmit: (data: CreateResumeDto) => Promise<void>;
  onChange?: (data: CreateResumeDto) => void;
}

// Collapsible Section Header Component
interface CollapsibleHeaderProps {
  title: string;
  icon: string;
  isCollapsed: boolean;
  onToggle: () => void;
  count?: number;
}

function CollapsibleHeader({ title, icon, isCollapsed, onToggle, count }: CollapsibleHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-amber-900 dark:text-dark-text-primary">
          {icon} {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full">
            {count}
          </span>
        )}
      </div>
      <svg
        className={`w-5 h-5 text-amber-900 dark:text-dark-text-primary transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export default function ResumeForm({ resume, onSubmit, onChange }: ResumeFormProps) {
  const { t } = useTranslation();

  // Collapsible section states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    basicInfo: false,
    skills: false,
    experience: false,
    education: false,
    certificates: false,
    military: false,
    coverLetter: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [formData, setFormData] = useState<CreateResumeDto>({
    title: resume?.title || 'My Resume',
    description: resume?.description || '',
    isDefault: resume?.isDefault || false,
    paperSize: resume?.paperSize || 'A4',
    name: resume?.name || '',
    email: resume?.email || '',
    phone: resume?.phone || '',
    address: resume?.address || '',
    github: resume?.github || '',
    blog: resume?.blog || '',
    linkedin: resume?.linkedin || '',
    portfolio: resume?.portfolio || '',
    summary: resume?.summary || '',
    profileImage: resume?.profileImage || '',
    militaryService: resume?.militaryService,
    militaryDischarge: resume?.militaryDischarge || '',
    militaryRank: resume?.militaryRank || '',
    militaryDischargeType: resume?.militaryDischargeType || '',
    militaryServiceStartDate: resume?.militaryServiceStartDate || '',
    militaryServiceEndDate: resume?.militaryServiceEndDate || '',
    coverLetter: resume?.coverLetter || '',
    applicationReason: resume?.applicationReason || '',
    skills: resume?.skills?.map(s => ({
      category: s.category,
      items: s.items?.map((item: any) =>
        typeof item === 'string'
          ? { name: item, description: '' }
          : item
      ) || [],
      order: s.order,
      visible: s.visible
    })) || [],
    experiences: resume?.experiences?.map(e => ({
      company: e.company,
      startDate: e.startDate,
      endDate: e.endDate,
      finalPosition: e.finalPosition,
      jobTitle: e.jobTitle,
      projects: e.projects?.map(p => ({
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        description: p.description,
        role: p.role,
        achievements: p.achievements || [],
        techStack: p.techStack || [],
        url: p.url,
        githubUrl: p.githubUrl,
        order: p.order,
      })) || [],
      order: e.order,
      visible: e.visible,
    })) || [],
    // NOTE: Independent projects field removed - projects are now only handled as nested ExperienceProject within experiences
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
  const [draftSaved, setDraftSaved] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Load draft from localStorage on mount
  useEffect(() => {
    const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft && !resume) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        // Remove projects field if it exists in old drafts
        const { projects, ...cleanDraft } = parsedDraft;
        setFormData(cleanDraft);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save (3 seconds after last change)
    const timeout = setTimeout(() => {
      const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setDraftSaved(true);

      // Hide the "saved" message after 2 seconds
      setTimeout(() => setDraftSaved(false), 2000);
    }, 3000);

    setAutoSaveTimeout(timeout);

    // Cleanup on unmount
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData]);

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

  const handleSaveDraft = () => {
    const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
    localStorage.setItem(draftKey, JSON.stringify(formData));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleClearDraft = () => {
    if (confirm('저장된 내용을 삭제하시겠습니까?')) {
      const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
      localStorage.removeItem(draftKey);
      alert('저장 내용이 삭제되었습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Remove projects field before submitting (no longer supported by API)
      const { projects, ...dataToSubmit } = formData as any;
      await onSubmit(dataToSubmit);
      // Clear draft after successful submission
      const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
      localStorage.removeItem(draftKey);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resume Settings */}
      <div className="bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle rounded-2xl shadow-sm dark:shadow-dark-sm transition-colors duration-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">⚙️ {t('resume.sections.settings')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              Resume Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="e.g., For Tech Companies, For Startups"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              Paper Size <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paperSize}
              onChange={e => setFormData({ ...formData, paperSize: e.target.value as PaperSize })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="LETTER">Letter (8.5 × 11 in)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            Description
          </label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            placeholder="Brief description of this resume"
          />
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md transition-colors duration-200 p-6">
        <CollapsibleHeader
          title={t('resume.sections.basicInfo')}
          icon="📋"
          isCollapsed={collapsedSections.basicInfo}
          onToggle={() => toggleSection('basicInfo')}
        />
        {!collapsedSections.basicInfo && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="Hong Gildong"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="hong@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="010-1234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              {t('resume.address')}
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="서울특별시 강남구"
            />
            <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
              City/District level (e.g., "서울특별시 강남구" or "Seoul, Gangnam-gu")
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              GitHub
            </label>
            <input
              type="url"
              value={formData.github || ''}
              onChange={e => setFormData({ ...formData, github: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="https://github.com/username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              Blog
            </label>
            <input
              type="url"
              value={formData.blog || ''}
              onChange={e => setFormData({ ...formData, blog: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="https://blog.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.linkedin || ''}
              onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder="https://linkedin.com/in/username"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            Profile Photo URL
          </label>
          <input
            type="url"
            value={formData.profileImage || ''}
            onChange={e => setFormData({ ...formData, profileImage: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            placeholder="https://example.com/photo.jpg (or upload below)"
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            You can also upload a photo in the Attachments section below
          </p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            Military Service (Korean)
          </label>
          <select
            value={formData.militaryService || ''}
            onChange={e => setFormData({ ...formData, militaryService: e.target.value as any })}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
          >
            <option value="">Select status</option>
            <option value="COMPLETED">Completed (군필)</option>
            <option value="EXEMPTED">Exempted (면제)</option>
            <option value="NOT_APPLICABLE">Not Applicable (해당없음)</option>
          </select>
        </div>
        {formData.militaryService === 'COMPLETED' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                {t('resume.militaryService.rank')}
              </label>
              <select
                value={formData.militaryRank || ''}
                onChange={e => setFormData({ ...formData, militaryRank: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              >
                <option value="">선택</option>
                <option value="병장">병장 (Sergeant)</option>
                <option value="상병">상병 (Corporal)</option>
                <option value="일병">일병 (Private First Class)</option>
                <option value="이병">이병 (Private)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                {t('resume.militaryService.dischargeType')}
              </label>
              <select
                value={formData.militaryDischargeType || ''}
                onChange={e => setFormData({ ...formData, militaryDischargeType: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              >
                <option value="">선택</option>
                <option value="만기전역">만기전역 (Honorable Discharge)</option>
                <option value="의병전역">의병전역 (Medical Discharge)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                {t('resume.militaryService.servicePeriod')}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="month"
                  value={formData.militaryServiceStartDate || ''}
                  onChange={e => setFormData({ ...formData, militaryServiceStartDate: e.target.value })}
                  className="flex-1 px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                />
                <span className="text-gray-500 dark:text-dark-text-tertiary">~</span>
                <input
                  type="month"
                  value={formData.militaryServiceEndDate || ''}
                  onChange={e => setFormData({ ...formData, militaryServiceEndDate: e.target.value })}
                  className="flex-1 px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                YYYY-MM format (e.g., 2020-01 ~ 2021-10)
              </p>
            </div>
          </div>
        )}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            Summary
          </label>
          <textarea
            value={formData.summary || ''}
            onChange={e => setFormData({ ...formData, summary: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            placeholder="Brief introduction about yourself..."
          />
        </div>
        </>
        )}
      </div>

      {/* Korean-specific sections */}
      <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md transition-colors duration-200 p-6">
        <CollapsibleHeader
          title="Korean Resume Sections"
          icon="📝"
          isCollapsed={collapsedSections.coverLetter}
          onToggle={() => toggleSection('coverLetter')}
        />
        {!collapsedSections.coverLetter && (
        <>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            Cover Letter (자기소개서)
          </label>
          <textarea
            value={formData.coverLetter || ''}
            onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
            rows={8}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            placeholder="Write about your background, strengths, and why you're a good fit for this position..."
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            Describe your background, experiences, and what makes you unique
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            Application Reason (지원 동기)
          </label>
          <textarea
            value={formData.applicationReason || ''}
            onChange={e => setFormData({ ...formData, applicationReason: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            placeholder="귀사에 지원하게 된 동기와 이유를 작성해주세요..."
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            회사의 비전, 직무의 매력, 본인의 강점과의 연결성 등을 작성
          </p>
        </div>
        </>
        )}
      </div>

      {/* Work Experience Section */}
      <ExperienceSection
        experiences={formData.experiences || []}
        onChange={(experiences) => {
          setFormData({ ...formData, experiences });
          onChange?.({ ...formData, experiences });
        }}
        t={t}
      />

      {/* Skills Section */}
      <div className="bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle rounded-2xl shadow-sm dark:shadow-dark-sm transition-colors duration-200 p-6">
        <CollapsibleHeader
          title={t('resume.sections.skills')}
          icon="⚡"
          isCollapsed={collapsedSections.skills}
          onToggle={() => toggleSection('skills')}
          count={formData.skills?.length}
        />
        {!collapsedSections.skills && (
        <>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{t('resume.descriptions.skills')}</p>
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
            className="px-4 py-2 bg-amber-700 dark:bg-amber-600 hover:bg-amber-800 dark:hover:bg-amber-700 text-white dark:text-gray-900 rounded-lg transition-all font-semibold"
          >
            + 카테고리 추가
          </button>
        </div>

        {formData.skills && formData.skills.length > 0 ? (
          <div className="space-y-6">
            {formData.skills.map((skill, skillIndex) => (
              <div key={skillIndex} className="border border-amber-200 dark:border-dark-border-default rounded-lg p-5 bg-amber-50/20 dark:bg-dark-bg-elevated transition-colors duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">📚 카테고리 #{skillIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newSkills = formData.skills?.filter((_, i) => i !== skillIndex);
                      setFormData({ ...formData, skills: newSkills });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    삭제
                  </button>
                </div>

                {/* Category Name */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                    카테고리명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={skill.category}
                    onChange={e => {
                      const newSkills = [...(formData.skills || [])];
                      newSkills[skillIndex] = { ...newSkills[skillIndex], category: e.target.value };
                      setFormData({ ...formData, skills: newSkills });
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-dark-bg-card border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-dark-text-primary"
                    placeholder="예: 프로그래밍 언어, 프레임워크, 데이터베이스, 클라우드"
                  />
                </div>

                {/* Skill Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">기술 스택</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newSkills = [...(formData.skills || [])];
                        const currentItems = Array.isArray(newSkills[skillIndex].items)
                          ? newSkills[skillIndex].items
                          : [];
                        newSkills[skillIndex] = {
                          ...newSkills[skillIndex],
                          items: [
                            ...currentItems,
                            { name: '', description: '' },
                          ],
                        };
                        setFormData({ ...formData, skills: newSkills });
                      }}
                      className="px-3 py-1 text-sm bg-white dark:bg-dark-bg-elevated border border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-dark-bg-hover transition-all font-semibold"
                    >
                      + 기술 추가
                    </button>
                  </div>

                  {Array.isArray(skill.items) && skill.items.length > 0 ? (
                    <div className="space-y-3">
                      {skill.items.map((item: any, itemIndex: number) => (
                        <div key={itemIndex} className="border border-gray-200 dark:border-dark-border-default rounded-lg p-4 bg-white dark:bg-dark-bg-card transition-colors duration-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1">
                                {itemIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSkills = [...(formData.skills || [])];
                                      const newItems = [...(newSkills[skillIndex].items || [])];
                                      [newItems[itemIndex - 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex - 1]];
                                      newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
                                      setFormData({ ...formData, skills: newSkills });
                                    }}
                                    className="text-amber-600 hover:text-amber-800 text-xs font-semibold"
                                    title="위로 이동"
                                  >
                                    ▲
                                  </button>
                                )}
                                {itemIndex < skill.items.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSkills = [...(formData.skills || [])];
                                      const newItems = [...(newSkills[skillIndex].items || [])];
                                      [newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]];
                                      newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
                                      setFormData({ ...formData, skills: newSkills });
                                    }}
                                    className="text-amber-600 hover:text-amber-800 text-xs font-semibold"
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">기술 #{itemIndex + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newSkills = [...(formData.skills || [])];
                                const newItems = Array.isArray(newSkills[skillIndex].items)
                                  ? newSkills[skillIndex].items.filter((_: any, i: number) => i !== itemIndex)
                                  : [];
                                newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
                                setFormData({ ...formData, skills: newSkills });
                              }}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold"
                            >
                              삭제
                            </button>
                          </div>

                          <div className="mb-3">
                            {/* Skill Name */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-text-secondary mb-1">
                                기술명 <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={typeof item === 'string' ? item : item.name || ''}
                                onChange={e => {
                                  const newSkills = [...(formData.skills || [])];
                                  const newItems = [...(newSkills[skillIndex].items || [])];
                                  newItems[itemIndex] = typeof newItems[itemIndex] === 'string'
                                    ? { name: e.target.value, description: '' }
                                    : { ...newItems[itemIndex], name: e.target.value };
                                  newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
                                  setFormData({ ...formData, skills: newSkills });
                                }}
                                className="w-full px-3 py-2 bg-white dark:bg-dark-bg-elevated border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-dark-text-primary text-sm"
                                placeholder="예: React, Node.js, PostgreSQL"
                              />
                            </div>
                          </div>

                          {/* Hierarchical Description */}
                          <HierarchicalDescription
                            items={(typeof item === 'string' ? [] : item.descriptions || []) as HierarchicalItem[]}
                            onChange={(descriptions) => {
                              const newSkills = [...(formData.skills || [])];
                              const newItems = [...(newSkills[skillIndex].items || [])];
                              newItems[itemIndex] = typeof newItems[itemIndex] === 'string'
                                ? { name: newItems[itemIndex], description: '', descriptions }
                                : { ...newItems[itemIndex], descriptions };
                              newSkills[skillIndex] = { ...newSkills[skillIndex], items: newItems };
                              setFormData({ ...formData, skills: newSkills });
                            }}
                            label="활용 경험 / 세부 설명"
                            placeholder="활용 경험이나 세부 설명을 추가하려면 '+ 추가' 버튼을 클릭하세요"
                            maxDepth={4}
                          />

                          {/* Legacy Description (for backward compatibility) */}
                          {typeof item !== 'string' && item.description && !item.descriptions?.length && (
                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
                                <strong>기존 설명:</strong> {item.description}
                              </p>
                              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                위 내용은 기존 텍스트 형식입니다. 새로운 계층 구조로 마이그레이션하려면 위에서 "+ 추가" 버튼을 눌러 새로운 항목을 추가하세요.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-dark-text-tertiary text-sm bg-white dark:bg-dark-bg-elevated rounded-lg border border-dashed border-gray-300 dark:border-dark-border-subtle transition-colors duration-200">
                      <p>기술을 추가하려면 "+ 기술 추가" 버튼을 클릭하세요</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
            <p>카테고리를 추가하려면 "+ 카테고리 추가" 버튼을 클릭하세요</p>
          </div>
        )}
        </>
        )}
      </div>

      {/* Education Section */}
      <EducationSection
        educations={formData.educations || []}
        onChange={(educations) => setFormData({ ...formData, educations })}
        t={t}
      />

      {/* Certificates Section */}
      <div className="bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle rounded-2xl shadow-sm dark:shadow-dark-sm transition-colors duration-200 p-6">
        <CollapsibleHeader
          title={t('resume.sections.certifications')}
          icon="🏆"
          isCollapsed={collapsedSections.certificates}
          onToggle={() => toggleSection('certificates')}
          count={formData.certificates?.length}
        />
        {!collapsedSections.certificates && (
        <>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{t('resume.descriptions.certifications')}</p>
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
            className="px-4 py-2 bg-amber-700 dark:bg-amber-600 hover:bg-amber-800 dark:hover:bg-amber-700 text-white dark:text-gray-900 rounded-lg transition-all font-semibold"
          >
            + Add Certificate
          </button>
        </div>

        {formData.certificates && formData.certificates.length > 0 ? (
          <div className="space-y-4">
            {formData.certificates.map((cert, index) => (
              <div key={index} className="border border-gray-200 dark:border-dark-border-default rounded-lg p-4 bg-white dark:bg-dark-bg-elevated transition-colors duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Certificate #{index + 1}</h3>
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-dark-bg-card border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                      placeholder="e.g., AWS Certified Solutions Architect"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-dark-bg-card border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                      placeholder="e.g., Amazon Web Services"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-dark-bg-card border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-dark-bg-card border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                      placeholder="Leave empty if no expiry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-dark-bg-card border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                      placeholder="Credential ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-dark-bg-card border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
                      placeholder="https://verify.example.com"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
            <p>No certifications added yet. Click "Add Certificate" to get started.</p>
          </div>
        )}
        </>
        )}
      </div>

      {/* Attachments Section */}
      <div className="bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle rounded-2xl shadow-sm dark:shadow-dark-sm transition-colors duration-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">📎 Attachments</h2>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
          Upload profile photo (grayscale), portfolios, and certificates. Max size: 10MB per file.
        </p>

        {!resume?.id && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <p className="text-blue-800 dark:text-blue-400 text-sm">
              💡 Please save your resume first to enable file uploads.
            </p>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-800 dark:text-red-400 text-sm">
              ⚠️ {uploadError}
            </p>
          </div>
        )}

        {/* Profile Photo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">📷 Profile Photo</h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
            Professional photo (automatically converted to grayscale)
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PROFILE_PHOTO).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-lg p-3 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  {attachment.fileUrl && (
                    <img
                      src={attachment.fileUrl}
                      alt="Profile"
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{attachment.fileName}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">{formatFileSize(attachment.fileSize)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
              <div className="border-2 border-dashed border-gray-300 dark:border-dark-border-subtle rounded-lg p-4 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload profile photo'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Portfolio Files */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">🎨 Portfolio</h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
            Upload your project screenshots, designs, or PDF documents
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PORTFOLIO).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-lg p-3 transition-colors duration-200">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">{formatFileSize(attachment.fileSize)}</p>
                  {attachment.title && <p className="text-xs text-gray-700 dark:text-dark-text-secondary mt-1">{attachment.title}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
              <div className="border-2 border-dashed border-gray-300 dark:border-dark-border-subtle rounded-lg p-4 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload portfolio file'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Certificate Files */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">🏆 Certificates</h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
            Upload your certification or award documents
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.CERTIFICATE).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-lg p-3 transition-colors duration-200">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">{formatFileSize(attachment.fileSize)}</p>
                  {attachment.title && <p className="text-xs text-gray-700 dark:text-dark-text-secondary mt-1">{attachment.title}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
              <div className="border-2 border-dashed border-gray-300 dark:border-dark-border-subtle rounded-lg p-4 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
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
      {/* Auto-save indicator */}
      {draftSaved && (
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            <span>✓</span>
            <span>저장됨</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleClearDraft}
          className="px-4 py-2 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary underline transition-all"
        >
          저장 내용 삭제
        </button>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-100 dark:bg-dark-bg-elevated hover:bg-gray-200 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary rounded-lg font-semibold border border-gray-300 dark:border-dark-border-default transition-all"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-6 py-3 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-amber-700 dark:text-amber-400 rounded-lg font-semibold border-2 border-amber-700 dark:border-amber-600 transition-all transform hover:scale-[1.02]"
          >
            📝 저장
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '💾 저장 중...' : '💾 저장 및 미리보기'}
          </button>
        </div>
      </div>
    </form>
  );
}
