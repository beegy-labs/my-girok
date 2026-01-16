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
import { Button, Alert, Card } from '@my-girok/ui-components';
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

  // Memoized handlers (2025 best practice - rules.md)
  const togglePreview = useCallback(() => setShowPreview((prev) => !prev), []);
  const handleGoBack = useCallback(() => navigate(-1), [navigate]);
  const handleSaveClick = useCallback(() => {
    const form = document.getElementById('resume-form') as HTMLFormElement | null;
    form?.requestSubmit();
  }, []);

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
    <main className="min-h-screen bg-theme-bg-page transition-colors duration-200 pb-24">
      {/* Fixed Bottom Action Bar - Always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-theme-bg-card border-t border-theme-border-default safe-area-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3">
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={handleGoBack}>
              {t('common.goBack')}
            </Button>
            <Button variant="primary" onClick={handleSaveClick}>
              {t('common.save')}
            </Button>
            {/* Mobile/Tablet: Preview toggle */}
            <Button variant="secondary" onClick={togglePreview} className="lg:hidden">
              {showPreview ? t('edit.showForm') : t('common.preview')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {error && (
          <Alert variant="error" className="mb-4">
            {t('edit.error')} {error}
          </Alert>
        )}

        {/* PC: Side-by-side / Mobile: Toggle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className={showPreview ? 'hidden lg:block' : 'block'}>
            <ResumeForm resume={resume} onSubmit={handleSubmit} onChange={handleFormChange} />
          </div>

          {/* Preview */}
          <div className={showPreview ? 'block' : 'hidden lg:block'}>
            <div className="lg:sticky lg:top-20">
              {previewData ? (
                <ResumePreviewContainer
                  key={`preview-${previewData.id || 'new'}`}
                  resume={previewData}
                  maxHeight="calc(100svh - 200px)"
                  containerClassName="border-2 border-theme-border-default rounded-soft min-h-[60svh] lg:min-h-[500px]"
                />
              ) : (
                <Card
                  variant="secondary"
                  padding="xl"
                  radius="lg"
                  className="text-center border-2 border-theme-border-default min-h-[60svh] lg:min-h-[500px] flex items-center justify-center"
                >
                  <p className="text-theme-text-tertiary">{t('errors.startFilling')}</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
