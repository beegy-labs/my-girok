import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getResume, createResume, updateResume, CreateResumeDto, Resume, SectionType } from '../../api/resume';
import ResumeForm from '../../components/resume/ResumeForm';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import { PrimaryButton, SecondaryButton } from '../../components/ui';

export default function ResumeEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Resume | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (resumeId) {
      loadResume();
    } else {
      // New resume creation - no need to load
      setLoading(false);
    }
  }, [resumeId]);

  const loadResume = async () => {
    if (!resumeId) return;

    try {
      setLoading(true);
      const data = await getResume(resumeId);
      setResume(data);
      setPreviewData(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(t('resume.errors.resumeNotFound'));
      } else {
        setError(t('resume.errors.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Memoize default sections to avoid recreating on every render
  const defaultSections = useMemo(() => [
    { id: '1', type: SectionType.SKILLS, order: 1, visible: true },
    { id: '2', type: SectionType.EXPERIENCE, order: 2, visible: true },
    { id: '3', type: SectionType.PROJECT, order: 3, visible: true },
    { id: '4', type: SectionType.EDUCATION, order: 4, visible: true },
    { id: '5', type: SectionType.CERTIFICATE, order: 5, visible: true },
  ], []);

  // Optimize handleFormChange with useCallback to prevent unnecessary re-renders
  const handleFormChange = useCallback((data: CreateResumeDto) => {
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
  }, [resume?.id, resume?.userId, resume?.sections, defaultSections]);

  const handleSubmit = async (data: CreateResumeDto) => {
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
    } catch (err: any) {
      // Log detailed error for debugging
      console.error('Resume save failed:', err);
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 dark:border-amber-400 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-dark-text-secondary font-medium">{t('errors.loadingResume')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
      {/* Mobile: Fixed bottom navigation bar for preview toggle */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-bg-card border-t border-gray-200 dark:border-dark-border-default p-3 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <SecondaryButton
            onClick={() => navigate(-1)}
            size="sm"
            className="flex-1 py-3 text-sm"
          >
            ← {t('common.back')}
          </SecondaryButton>
          <PrimaryButton
            onClick={() => setShowPreview(!showPreview)}
            size="sm"
            className="flex-1 py-3 text-sm"
          >
            {showPreview ? '📝 ' + t('edit.showForm') : '👁️ ' + t('edit.showPreview')}
          </PrimaryButton>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-1 sm:px-4 py-2 sm:py-8 pb-24 lg:pb-8">
        {/* Header - Simplified for mobile */}
        <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-xl sm:rounded-2xl shadow-md dark:shadow-dark-md p-3 sm:p-6 mb-4 sm:mb-6 transition-colors duration-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-3xl">✍️</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-amber-900 dark:text-dark-text-primary truncate">
                {resumeId ? t('edit.editResume') : t('edit.createNewResume')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-dark-text-secondary truncate">
                {resumeId ? t('edit.updateInfo') : t('edit.fillInfo')}
              </p>
            </div>
            {/* Desktop only preview toggle */}
            <PrimaryButton
              onClick={() => setShowPreview(!showPreview)}
              size="sm"
              className="hidden lg:flex"
            >
              {showPreview ? t('edit.showForm') : t('edit.showPreview')}
            </PrimaryButton>
          </div>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm sm:text-base">
            <strong>{t('edit.error')}</strong> {error}
          </div>
        )}

        {/* Side-by-side layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Form Section */}
          <div className={`${showPreview ? 'hidden lg:block' : 'block'}`}>
            <ResumeForm
              resume={resume}
              onSubmit={handleSubmit}
              onChange={handleFormChange}
            />
          </div>

          {/* Live Preview Section */}
          <div className={`${showPreview ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-4 sm:top-8">
              {/* Preview Header - Hidden on mobile since we have bottom bar */}
              <div className="bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle rounded-xl sm:rounded-2xl shadow-md dark:shadow-dark-md p-3 sm:p-6 mb-3 sm:mb-4 transition-colors duration-200">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-1 sm:mb-2 flex items-center gap-2">
                  <span>👁️</span>
                  {t('edit.livePreview')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">
                  {t('edit.previewDescription')}
                </p>
              </div>

              {previewData ? (
                <ResumePreviewContainer
                  resume={previewData}
                  maxHeight="calc(100vh - 280px)"
                  containerClassName="border-2 border-gray-300 dark:border-dark-border-default rounded-xl"
                />
              ) : (
                <div className="bg-gray-100 dark:bg-dark-bg-secondary/50 p-4 rounded-xl shadow-inner dark:shadow-dark-inner transition-colors duration-200">
                  <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-dark-text-tertiary text-sm sm:text-base">
                    <p>{t('errors.startFilling')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
