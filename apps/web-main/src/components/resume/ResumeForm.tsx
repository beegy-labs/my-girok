import { useState, useEffect, useCallback } from 'react';
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
  Gender,
} from '../../api/resume';
import SectionOrderManager from './SectionOrderManager';
import ExperienceSection from './ExperienceSection';
import EducationSection from './EducationSection';
import HierarchicalDescription, { HierarchicalItem } from './HierarchicalDescription';
import {
  TextInput,
  Select,
  TextArea,
  PrimaryButton,
  SecondaryButton,
  DestructiveButton,
  Card,
} from '../ui';

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
    applicationReason: false,
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
    keyAchievements: resume?.keyAchievements || [],
    profileImage: resume?.profileImage || '',
    birthYear: resume?.birthYear, // deprecated - kept for backward compatibility
    birthDate: resume?.birthDate || '',
    gender: resume?.gender,
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
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

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
  // Note: onChange is excluded from dependencies to prevent infinite loop
  // Parent component should memoize onChange with useCallback
  useEffect(() => {
    if (onChange) {
      onChange(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, sections]);

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

      // Automatically set profile photo if exists
      const profilePhoto = data.find(a => a.type === AttachmentType.PROFILE_PHOTO);
      if (profilePhoto) {
        setFormData(prev => ({ ...prev, profileImage: profilePhoto.fileUrl }));
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleFileUpload = async (file: File, type: AttachmentType) => {
    if (!resume?.id) {
      setUploadError(t('resume.form.saveResumeFirstUpload'));
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const attachment = await uploadAttachment(resume.id, file, type);
      setAttachments([...attachments, attachment]);
    } catch (error: any) {
      setUploadError(error.response?.data?.message || t('resume.form.uploadFailed'));
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
    if (confirm(t('resume.form.clearDraftConfirm'))) {
      const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
      localStorage.removeItem(draftKey);
      alert(t('resume.form.clearDraftSuccess'));
    }
  };

  // Handle profile photo file selection
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError(t('resume.form.selectImageFile'));
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(t('resume.form.imageSizeTooLarge'));
        return;
      }

      setProfilePhotoFile(file);
      setUploadError(null);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, profileImage: previewUrl }));
    }
  };

  // Upload profile photo
  const handleProfilePhotoUpload = async () => {
    if (!profilePhotoFile || !resume?.id) {
      setUploadError(t('resume.form.saveResumeFirstPhoto'));
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const attachment = await uploadAttachment(
        resume.id,
        profilePhotoFile,
        AttachmentType.PROFILE_PHOTO,
        t('resume.form.profilePhoto')
      );

      setFormData(prev => ({ ...prev, profileImage: attachment.fileUrl }));
      setProfilePhotoFile(null);
      await loadAttachments();
      alert(t('resume.form.photoUploadSuccess'));
    } catch (error: any) {
      console.error('Failed to upload profile photo:', error);
      setUploadError(error.response?.data?.message || t('resume.form.photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  // Delete profile photo
  const handleProfilePhotoDelete = async () => {
    if (!resume?.id) return;

    const profilePhoto = attachments.find(a => a.type === AttachmentType.PROFILE_PHOTO);
    if (!profilePhoto) {
      // Just clear the URL if no attachment exists
      setFormData(prev => ({ ...prev, profileImage: '' }));
      return;
    }

    if (!confirm(t('resume.form.confirmDeletePhoto'))) {
      return;
    }

    setUploading(true);
    try {
      await deleteAttachment(resume.id, profilePhoto.id);
      setFormData(prev => ({ ...prev, profileImage: '' }));
      await loadAttachments();
      alert(t('resume.form.photoDeleteSuccess'));
    } catch (error) {
      console.error('Failed to delete profile photo:', error);
      alert(t('resume.form.photoDeleteFailed'));
    } finally {
      setUploading(false);
    }
  };

  // Birth date and gender change handlers
  const handleBirthDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      birthDate: value || undefined,
      // Auto-populate birthYear for backward compatibility
      birthYear: value ? new Date(value).getFullYear() : undefined
    }));
  }, []);

  const handleGenderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      gender: value as Gender || undefined
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Remove projects field before submitting (no longer supported by API)
      const { projects, ...dataToSubmit } = formData as any;

      // Remove empty string fields to avoid validation errors
      const cleanedData: any = {};
      for (const [key, value] of Object.entries(dataToSubmit)) {
        cleanedData[key] = value === '' ? undefined : value;
      }

      await onSubmit(cleanedData);
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
      <Card variant="secondary" padding="md" className="shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">⚙️ {t('resume.sections.settings')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label={t('resume.form.resumeTitle')}
            value={formData.title}
            onChange={(value) => setFormData({ ...formData, title: value })}
            required
            placeholder={t('resume.form.resumeTitlePlaceholder')}
            className="mb-0"
          />
          <Select
            label={t('resume.form.paperSize')}
            value={formData.paperSize || 'A4'}
            onChange={(value) => setFormData({ ...formData, paperSize: value as PaperSize })}
            options={[
              { value: 'A4', label: t('resume.form.paperSizeA4') },
              { value: 'LETTER', label: t('resume.form.paperSizeLetter') }
            ]}
            required
            className="mb-0"
          />
        </div>
        <div className="mt-4">
          <TextInput
            label={t('resume.form.description')}
            value={formData.description || ''}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder={t('resume.form.descriptionPlaceholder')}
            className="mb-0"
          />
        </div>
      </Card>

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
          <TextInput
            label={t('resume.form.name')}
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            required
            placeholder={t('resume.form.namePlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.email')}
            type="email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            required
            placeholder={t('resume.form.emailPlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.phone')}
            type="tel"
            value={formData.phone || ''}
            onChange={(value) => setFormData({ ...formData, phone: value })}
            placeholder={t('resume.form.phonePlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.address')}
            value={formData.address || ''}
            onChange={(value) => setFormData({ ...formData, address: value })}
            placeholder="서울특별시 강남구"
            hint={t('resume.form.addressHint')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.github')}
            type="url"
            value={formData.github || ''}
            onChange={(value) => setFormData({ ...formData, github: value })}
            placeholder={t('resume.form.githubPlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.blog')}
            type="url"
            value={formData.blog || ''}
            onChange={(value) => setFormData({ ...formData, blog: value })}
            placeholder={t('resume.form.blogPlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.linkedin')}
            type="url"
            value={formData.linkedin || ''}
            onChange={(value) => setFormData({ ...formData, linkedin: value })}
            placeholder={t('resume.form.linkedinPlaceholder')}
            className="mb-0"
          />
        </div>

        {/* Birth Date and Gender */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              {t('resume.birthDate')}
            </label>
            <input
              type="date"
              value={formData.birthDate || ''}
              onChange={handleBirthDateChange}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
              placeholder={t('resume.birthDatePlaceholder')}
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
              {t('resume.birthDateHint')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
              {t('resume.gender')}
            </label>
            <select
              value={formData.gender || ''}
              onChange={handleGenderChange}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            >
              <option value="">{t('resume.genderPlaceholder')}</option>
              <option value="MALE">{t('resume.genderOptions.MALE')}</option>
              <option value="FEMALE">{t('resume.genderOptions.FEMALE')}</option>
              <option value="OTHER">{t('resume.genderOptions.OTHER')}</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            {t('resume.form.profilePhoto')}
          </label>

          {/* Display current or preview photo */}
          {formData.profileImage && (
            <div className="mb-3 flex items-center gap-3">
              <img
                src={formData.profileImage}
                alt="Profile"
                className="w-24 h-24 object-cover rounded-full border-2 border-amber-300 dark:border-amber-600"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23e5e7eb"/><text x="50%" y="50%" font-size="14" text-anchor="middle" dy=".3em" fill="%239ca3af">No Image</text></svg>';
                }}
              />
              <button
                type="button"
                onClick={handleProfilePhotoDelete}
                disabled={uploading}
                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? t('resume.form.deletingPhoto') : t('resume.form.deletePhoto')}
              </button>
            </div>
          )}

          {/* File upload input */}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoChange}
              disabled={uploading || !resume?.id}
              className="block w-full text-sm text-gray-700 dark:text-dark-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 dark:file:bg-amber-900/20 file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-100 dark:hover:file:bg-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {profilePhotoFile && (
              <button
                type="button"
                onClick={handleProfilePhotoUpload}
                disabled={uploading}
                className="px-4 py-2 text-sm bg-amber-700 dark:bg-amber-600 text-white dark:text-gray-900 rounded-lg hover:bg-amber-800 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {uploading ? t('resume.form.uploadingPhoto') : t('resume.form.uploadPhoto')}
              </button>
            )}
          </div>

          {uploadError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{uploadError}</p>
          )}

          {!resume?.id && (
            <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
              {t('resume.form.saveFirstPhotoHint')}
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            {t('resume.form.photoFormats')}
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            {t('resume.form.militaryServiceKorean')}
          </label>
          <select
            value={formData.militaryService || ''}
            onChange={e => setFormData({ ...formData, militaryService: e.target.value as any })}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
          >
            <option value="">{t('resume.form.militaryServiceSelect')}</option>
            <option value="COMPLETED">{t('resume.form.militaryServiceCompleted')}</option>
            <option value="EXEMPTED">{t('resume.form.militaryServiceExempted')}</option>
            <option value="NOT_APPLICABLE">{t('resume.form.militaryServiceNotApplicable')}</option>
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
                <option value="">{t('resume.form.militaryRankSelect')}</option>
                <option value="병장">{t('resume.militaryRanks.sergeant')}</option>
                <option value="상병">{t('resume.militaryRanks.corporal')}</option>
                <option value="일병">{t('resume.militaryRanks.pfc')}</option>
                <option value="이병">{t('resume.militaryRanks.private')}</option>
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
                <option value="">{t('resume.form.militaryDischargeSelect')}</option>
                <option value="만기전역">{t('resume.dischargeTypes.honorable')}</option>
                <option value="의병전역">{t('resume.dischargeTypes.medical')}</option>
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
                {t('resume.form.yyyymmFormat')}
              </p>
            </div>
          </div>
        )}
        <div className="mt-4">
          <TextArea
            label={t('resume.form.summary')}
            value={formData.summary || ''}
            onChange={value => setFormData({ ...formData, summary: value })}
            rows={4}
            placeholder={t('resume.form.summaryPlaceholder')}
          />
        </div>

        {/* Key Achievements */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
            {t('resume.form.keyAchievements')}
          </label>
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mb-3">
            {t('resume.form.keyAchievementsHint')}
          </p>
          {(formData.keyAchievements || []).map((achievement, index) => (
            <div key={index} className="mb-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextArea
                    value={achievement}
                    onChange={value => {
                      const newAchievements = [...(formData.keyAchievements || [])];
                      newAchievements[index] = value;
                      setFormData({ ...formData, keyAchievements: newAchievements });
                    }}
                    rows={3}
                    placeholder={t('resume.form.achievementPlaceholder', { index: index + 1 })}
                  />
                </div>
                <DestructiveButton
                  onClick={() => {
                    const newAchievements = formData.keyAchievements?.filter((_, i) => i !== index);
                    setFormData({ ...formData, keyAchievements: newAchievements });
                  }}
                  size="sm"
                >
                  {t('resume.form.remove')}
                </DestructiveButton>
              </div>
            </div>
          ))}
          <SecondaryButton
            onClick={() => {
              setFormData({
                ...formData,
                keyAchievements: [...(formData.keyAchievements || []), '']
              });
            }}
            size="sm"
          >
            {t('resume.experienceForm.addAchievement')}
          </SecondaryButton>
        </div>
        </>
        )}
      </div>

      {/* Application Reason (지원 동기) */}
      <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md transition-colors duration-200 p-6">
        <CollapsibleHeader
          title={t('resume.form.applicationReason')}
          icon="💼"
          isCollapsed={collapsedSections.applicationReason}
          onToggle={() => toggleSection('applicationReason')}
        />
        {!collapsedSections.applicationReason && (
        <>
          <TextArea
            value={formData.applicationReason || ''}
            onChange={value => setFormData({ ...formData, applicationReason: value })}
            rows={6}
            placeholder={t('resume.form.applicationReasonPlaceholder')}
            hint={t('resume.form.applicationReasonHint')}
          />
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
          <PrimaryButton
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
          >
            {t('resume.form.addCategory')}
          </PrimaryButton>
        </div>

        {formData.skills && formData.skills.length > 0 ? (
          <div className="space-y-6">
            {formData.skills.map((skill, skillIndex) => (
              <div key={skillIndex} className="border border-amber-200 dark:border-dark-border-default rounded-lg p-5 bg-amber-50/20 dark:bg-dark-bg-elevated transition-colors duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{t('resume.form.categoryNumber', { index: skillIndex + 1 })}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newSkills = formData.skills?.filter((_, i) => i !== skillIndex);
                      setFormData({ ...formData, skills: newSkills });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    {t('common.delete')}
                  </button>
                </div>

                {/* Category Name */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                    {t('resume.form.categoryName')} <span className="text-red-500">*</span>
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
                    placeholder={t('resume.form.categoryPlaceholder')}
                  />
                </div>

                {/* Skill Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">{t('resume.form.skillStack')}</label>
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
                      {t('resume.form.addSkillButton')}
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
                                    className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 text-xs font-semibold"
                                    title={t('resume.form.moveUpButton')}
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
                                    className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 text-xs font-semibold"
                                    title={t('resume.form.moveDownButton')}
                                  >
                                    ▼
                                  </button>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">{t('resume.form.skillNumber', { index: itemIndex + 1 })}</span>
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
                              {t('common.delete')}
                            </button>
                          </div>

                          <div className="mb-3">
                            {/* Skill Name */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-text-secondary mb-1">
                                {t('resume.form.skillName')} <span className="text-red-500">*</span>
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
                                placeholder={t('resume.form.skillPlaceholder')}
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
                                <strong>{t('resume.form.legacyDescriptionTitle')}</strong> {item.description}
                              </p>
                              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                {t('resume.form.legacyDescriptionMigration')}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-dark-text-tertiary text-sm bg-white dark:bg-dark-bg-elevated rounded-lg border border-dashed border-gray-300 dark:border-dark-border-subtle transition-colors duration-200">
                      <p>{t('resume.form.clickToAddSkills')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
            <p>{t('resume.form.clickToAddCategory')}</p>
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
          <PrimaryButton
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
          >
            {t('resume.form.addCertificate')}
          </PrimaryButton>
        </div>

        {formData.certificates && formData.certificates.length > 0 ? (
          <div className="space-y-4">
            {formData.certificates.map((cert, index) => (
              <div key={index} className="border border-gray-200 dark:border-dark-border-default rounded-lg p-4 bg-white dark:bg-dark-bg-elevated transition-colors duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{t('resume.form.certificateNumber', { index: index + 1 })}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newCertificates = formData.certificates?.filter((_, i) => i !== index);
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    {t('resume.form.remove')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t('resume.form.certificateName')} <span className="text-red-500">*</span>
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
                      placeholder={t('resume.form.certificatePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t('resume.form.issuer')} <span className="text-red-500">*</span>
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
                      placeholder={t('resume.form.issuerPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t('resume.form.issueDate')} <span className="text-red-500">*</span>
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
                      {t('resume.form.expiryDate')}
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
                      placeholder={t('resume.form.expiryEmpty')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t('resume.form.credentialIdLabel')}
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
                      placeholder={t('resume.form.credentialId')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t('resume.form.credentialUrl')}
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
                      placeholder={t('resume.form.credentialUrlPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
            <p>{t('resume.form.noCertificates')}</p>
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
                  {uploading ? t('resume.form.uploading') : t('resume.form.clickToUploadPhoto')}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Portfolio Files */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">🎨 {t('resume.form.portfolioSection')}</h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
            {t('resume.form.portfolioDesc')}
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
                  {t('common.delete')}
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
                  {uploading ? t('resume.form.uploading') : t('resume.form.clickToUploadPortfolio')}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Certificate Files */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">🏆 {t('resume.form.certificatesSection')}</h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
            {t('resume.form.certificatesDesc')}
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
                  {t('common.delete')}
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
                  {uploading ? t('resume.form.uploading') : t('resume.form.clickToUploadCertificate')}
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

      {/* Cover Letter (자기소개서) - At the bottom */}
      <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md transition-colors duration-200 p-6">
        <CollapsibleHeader
          title={t('resume.form.coverLetter')}
          icon="📝"
          isCollapsed={collapsedSections.coverLetter}
          onToggle={() => toggleSection('coverLetter')}
        />
        {!collapsedSections.coverLetter && (
        <>
          <textarea
            value={formData.coverLetter || ''}
            onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
            rows={8}
            className="w-full px-4 py-3 bg-white dark:bg-dark-bg-elevated border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-dark-text-primary"
            placeholder={t('resume.form.coverLetterPlaceholder')}
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            {t('resume.form.coverLetterHint')}
          </p>
        </>
        )}
      </div>

      {/* Submit Buttons */}
      {/* Auto-save indicator */}
      {draftSaved && (
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            <span>✓</span>
            <span>{t('resume.success.saved')}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleClearDraft}
          className="px-4 py-2 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary underline transition-all"
        >
          {t('resume.form.deleteDraft')}
        </button>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-100 dark:bg-dark-bg-elevated hover:bg-gray-200 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary rounded-lg font-semibold border border-gray-300 dark:border-dark-border-default transition-all"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-6 py-3 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-amber-700 dark:text-amber-400 rounded-lg font-semibold border-2 border-amber-700 dark:border-amber-600 transition-all transform hover:scale-[1.02]"
          >
            📝 {t('common.save')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('resume.form.saving') : t('resume.form.saveAndPreview')}
          </button>
        </div>
      </div>
    </form>
  );
}
