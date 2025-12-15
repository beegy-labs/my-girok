import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getUserResume, Resume } from '../../api/resume';
import { useAuthStore } from '../../stores/authStore';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';
import { PrimaryButton, SecondaryButton } from '../../components/ui';

export default function PublicResumePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
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
    } catch (err: any) {
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
    return <LoadingSpinner fullScreen message="이력서를 불러오는 중..." />;
  }

  if (error) {
    const isNotFound = error === 'User not found';

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <CharacterMessage
          type={isNotFound ? 'not-found' : 'error'}
          title={isNotFound ? '이력서를 찾을 수 없어요' : undefined}
          message={isNotFound ? '요청하신 사용자를 찾을 수 없습니다' : error}
          action={
            <PrimaryButton onClick={() => navigate('/')}>
              홈으로 돌아가기
            </PrimaryButton>
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
        <div className="max-w-5xl mx-auto bg-vintage-bg-card dark:bg-dark-bg-card border border-vintage-border-subtle dark:border-dark-border-subtle rounded-xl sm:rounded-2xl shadow-sm dark:shadow-dark-sm px-4 py-3 sm:py-4 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-vintage-text-primary dark:text-dark-text-primary">
                {resume.name}'s Resume
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs sm:text-sm text-vintage-text-secondary dark:text-dark-text-secondary">@{username}</p>
                {isOwnProfile && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-vintage-primary/20 dark:bg-vintage-primary/20 text-vintage-primary-light dark:text-vintage-primary-light rounded-full">
                    Your Profile
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {isOwnProfile && (
                <PrimaryButton onClick={handleEdit} size="sm">
                  Edit Resume
                </PrimaryButton>
              )}
              <SecondaryButton onClick={handlePrint} size="sm">
                Print
              </SecondaryButton>
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
