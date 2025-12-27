import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  Resume,
  CreateResumeDto,
  AttachmentType,
  ResumeAttachment,
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  uploadToTemp,
  deleteTempFile,
  SectionType,
  Gender,
  Experience,
  Skill,
  Education,
} from '../../api/resume';
import SectionOrderManager from './SectionOrderManager';
import { ExperienceSection } from './experience';
import EducationSection from './EducationSection';
import SkillsSection from './SkillsSection';
import {
  TextInput,
  SelectInput,
  TextArea,
  Button,
  CollapsibleSection,
} from '@my-girok/ui-components';

interface ResumeFormProps {
  resume: Resume | null;
  onSubmit: (data: CreateResumeDto) => Promise<void>;
  onChange?: (data: CreateResumeDto) => void;
}

// Frontend-only extended section types (not yet in DB)
// TODO: Sync with backend when DB migration is done
// Note: BASIC_INFO is always first and not manageable, PROJECT/MILITARY cards don't exist yet
export enum FormSectionType {
  EXPERIENCE = 'EXPERIENCE',
  EDUCATION = 'EDUCATION',
  SKILLS = 'SKILLS',
  CERTIFICATE = 'CERTIFICATE',
  KEY_ACHIEVEMENTS = 'KEY_ACHIEVEMENTS',
  APPLICATION_REASON = 'APPLICATION_REASON',
  ATTACHMENTS = 'ATTACHMENTS',
  COVER_LETTER = 'COVER_LETTER',
}

// Form section interface for ordering
export interface FormSection {
  id: string;
  type: FormSectionType;
  order: number;
  visible: boolean;
}

// Initial collapsed sections state - extracted to module scope (2025 best practice)
// All sections collapsed by default (true = collapsed)
const INITIAL_COLLAPSED_SECTIONS: Record<string, boolean> = {
  basicInfo: true,
  keyAchievements: true,
  skills: true,
  experience: true,
  education: true,
  certificates: true,
  military: true,
  applicationReason: true,
  attachments: true,
  coverLetter: true,
} as const;

// Default sections order - excludes BASIC_INFO (always first, not reorderable)
// Priority order (Korean resume standard): 경력 → 학력 → 기술 → 자격증 → 핵심성과 → 지원동기 → 첨부파일 → 자기소개서
const DEFAULT_SECTIONS: FormSection[] = [
  { id: '1', type: FormSectionType.EXPERIENCE, order: 0, visible: true },
  { id: '2', type: FormSectionType.EDUCATION, order: 1, visible: true },
  { id: '3', type: FormSectionType.SKILLS, order: 2, visible: true },
  { id: '4', type: FormSectionType.CERTIFICATE, order: 3, visible: true },
  { id: '5', type: FormSectionType.KEY_ACHIEVEMENTS, order: 4, visible: true },
  { id: '6', type: FormSectionType.APPLICATION_REASON, order: 5, visible: true },
  { id: '7', type: FormSectionType.ATTACHMENTS, order: 6, visible: true },
  { id: '8', type: FormSectionType.COVER_LETTER, order: 7, visible: true },
];

/**
 * Convert backend SectionType to frontend FormSectionType
 * For sections not yet in DB, use default values
 * Filters out backend types that don't exist in FormSectionType (e.g., PROJECT)
 */
const initializeSections = (
  resumeSections?: { id: string; type: SectionType; order: number; visible: boolean }[],
): FormSection[] => {
  if (!resumeSections || resumeSections.length === 0) {
    return [...DEFAULT_SECTIONS];
  }

  // Valid FormSectionType values
  const validFormSectionTypes = new Set(Object.values(FormSectionType));

  // Filter and map backend sections to FormSection (only types that exist in FormSectionType)
  const validBackendSections = resumeSections.filter((s) =>
    validFormSectionTypes.has(s.type as unknown as FormSectionType),
  );

  const backendSectionTypes = new Set(validBackendSections.map((s) => s.type as string));

  // Start with valid backend sections, converted to FormSectionType
  const result: FormSection[] = validBackendSections.map((s) => ({
    id: s.id,
    type: s.type as unknown as FormSectionType,
    order: s.order,
    visible: s.visible,
  }));

  // Add frontend-only sections that don't exist in backend
  const frontendOnlySections = DEFAULT_SECTIONS.filter((s) => !backendSectionTypes.has(s.type));

  // Append frontend-only sections with adjusted order
  const maxOrder = Math.max(...result.map((s) => s.order), -1);
  frontendOnlySections.forEach((s, idx) => {
    result.push({
      ...s,
      id: `frontend-${s.type}`,
      order: maxOrder + 1 + idx,
    });
  });

  return result.sort((a, b) => a.order - b.order);
};

// Debounce delay for form change callback (ms)
// Prevents excessive PDF re-generation during typing (Over-Engineering Policy: <16ms render target)
const FORM_CHANGE_DEBOUNCE_MS = 800;

// Cover Letter Section interface (2025 best practice - module scope)
interface CoverLetterSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

/**
 * Format file size in human-readable format (2025 best practice: pure function outside component)
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

/**
 * SortableFormSection - Wrapper for draggable form sections
 */
