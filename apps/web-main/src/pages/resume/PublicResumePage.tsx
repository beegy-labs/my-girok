import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getUserResume, Resume } from '../../api/resume';
import { useAuthStore } from '../../stores/authStore';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ResumeActionBar from '../../components/resume/ResumeActionBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusMessage from '../../components/StatusMessage';
import { Button } from '@my-girok/ui-components';

/**
 * PublicResumePage - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function PublicResumePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = user?.username === username;

  // Memoized with useCallback per project policy
  const loadResume = useCallback(async (targetUsername: string) => {
    try {
      const data = await getUserResume(targetUsername);
      setResume(data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        setError('User not found');
      } else {
        setError('Failed to load resume');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) {
      loadResume(username);
    }
  }, [username, loadResume]);

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.preview.loading')} />;
  }

  if (error) {
    const isNotFound = error === 'User not found';

    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ paddingTop: 'var(--nav-height-editorial, 80px)' }}
      >
        <StatusMessage
          type={isNotFound ? 'not-found' : 'error'}
          title={isNotFound ? t('resume.preview.notFoundTitle') : undefined}
          message={isNotFound ? t('resume.preview.notFoundMessage') : error}
          action={
            <Button variant="primary" size="lg" rounded="editorial" onClick={() => navigate('/')}>
              {t('common.backToHome')}
            </Button>
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
    </div>
  );
}
