import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getResume, Resume } from '../../api/resume';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';
import { Button } from '@my-girok/ui-components';

export default function ResumePreviewPage() {
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define loadResume function to be reused (for initial load and retry)
  // Memoized with useCallback per project policy (no eslint-disable)
  const loadResume = useCallback(async () => {
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
    } catch (err: unknown) {
      console.error('Failed to load resume', err);
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        setError('NOT_FOUND');
      } else {
        setError('GENERAL');
      }
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  // Load resume when resumeId changes
  useEffect(() => {
    loadResume();
  }, [loadResume]);

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
          <Button variant="primary" onClick={() => navigate('/resume/my')}>
            {t('resume.preview.backToMyResumes')}
          </Button>
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
          <Button variant="primary" onClick={() => loadResume()}>
            {t('resume.preview.retry')}
          </Button>
        }
      />
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <div className="w-full min-h-screen">
      {/* Action Bar - Common component with owner mode (all actions enabled) */}
      <ResumeActionBar resume={resume} mode="owner" />

      {/* Resume Preview - Full width responsive container */}
      <div className="py-4 sm:py-6 md:py-8 print:py-0">
        <ResumePreviewContainer resume={resume} />
      </div>
    </div>
  );
}
