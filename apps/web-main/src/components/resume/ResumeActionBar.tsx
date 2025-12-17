import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Resume } from '../../api/resume';
import { exportResumeToPDF, printResumePDF } from '../../utils/pdf';
import { Button } from '@my-girok/ui-components';
import ShareLinkModal from './ShareLinkModal';

export interface ResumeActionBarProps {
  resume: Resume;
  /**
   * Mode determines which actions are available:
   * - 'owner': Full access (edit, PDF, print, share) - for /resume/preview
   * - 'shared': Limited access (PDF, print only) - for /shared/ pages
   */
  mode: 'owner' | 'shared';
  /** Custom badge to show (optional) */
  badge?: {
    emoji: string;
    text: string;
    color: 'blue' | 'green';
  };
}

export default function ResumeActionBar({ resume, mode, badge }: ResumeActionBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const paperSize = resume.paperSize || 'A4';
      await printResumePDF(resume, { paperSize });
    } catch (error) {
      console.error('Print failed:', error);
      alert(t('resume.preview.printFailed'));
    } finally {
      setPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const paperSize = resume.paperSize || 'A4';
      const fileName = `${resume.name.replace(/\s+/g, '_')}_Resume_${paperSize}.pdf`;
      await exportResumeToPDF(resume, {
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

  const isOwner = mode === 'owner';

  // Default badge based on mode
  const displayBadge = badge || {
    emoji: isOwner ? '👁️' : '🔗',
    text: isOwner ? t('resume.preview.badge') : t('resume.shared.badge'),
    color: isOwner ? 'blue' as const : 'green' as const,
  };

  const badgeColorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  };

  return (
    <>
      <div className="print:hidden px-4 pt-4 sm:pt-6">
        <div className="max-w-5xl mx-auto theme-bg-card border theme-border-subtle rounded-xl sm:rounded-2xl shadow-theme-sm px-4 py-3 sm:py-4 transition-colors duration-200">
          {/* Header - Stack on mobile, side-by-side on larger screens */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold theme-text-primary">
                📄 {isOwner
                  ? t('resume.preview.title', { name: resume.name })
                  : t('resume.shared.resumeTitle', { name: resume.name })}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badgeColorClasses[displayBadge.color]}`}>
                  {displayBadge.emoji} {displayBadge.text}
                </span>
              </div>
            </div>
            {isOwner && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/resume/edit/${resume.id}`)}
                size="sm"
                className="self-start sm:self-auto"
              >
                ✍️ {t('resume.preview.edit')}
              </Button>
            )}
          </div>

          {/* Action Buttons - Responsive grid on mobile, flex on larger screens */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2 sm:gap-3">
            <Button
              variant="primary"
              onClick={handleExportPDF}
              loading={exporting}
              className="flex-1 whitespace-nowrap"
            >
              📥 {t('resume.preview.downloadPdf')}
            </Button>
            <Button
              variant="secondary"
              onClick={handlePrint}
              loading={printing}
              className="flex-1 whitespace-nowrap"
            >
              🖨️ {t('resume.preview.print')}
            </Button>
            {isOwner && (
              <Button
                variant="secondary"
                onClick={() => setShowShareModal(true)}
                className="col-span-2 sm:col-span-1 flex-1 whitespace-nowrap"
              >
                🔗 {t('resume.preview.shareLink')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal - Only shown in owner mode */}
      {isOwner && showShareModal && (
        <ShareLinkModal
          onClose={() => setShowShareModal(false)}
          resumeId={resume.id}
        />
      )}
    </>
  );
}
