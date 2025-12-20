import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getResume, Resume } from '../../api/resume';
import { useResumeViewer, ResumeViewerError, createErrorMapper } from '../../hooks';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusMessage from '../../components/StatusMessage';
import { Button } from '@my-girok/ui-components';

/**
 * Error mapper for ResumePreviewPage
 * Maps 404 to NOT_FOUND, others to UNKNOWN
 */
const previewErrorMapper = createErrorMapper({
  404: ResumeViewerError.NOT_FOUND,
});

/**
 * ResumePreviewPage - V0.0.1 AAA Workstation Design
 *
 * Uses useResumeViewer hook for data fetching (2025 best practices)
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function ResumePreviewPage() {
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const { t } = useTranslation();

  // Use custom hook for data fetching (2025 best practice)
  const {
    data: resume,
    loading,
    error,
    retry,
  } = useResumeViewer<Resume>({
    fetchFn: () => getResume(resumeId!),
    deps: [resumeId],
    skip: !resumeId,
    errorMapper: previewErrorMapper,
  });

  // Memoized navigation handler (2025 React best practice)
  const handleBackToMyResumes = useCallback(() => {
    navigate('/resume/my');
  }, [navigate]);

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.preview.loading')} />;
  }

  if (error === ResumeViewerError.NO_ID || error === ResumeViewerError.NOT_FOUND) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 pt-nav bg-theme-bg-page">
        <StatusMessage
          type="not-found"
          title={t('resume.preview.notFoundTitle')}
          message={t('resume.preview.notFoundMessage')}
          action={
            <Button variant="primary" size="lg" rounded="editorial" onClick={handleBackToMyResumes}>
              {t('resume.preview.backToMyResumes')}
            </Button>
          }
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 pt-nav bg-theme-bg-page">
        <StatusMessage
          type="error"
          title={t('resume.preview.errorTitle')}
          message={t('resume.preview.errorMessage')}
          action={
            <Button variant="primary" size="lg" rounded="editorial" onClick={retry}>
              {t('resume.preview.retry')}
            </Button>
          }
        />
      </main>
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <main className="w-full min-h-screen bg-theme-bg-page pt-nav">
      {/* Action Bar - V0.0.1 Style with owner mode (all actions enabled) */}
      <ResumeActionBar resume={resume} mode="owner" />

      {/* Resume Preview - V0.0.1 Full width responsive container */}
      <div className="py-6 sm:py-10 md:py-14 print:py-0">
        <ResumePreviewContainer resume={resume} />
      </div>
    </main>
  );
}
