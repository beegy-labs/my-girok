import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicResume, Resume } from '../../api/resume';
import ResumePreview from '../../components/resume/ResumePreview';

export default function SharedResumePage() {
  const { token } = useParams<{ token: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedResume(token);
    }
  }, [token]);

  const loadSharedResume = async (token: string) => {
    try {
      const data = await getPublicResume(token);
      setResume(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Share link not found');
      } else if (err.response?.status === 410) {
        setError('This share link has expired');
      } else if (err.response?.status === 403) {
        setError('This share link is no longer active');
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
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-amber-900 mb-2">
            {error === 'This share link has expired' ? 'Link Expired' :
             error === 'This share link is no longer active' ? 'Link Inactive' :
             'Not Found'}
          </h1>
          <p className="text-gray-700 mb-4">{error}</p>
          {error.includes('expired') || error.includes('inactive') ? (
            <p className="text-sm text-gray-600">
              Please contact the resume owner for a new link.
            </p>
          ) : null}
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
                <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                  🔗 Shared Link
                </span>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-all"
            >
              🖨️ Print
            </button>
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
