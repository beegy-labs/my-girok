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
  uploadToTemp,
  deleteTempFile,
  SectionType,
  Gender,
} from '../../api/resume';
import SectionOrderManager from './SectionOrderManager';
import ExperienceSection from './ExperienceSection';
import EducationSection from './EducationSection';
import SkillsSection from './SkillsSection';
import {
  TextInput,
  SelectInput,
  TextArea,
  Button,
  Card,
  CollapsibleSection,
} from '@my-girok/ui-components';

interface ResumeFormProps {
  resume: Resume | null;
  onSubmit: (data: CreateResumeDto) => Promise<void>;
  onChange?: (data: CreateResumeDto) => void;
}

/**
 * ResumeForm - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
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
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
    skills:
      resume?.skills?.map((s) => ({
        category: s.category,
        items:
          s.items?.map((item: any) =>
            typeof item === 'string' ? { name: item, description: '' } : item,
          ) || [],
        order: s.order,
        visible: s.visible,
      })) || [],
    experiences:
      resume?.experiences?.map((e) => ({
        company: e.company,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrentlyWorking: e.isCurrentlyWorking,
        finalPosition: e.finalPosition,
        jobTitle: e.jobTitle,
        salary: e.salary,
        salaryUnit: e.salaryUnit,
        showSalary: e.showSalary,
        projects:
          e.projects?.map((p) => ({
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
    educations:
      resume?.educations?.map((e) => ({
        school: e.school,
        major: e.major,
        degree: e.degree,
        startDate: e.startDate,
        endDate: e.endDate,
        gpa: e.gpa,
        order: e.order,
        visible: e.visible,
      })) || [],
    certificates:
      resume?.certificates?.map((c) => ({
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
  // Profile photo temp upload state
  const [profilePhotoTempKey, setProfilePhotoTempKey] = useState<string | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null); // Presigned URL from temp upload

  // Section ordering
  const [sections, setSections] = useState(
    resume?.sections?.sort((a, b) => a.order - b.order) || [
      { id: '1', type: SectionType.SKILLS, order: 0, visible: true },
      { id: '2', type: SectionType.EXPERIENCE, order: 1, visible: true },
      { id: '3', type: SectionType.PROJECT, order: 2, visible: true },
      { id: '4', type: SectionType.EDUCATION, order: 3, visible: true },
      { id: '5', type: SectionType.CERTIFICATE, order: 4, visible: true },
    ],
  );

  // Load draft from localStorage on mount
  useEffect(() => {
    const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft && !resume) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        // Remove projects field if it exists in old drafts
        const { projects: _projects, ...cleanDraft } = parsedDraft;
        setFormData(cleanDraft);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [resume]);

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    const resumeId = resume?.id;

    // Set new timeout for auto-save (3 seconds after last change)
    const timeout = setTimeout(() => {
      const draftKey = resumeId ? `resume-draft-${resumeId}` : 'resume-draft-new';
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setDraftSaved(true);

      // Hide the "saved" message after 2 seconds
      setTimeout(() => setDraftSaved(false), 2000);
    }, 3000);

    // Cleanup on unmount or when formData changes
    return () => {
      clearTimeout(timeout);
    };
  }, [formData, resume?.id]);

  // Trigger onChange when formData or sections change
  // Note: onChange is excluded from dependencies to prevent infinite loop
  // Parent component should memoize onChange with useCallback
  useEffect(() => {
    if (onChange) {
      onChange(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, sections]);

  // Memoize loadAttachments to use in useEffect
  const loadAttachments = useCallback(async () => {
    if (!resume?.id) return;
    try {
      const data = await getAttachments(resume.id);
      setAttachments(data);

      // Automatically set profile photo if exists
      const profilePhoto = data.find((a) => a.type === AttachmentType.PROFILE_PHOTO);
      if (profilePhoto) {
        setFormData((prev) => ({ ...prev, profileImage: profilePhoto.fileUrl }));
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  }, [resume?.id]);

  // Load attachments if resume exists
  useEffect(() => {
    if (resume?.id) {
      loadAttachments();
    }
  }, [resume?.id, loadAttachments]);

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setUploadError(err.response?.data?.message || t('resume.form.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!resume?.id) return;

    try {
      await deleteAttachment(resume.id, attachmentId);
      setAttachments(attachments.filter((a) => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const getAttachmentsByType = (type: AttachmentType) => attachments.filter((a) => a.type === type);

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

  // Handle profile photo file selection - auto-uploads to temp storage
  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setUploading(true);
    setUploadError(null);

    try {
      // Clean up previous temp file if exists
      if (profilePhotoTempKey) {
        try {
          await deleteTempFile(profilePhotoTempKey);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Auto-upload to temp storage
      const result = await uploadToTemp(file);

      setProfilePhotoTempKey(result.tempKey);
      setProfilePhotoPreview(result.previewUrl);
    } catch (error: unknown) {
      console.error('Failed to upload to temp storage:', error);
      const err = error as { response?: { data?: { message?: string } } };
      setUploadError(err.response?.data?.message || t('resume.form.photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  // Memoized back navigation handler (2025 best practice)
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  // Cancel profile photo selection
  const handleProfilePhotoCancel = useCallback(async () => {
    if (profilePhotoTempKey) {
      try {
        await deleteTempFile(profilePhotoTempKey);
      } catch {
        // Ignore cleanup errors
      }
    }
    setProfilePhotoTempKey(null);
    setProfilePhotoPreview(null);
  }, [profilePhotoTempKey]);

  // Delete profile photo
  const handleProfilePhotoDelete = async () => {
    if (!resume?.id) return;

    const profilePhoto = attachments.find((a) => a.type === AttachmentType.PROFILE_PHOTO);
    if (!profilePhoto) {
      // Just clear the URL if no attachment exists
      setFormData((prev) => ({ ...prev, profileImage: '' }));
      return;
    }

    if (!confirm(t('resume.form.confirmDeletePhoto'))) {
      return;
    }

    setUploading(true);
    try {
      await deleteAttachment(resume.id, profilePhoto.id);
      setFormData((prev) => ({ ...prev, profileImage: '' }));
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
    setFormData((prev) => ({
      ...prev,
      birthDate: value || undefined,
      // Auto-populate birthYear for backward compatibility
      birthYear: value ? new Date(value).getFullYear() : undefined,
    }));
  }, []);

  const handleGenderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      gender: (value as Gender) || undefined,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields manually before submitting
    const validationErrors: string[] = [];
    if (!formData.title?.trim()) {
      validationErrors.push(t('resume.validation.titleRequired'));
    }
    if (!formData.name?.trim()) {
      validationErrors.push(t('resume.validation.nameRequired'));
      // Expand basicInfo section if name is missing
      setCollapsedSections((prev) => ({ ...prev, basicInfo: false }));
    }
    if (!formData.email?.trim()) {
      validationErrors.push(t('resume.validation.emailRequired'));
      // Expand basicInfo section if email is missing
      setCollapsedSections((prev) => ({ ...prev, basicInfo: false }));
    }

    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      // Remove projects field before submitting (no longer supported by API)
      // Note: Empty string handling is done by stripIds() in resume.ts API layer
      // which converts empty strings to null for proper database clearing
      const { projects: _projects, ...dataToSubmit } = formData as any;

      // Include profileImageTempKey if a new image was uploaded to temp storage
      if (profilePhotoTempKey) {
        dataToSubmit.profileImageTempKey = profilePhotoTempKey;
      }

      await onSubmit(dataToSubmit);

      // Clear temp state after successful save (backend moved file to permanent storage)
      if (profilePhotoTempKey) {
        setProfilePhotoTempKey(null);
        setProfilePhotoPreview(null);
      }

      // Clear draft after successful submission
      const draftKey = resume?.id ? `resume-draft-${resume.id}` : 'resume-draft-new';
      localStorage.removeItem(draftKey);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Resume Settings - Compact on mobile */}
      <Card
        variant="secondary"
        padding="responsive"
        className="shadow-sm rounded-xl sm:rounded-input lg:rounded-widget"
      >
        <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-theme-text-primary mb-3 sm:mb-4 lg:mb-6">
          ⚙️ {t('resume.sections.settings')}
        </h2>
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 lg:gap-6">
          <TextInput
            label={t('resume.form.resumeTitle')}
            value={formData.title}
            onChange={(value: string) => setFormData({ ...formData, title: value })}
            required
            placeholder={t('resume.form.resumeTitlePlaceholder')}
            className="mb-0"
          />
          <SelectInput
            label={t('resume.form.paperSize')}
            value={formData.paperSize || 'A4'}
            onChange={(value: string) =>
              setFormData({ ...formData, paperSize: value as PaperSize })
            }
            options={[
              { value: 'A4', label: t('resume.form.paperSizeA4') },
              { value: 'LETTER', label: t('resume.form.paperSizeLetter') },
            ]}
            required
          />
        </div>
        <div className="mt-3 sm:mt-4">
          <TextInput
            label={t('resume.form.description')}
            value={formData.description || ''}
            onChange={(value: string) => setFormData({ ...formData, description: value })}
            placeholder={t('resume.form.descriptionPlaceholder')}
            className="mb-0"
          />
        </div>
      </Card>

      {/* Basic Info */}
      <CollapsibleSection
        title={t('resume.sections.basicInfo')}
        icon="📋"
        isExpanded={!collapsedSections.basicInfo}
        onToggle={() => toggleSection('basicInfo')}
        variant="primary"
      >
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 lg:gap-6">
          <TextInput
            label={t('resume.form.name')}
            value={formData.name}
            onChange={(value: string) => setFormData({ ...formData, name: value })}
            required
            placeholder={t('resume.form.namePlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.email')}
            type="email"
            value={formData.email}
            onChange={(value: string) => setFormData({ ...formData, email: value })}
            required
            placeholder={t('resume.form.emailPlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.phone')}
            type="tel"
            value={formData.phone || ''}
            onChange={(value: string) => setFormData({ ...formData, phone: value })}
            placeholder={t('resume.form.phonePlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.address')}
            value={formData.address || ''}
            onChange={(value: string) => setFormData({ ...formData, address: value })}
            placeholder={t('resume.form.addressPlaceholder')}
            hint={t('resume.form.addressHint')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.github')}
            type="url"
            value={formData.github || ''}
            onChange={(value: string) => setFormData({ ...formData, github: value })}
            placeholder={t('resume.form.githubPlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.blog')}
            type="url"
            value={formData.blog || ''}
            onChange={(value: string) => setFormData({ ...formData, blog: value })}
            placeholder={t('resume.form.blogPlaceholder')}
            className="mb-0"
          />
          <TextInput
            label={t('resume.form.linkedin')}
            type="url"
            value={formData.linkedin || ''}
            onChange={(value: string) => setFormData({ ...formData, linkedin: value })}
            placeholder={t('resume.form.linkedinPlaceholder')}
            className="mb-0"
          />
        </div>

        {/* Birth Date and Gender */}
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
              {t('resume.birthDate')}
            </label>
            <input
              type="date"
              value={formData.birthDate || ''}
              onChange={handleBirthDateChange}
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
              placeholder={t('resume.birthDatePlaceholder')}
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-theme-text-tertiary mt-1 hidden sm:block">
              {t('resume.birthDateHint')}
            </p>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
              {t('resume.gender')}
            </label>
            <select
              value={formData.gender || ''}
              onChange={handleGenderChange}
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
            >
              <option value="">{t('resume.genderPlaceholder')}</option>
              <option value="MALE">{t('resume.genderOptions.MALE')}</option>
              <option value="FEMALE">{t('resume.genderOptions.FEMALE')}</option>
              <option value="OTHER">{t('resume.genderOptions.OTHER')}</option>
            </select>
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
            {t('resume.form.profilePhoto')}
          </label>

          {/* Display preview (pending upload) or current uploaded photo */}
          {/* New photo preview (from temp upload) */}
          {profilePhotoPreview && (
            <div className="mb-3 flex items-center gap-3">
              <img
                src={profilePhotoPreview}
                alt="Profile Preview"
                className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-full border-2 border-theme-status-success-border"
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-theme-status-success-text font-medium flex items-center gap-1">
                  ✓ {t('resume.form.photoReady')}
                </span>
                <button
                  type="button"
                  onClick={handleProfilePhotoCancel}
                  disabled={uploading}
                  className="px-3 py-1 text-xs bg-theme-bg-elevated text-theme-text-secondary rounded-xl hover:bg-theme-bg-hover disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
          {/* Current saved photo (not in temp, not a new upload) */}
          {!profilePhotoPreview &&
            formData.profileImage &&
            !formData.profileImage.startsWith('blob:') && (
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={formData.profileImage}
                  alt="Profile"
                  className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-full border-2 border-theme-primary"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23e5e7eb"/><text x="50%" y="50%" font-size="14" text-anchor="middle" dy=".3em" fill="%239ca3af">No Image</text></svg>';
                  }}
                />
                <button
                  type="button"
                  onClick={handleProfilePhotoDelete}
                  disabled={uploading}
                  className="px-3 py-2 text-xs sm:text-sm bg-theme-status-error-bg text-theme-status-error-text rounded-xl hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  {uploading ? t('resume.form.deletingPhoto') : t('resume.form.deletePhoto')}
                </button>
              </div>
            )}
          {/* Warning for invalid blob URL in database */}
          {!profilePhotoPreview &&
            formData.profileImage &&
            formData.profileImage.startsWith('blob:') && (
              <div className="mb-3 p-3 bg-theme-status-error-bg border border-theme-status-error-border rounded-xl">
                <p className="text-xs text-theme-status-error-text">
                  ⚠️ {t('resume.form.invalidImageUrl')}
                </p>
              </div>
            )}

          {/* File upload input - always visible */}
          <div className="space-y-2">
            <label className="relative block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                disabled={uploading}
                className="block w-full text-sm text-theme-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-theme-bg-hover file:text-theme-primary hover:file:bg-theme-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {uploading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-theme-primary">
                  {t('resume.form.uploadingPhoto')}...
                </span>
              )}
            </label>
          </div>

          {uploadError && (
            <p className="text-xs text-theme-status-error-text mt-1">{uploadError}</p>
          )}

          <p className="text-xs text-theme-text-tertiary mt-1">{t('resume.form.photoFormats')}</p>
        </div>

        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
            {t('resume.form.militaryServiceKorean')}
          </label>
          <select
            value={formData.militaryService || ''}
            onChange={(e) => setFormData({ ...formData, militaryService: e.target.value as any })}
            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
          >
            <option value="">{t('resume.form.militaryServiceSelect')}</option>
            <option value="COMPLETED">{t('resume.form.militaryServiceCompleted')}</option>
            <option value="EXEMPTED">{t('resume.form.militaryServiceExempted')}</option>
            <option value="NOT_APPLICABLE">{t('resume.form.militaryServiceNotApplicable')}</option>
          </select>
        </div>
        {formData.militaryService === 'COMPLETED' && (
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
                {t('resume.militaryService.rank')}
              </label>
              <select
                value={formData.militaryRank || ''}
                onChange={(e) => setFormData({ ...formData, militaryRank: e.target.value })}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
              >
                <option value="">{t('resume.form.militaryRankSelect')}</option>
                <option value="병장">{t('resume.militaryRanks.sergeant')}</option>
                <option value="상병">{t('resume.militaryRanks.corporal')}</option>
                <option value="일병">{t('resume.militaryRanks.pfc')}</option>
                <option value="이병">{t('resume.militaryRanks.private')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
                {t('resume.militaryService.dischargeType')}
              </label>
              <select
                value={formData.militaryDischargeType || ''}
                onChange={(e) =>
                  setFormData({ ...formData, militaryDischargeType: e.target.value })
                }
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
              >
                <option value="">{t('resume.form.militaryDischargeSelect')}</option>
                <option value="만기전역">{t('resume.dischargeTypes.honorable')}</option>
                <option value="의병전역">{t('resume.dischargeTypes.medical')}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
                {t('resume.militaryService.servicePeriod')}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="month"
                  value={formData.militaryServiceStartDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, militaryServiceStartDate: e.target.value })
                  }
                  className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
                />
                <span className="text-theme-text-tertiary text-sm">~</span>
                <input
                  type="month"
                  value={formData.militaryServiceEndDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, militaryServiceEndDate: e.target.value })
                  }
                  className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
                />
              </div>
              <p className="text-xs text-theme-text-tertiary mt-1 hidden sm:block">
                {t('resume.form.yyyymmFormat')}
              </p>
            </div>
          </div>
        )}
        <div className="mt-4">
          <TextArea
            label={t('resume.form.summary')}
            value={formData.summary || ''}
            onChange={(value: string) => setFormData({ ...formData, summary: value })}
            rows={4}
            placeholder={t('resume.form.summaryPlaceholder')}
          />
        </div>

        {/* Key Achievements */}
        <div className="mt-4 sm:mt-6">
          <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
            {t('resume.form.keyAchievements')}
          </label>
          <p className="text-xs text-theme-text-tertiary mb-2 sm:mb-3">
            {t('resume.form.keyAchievementsHint')}
          </p>
          {(formData.keyAchievements || []).map((achievement, index) => (
            <div key={index} className="mb-2 sm:mb-3">
              <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                <div className="flex-1">
                  <TextArea
                    value={achievement}
                    onChange={(value: string) => {
                      const newAchievements = [...(formData.keyAchievements || [])];
                      newAchievements[index] = value;
                      setFormData({ ...formData, keyAchievements: newAchievements });
                    }}
                    rows={2}
                    placeholder={t('resume.form.achievementPlaceholder', { index: index + 1 })}
                  />
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    const newAchievements = formData.keyAchievements?.filter((_, i) => i !== index);
                    setFormData({ ...formData, keyAchievements: newAchievements });
                  }}
                  size="sm"
                  className="self-end sm:self-start py-2 touch-manipulation"
                >
                  <span className="hidden sm:inline">{t('resume.form.remove')}</span>
                  <span className="sm:hidden">✕ {t('common.delete')}</span>
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => {
              setFormData({
                ...formData,
                keyAchievements: [...(formData.keyAchievements || []), ''],
              });
            }}
            size="sm"
            className="py-2 touch-manipulation"
          >
            + {t('resume.experienceForm.addAchievement')}
          </Button>
        </div>
      </CollapsibleSection>

      {/* Application Reason (지원 동기) */}
      <CollapsibleSection
        title={t('resume.form.applicationReason')}
        icon="💼"
        isExpanded={!collapsedSections.applicationReason}
        onToggle={() => toggleSection('applicationReason')}
        variant="primary"
      >
        <TextArea
          value={formData.applicationReason || ''}
          onChange={(value: string) => setFormData({ ...formData, applicationReason: value })}
          rows={4}
          placeholder={t('resume.form.applicationReasonPlaceholder')}
          hint={t('resume.form.applicationReasonHint')}
        />
      </CollapsibleSection>

      {/* Work Experience Section */}
      <ExperienceSection
        experiences={formData.experiences || []}
        onChange={(experiences) => {
          // Only update formData - useEffect will call onChange automatically
          // This prevents double-calling onChange with stale formData
          setFormData({ ...formData, experiences });
        }}
        t={t}
      />

      {/* Skills Section */}
      <SkillsSection
        skills={formData.skills || []}
        onChange={(skills) => setFormData({ ...formData, skills })}
        t={t}
      />

      {/* Education Section */}
      <EducationSection
        educations={formData.educations || []}
        onChange={(educations) => setFormData({ ...formData, educations })}
        t={t}
      />

      {/* Certificates Section */}
      <CollapsibleSection
        title={t('resume.sections.certifications')}
        icon="🏆"
        isExpanded={!collapsedSections.certificates}
        onToggle={() => toggleSection('certificates')}
        count={formData.certificates?.length}
        variant="secondary"
        headerAction={
          <Button
            variant="primary"
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
            size="sm"
            className="py-2 touch-manipulation"
          >
            + {t('resume.form.addCertificate')}
          </Button>
        }
      >
        <p className="text-xs sm:text-sm text-theme-text-secondary mb-3 sm:mb-4">
          {t('resume.descriptions.certifications')}
        </p>

        {formData.certificates && formData.certificates.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {formData.certificates.map((cert, index) => (
              <div
                key={index}
                className="border border-theme-border-subtle rounded-xl p-3 sm:p-4 bg-theme-bg-input transition-colors duration-200"
              >
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-lg font-semibold text-theme-text-primary">
                    {t('resume.form.certificateNumber', { index: index + 1 })}
                  </h3>
                  <Button
                    variant="danger"
                    onClick={() => {
                      const newCertificates = formData.certificates?.filter((_, i) => i !== index);
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    size="sm"
                    className="py-1.5 px-2 text-xs touch-manipulation"
                  >
                    <span className="hidden sm:inline">{t('resume.form.remove')}</span>
                    <span className="sm:hidden">✕</span>
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 lg:gap-6">
                  <TextInput
                    label={t('resume.form.certificateName')}
                    value={cert.name}
                    onChange={(value: string) => {
                      const newCertificates = [...(formData.certificates || [])];
                      newCertificates[index] = { ...newCertificates[index], name: value };
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    placeholder={t('resume.form.certificatePlaceholder')}
                    required
                  />

                  <TextInput
                    label={t('resume.form.issuer')}
                    value={cert.issuer}
                    onChange={(value: string) => {
                      const newCertificates = [...(formData.certificates || [])];
                      newCertificates[index] = { ...newCertificates[index], issuer: value };
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    placeholder={t('resume.form.issuerPlaceholder')}
                    required
                  />

                  <TextInput
                    label={t('resume.form.issueDate')}
                    type="month"
                    value={cert.issueDate}
                    onChange={(value: string) => {
                      const newCertificates = [...(formData.certificates || [])];
                      newCertificates[index] = { ...newCertificates[index], issueDate: value };
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    required
                  />

                  <TextInput
                    label={t('resume.form.expiryDate')}
                    type="month"
                    value={cert.expiryDate || ''}
                    onChange={(value: string) => {
                      const newCertificates = [...(formData.certificates || [])];
                      newCertificates[index] = { ...newCertificates[index], expiryDate: value };
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    placeholder={t('resume.form.expiryEmpty')}
                  />

                  <TextInput
                    label={t('resume.form.credentialIdLabel')}
                    value={cert.credentialId || ''}
                    onChange={(value: string) => {
                      const newCertificates = [...(formData.certificates || [])];
                      newCertificates[index] = { ...newCertificates[index], credentialId: value };
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    placeholder={t('resume.form.credentialId')}
                  />

                  <TextInput
                    label={t('resume.form.credentialUrl')}
                    type="url"
                    value={cert.credentialUrl || ''}
                    onChange={(value: string) => {
                      const newCertificates = [...(formData.certificates || [])];
                      newCertificates[index] = { ...newCertificates[index], credentialUrl: value };
                      setFormData({ ...formData, certificates: newCertificates });
                    }}
                    placeholder={t('resume.form.credentialUrlPlaceholder')}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-theme-text-tertiary">
            <p>{t('resume.form.noCertificates')}</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Attachments Section */}
      <div className="bg-theme-bg-card border border-theme-border-subtle rounded-xl sm:rounded-input lg:rounded-widget shadow-theme-sm transition-colors duration-200 p-3 sm:p-6 lg:p-8">
        <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-theme-text-primary mb-1 sm:mb-2 lg:mb-4">
          📎 {t('resume.form.attachments')}
        </h2>
        <p className="text-xs sm:text-sm text-theme-text-secondary mb-3 sm:mb-4">
          {t('resume.form.attachmentsDesc')}
        </p>

        {!resume?.id && (
          <div className="bg-theme-status-info-bg border border-theme-status-info-border rounded-xl p-4 mb-4">
            <p className="text-theme-status-info-text text-sm">💡 {t('resume.form.saveFirst')}</p>
          </div>
        )}

        {uploadError && (
          <div className="bg-theme-status-error-bg border border-theme-status-error-border rounded-xl p-4 mb-4">
            <p className="text-theme-status-error-text text-sm">⚠️ {uploadError}</p>
          </div>
        )}

        {/* Profile Photo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-3">
            📷 {t('resume.form.profilePhotoSection')}
          </h3>
          <p className="text-sm text-theme-text-secondary mb-3">
            {t('resume.form.profilePhotoDesc')}
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PROFILE_PHOTO).map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between bg-theme-bg-hover border border-theme-border-subtle rounded-xl p-3 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  {attachment.fileUrl && (
                    <img
                      src={attachment.fileUrl}
                      alt="Profile"
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-theme-text-primary">
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-theme-text-tertiary">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-theme-status-error-text hover:bg-theme-status-error-bg rounded transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <label
              className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="file"
                accept="image/*"
                disabled={!resume?.id || uploading}
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFileUpload(e.target.files[0], AttachmentType.PROFILE_PHOTO)
                }
                className="hidden"
              />
              <div className="border-2 border-dashed border-theme-border-default rounded-xl p-4 text-center hover:border-theme-primary transition-colors">
                <p className="text-sm text-theme-text-secondary">
                  {uploading ? t('resume.form.uploading') : t('resume.form.clickToUploadPhoto')}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Portfolio Files */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-3">
            🎨 {t('resume.form.portfolioSection')}
          </h3>
          <p className="text-sm text-theme-text-secondary mb-3">{t('resume.form.portfolioDesc')}</p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PORTFOLIO).map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between bg-theme-bg-hover border border-theme-border-subtle rounded-xl p-3 transition-colors duration-200"
              >
                <div>
                  <p className="text-sm font-medium text-theme-text-primary">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-theme-text-tertiary">
                    {formatFileSize(attachment.fileSize)}
                  </p>
                  {attachment.title && (
                    <p className="text-xs text-theme-text-secondary mt-1">{attachment.title}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-theme-status-error-text hover:bg-theme-status-error-bg rounded transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <label
              className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!resume?.id || uploading}
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFileUpload(e.target.files[0], AttachmentType.PORTFOLIO)
                }
                className="hidden"
              />
              <div className="border-2 border-dashed border-theme-border-default rounded-xl p-4 text-center hover:border-theme-primary transition-colors">
                <p className="text-sm text-theme-text-secondary">
                  {uploading ? t('resume.form.uploading') : t('resume.form.clickToUploadPortfolio')}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Certificate Files */}
        <div>
          <h3 className="text-lg font-semibold text-theme-text-primary mb-3">
            🏆 {t('resume.form.certificatesSection')}
          </h3>
          <p className="text-sm text-theme-text-secondary mb-3">
            {t('resume.form.certificatesDesc')}
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.CERTIFICATE).map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between bg-theme-bg-hover border border-theme-border-subtle rounded-xl p-3 transition-colors duration-200"
              >
                <div>
                  <p className="text-sm font-medium text-theme-text-primary">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-theme-text-tertiary">
                    {formatFileSize(attachment.fileSize)}
                  </p>
                  {attachment.title && (
                    <p className="text-xs text-theme-text-secondary mt-1">{attachment.title}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-theme-status-error-text hover:bg-theme-status-error-bg rounded transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <label
              className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!resume?.id || uploading}
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFileUpload(e.target.files[0], AttachmentType.CERTIFICATE)
                }
                className="hidden"
              />
              <div className="border-2 border-dashed border-theme-border-default rounded-xl p-4 text-center hover:border-theme-primary transition-colors">
                <p className="text-sm text-theme-text-secondary">
                  {uploading
                    ? t('resume.form.uploading')
                    : t('resume.form.clickToUploadCertificate')}
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
      <CollapsibleSection
        title={t('resume.form.coverLetter')}
        icon="📝"
        isExpanded={!collapsedSections.coverLetter}
        onToggle={() => toggleSection('coverLetter')}
        variant="primary"
      >
        <textarea
          value={formData.coverLetter || ''}
          onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
          rows={6}
          className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-xl focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
          placeholder={t('resume.form.coverLetterPlaceholder')}
        />
        <p className="text-xs text-theme-text-tertiary mt-1">{t('resume.form.coverLetterHint')}</p>
      </CollapsibleSection>

      {/* Submit Buttons */}
      {/* Auto-save indicator */}
      {draftSaved && (
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-theme-status-success-bg border border-theme-status-success-border rounded-xl text-theme-status-success-text text-xs sm:text-sm">
            <span>✓</span>
            <span>{t('resume.success.saved')}</span>
          </div>
        </div>
      )}

      {/* Mobile: Stacked buttons, Desktop: Horizontal layout */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
        <button
          type="button"
          onClick={handleClearDraft}
          className="hidden sm:block px-4 py-2 text-sm text-theme-text-secondary hover:text-theme-text-primary underline transition-all"
        >
          {t('resume.form.deleteDraft')}
        </button>

        {/* Mobile: Primary actions first */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gradient-to-r from-theme-primary-dark to-theme-primary hover:from-theme-primary hover:to-theme-primary-light text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-theme-primary/30 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm sm:text-base"
          >
            {submitting ? t('resume.form.saving') : t('resume.form.saveAndPreview')}
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-theme-bg-input hover:bg-theme-bg-hover text-theme-primary rounded-xl font-semibold border-2 border-theme-primary transition-all touch-manipulation text-sm sm:text-base"
          >
            📝 {t('common.save')}
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-theme-bg-elevated hover:bg-theme-bg-hover text-theme-text-secondary rounded-xl font-semibold border border-theme-border-default transition-all touch-manipulation text-sm sm:text-base"
          >
            {t('common.cancel')}
          </button>
        </div>

        {/* Mobile: Clear draft at bottom */}
        <button
          type="button"
          onClick={handleClearDraft}
          className="sm:hidden w-full px-4 py-2 text-xs text-theme-text-tertiary hover:text-theme-text-secondary transition-all"
        >
          {t('resume.form.deleteDraft')}
        </button>
      </div>
    </form>
  );
}
