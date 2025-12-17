import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getUserResume, Resume } from '../../api/resume';
import { useAuthStore } from '../../stores/authStore';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusMessage from '../../components/StatusMessage';
import { Button } from '@my-girok/ui-components';

export default function PublicResumePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (username) {
      loadResume(username);
    }
  }, [username]);

  const loadResume = async (username: string) => {
    try {
      const data = await getUserResume(username);
      setResume(data);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) {
        setError('User not found');
      } else {
        setError('Failed to load resume');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    navigate(`/resume/${username}/edit`);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.preview.loading')} />;
  }

  if (error) {
    const isNotFound = error === 'User not found';

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <StatusMessage
          type={isNotFound ? 'not-found' : 'error'}
          title={isNotFound ? t('resume.preview.notFoundTitle') : undefined}
          message={isNotFound ? t('resume.preview.notFoundMessage') : error}
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
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
    <div className="w-full min-h-screen">
      {/* Action Bar - Hidden when printing */}
      <div className="print:hidden px-4 pt-4 sm:pt-6">
        <div className="max-w-5xl mx-auto bg-theme-bg-card border border-theme-border-subtle rounded-xl sm:rounded-2xl shadow-theme-sm px-4 py-3 sm:py-4 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-theme-text-primary">
                {t('resume.preview.title', { name: resume.name })}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs sm:text-sm text-theme-text-secondary">@{username}</p>
                {isOwnProfile && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-theme-primary/20 text-theme-primary-light rounded-full">
                    {t('resume.public.yourProfile')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {isOwnProfile && (
                <Button variant="primary" onClick={handleEdit} size="sm">
                  {t('resume.edit')}
                </Button>
              )}
              <Button variant="secondary" onClick={handlePrint} size="sm">
                {t('resume.preview.print')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Preview - Full responsive scaling */}
      <div className="py-4 sm:py-6 md:py-8 print:py-0">
        <ResumePreviewContainer resume={resume} />
      </div>
    </div>
  );
}
