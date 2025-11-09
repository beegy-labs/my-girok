import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicResume, Resume } from '../../api/resume';
import ResumePreview from '../../components/resume/ResumePreview';

export default function PublicResumePage() {
  const { token } = useParams<{ token: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadResume(token);
    }
  }, [token]);

  const loadResume = async (token: string) => {
    try {
      const data = await getPublicResume(token);
      setResume(data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('This share link has expired or been deactivated');
      } else if (err.response?.status === 404) {
        setError('Invalid share link');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Action Bar - Hidden when printing */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">{resume.name}'s Resume</h1>
            <p className="text-sm text-gray-600">Shared via My-Girok</p>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* A4 Preview */}
      <div className="py-8 print:py-0">
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}
