import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getResume, Resume, updateResume, PaperSize } from '../../api/resume';
import ResumePreview from '../../components/resume/ResumePreview';
import ShareLinkModal from '../../components/resume/ShareLinkModal';
import { exportResumeToPDF, printResume } from '../../utils/pdf';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';

export default function ResumePreviewPage() {
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadResume();
  }, [resumeId]);

  const loadResume = async () => {
    if (!resumeId) {
      setError('NO_ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getResume(resumeId);
      setResume(data);
      // Set paper size from resume if available
      if (data.paperSize) {
        setPaperSize(data.paperSize);
      }
    } catch (err: any) {
      console.error('Failed to load resume', err);
      if (err.response?.status === 404) {
        setError('NOT_FOUND');
      } else {
        setError('GENERAL');
      }
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
    return <LoadingSpinner fullScreen message="이력서를 불러오는 중..." />;
  }

  if (error === 'NOT_FOUND') {
    return (
      <CharacterMessage
        type="not-found"
        title="이력서를 찾을 수 없습니다"
        message="요청하신 이력서가 존재하지 않거나 삭제되었습니다."
        action={
          <button
            onClick={() => navigate('/resume/my')}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20"
          >
            내 이력서로 돌아가기
          </button>
        }
      />
    );
  }

  if (error) {
    return (
      <CharacterMessage
        type="error"
        title="이력서를 불러올 수 없습니다"
        message="이력서를 불러오는 중 오류가 발생했습니다."
        action={
          <button
            onClick={() => loadResume()}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20"
          >
            다시 시도
          </button>
        }
      />
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
      {/* Action Bar - Hidden when printing */}
      <div className="bg-amber-50/30 dark:bg-dark-bg-card border-b border-amber-100 dark:border-dark-border-subtle print:hidden shadow-sm dark:shadow-dark-sm transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-amber-900 dark:text-dark-text-primary">📄 Resume Preview</h1>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Preview and export your resume
              </p>
            </div>
            <button
              onClick={() => navigate(`/resume/edit/${resumeId}`)}
              className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-elevated hover:bg-gray-200 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary rounded-lg font-medium border border-gray-300 dark:border-dark-border-default transition-all"
            >
              ✍️ Edit
            </button>
          </div>

          {/* Paper Size Selector */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">Paper Size:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePaperSizeChange('A4')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    paperSize === 'A4'
                      ? 'bg-amber-700 dark:bg-amber-600 text-white dark:text-gray-900 shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20'
                      : 'bg-white dark:bg-dark-bg-elevated text-gray-700 dark:text-dark-text-primary border border-gray-300 dark:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover'
                  }`}
                >
                  A4 (210×297mm)
                </button>
                <button
                  onClick={() => handlePaperSizeChange('LETTER')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    paperSize === 'LETTER'
                      ? 'bg-amber-700 dark:bg-amber-600 text-white dark:text-gray-900 shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20'
                      : 'bg-white dark:bg-dark-bg-elevated text-gray-700 dark:text-dark-text-primary border border-gray-300 dark:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover'
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? '📥 Exporting...' : '📥 Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-6 py-3 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary font-semibold rounded-lg border border-gray-300 dark:border-dark-border-default transition-all"
            >
              🖨️ Print
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex-1 px-6 py-3 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-amber-700 dark:text-amber-400 font-semibold rounded-lg border border-amber-300 dark:border-amber-600 transition-all"
            >
              🔗 Share Link
            </button>
          </div>

          {/* Print Notice */}
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors duration-200">
            <p className="text-sm text-gray-700 dark:text-amber-200">
              💡 <strong>Tip:</strong> For best results, use "Download PDF" for digital distribution.
              Use "Print" for direct printing with optimized black & white settings.
            </p>
          </div>
        </div>
      </div>

      {/* Resume Preview - Grayscale resume with natural blending */}
      <div className="py-8 print:py-0 flex justify-center">
        <div className="bg-gray-100 dark:bg-dark-bg-secondary/50 p-8 rounded-lg shadow-inner dark:shadow-dark-inner transition-colors duration-200">
          <div className="bg-white rounded shadow-lg">
            <ResumePreview resume={resume} paperSize={paperSize} />
          </div>
        </div>
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