interface SortableFormSectionProps {
  id: string;
  children: React.ReactNode;
  dragHandleLabel: string;
}

function SortableFormSection({ id, children, dragHandleLabel }: SortableFormSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group mb-4">
      {/* Drag handle - uses activator node ref for proper isolation */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="absolute -left-2 top-4 sm:-left-4 sm:top-6 z-10 cursor-grab active:cursor-grabbing p-1.5 sm:p-2 bg-theme-bg-card border border-theme-border-subtle rounded-soft shadow-theme-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 touch-none select-none"
        title={dragHandleLabel}
        role="button"
        tabIndex={0}
        style={{ touchAction: 'none' }}
      >
        <svg
          className="w-4 h-4 text-theme-text-tertiary pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
      {children}
    </div>
  );
}

/**
 * ResumeForm - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function ResumeForm({ resume, onSubmit, onChange }: ResumeFormProps) {
  const { t } = useTranslation();

  // Collapsible section states - using module-scope constant (2025 best practice)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    INITIAL_COLLAPSED_SECTIONS,
  );

  // Curried handler for toggling section (2025 React best practice)
  const toggleSection = useCallback(
    (section: string) => () => {
      setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    },
    [],
  );

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

  // Submitting state to prevent double-submission (used in handleSubmit)
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<ResumeAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  // Profile photo temp upload state
  const [profilePhotoTempKey, setProfilePhotoTempKey] = useState<string | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null); // Presigned URL from temp upload
  // Ref for profile photo file input (to reset value after delete)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // Helper to reset file input (allows re-selecting same file after delete)
  const resetProfilePhotoInput = useCallback(() => {
    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = '';
    }
  }, []);

  // Section ordering - using initializeSections helper (2025 best practice)
  const [sections, setSections] = useState<FormSection[]>(() =>
    initializeSections(resume?.sections),
  );

  // Cover Letter Sections - 2-depth structure (title + content)
  // Frontend-only state for now, API integration will follow
  const [coverLetterSections, setCoverLetterSections] = useState<CoverLetterSection[]>([]);

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

  // Stable ref for onChange to avoid dependency issues (2025 best practice)
  // This pattern is preferred over eslint-disable per project policy
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Trigger onChange when formData or sections change (debounced)
  useEffect(() => {
    if (!onChangeRef.current) return;

    const debounceTimeout = setTimeout(() => {
      onChangeRef.current?.(formData);
    }, FORM_CHANGE_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimeout);
    };
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

  // Memoized file upload handler (2025 React best practice)
  const handleFileUpload = useCallback(
    async (file: File, type: AttachmentType) => {
      if (!resume?.id) {
        setUploadError(t('resume.form.saveResumeFirstUpload'));
        return;
      }

      setUploading(true);
      setUploadError(null);

      try {
        const attachment = await uploadAttachment(resume.id, file, type);
        setAttachments((prev) => [...prev, attachment]);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setUploadError(err.response?.data?.message || t('resume.form.uploadFailed'));
      } finally {
        setUploading(false);
      }
    },
    [resume?.id, t],
  );

  // Memoized delete attachment handler (2025 React best practice)
  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      if (!resume?.id) return;

      try {
        await deleteAttachment(resume.id, attachmentId);
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      } catch (error) {
        console.error('Failed to delete attachment:', error);
      }
    },
    [resume?.id],
  );

  // Memoized attachment lists by type (2025 best practice - useMemo for derived arrays)
  const profilePhotoAttachments = useMemo(
    () => attachments.filter((a) => a.type === AttachmentType.PROFILE_PHOTO),
    [attachments],
  );
  const portfolioAttachments = useMemo(
    () => attachments.filter((a) => a.type === AttachmentType.PORTFOLIO),
    [attachments],
  );
  const certificateAttachments = useMemo(
    () => attachments.filter((a) => a.type === AttachmentType.CERTIFICATE),
    [attachments],
  );

  // Memoized profile photo change handler (2025 React best practice)
  const handleProfilePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset file input value to allow re-selecting the same file
      // This is critical for the delete-then-reselect flow
      if (e.target) {
        e.target.value = '';
      }

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
    },
    [profilePhotoTempKey, t],
  );

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

  // Memoized delete profile photo handler (2025 React best practice)
  const handleProfilePhotoDelete = useCallback(async () => {
    if (!resume?.id) return;

    const profilePhoto = attachments.find((a) => a.type === AttachmentType.PROFILE_PHOTO);
    if (!profilePhoto) {
      // Just clear the URL if no attachment exists
      setFormData((prev) => ({ ...prev, profileImage: '' }));
      resetProfilePhotoInput();
      return;
    }

    if (!confirm(t('resume.form.confirmDeletePhoto'))) {
      return;
    }

    setUploading(true);
    try {
      await deleteAttachment(resume.id, profilePhoto.id);
      setFormData((prev) => ({ ...prev, profileImage: '' }));
      resetProfilePhotoInput();
      await loadAttachments();
      alert(t('resume.form.photoDeleteSuccess'));
    } catch (error) {
      console.error('Failed to delete profile photo:', error);
      alert(t('resume.form.photoDeleteFailed'));
    } finally {
      setUploading(false);
    }
  }, [resume?.id, attachments, t, loadAttachments, resetProfilePhotoInput]);

  // Birth date and gender change handlers
  const handleBirthDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      birthDate: value || undefined,
    }));
  }, []);

  const handleGenderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      gender: (value as Gender) || undefined,
    }));
  }, []);

  // Memoized handler for removing achievement (2025 React best practice)
  const handleRemoveAchievement = useCallback(
    (index: number) => () => {
      const newAchievements = formData.keyAchievements?.filter((_, i) => i !== index);
      setFormData({ ...formData, keyAchievements: newAchievements });
    },
    [formData],
  );

  // Memoized handler for adding certificate (2025 React best practice)
  const handleAddCertificate = useCallback(() => {
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
  }, [formData]);

  // Memoized handler for removing certificate (2025 React best practice)
  const handleRemoveCertificate = useCallback(
    (index: number) => () => {
      const newCertificates = formData.certificates?.filter((_, i) => i !== index);
      setFormData({ ...formData, certificates: newCertificates });
    },
    [formData],
  );

  // Memoized handler for updating certificate field (2025 React best practice - curried)
  const handleUpdateCertificateField = useCallback(
    (index: number, field: keyof NonNullable<CreateResumeDto['certificates']>[number]) =>
      (value: string) => {
        setFormData((prev) => {
          const newCertificates = [...(prev.certificates || [])];
          newCertificates[index] = { ...newCertificates[index], [field]: value };
          return { ...prev, certificates: newCertificates };
        });
      },
    [],
  );

  // Memoized handler for adding key achievement (2025 React best practice)
  const handleAddKeyAchievement = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      keyAchievements: [...(prev.keyAchievements || []), ''],
    }));
  }, []);

  // Memoized handler for updating key achievement (2025 React best practice - curried)
  const handleUpdateKeyAchievement = useCallback(
    (index: number) => (value: string) => {
      setFormData((prev) => {
        const newAchievements = [...(prev.keyAchievements || [])];
        newAchievements[index] = value;
        return { ...prev, keyAchievements: newAchievements };
      });
    },
    [],
  );

  // Generic field change handler for select/input elements (2025 React best practice - curried)
  const handleSelectChange = useCallback(
    <K extends keyof CreateResumeDto>(field: K) =>
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value || undefined }));
      },
    [],
  );

  // Generic input change handler (2025 React best practice - curried)
  const handleInputChange = useCallback(
    <K extends keyof CreateResumeDto>(field: K) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value || undefined }));
      },
    [],
  );

  // File upload handler factory (2025 React best practice - curried)
  const handleFileChange = useCallback(
    (type: AttachmentType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
    },
    [handleFileUpload],
  );

  // Cover Letter Sections handlers (2-depth structure)
  const handleAddCoverLetterSection = useCallback(() => {
    setCoverLetterSections((prev) => [
      ...prev,
      {
        id: `cl-${Date.now()}`,
        title: '',
        content: '',
        order: prev.length,
      },
    ]);
  }, []);

  const handleRemoveCoverLetterSection = useCallback(
    (id: string) => () => {
      setCoverLetterSections((prev) =>
        prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx })),
      );
    },
    [],
  );

  const handleUpdateCoverLetterSection = useCallback(
    (id: string, field: 'title' | 'content') => (value: string) => {
      setCoverLetterSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  // TextInput field change handler (2025 React best practice - curried)
  // TextInput passes value directly, not event
  const handleTextFieldChange = useCallback(
    <K extends keyof CreateResumeDto>(field: K) =>
      (value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value || undefined }));
      },
    [],
  );

  // TextArea field change handler (2025 React best practice - curried)
  const handleTextAreaChange = useCallback(
    <K extends keyof CreateResumeDto>(field: K) =>
      (value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
      },
    [],
  );

  // SelectInput field change handler (2025 React best practice - curried)
  // SelectInput passes value directly, not event
  const handleSelectFieldChange = useCallback(
    <K extends keyof CreateResumeDto>(field: K) =>
      (value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value || undefined }));
      },
    [],
  );

  // Memoized paper size options (2025 best practice - avoid inline arrays)
  const paperSizeOptions = useMemo(
    () => [
      { value: 'A4', label: t('resume.form.paperSizeA4') },
      { value: 'LETTER', label: t('resume.form.paperSizeLetter') },
    ],
    [t],
  );

  // Memoized handler for experiences change (2025 React best practice)
  const handleExperiencesChange = useCallback((experiences: Experience[]) => {
    // Only update formData - useEffect will call onChange automatically
    // This prevents double-calling onChange with stale formData
    setFormData((prev) => ({ ...prev, experiences }));
  }, []);

  // Memoized handler for skills change (2025 React best practice)
  const handleSkillsChange = useCallback((skills: Skill[]) => {
    setFormData((prev) => ({ ...prev, skills }));
  }, []);

  // Memoized handler for educations change (2025 React best practice)
  const handleEducationsChange = useCallback((educations: Education[]) => {
    setFormData((prev) => ({ ...prev, educations }));
  }, []);

  // Memoized handler for sections reorder (2025 React best practice)
  const handleSectionsReorder = useCallback((newSections: typeof sections) => {
    setSections(newSections);
    // Update will be saved when form is submitted
  }, []);

  // All sections sorted by order (for rendering)
  const sortedAllSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections],
  );

  // DnD sensors for form sections - with strict activation constraints
  const formSectionSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Must move 10px before drag starts
        delay: 150, // 150ms delay before drag activates
        tolerance: 5, // 5px tolerance during delay
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Handle drag end for form sections
  const handleFormSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = sections.findIndex((s) => s.id === active.id);
        const newIndex = sections.findIndex((s) => s.id === over.id);
        const newSections = arrayMove(sections, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
        setSections(newSections);
      }
    },
    [sections],
  );

  // Memoized form submit handler (2025 React best practice)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [formData, profilePhotoTempKey, onSubmit, resume?.id, t],
  );

  return (
    <form id="resume-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Fieldset to disable form during submission (2025 best practice) */}
      <fieldset disabled={submitting} className="space-y-4">
        {/* Resume Settings - Always expanded, not collapsible */}
        <CollapsibleSection
          title={t('resume.sections.settings')}
          icon="⚙️"
          isExpanded={true}
          onToggle={() => {}}
          variant="secondary"
          collapsibleOnDesktop={false}
        >
          <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
            {t('resume.descriptions.settings')}
          </p>

          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 gap-4 lg:gap-6">
            <TextInput
              label={t('resume.form.resumeTitle')}
              value={formData.title}
              onChange={handleTextFieldChange('title')}
              required
              placeholder={t('resume.form.resumeTitlePlaceholder')}
              className="mb-0"
            />
            <SelectInput
              label={t('resume.form.paperSize')}
              value={formData.paperSize || 'A4'}
              onChange={handleSelectFieldChange('paperSize')}
              options={paperSizeOptions}
              required
            />
          </div>
          <div className="mt-4">
            <TextInput
              label={t('resume.form.description')}
              value={formData.description || ''}
              onChange={handleTextFieldChange('description')}
              placeholder={t('resume.form.descriptionPlaceholder')}
              className="mb-0"
            />
          </div>

          {/* Section Order & Display - Embedded in Settings with collapsible feature */}
          <SectionOrderManager sections={sections} onReorder={handleSectionsReorder} embedded />
        </CollapsibleSection>

        {/* Basic Info */}
        <CollapsibleSection
          title={t('resume.sections.basicInfo')}
          icon="📋"
          isExpanded={!collapsedSections.basicInfo}
          onToggle={toggleSection('basicInfo')}
          variant="primary"
          collapsibleOnDesktop
        >
          <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
            {t('resume.descriptions.basicInfo')}
          </p>

          {/* Short fields: 3 columns */}
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <TextInput
              label={t('resume.form.name')}
              value={formData.name}
              onChange={handleTextFieldChange('name')}
              required
              placeholder={t('resume.form.namePlaceholder')}
              className="mb-0"
            />
            <TextInput
              label={t('resume.form.email')}
              type="email"
              value={formData.email}
              onChange={handleTextFieldChange('email')}
              required
              placeholder={t('resume.form.emailPlaceholder')}
              className="mb-0"
            />
            <TextInput
              label={t('resume.form.phone')}
              type="tel"
              value={formData.phone || ''}
              onChange={handleTextFieldChange('phone')}
              placeholder={t('resume.form.phonePlaceholder')}
              className="mb-0"
            />
          </div>

          {/* Long fields: 1 column on mobile, 2 columns on tablet+ */}
          <div className="mt-4 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
            <TextInput
              label={t('resume.address')}
              value={formData.address || ''}
              onChange={handleTextFieldChange('address')}
              placeholder={t('resume.form.addressPlaceholder')}
              hint={t('resume.form.addressHint')}
              className="mb-0"
            />
            <TextInput
              label={t('resume.form.github')}
              type="url"
              value={formData.github || ''}
              onChange={handleTextFieldChange('github')}
              placeholder={t('resume.form.githubPlaceholder')}
              className="mb-0"
            />
            <TextInput
              label={t('resume.form.blog')}
              type="url"
              value={formData.blog || ''}
              onChange={handleTextFieldChange('blog')}
              placeholder={t('resume.form.blogPlaceholder')}
              className="mb-0"
            />
            <TextInput
              label={t('resume.form.linkedin')}
              type="url"
              value={formData.linkedin || ''}
              onChange={handleTextFieldChange('linkedin')}
              placeholder={t('resume.form.linkedinPlaceholder')}
              className="mb-0"
            />
          </div>

          {/* Birth Date and Gender */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-1 sm:mb-2">
                {t('resume.birthDate')}
              </label>
              <input
                type="date"
                value={formData.birthDate || ''}
                onChange={handleBirthDateChange}
                className="w-full px-4 py-2 sm:py-4 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
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
                className="w-full px-4 py-2 sm:py-4 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
              >
                <option value="">{t('resume.genderPlaceholder')}</option>
                <option value="MALE">{t('resume.genderOptions.MALE')}</option>
                <option value="FEMALE">{t('resume.genderOptions.FEMALE')}</option>
                <option value="OTHER">{t('resume.genderOptions.OTHER')}</option>
                <option value="PREFER_NOT_TO_SAY">
                  {t('resume.genderOptions.PREFER_NOT_TO_SAY')}
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-2">
              {t('resume.form.profilePhoto')}
            </label>

            {/* Display preview (pending upload) or current uploaded photo */}
            {/* New photo preview (from temp upload) */}
            {profilePhotoPreview && (
              <div className="mb-4 flex items-center gap-4">
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
                    className="px-4 py-2 text-xs bg-theme-bg-elevated text-theme-text-secondary rounded-soft hover:bg-theme-bg-hover disabled:opacity-50"
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
                <div className="mb-4 flex items-center gap-4">
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
                    className="px-4 py-2 text-xs sm:text-sm bg-theme-status-error-bg text-theme-status-error-text rounded-soft hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {uploading ? t('resume.form.deletingPhoto') : t('resume.form.deletePhoto')}
                  </button>
                </div>
              )}
            {/* Warning for invalid blob URL in database */}
            {!profilePhotoPreview &&
              formData.profileImage &&
              formData.profileImage.startsWith('blob:') && (
                <div className="mb-4 p-4 bg-theme-status-error-bg border border-theme-status-error-border rounded-soft">
                  <p className="text-xs text-theme-status-error-text">
                    ⚠️ {t('resume.form.invalidImageUrl')}
                  </p>
                </div>
              )}

            {/* File upload input - always visible */}
            <div className="space-y-2">
              <label className="relative block cursor-pointer">
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoChange}
                  disabled={uploading}
                  className="block w-full text-sm text-theme-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-soft file:border-0 file:text-sm file:font-semibold file:bg-theme-bg-hover file:text-theme-primary hover:file:bg-theme-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-4">
            <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-2">
              {t('resume.form.militaryServiceKorean')}
            </label>
            <select
              value={formData.militaryService || ''}
              onChange={handleSelectChange('militaryService')}
              className="w-full px-4 py-2 sm:py-4 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
            >
              <option value="">{t('resume.form.militaryServiceSelect')}</option>
              <option value="COMPLETED">{t('resume.form.militaryServiceCompleted')}</option>
              <option value="EXEMPTED">{t('resume.form.militaryServiceExempted')}</option>
              <option value="NOT_APPLICABLE">
                {t('resume.form.militaryServiceNotApplicable')}
              </option>
            </select>
          </div>
          {formData.militaryService === 'COMPLETED' && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-2">
                  {t('resume.militaryService.rank')}
                </label>
                <select
                  value={formData.militaryRank || ''}
                  onChange={handleSelectChange('militaryRank')}
                  className="w-full px-4 py-2 sm:py-4 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
                >
                  <option value="">{t('resume.form.militaryRankSelect')}</option>
                  <option value="병장">{t('resume.militaryRanks.sergeant')}</option>
                  <option value="상병">{t('resume.militaryRanks.corporal')}</option>
                  <option value="일병">{t('resume.militaryRanks.pfc')}</option>
                  <option value="이병">{t('resume.militaryRanks.private')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-2">
                  {t('resume.militaryService.dischargeType')}
                </label>
                <select
                  value={formData.militaryDischargeType || ''}
                  onChange={handleSelectChange('militaryDischargeType')}
                  className="w-full px-4 py-2 sm:py-4 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
                >
                  <option value="">{t('resume.form.militaryDischargeSelect')}</option>
                  <option value="만기전역">{t('resume.dischargeTypes.honorable')}</option>
                  <option value="의병전역">{t('resume.dischargeTypes.medical')}</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-theme-text-secondary mb-2">
                  {t('resume.militaryService.servicePeriod')}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="month"
                    value={formData.militaryServiceStartDate || ''}
                    onChange={handleInputChange('militaryServiceStartDate')}
                    className="flex-1 px-4 py-2 sm:py-4 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
                  />
                  <span className="text-theme-text-tertiary text-sm">~</span>
                  <input
                    type="month"
                    value={formData.militaryServiceEndDate || ''}
                    onChange={handleInputChange('militaryServiceEndDate')}
                    className="flex-1 px-4 py-2 sm:py-4 text-sm sm:text-base bg-theme-bg-input border border-theme-border-default rounded-soft focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all text-theme-text-primary"
                  />
                </div>
                <p className="text-xs text-theme-text-tertiary mt-1 hidden sm:block">
                  {t('resume.form.yyyymmFormat')}
                </p>
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Dynamic Sections - Drag-and-drop reorderable, managed by SectionOrderManager */}
        <DndContext
          sensors={formSectionSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFormSectionDragEnd}
        >
          <SortableContext
            items={sortedAllSections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedAllSections.map((section) => {
              switch (section.type) {
                case FormSectionType.EXPERIENCE:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <ExperienceSection
                          experiences={formData.experiences || []}
                          onChange={handleExperiencesChange}
                          t={t}
                          isExpanded={!collapsedSections.experience}
                          onToggle={toggleSection('experience')}
                        />
                      </div>
                    </SortableFormSection>
                  );

                case FormSectionType.SKILLS:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <SkillsSection
                          skills={formData.skills || []}
                          onChange={handleSkillsChange}
                          t={t}
                          isExpanded={!collapsedSections.skills}
                          onToggle={toggleSection('skills')}
                        />
                      </div>
                    </SortableFormSection>
                  );

                case FormSectionType.EDUCATION:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <EducationSection
                          educations={formData.educations || []}
                          onChange={handleEducationsChange}
                          t={t}
                          isExpanded={!collapsedSections.education}
                          onToggle={toggleSection('education')}
                        />
                      </div>
                    </SortableFormSection>
                  );

                case FormSectionType.CERTIFICATE:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <CollapsibleSection
                          title={t('resume.sections.certifications')}
                          icon="🏆"
                          isExpanded={!collapsedSections.certificates}
                          onToggle={toggleSection('certificates')}
                          count={formData.certificates?.length}
                          variant="secondary"
                          collapsibleOnDesktop
                          headerAction={
                            <Button
                              variant="primary"
                              onClick={handleAddCertificate}
                              size="sm"
                              className="py-2 touch-manipulation"
                            >
                              + {t('common.add')}
                            </Button>
                          }
                        >
                          <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
                            {t('resume.descriptions.certifications')}
                          </p>

                          {formData.certificates && formData.certificates.length > 0 ? (
                            <div className="space-y-4">
                              {formData.certificates.map((cert, index) => (
                                <div
                                  key={index}
                                  className="border border-theme-border-subtle rounded-soft p-4 bg-theme-bg-input transition-colors duration-200"
                                >
                                  <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm sm:text-lg font-semibold text-theme-text-primary">
                                      {t('resume.form.certificateNumber', { index: index + 1 })}
                                    </h3>
                                    <Button
                                      variant="danger"
                                      onClick={handleRemoveCertificate(index)}
                                      size="sm"
                                      className="py-1.5 px-2 text-xs touch-manipulation"
                                    >
                                      <span className="hidden sm:inline">
                                        {t('resume.form.remove')}
                                      </span>
                                      <span className="sm:hidden">✕</span>
                                    </Button>
                                  </div>

                                  <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                    <TextInput
                                      label={t('resume.form.certificateName')}
                                      value={cert.name}
                                      onChange={handleUpdateCertificateField(index, 'name')}
                                      placeholder={t('resume.form.certificatePlaceholder')}
                                      required
                                    />

                                    <TextInput
                                      label={t('resume.form.issuer')}
                                      value={cert.issuer}
                                      onChange={handleUpdateCertificateField(index, 'issuer')}
                                      placeholder={t('resume.form.issuerPlaceholder')}
                                      required
                                    />

                                    <TextInput
                                      label={t('resume.form.issueDate')}
                                      type="month"
                                      value={cert.issueDate}
                                      onChange={handleUpdateCertificateField(index, 'issueDate')}
                                      required
                                    />

                                    <TextInput
                                      label={t('resume.form.expiryDate')}
                                      type="month"
                                      value={cert.expiryDate || ''}
                                      onChange={handleUpdateCertificateField(index, 'expiryDate')}
                                      placeholder={t('resume.form.expiryEmpty')}
                                    />

                                    <TextInput
                                      label={t('resume.form.credentialIdLabel')}
                                      value={cert.credentialId || ''}
                                      onChange={handleUpdateCertificateField(index, 'credentialId')}
                                      placeholder={t('resume.form.credentialId')}
                                    />

                                    <TextInput
                                      label={t('resume.form.credentialUrl')}
                                      type="url"
                                      value={cert.credentialUrl || ''}
                                      onChange={handleUpdateCertificateField(
                                        index,
                                        'credentialUrl',
                                      )}
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
                      </div>
                    </SortableFormSection>
                  );

                case FormSectionType.KEY_ACHIEVEMENTS:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <CollapsibleSection
                          title={t('resume.form.keyAchievements')}
                          icon="🏅"
                          isExpanded={!collapsedSections.keyAchievements}
                          onToggle={toggleSection('keyAchievements')}
                          count={formData.keyAchievements?.length}
                          variant="secondary"
                          collapsibleOnDesktop
                          headerAction={
                            <Button
                              variant="primary"
                              onClick={handleAddKeyAchievement}
                              size="sm"
                              className="py-2 touch-manipulation"
                            >
                              + {t('common.add')}
                            </Button>
                          }
                        >
                          <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
                            {t('resume.form.keyAchievementsHint')}
                          </p>
                          {(formData.keyAchievements || []).length > 0 ? (
                            <div className="space-y-4">
                              {(formData.keyAchievements || []).map((achievement, index) => (
                                <div
                                  key={index}
                                  className="border border-theme-border-subtle rounded-soft p-4 bg-theme-bg-input transition-colors duration-200"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                                    <div className="flex-1">
                                      <TextArea
                                        value={achievement}
                                        onChange={handleUpdateKeyAchievement(index)}
                                        rows={2}
                                        placeholder={t('resume.form.achievementPlaceholder', {
                                          index: index + 1,
                                        })}
                                      />
                                    </div>
                                    <Button
                                      variant="danger"
                                      onClick={handleRemoveAchievement(index)}
                                      size="sm"
                                      className="self-end sm:self-start py-2 touch-manipulation"
                                    >
                                      <span className="hidden sm:inline">
                                        {t('resume.form.remove')}
                                      </span>
                                      <span className="sm:hidden">✕</span>
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-theme-text-tertiary">
                              <p>{t('resume.form.noKeyAchievements')}</p>
                            </div>
                          )}
                        </CollapsibleSection>
                      </div>
                    </SortableFormSection>
                  );

                case FormSectionType.APPLICATION_REASON:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <CollapsibleSection
                          title={t('resume.form.applicationReason')}
                          icon="💡"
                          isExpanded={!collapsedSections.applicationReason}
                          onToggle={toggleSection('applicationReason')}
                          variant="primary"
                          collapsibleOnDesktop
                        >
                          <TextArea
                            value={formData.applicationReason || ''}
                            onChange={handleTextAreaChange('applicationReason')}
                            rows={4}
                            placeholder={t('resume.form.applicationReasonPlaceholder')}
                            hint={t('resume.form.applicationReasonHint')}
                          />
                        </CollapsibleSection>
                      </div>
                    </SortableFormSection>
                  );

                case FormSectionType.ATTACHMENTS:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <CollapsibleSection
                          title={t('resume.form.attachments')}
                          icon="📎"
                          isExpanded={!collapsedSections.attachments}
                          onToggle={toggleSection('attachments')}
                          count={
                            profilePhotoAttachments.length +
                            portfolioAttachments.length +
                            certificateAttachments.length
                          }
                          variant="secondary"
                          collapsibleOnDesktop
                        >
                          <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
                            {t('resume.form.attachmentsDesc')}
                          </p>

                          {!resume?.id && (
                            <div className="bg-theme-status-info-bg border border-theme-status-info-border rounded-soft p-4 mb-4">
                              <p className="text-theme-status-info-text text-sm">
                                💡 {t('resume.form.saveFirst')}
                              </p>
                            </div>
                          )}

                          {uploadError && (
                            <div className="bg-theme-status-error-bg border border-theme-status-error-border rounded-soft p-4 mb-4">
                              <p className="text-theme-status-error-text text-sm">
                                ⚠️ {uploadError}
                              </p>
                            </div>
                          )}

                          {/* Profile Photo */}
                          <div className="mb-6 p-4 border border-theme-border-subtle rounded-soft bg-theme-bg-hover">
                            <h4 className="text-sm font-semibold text-theme-text-primary mb-3">
                              📷 {t('resume.form.profilePhoto')}
                            </h4>

                            {profilePhotoAttachments.length > 0 ? (
                              <div className="space-y-2">
                                {profilePhotoAttachments.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between p-2 bg-theme-bg-card border border-theme-border-subtle rounded"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-lg">🖼️</span>
                                      <span className="text-sm text-theme-text-primary truncate">
                                        {file.fileName}
                                      </span>
                                      <span className="text-xs text-theme-text-tertiary flex-shrink-0">
                                        ({formatFileSize(file.fileSize)})
                                      </span>
                                    </div>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleDeleteAttachment(file.id)}
                                      className="flex-shrink-0"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <label
                                className={`block cursor-pointer ${!resume?.id || uploading ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleFileChange(AttachmentType.PROFILE_PHOTO)}
                                  disabled={!resume?.id || uploading}
                                />
                                <div className="border-2 border-dashed border-theme-border-default rounded-soft p-3 text-center hover:border-theme-primary transition-colors">
                                  <p className="text-xs sm:text-sm text-theme-text-secondary">
                                    {uploading
                                      ? t('resume.form.uploading')
                                      : t('resume.form.clickToUploadPhoto')}
                                  </p>
                                </div>
                              </label>
                            )}
                          </div>

                          {/* Portfolio Files */}
                          <div className="mb-6 p-4 border border-theme-border-subtle rounded-soft bg-theme-bg-hover">
                            <h4 className="text-sm font-semibold text-theme-text-primary mb-3">
                              📁 {t('resume.form.portfolio')}
                            </h4>

                            {portfolioAttachments.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {portfolioAttachments.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between p-2 bg-theme-bg-card border border-theme-border-subtle rounded"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-lg">📄</span>
                                      <span className="text-sm text-theme-text-primary truncate">
                                        {file.fileName}
                                      </span>
                                      <span className="text-xs text-theme-text-tertiary flex-shrink-0">
                                        ({formatFileSize(file.fileSize)})
                                      </span>
                                    </div>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleDeleteAttachment(file.id)}
                                      className="flex-shrink-0"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <label
                              className={`block cursor-pointer ${!resume?.id || uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                onChange={handleFileChange(AttachmentType.PORTFOLIO)}
                                disabled={!resume?.id || uploading}
                              />
                              <div className="border-2 border-dashed border-theme-border-default rounded-soft p-3 text-center hover:border-theme-primary transition-colors">
                                <p className="text-xs sm:text-sm text-theme-text-secondary">
                                  {uploading
                                    ? t('resume.form.uploading')
                                    : t('resume.form.clickToUploadPortfolio')}
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* Certificate Files */}
                          <div className="p-4 border border-theme-border-subtle rounded-soft bg-theme-bg-hover">
                            <h4 className="text-sm font-semibold text-theme-text-primary mb-3">
                              📜 {t('resume.form.certificateFiles')}
                            </h4>

                            {certificateAttachments.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {certificateAttachments.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between p-2 bg-theme-bg-card border border-theme-border-subtle rounded"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-lg">📄</span>
                                      <span className="text-sm text-theme-text-primary truncate">
                                        {file.fileName}
                                      </span>
                                      <span className="text-xs text-theme-text-tertiary flex-shrink-0">
                                        ({formatFileSize(file.fileSize)})
                                      </span>
                                    </div>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleDeleteAttachment(file.id)}
                                      className="flex-shrink-0"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <label
                              className={`block cursor-pointer ${!resume?.id || uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange(AttachmentType.CERTIFICATE)}
                                disabled={!resume?.id || uploading}
                              />
                              <div className="border-2 border-dashed border-theme-border-default rounded-soft p-3 text-center hover:border-theme-primary transition-colors">
                                <p className="text-xs sm:text-sm text-theme-text-secondary">
                                  {uploading
                                    ? t('resume.form.uploading')
                                    : t('resume.form.clickToUploadCertificate')}
                                </p>
                              </div>
                            </label>
                          </div>
                        </CollapsibleSection>
                      </div>
                    </SortableFormSection>
                  );

                case FormSectionType.COVER_LETTER:
                  return (
                    <SortableFormSection
                      key={section.id}
                      id={section.id}
                      dragHandleLabel={t('common.dragToReorder')}
                    >
                      <div className={section.visible ? '' : 'opacity-50'}>
                        <CollapsibleSection
                          title={t('resume.form.coverLetter')}
                          icon="📝"
                          isExpanded={!collapsedSections.coverLetter}
                          onToggle={toggleSection('coverLetter')}
                          count={coverLetterSections.length}
                          variant="primary"
                          collapsibleOnDesktop
                          headerAction={
                            <Button
                              variant="primary"
                              onClick={handleAddCoverLetterSection}
                              size="sm"
                              className="py-2 touch-manipulation"
                            >
                              + {t('common.add')}
                            </Button>
                          }
                        >
                          <p className="text-xs sm:text-sm text-theme-text-secondary mb-4">
                            {t('resume.form.coverLetterDescription')}
                          </p>

                          {coverLetterSections.length > 0 ? (
                            <div className="space-y-4">
                              {coverLetterSections.map((clSection, index) => (
                                <div
                                  key={clSection.id}
                                  className="border border-theme-border-subtle rounded-soft p-4 bg-theme-bg-input transition-colors duration-200"
                                >
                                  <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs text-theme-text-tertiary">
                                      #{index + 1}
                                    </span>
                                    <Button
                                      variant="danger"
                                      onClick={handleRemoveCoverLetterSection(clSection.id)}
                                      size="sm"
                                      className="py-1.5 px-2 text-xs touch-manipulation"
                                    >
                                      <span className="hidden sm:inline">
                                        {t('resume.form.remove')}
                                      </span>
                                      <span className="sm:hidden">✕</span>
                                    </Button>
                                  </div>

                                  <div className="space-y-4">
                                    <TextInput
                                      label={t('resume.coverLetter.sectionTitle')}
                                      value={clSection.title}
                                      onChange={handleUpdateCoverLetterSection(
                                        clSection.id,
                                        'title',
                                      )}
                                      placeholder={t('resume.coverLetter.sectionTitlePlaceholder')}
                                    />

                                    <TextArea
                                      label={t('resume.coverLetter.sectionContent')}
                                      value={clSection.content}
                                      onChange={handleUpdateCoverLetterSection(
                                        clSection.id,
                                        'content',
                                      )}
                                      rows={6}
                                      placeholder={t(
                                        'resume.coverLetter.sectionContentPlaceholder',
                                      )}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-theme-text-tertiary">
                              <p className="mb-4">{t('resume.coverLetter.empty')}</p>
                              <Button
                                variant="secondary"
                                onClick={handleAddCoverLetterSection}
                                size="sm"
                                className="touch-manipulation"
                              >
                                + {t('resume.coverLetter.addSection')}
                              </Button>
                            </div>
                          )}

                          <div className="mt-4 p-4 bg-theme-status-info-bg border border-theme-status-info-border rounded-soft">
                            <p className="text-xs sm:text-sm text-theme-status-info-text">
                              💡 <strong>{t('resume.coverLetter.tipTitle')}</strong>{' '}
                              {t('resume.coverLetter.tipDescription')}
                            </p>
                          </div>
                        </CollapsibleSection>
                      </div>
                    </SortableFormSection>
                  );

                default:
                  return null;
              }
            })}
          </SortableContext>
        </DndContext>

        {/* Submit Buttons - Simplified: Save + Go Back only */}
        {draftSaved && (
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-theme-status-success-bg border border-theme-status-success-border rounded-soft text-theme-status-success-text text-xs sm:text-sm">
              <span>✓</span>
              <span>{t('resume.success.saved')}</span>
            </div>
          </div>
        )}
      </fieldset>
    </form>
  );
}
