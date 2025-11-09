import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDefaultResume, createResume, updateResume, CreateResumeDto, Resume } from '../../api/resume';
import ResumeForm from '../../components/resume/ResumeForm';

export default function ResumeEditPage() {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResume();
  }, []);

  const loadResume = async () => {
    try {
      setLoading(true);
      const data = await getDefaultResume();
      setResume(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No resume yet
        setResume(null);
      } else {
        setError('Failed to load resume');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateResumeDto) => {
    try {
      if (resume) {
        await updateResume(resume.id, data);
      } else {
        await createResume(data);
      }
      navigate(`/resume/${username}/preview`);
    } catch (err) {
      setError('Failed to save resume');
    }
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">✍️</span>
            <h1 className="text-3xl font-bold text-amber-900">
              {resume ? 'Edit Resume' : 'Create Resume'}
            </h1>
          </div>
          <p className="text-gray-700 ml-12">
            Fill in your information to create a professional resume
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <ResumeForm resume={resume} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
