import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserResume, Resume } from '../../api/resume';
import { useAuthStore } from '../../stores/authStore';
import ResumePreview from '../../components/resume/ResumePreview';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-amber-900 mb-2">Not Found</h1>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Bar - Hidden when printing */}
      <div className="bg-amber-50/30 border-b border-amber-100 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-bold text-amber-900">
                📄 {resume.name}'s Resume
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">@{username}</p>
                {isOwnProfile && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                    Your Profile
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {isOwnProfile && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-amber-700/30"
                >
                  ✍️ Edit Resume
                </button>
              )}
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-all"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="py-8 print:py-0">
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}
