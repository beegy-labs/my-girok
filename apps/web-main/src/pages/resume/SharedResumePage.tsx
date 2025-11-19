import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPublicResume, Resume } from '../../api/resume';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';

export default function SharedResumePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedResume(token);
    }
  }, [token]);

  const loadSharedResume = async (token: string) => {
    try {
      const data = await getPublicResume(token);
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
  };

  const handlePrint = () => {
    window.print();
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary px-4 transition-colors duration-200">
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
      {/* Action Bar - Hidden when printing */}
      <div className="bg-amber-50/30 dark:bg-dark-bg-card border-b border-amber-100 dark:border-dark-border-subtle print:hidden sticky top-0 z-10 shadow-sm dark:shadow-dark-sm transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-bold text-amber-900 dark:text-dark-text-primary">
                📄 {t('resume.shared.resumeTitle', { name: resume.name })}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                  🔗 {t('resume.shared.badge')}
                </span>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary font-semibold rounded-lg border border-gray-300 dark:border-dark-border-default transition-all"
            >
              🖨️ {t('resume.shared.print')}
            </button>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="py-6 sm:py-8 print:py-0 flex justify-center">
        <ResumePreviewContainer resume={resume} />
      </div>
    </div>
  );
}
