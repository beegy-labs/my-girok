import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Resume } from '../../api/resume';
import { exportResumeToPDF, printResumePDF } from '../../utils/pdf';
import { Button } from '@my-girok/ui-components';
import ShareLinkModal from './ShareLinkModal';
import { Download, Printer, Share2, Pencil, Eye, Link2, User } from 'lucide-react';

// Static badge color classes (2025 best practice - define constants outside component)
const BADGE_COLOR_CLASSES = {
  blue: 'bg-theme-status-info-bg text-theme-status-info-text',
  green: 'bg-theme-status-success-bg text-theme-status-success-text',
} as const;

/**
 * ResumeActionBar - V0.0.1 AAA Workstation Design
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
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

export default function ResumeActionBar({
  resume,
  mode,
  username,
  isOwnProfile,
}: ResumeActionBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Memoized print handler (2025 best practice)
  const handlePrint = useCallback(async () => {
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
  }, [resume, t]);

  // Memoized PDF export handler (2025 best practice)
  const handleExportPDF = useCallback(async () => {
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
  }, [resume, t]);

  const isOwner = mode === 'owner';
  const isPublic = mode === 'public';
  const canEdit = isOwner || (isPublic && isOwnProfile);
  const canShare = isOwner;

  // Memoized badge configuration based on mode (2025 best practice)
  const badge = useMemo(
    () =>
      ({
        owner: { icon: Eye, text: t('resume.preview.badge'), color: 'blue' as const },
        public: { icon: User, text: t('resume.public.yourProfile'), color: 'green' as const },
        shared: { icon: Link2, text: t('resume.shared.badge'), color: 'green' as const },
      })[mode],
    [mode, t],
  );

  // Memoized title and subtitle (2025 best practice)
  const title = useMemo(() => {
    if (isPublic) {
      return t('resume.preview.title', { name: resume.name });
    }
    return isOwner
      ? t('resume.preview.title', { name: resume.name })
      : t('resume.shared.resumeTitle', { name: resume.name });
  }, [isPublic, isOwner, resume.name, t]);

  const subtitle = useMemo(() => {
    if (isPublic && username) {
      return `@${username}`;
    }
    return null;
  }, [isPublic, username]);

  const editRoute = `/resume/edit/${resume.id}`;

  // Memoized navigation handler (2025 best practice)
  const handleNavigateToEdit = useCallback(() => {
    navigate(editRoute);
  }, [navigate, editRoute]);

  // Memoized share modal toggle (2025 best practice)
  const handleOpenShareModal = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
  }, []);

  const BadgeIcon = badge.icon;

  return (
    <>
      {/* V0.0.1 Action Bar */}
      <div className="print:hidden px-4 sm:px-8 pt-6 sm:pt-10">
        <div className="w-full lg:max-w-5xl mx-auto bg-theme-bg-card border-2 border-theme-border-default rounded-soft shadow-theme-md px-4 sm:px-6 lg:px-8 py-6 sm:py-8 transition-colors duration-200">
          {/* Header - V0.0.1 Style */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 pb-6 border-b-2 border-theme-border-default">
            <div>
              <h1 className="text-2xl sm:text-3xl text-theme-text-primary tracking-editorial italic mb-2 font-serif-title">
                {title}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                {subtitle && (
                  <p className="text-[11px] font-black uppercase tracking-brand-sm text-theme-text-secondary font-mono-brand">
                    {subtitle}
                  </p>
                )}
                {isPublic && isOwnProfile && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-brand-lg rounded-full ${BADGE_COLOR_CLASSES[badge.color]}`}
                  >
                    <BadgeIcon className="w-3 h-3" aria-hidden="true" />
                    {badge.text}
                  </span>
                )}
                {!isPublic && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-brand-lg rounded-full ${BADGE_COLOR_CLASSES[badge.color]}`}
                  >
                    <BadgeIcon className="w-3 h-3" aria-hidden="true" />
                    {badge.text}
                  </span>
                )}
              </div>
            </div>
            {canEdit && (
              <Button
                variant="secondary"
                onClick={handleNavigateToEdit}
                size="lg"
                rounded="default"
                icon={<Pencil className="w-4 h-4" />}
                className="self-start sm:self-auto"
              >
                {t('resume.preview.edit')}
              </Button>
            )}
          </div>

          {/* Action Buttons - V0.0.1 Style */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-3 sm:gap-4">
            <Button
              variant="primary"
              onClick={handleExportPDF}
              loading={exporting}
              size="lg"
              rounded="editorial"
              icon={<Download className="w-4 h-4" />}
              className="flex-1 whitespace-nowrap"
            >
              {t('resume.preview.downloadPdf')}
            </Button>
            <Button
              variant="secondary"
              onClick={handlePrint}
              loading={printing}
              size="lg"
              rounded="default"
              icon={<Printer className="w-4 h-4" />}
              className="flex-1 whitespace-nowrap"
            >
              {t('resume.preview.print')}
            </Button>
            {canShare && (
              <Button
                variant="secondary"
                onClick={handleOpenShareModal}
                size="lg"
                rounded="default"
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
        <ShareLinkModal onClose={handleCloseShareModal} resumeId={resume.id} />
      )}
    </>
  );
}
