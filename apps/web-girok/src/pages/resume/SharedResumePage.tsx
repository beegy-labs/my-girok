import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPublicResume, Resume } from '../../api/resume';
import { useResumeViewer, ResumeViewerError, createErrorMapper } from '../../hooks';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusMessage from '../../components/StatusMessage';

/**
 * Error mapper for SharedResumePage
 * Maps share-specific errors (expired, inactive, not found)
 */
const sharedErrorMapper = createErrorMapper({
  404: ResumeViewerError.NOT_FOUND,
  410: ResumeViewerError.EXPIRED,
  403: ResumeViewerError.INACTIVE,
});

/**
 * SharedResumePage - V0.0.1 AAA Workstation Design
 *
 * Uses useResumeViewer hook for data fetching (2025 best practices)
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function SharedResumePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  // Use custom hook for data fetching (2025 best practice)
  const {
    data: resume,
    loading,
    error,
  } = useResumeViewer<Resume>({
    fetchFn: () => getPublicResume(token!),
    deps: [token],
    skip: !token,
    errorMapper: sharedErrorMapper,
  });

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.shared.loading')} />;
  }

  if (error) {
    // Map error to StatusMessage type
    const statusType = (() => {
      switch (error) {
        case ResumeViewerError.EXPIRED:
          return 'expired' as const;
        case ResumeViewerError.INACTIVE:
          return 'no-permission' as const;
        case ResumeViewerError.NOT_FOUND:
        case ResumeViewerError.NO_ID:
          return 'not-found' as const;
        default:
          return 'error' as const;
      }
    })();

    // Map error to message
    const errorMessage = (() => {
      switch (error) {
        case ResumeViewerError.EXPIRED:
          return t('resume.shared.expired');
        case ResumeViewerError.INACTIVE:
          return t('resume.shared.inactive');
        case ResumeViewerError.NOT_FOUND:
        case ResumeViewerError.NO_ID:
          return t('resume.shared.notFound');
        default:
          return t('resume.shared.failed');
      }
    })();

    const showContactOwner =
      error === ResumeViewerError.EXPIRED || error === ResumeViewerError.INACTIVE;

    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-theme-bg-page">
        <StatusMessage
          type={statusType}
          message={errorMessage}
          action={
            showContactOwner && (
              <p className="text-sm text-theme-text-secondary">{t('resume.shared.contactOwner')}</p>
            )
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
      {/* Action Bar - V0.0.1 Style with shared mode (PDF + print only) */}
      <ResumeActionBar resume={resume} mode="shared" />

      {/* Resume Preview - V0.0.1 Full responsive scaling */}
      <div className="py-6 sm:py-10 md:py-14 print:py-0">
        <ResumePreviewContainer resume={resume} />
      </div>
    </main>
  );
}
