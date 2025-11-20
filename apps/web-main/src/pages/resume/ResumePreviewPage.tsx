import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getResume, Resume } from '../../api/resume';
import ResumePreviewContainer from '../../components/resume/ResumePreviewContainer';
import ShareLinkModal from '../../components/resume/ShareLinkModal';
import { exportResumeToPDF } from '../../utils/pdf';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CharacterMessage } from '../../components/characters';

export default function ResumePreviewPage() {
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const { t } = useTranslation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Define loadResume function to be reused (for initial load and retry)
  const loadResume = async () => {
    if (!resumeId) {
      setError('NO_ID');
      setLoading(false);
      return;
    }

    try {
      // Reset state
      setResume(null);
      setLoading(true);
      setError(null);
      setShowShareModal(false);
      setExporting(false);

      // Load resume data
      const data = await getResume(resumeId);
      setResume(data);
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

  // Load resume when resumeId changes (React 19 compatibility)
  useEffect(() => {
    loadResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!resume) return;

    setExporting(true);
    try {
      const paperSize = resume.paperSize || 'A4';
      const fileName = `${resume.name.replace(/\s+/g, '_')}_Resume_${paperSize}.pdf`;
      await exportResumeToPDF('resume-content', {
        paperSize,
        fileName,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(t('resume.preview.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message={t('resume.preview.loading')} />;
  }

  if (error === 'NOT_FOUND') {
    return (
      <CharacterMessage
        type="not-found"
        title={t('resume.preview.notFoundTitle')}
        message={t('resume.preview.notFoundMessage')}
        action={
          <button
            onClick={() => navigate('/resume/my')}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20"
          >
            {t('resume.preview.backToMyResumes')}
          </button>
        }
      />
    );
  }

  if (error) {
    return (
      <CharacterMessage
        type="error"
        title={t('resume.preview.errorTitle')}
        message={t('resume.preview.errorMessage')}
        action={
          <button
            onClick={() => loadResume()}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20"
          >
            {t('resume.preview.retry')}
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
      <div className="bg-amber-50/30 dark:bg-dark-bg-card border-b border-amber-100 dark:border-dark-border-subtle print:hidden sticky top-0 z-10 shadow-sm dark:shadow-dark-sm transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-bold text-amber-900 dark:text-dark-text-primary">
                📄 {t('resume.preview.title', { name: resume.name })}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                  👁️ {t('resume.preview.badge')}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/resume/edit/${resumeId}`)}
              className="px-4 py-2 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary font-semibold rounded-lg border border-gray-300 dark:border-dark-border-default transition-all"
            >
              ✍️ {t('resume.preview.edit')}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? t('resume.preview.exporting') : t('resume.preview.downloadPdf')}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-6 py-3 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary font-semibold rounded-lg border border-gray-300 dark:border-dark-border-default transition-all"
            >
              🖨️ {t('resume.preview.print')}
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex-1 px-6 py-3 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-amber-700 dark:text-amber-400 font-semibold rounded-lg border border-amber-300 dark:border-amber-600 transition-all"
            >
              🔗 {t('resume.preview.shareLink')}
            </button>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="py-6 sm:py-8 print:py-0 flex justify-center">
        <ResumePreviewContainer resume={resume} />
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
