import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getUserResume, Resume } from '../../api/resume';
import { useAuthStore } from '../../stores/authStore';
import { useResumeViewer, ResumeViewerError, createErrorMapper } from '../../hooks';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusMessage from '../../components/StatusMessage';
import { Button } from '@my-girok/ui-components';

/**
 * Error mapper for PublicResumePage
 * Maps 404 to NOT_FOUND (user not found or no public resume)
 */
const publicErrorMapper = createErrorMapper({
  404: ResumeViewerError.NOT_FOUND,
});

/**
 * PublicResumePage - V0.0.1 AAA Workstation Design
 *
 * Uses useResumeViewer hook for data fetching (2025 best practices)
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function PublicResumePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isOwnProfile = user?.username === username;

  // Use custom hook for data fetching (2025 best practice)
  const {
    data: resume,
    loading,
    error,
  } = useResumeViewer<Resume>({
    fetchFn: () => getUserResume(username!),
    deps: [username],
    skip: !username,
    errorMapper: publicErrorMapper,
  });

  // Memoized navigation handler (2025 React best practice)
  const handleBackToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.preview.loading')} />;
  }

  if (error) {
    const isNotFound = error === ResumeViewerError.NOT_FOUND || error === ResumeViewerError.NO_ID;

    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-theme-bg-page">
        <StatusMessage
          type={isNotFound ? 'not-found' : 'error'}
          title={isNotFound ? t('resume.preview.notFoundTitle') : undefined}
          message={isNotFound ? t('resume.preview.notFoundMessage') : t('resume.public.loadFailed')}
          action={
            <Button variant="primary" size="lg" rounded="editorial" onClick={handleBackToHome}>
              {t('common.backToHome')}
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
    <main className="w-full min-h-screen bg-theme-bg-page">
      {/* Action Bar - V0.0.1 Style with public mode */}
      <ResumeActionBar
        resume={resume}
        mode="public"
        username={username}
        isOwnProfile={isOwnProfile}
      />

      {/* Resume Preview - V0.0.1 Full responsive scaling */}
      <div className="py-6 sm:py-10 md:py-14 print:py-0">
        <ResumePreviewContainer resume={resume} />
      </div>
    </main>
  );
}
