import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDefaultResume, Resume, updateResume, PaperSize } from '../../api/resume';
import ResumePreview from '../../components/resume/ResumePreview';
import ShareLinkModal from '../../components/resume/ShareLinkModal';
import { exportResumeToPDF, printResume } from '../../utils/pdf';

export default function ResumePreviewPage() {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadResume();
  }, []);

  const loadResume = async () => {
    try {
      const data = await getDefaultResume();
      setResume(data);
      // Set paper size from resume if available
      if (data.paperSize) {
        setPaperSize(data.paperSize);
      }
    } catch (err) {
      console.error('Failed to load resume', err);
      navigate(`/resume/${username}/edit`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaperSizeChange = async (newSize: PaperSize) => {
    setPaperSize(newSize);
    // Save to backend
    if (resume) {
      try {
        await updateResume(resume.id, { paperSize: newSize });
      } catch (err) {
        console.error('Failed to save paper size preference', err);
      }
    }
  };

  const handlePrint = () => {
    printResume();
  };

  const handleExportPDF = async () => {
    if (!resume) return;

    setExporting(true);
    try {
      const fileName = `${resume.name.replace(/\s+/g, '_')}_Resume_${paperSize}.pdf`;
      await exportResumeToPDF('resume-content', {
        paperSize,
        fileName,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Bar - Hidden when printing */}
      <div className="bg-gray-50 border-b border-gray-200 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📄 Resume Preview</h1>
              <p className="text-sm text-gray-600 mt-1">
                Preview and export your resume
              </p>
            </div>
            <button
              onClick={() => navigate(`/resume/${username}/edit`)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium border border-gray-300 transition-all"
            >
              ✍️ Edit
            </button>
          </div>

          {/* Paper Size Selector */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Paper Size:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePaperSizeChange('A4')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    paperSize === 'A4'
                      ? 'bg-gray-700 text-white shadow-lg shadow-gray-700/30'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  A4 (210×297mm)
                </button>
                <button
                  onClick={() => handlePaperSizeChange('LETTER')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    paperSize === 'LETTER'
                      ? 'bg-gray-700 text-white shadow-lg shadow-gray-700/30'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Letter (216×279mm)
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gray-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? '📥 Exporting...' : '📥 Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-all"
            >
              🖨️ Print
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex-1 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-all"
            >
              🔗 Share Link
            </button>
          </div>

          {/* Print Notice */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">
              💡 <strong>Tip:</strong> For best results, use "Download PDF" for digital distribution.
              Use "Print" for direct printing with optimized black & white settings.
            </p>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="py-8 print:py-0">
        <ResumePreview resume={resume} paperSize={paperSize} />
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
