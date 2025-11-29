import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getUserResume, Resume } from '../../api/resume';
import { useAuthStore } from '../../stores/authStore';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary px-4 transition-colors duration-200">
        <CharacterMessage
          type={isNotFound ? 'not-found' : 'error'}
          title={isNotFound ? '이력서를 찾을 수 없어요' : undefined}
          message={isNotFound ? '요청하신 사용자를 찾을 수 없습니다' : error}
          action={
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20"
            >
              홈으로 돌아가기
            </button>
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
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-amber-900 dark:text-dark-text-primary">
                📄 {resume.name}'s Resume
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">@{username}</p>
                {isOwnProfile && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full">
                    Your Profile
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {isOwnProfile && (
                <button
                  onClick={handleEdit}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 text-xs sm:text-sm font-semibold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 whitespace-nowrap"
                >
                  ✍️ Edit Resume
                </button>
              )}
              <button
                onClick={handlePrint}
                className="px-3 sm:px-4 py-2 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary text-xs sm:text-sm font-semibold rounded-lg border border-gray-300 dark:border-dark-border-default transition-all whitespace-nowrap"
              >
                🖨️ Print
              </button>
            </div>
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
