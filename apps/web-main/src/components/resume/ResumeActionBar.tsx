import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Resume } from '../../api/resume';
import { exportResumeToPDF, printResumePDF } from '../../utils/pdf';
import { Button } from '@my-girok/ui-components';
import ShareLinkModal from './ShareLinkModal';
import { Download, Printer, Share2, Pencil, Eye, Link2, User } from 'lucide-react';

export interface ResumeActionBarProps {
  resume: Resume;
  /**
   * Mode determines which actions are available:
   * - 'owner': Full access (edit, PDF, print, share) - for /resume/preview
   * - 'public': Public profile view (edit if own, PDF, print) - for /resume/:username
   * - 'shared': Limited access (PDF, print only) - for /shared/ pages
   */
  mode: 'owner' | 'public' | 'shared';
  /** Username for public mode */
  username?: string;
  /** Whether viewing own profile (for public mode) */
  isOwnProfile?: boolean;
}

export default function ResumeActionBar({ resume, mode, username, isOwnProfile }: ResumeActionBarProps) {
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
  const isPublic = mode === 'public';
  const canEdit = isOwner || (isPublic && isOwnProfile);
  const canShare = isOwner;

  // Badge configuration based on mode
  const badgeConfig = {
    owner: { icon: Eye, text: t('resume.preview.badge'), color: 'blue' as const },
    public: { icon: User, text: t('resume.public.yourProfile'), color: 'green' as const },
    shared: { icon: Link2, text: t('resume.shared.badge'), color: 'green' as const },
  };

  const badge = badgeConfig[mode];

  const badgeColorClasses = {
    blue: 'bg-theme-status-info-bg text-theme-status-info-text',
    green: 'bg-theme-status-success-bg text-theme-status-success-text',
  };

  // Determine title and subtitle based on mode
  const getTitle = () => {
    if (isPublic) {
      return t('resume.preview.title', { name: resume.name });
    }
    return isOwner
      ? t('resume.preview.title', { name: resume.name })
      : t('resume.shared.resumeTitle', { name: resume.name });
  };

  const getSubtitle = () => {
    if (isPublic && username) {
      return `@${username}`;
    }
    return null;
  };

  // Determine edit route based on mode
  const getEditRoute = () => {
    if (isPublic) {
      return `/resume/edit/${resume.id}`;
    }
    return `/resume/edit/${resume.id}`;
  };

  const BadgeIcon = badge.icon;

  return (
    <>
      <div className="print:hidden px-4 pt-4 sm:pt-6">
        <div className="max-w-5xl mx-auto bg-theme-bg-card border border-theme-border-subtle rounded-xl sm:rounded-2xl shadow-theme-sm px-4 py-3 sm:py-4 transition-colors duration-200">
          {/* Header - Stack on mobile, side-by-side on larger screens */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-theme-text-primary">
                {getTitle()}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {getSubtitle() && (
                  <p className="text-xs sm:text-sm text-theme-text-secondary">{getSubtitle()}</p>
                )}
                {(isPublic && isOwnProfile) && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${badgeColorClasses[badge.color]}`}>
                    <BadgeIcon className="w-3 h-3" aria-hidden="true" />
                    {badge.text}
                  </span>
                )}
                {!isPublic && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${badgeColorClasses[badge.color]}`}>
                    <BadgeIcon className="w-3 h-3" aria-hidden="true" />
                    {badge.text}
                  </span>
                )}
              </div>
            </div>
            {canEdit && (
              <Button
                variant="secondary"
                onClick={() => navigate(getEditRoute())}
                size="sm"
                icon={<Pencil className="w-4 h-4" />}
                className="self-start sm:self-auto"
              >
                {t('resume.preview.edit')}
              </Button>
            )}
          </div>

          {/* Action Buttons - Responsive grid on mobile, flex on larger screens */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2 sm:gap-3">
            <Button
              variant="primary"
              onClick={handleExportPDF}
              loading={exporting}
              icon={<Download className="w-4 h-4" />}
              className="flex-1 whitespace-nowrap"
            >
              {t('resume.preview.downloadPdf')}
            </Button>
            <Button
              variant="secondary"
              onClick={handlePrint}
              loading={printing}
              icon={<Printer className="w-4 h-4" />}
              className="flex-1 whitespace-nowrap"
            >
              {t('resume.preview.print')}
            </Button>
            {canShare && (
              <Button
                variant="secondary"
                onClick={() => setShowShareModal(true)}
                icon={<Share2 className="w-4 h-4" />}
                className="col-span-2 sm:col-span-1 flex-1 whitespace-nowrap"
              >
                {t('resume.preview.shareLink')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal - Only shown in owner mode */}
      {canShare && showShareModal && (
        <ShareLinkModal
          onClose={() => setShowShareModal(false)}
          resumeId={resume.id}
        />
      )}
    </>
  );
}
