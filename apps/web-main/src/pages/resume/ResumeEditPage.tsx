import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultResume, createResume, updateResume, CreateResumeDto, Resume } from '../../api/resume';
import ResumeForm from '../../components/resume/ResumeForm';

export default function ResumeEditPage() {
  const navigate = useNavigate();
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
      navigate('/resume/preview');
    } catch (err) {
      setError('Failed to save resume');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {resume ? 'Edit Resume' : 'Create Resume'}
          </h1>
          <p className="mt-2 text-gray-600">
            Korean developer resume format
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <ResumeForm resume={resume} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
