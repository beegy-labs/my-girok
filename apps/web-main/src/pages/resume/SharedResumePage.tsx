import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPublicResume, Resume } from '../../api/resume';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';

export default function SharedResumePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSharedResume = useCallback(async (shareToken: string) => {
    try {
      const data = await getPublicResume(shareToken);
      setResume(data);
    } catch (err: any) {
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
  }, [t]);

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
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <CharacterMessage
          type={messageType}
          message={error}
          action={
            (isExpired || isInactive) && (
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {t('resume.shared.contactOwner')}
              </p>
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
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Action Bar - Common component with shared mode (PDF + print only) */}
      <ResumeActionBar resume={resume} mode="shared" />

      {/* Resume Preview */}
      <div className="py-4 sm:py-6 md:py-8 print:py-0 w-full max-w-full">
        <ResumePreviewContainer
          resume={resume}
          enableHorizontalScroll={true}
          minScale={0.6}
        />
      </div>
    </div>
  );
}
