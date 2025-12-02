import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getResume, Resume } from '../../api/resume';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';
import { PrimaryButton } from '../../components/ui';

export default function ResumePreviewPage() {
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define loadResume function to be reused (for initial load and retry)
  const loadResume = async () => {
    if (!resumeId) {
      setError('NO_ID');
      setLoading(false);
      return;
    }

    try {
      // Reset state
      setResume(null);
      setLoading(true);
      setError(null);

      // Load resume data
      const data = await getResume(resumeId);
      setResume(data);
    } catch (err: any) {
      console.error('Failed to load resume', err);
      if (err.response?.status === 404) {
        setError('NOT_FOUND');
      } else {
        setError('GENERAL');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load resume when resumeId changes (React 19 compatibility)
  useEffect(() => {
    loadResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.preview.loading')} />;
  }

  if (error === 'NOT_FOUND') {
    return (
      <CharacterMessage
        type="not-found"
        title={t('resume.preview.notFoundTitle')}
        message={t('resume.preview.notFoundMessage')}
        action={
          <PrimaryButton onClick={() => navigate('/resume/my')}>
            {t('resume.preview.backToMyResumes')}
          </PrimaryButton>
        }
      />
    );
  }

  if (error) {
    return (
      <CharacterMessage
        type="error"
        title={t('resume.preview.errorTitle')}
        message={t('resume.preview.errorMessage')}
        action={
          <PrimaryButton onClick={() => loadResume()}>
            {t('resume.preview.retry')}
          </PrimaryButton>
        }
      />
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
      {/* Action Bar - Common component with owner mode (all actions enabled) */}
      <ResumeActionBar resume={resume} mode="owner" />

      {/* Resume Preview */}
      <div className="py-4 sm:py-6 md:py-8 print:py-0 flex justify-center">
        <ResumePreviewContainer resume={resume} />
      </div>
    </div>
  );
}
