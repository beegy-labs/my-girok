import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  getResume,
  createResume,
  updateResume,
  CreateResumeDto,
  Resume,
  SectionType,
} from '../../api/resume';
import ResumeForm from '../../components/resume/ResumeForm';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import { Button, Alert, Card, SectionBadge } from '@my-girok/ui-components';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * ResumeEditPage - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function ResumeEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Resume | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Memoized navigation handlers (2025 best practice)
  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const togglePreview = useCallback(() => setShowPreview((prev) => !prev), []);

  const loadResume = useCallback(async () => {
    if (!resumeId) return;

    try {
      setLoading(true);
      const data = await getResume(resumeId);
      setResume(data);
      setPreviewData(data);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) {
        setError(t('resume.errors.resumeNotFound'));
      } else {
        setError(t('resume.errors.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [resumeId, t]);

  useEffect(() => {
    if (resumeId) {
      loadResume();
    } else {
      // New resume creation - no need to load
      setLoading(false);
    }
  }, [resumeId, loadResume]);

  // Memoize default sections to avoid recreating on every render
  const defaultSections = useMemo(
    () => [
      { id: '1', type: SectionType.SKILLS, order: 1, visible: true },
      { id: '2', type: SectionType.EXPERIENCE, order: 2, visible: true },
      { id: '3', type: SectionType.PROJECT, order: 3, visible: true },
      { id: '4', type: SectionType.EDUCATION, order: 4, visible: true },
      { id: '5', type: SectionType.CERTIFICATE, order: 5, visible: true },
    ],
    [],
  );

  // Optimize handleFormChange with useCallback to prevent unnecessary re-renders
  const handleFormChange = useCallback(
    (data: CreateResumeDto) => {
      // Update preview with current form data
      const mockResume: Resume = {
        id: resume?.id || 'preview',
        userId: resume?.userId || 'preview',
        title: data.title,
        description: data.description,
        isDefault: data.isDefault || false,
        paperSize: data.paperSize,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        github: data.github,
        blog: data.blog,
        linkedin: data.linkedin,
        portfolio: data.portfolio,
        summary: data.summary,
        keyAchievements: data.keyAchievements,
        profileImage: data.profileImage,
        birthYear: data.birthYear, // deprecated - for backward compatibility
        birthDate: data.birthDate,
        gender: data.gender,
        militaryService: data.militaryService,
        militaryDischarge: data.militaryDischarge,
        militaryRank: data.militaryRank,
        militaryDischargeType: data.militaryDischargeType,
        militaryServiceStartDate: data.militaryServiceStartDate,
        militaryServiceEndDate: data.militaryServiceEndDate,
        coverLetter: data.coverLetter,
        applicationReason: data.applicationReason,
        sections: resume?.sections || defaultSections,
        skills: (data.skills || []).map((s, i) => ({ ...s, id: `skill-${i}` })),
        experiences: (data.experiences || []).map((e, i) => ({ ...e, id: `exp-${i}` })),
        projects: [], // NOTE: Independent projects field removed - projects are now only handled as nested ExperienceProject within experiences
        educations: (data.educations || []).map((e, i) => ({ ...e, id: `edu-${i}` })),
        certificates: (data.certificates || []).map((c, i) => ({ ...c, id: `cert-${i}` })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPreviewData(mockResume);
    },
    [resume?.id, resume?.userId, resume?.sections, defaultSections],
  );

  // Memoized submit handler (2025 best practice)
  const handleSubmit = useCallback(
    async (data: CreateResumeDto) => {
      try {
        if (resumeId) {
          // Update existing resume
          const updated = await updateResume(resumeId, data);
          setResume(updated);
          setPreviewData(updated);
          // Direct navigation - React Router v7 supports this without issues
          navigate(`/resume/preview/${updated.id}`);
        } else {
          // Create new resume
          const created = await createResume(data);
          setResume(created);
          setPreviewData(created);
          // Direct navigation - React Router v7 supports this without issues
          navigate(`/resume/preview/${created.id}`);
        }
      } catch (error: unknown) {
        // Log detailed error for debugging
        console.error('Resume save failed:', error);
        const err = error as { response?: { data?: { message?: string | string[] } } };
        if (err.response?.data?.message) {
          console.error('Server error message:', err.response.data.message);
          // Show specific validation errors if available
          const serverMessage = Array.isArray(err.response.data.message)
            ? err.response.data.message.join(', ')
            : err.response.data.message;
          setError(`${t('resume.errors.saveFailed')}: ${serverMessage}`);
        } else {
          setError(t('resume.errors.saveFailed'));
        }
      }
    },
    [resumeId, navigate, t],
  );

  if (loading) {
    return <LoadingSpinner fullScreen message={t('errors.loadingResume')} />;
  }

  return (
    <div className="min-h-screen bg-theme-bg-page transition-colors duration-200 pt-nav">
      {/* Mobile: Fixed bottom navigation bar for preview toggle - V0.0.1 Style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-theme-bg-card border-t-2 border-theme-border-default p-4 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <Button
            variant="secondary"
            onClick={handleBack}
            size="lg"
            rounded="default"
            className="flex-1"
          >
            ← {t('common.back')}
          </Button>
          <Button
            variant="primary"
            onClick={togglePreview}
            size="lg"
            rounded="editorial"
            className="flex-1"
          >
            {showPreview ? '📝 ' + t('edit.showForm') : '👁️ ' + t('edit.showPreview')}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 pb-32 lg:pb-12">
        {/* Header - V0.0.1 Editorial Style */}
        <header className="mb-10 sm:mb-14">
          <SectionBadge className="mb-4">{t('badge.careerArchive')}</SectionBadge>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl text-theme-text-primary tracking-editorial italic mb-3 font-serif-title">
                {resumeId ? t('edit.editResume') : t('edit.createNewResume')}
              </h1>
              <p className="text-[11px] font-black uppercase tracking-brand text-theme-text-secondary font-mono-brand">
                {resumeId ? t('edit.updateInfo') : t('edit.fillInfo')}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={togglePreview}
              size="lg"
              rounded="editorial"
              className="hidden lg:flex"
            >
              {showPreview ? t('edit.showForm') : t('edit.showPreview')}
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="error" className="mb-4 sm:mb-6">
            {t('edit.error')} {error}
          </Alert>
        )}

        {/* Side-by-side layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Form Section */}
          <div className={`${showPreview ? 'hidden lg:block' : 'block'}`}>
            <ResumeForm resume={resume} onSubmit={handleSubmit} onChange={handleFormChange} />
          </div>

          {/* Live Preview Section - V0.0.1 Style */}
          <div className={`${showPreview ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-4 sm:top-8">
              {/* Preview Header - V0.0.1 Style */}
              <Card
                variant="secondary"
                padding="lg"
                radius="lg"
                className="mb-4 sm:mb-6 border-2 border-theme-border-default"
              >
                <h2 className="text-xl sm:text-2xl text-theme-text-primary tracking-editorial italic mb-2 flex items-center gap-3 font-serif-title">
                  <span>👁️</span>
                  {t('edit.livePreview')}
                </h2>
                <p className="text-[11px] font-black uppercase tracking-brand-sm text-theme-text-secondary font-mono-brand">
                  {t('edit.previewDescription')}
                </p>
              </Card>

              {previewData ? (
                <ResumePreviewContainer
                  resume={previewData}
                  maxHeight="calc(100vh - 320px)"
                  containerClassName="border-2 border-theme-border-default rounded-input"
                />
              ) : (
                <Card
                  variant="secondary"
                  padding="xl"
                  radius="lg"
                  className="text-center border-2 border-theme-border-default"
                >
                  <p className="text-theme-text-tertiary text-base">{t('errors.startFilling')}</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
