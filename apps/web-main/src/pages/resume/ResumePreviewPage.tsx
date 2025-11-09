import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyResume, Resume } from '../../api/resume';
import ResumePreview from '../../components/resume/ResumePreview';
import ShareLinkModal from '../../components/resume/ShareLinkModal';

export default function ResumePreviewPage() {
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    loadResume();
  }, []);

  const loadResume = async () => {
    try {
      const data = await getMyResume();
      setResume(data);
    } catch (err) {
      console.error('Failed to load resume', err);
      navigate('/resume/edit');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-xl font-semibold">Resume Preview</h1>
            <p className="text-sm text-gray-600">A4 optimized format</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/resume/edit')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Share
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* A4 Preview */}
      <div className="py-8 print:py-0">
        <ResumePreview resume={resume} />
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareLinkModal
          onClose={() => setShowShareModal(false)}
          resumeId={resume.id}
        />
      )}
    </div>
  );
}
