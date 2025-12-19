import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPublicResume, Resume } from '../../api/resume';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusMessage from '../../components/StatusMessage';

/**
 * SharedResumePage - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function SharedResumePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSharedResume = useCallback(
    async (shareToken: string) => {
      try {
        const data = await getPublicResume(shareToken);
        setResume(data);
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 404) {
          setError(t('resume.shared.notFound'));
        } else if (err.response?.status === 410) {
          setError(t('resume.shared.expired'));
        } else if (err.response?.status === 403) {
          setError(t('resume.shared.inactive'));
        } else {
          setError(t('resume.shared.failed'));
        }
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (token) {
      loadSharedResume(token);
    }
  }, [token, loadSharedResume]);

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.shared.loading')} />;
  }

  if (error) {
    const isExpired = error === t('resume.shared.expired');
    const isInactive = error === t('resume.shared.inactive');
    const isNotFound = error === t('resume.shared.notFound');

    let messageType: 'expired' | 'no-permission' | 'not-found' | 'error' = 'error';
    if (isExpired) messageType = 'expired';
    else if (isInactive) messageType = 'no-permission';
    else if (isNotFound) messageType = 'not-found';

    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
      >
        <StatusMessage
          type={messageType}
          message={error}
          action={
            (isExpired || isInactive) && (
              <p className="text-sm text-theme-text-secondary">{t('resume.shared.contactOwner')}</p>
            )
          }
        />
      </div>
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <div
      className="w-full min-h-screen bg-theme-bg-page"
      style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
    >
      {/* Action Bar - V0.0.1 Style with shared mode (PDF + print only) */}
      <ResumeActionBar resume={resume} mode="shared" />

      {/* Resume Preview - V0.0.1 Full responsive scaling */}
      <div className="py-6 sm:py-10 md:py-14 print:py-0">
        <ResumePreviewContainer resume={resume} />
      </div>
    </div>
  );
}
