import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import { usePDF } from '@react-pdf/renderer';
import { Resume } from '../../api/resume';
import { PAPER_SIZES, PaperSizeKey } from '../../constants/paper';
import ResumePdfDocument from './ResumePdfDocument';
import { imageToBase64 } from '../../utils/imageProxy';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// PDF generation timeout (15 seconds)
const PDF_GENERATION_TIMEOUT = 15000;

/**
 * Get capped device pixel ratio for high-quality rendering
 * Caps at 2 to prevent performance issues on very high DPI devices
 * while maintaining good quality on retina displays
 */
function getCappedDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(2, window.devicePixelRatio || 1);
}

interface ResumePreviewProps {
  resume: Resume;
  paperSize?: PaperSizeKey;
  /** External scale factor - controlled by parent container */
  scale?: number;
  /** Show toolbar with view mode toggle */
  showToolbar?: boolean;
  /** Callback when paper size changes */
  onPaperSizeChange?: (size: PaperSizeKey) => void;
}

/**
 * Resume Preview Component
 *
 * Uses @react-pdf/renderer to generate PDF and react-pdf to display it.
 * This approach ensures pixel-perfect PDF preview without CSS transform issues.
 */
export default function ResumePreview({
  resume,
  paperSize: externalPaperSize,
  scale = 1,
  showToolbar = true,
  onPaperSizeChange,
}: ResumePreviewProps) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState<number>(0);
  const [isGrayscaleMode, setIsGrayscaleMode] = useState(false);
  const [viewMode, setViewMode] = useState<'continuous' | 'paginated'>('paginated');
  const [currentPage, setCurrentPage] = useState(1);
  const [internalPaperSize, setInternalPaperSize] = useState<PaperSizeKey>(
    (externalPaperSize || resume.paperSize || 'A4') as PaperSizeKey,
  );
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use external paper size if provided, otherwise use internal state
  const paperSize = externalPaperSize || internalPaperSize;
  const paper = PAPER_SIZES[paperSize];

  // Load profile image as base64 (Best Practice 2025: avoids CORS issues in PDF generation)
  useEffect(() => {
    if (resume.profileImage) {
      imageToBase64(resume.profileImage).then((base64) => {
        setProfileImageBase64(base64);
      });
    } else {
      setProfileImageBase64(null);
    }
  }, [resume.profileImage]);

  // Handle paper size change (curried - 2025 best practice)
  const handlePaperSizeChange = useCallback(
    (size: PaperSizeKey) => () => {
      setInternalPaperSize(size);
      onPaperSizeChange?.(size);
    },
    [onPaperSizeChange],
  );

  // Create safe resume object to prevent PDF rendering crashes on empty strings
  // @react-pdf/renderer reconciler bug: crashes when dynamic content is deleted
  const safeResume = useMemo(
    () => ({
      ...resume,
      name: resume.name || '',
      email: resume.email || '',
      phone: resume.phone || '',
      address: resume.address || '',
      github: resume.github || '',
      blog: resume.blog || '',
      linkedin: resume.linkedin || '',
      portfolio: resume.portfolio || '',
      summary: resume.summary || '',
      applicationReason: resume.applicationReason || '',
      coverLetter: resume.coverLetter || '',
      keyAchievements: resume.keyAchievements || [],
      skills: resume.skills || [],
      experiences: resume.experiences || [],
      projects: resume.projects || [],
      educations: resume.educations || [],
      certificates: resume.certificates || [],
      sections: resume.sections || [],
    }),
    [resume],
  );

  // Generate PDF document (uses base64 image to avoid CORS issues)
  const pdfDocument = useMemo(
    () => (
      <ResumePdfDocument
        resume={safeResume}
        paperSize={paperSize}
        isGrayscaleMode={isGrayscaleMode}
        profileImageBase64={profileImageBase64}
      />
    ),
    [safeResume, paperSize, isGrayscaleMode, profileImageBase64],
  );

  // Use PDF hook to generate blob
  const [instance, updateInstance] = usePDF({ document: pdfDocument });

  // Re-generate PDF when resume or settings change
  useEffect(() => {
    updateInstance(pdfDocument);
  }, [pdfDocument, updateInstance]);

  // Timeout handling for PDF generation
  useEffect(() => {
    if (instance.loading) {
      setIsTimedOut(false);
      timeoutRef.current = setTimeout(() => {
        if (instance.loading) {
          setIsTimedOut(true);
        }
      }, PDF_GENERATION_TIMEOUT);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [instance.loading, retryCount]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setIsTimedOut(false);
    setRetryCount((prev) => prev + 1);
    updateInstance(pdfDocument);
  }, [pdfDocument, updateInstance]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  // Calculate display width based on scale (memoized)
  const displayWidth = useMemo(() => paper.width.px * scale, [paper.width.px, scale]);

  // Get capped device pixel ratio for high-quality rendering on all devices
  const devicePixelRatio = useMemo(() => getCappedDevicePixelRatio(), []);

  // Page navigation handlers (memoized)
  const goToPrevPage = useCallback(() => setCurrentPage((prev) => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(
    () => setCurrentPage((prev) => Math.min(numPages, prev + 1)),
    [numPages],
  );

  // View mode handlers (memoized)
  const handleSetContinuousView = useCallback(() => setViewMode('continuous'), []);
  const handleSetPaginatedView = useCallback(() => setViewMode('paginated'), []);
  const handleToggleGrayscale = useCallback(() => setIsGrayscaleMode((prev) => !prev), []);

  return (
    <div className="relative">
      {/* Toolbar (hidden in print) */}
      {showToolbar && (
        <div className="print:hidden mb-6 relative z-0">
          <div className="w-full lg:max-w-5xl mx-auto bg-theme-bg-card border border-theme-border-subtle rounded-soft shadow-sm shadow-theme-sm px-4 py-3 transition-colors duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Paper Size Selector */}
                <div className="flex items-center gap-1 bg-theme-bg-elevated rounded-soft p-1">
                  <button
                    onClick={handlePaperSizeChange('A4')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-soft transition-all ${
                      paperSize === 'A4'
                        ? 'bg-theme-bg-card text-theme-text-primary shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text-primary'
                    }`}
                    title={t('resume.paperSize.a4Title', { defaultValue: 'A4 (210mm x 297mm)' })}
                  >
                    A4
                  </button>
                  <button
                    onClick={handlePaperSizeChange('LETTER')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-soft transition-all ${
                      paperSize === 'LETTER'
                        ? 'bg-theme-bg-card text-theme-text-primary shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text-primary'
                    }`}
                    title={t('resume.paperSize.letterTitle', {
                      defaultValue: 'Letter (215.9mm x 279.4mm)',
                    })}
                  >
                    Letter
                  </button>
                </div>
                <div className="bg-theme-status-info-bg border border-theme-status-info-border rounded-soft px-2 py-1 text-xs text-theme-status-info-text">
                  {Math.round(scale * 100)}%
                </div>
                {numPages > 0 && (
                  <div className="bg-theme-status-success-bg border border-theme-status-success-border rounded-soft px-2 py-1 text-xs text-theme-status-success-text">
                    {numPages} {t('resume.preview.pages', { defaultValue: 'pages' })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-theme-bg-elevated rounded-soft p-1">
                  <button
                    onClick={handleSetContinuousView}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-soft transition-all ${
                      viewMode === 'continuous'
                        ? 'bg-theme-bg-card text-theme-text-primary shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text-primary'
                    }`}
                    title={t('resume.preview.continuousView')}
                  >
                    {t('resume.preview.continuousView')}
                  </button>
                  <button
                    onClick={handleSetPaginatedView}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-soft transition-all ${
                      viewMode === 'paginated'
                        ? 'bg-theme-bg-card text-theme-text-primary shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text-primary'
                    }`}
                    title={t('resume.preview.paginatedView')}
                  >
                    {t('resume.preview.paginatedView')}
                  </button>
                </div>
                {/* Grayscale Toggle */}
                <button
                  onClick={handleToggleGrayscale}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-soft border-2 transition-all ${
                    isGrayscaleMode
                      ? 'bg-theme-bg-elevated text-theme-text-primary border-theme-border-strong'
                      : 'bg-theme-bg-card text-theme-text-primary border-theme-border-default hover:border-theme-border-strong hover:bg-theme-bg-hover'
                  }`}
                  title={
                    isGrayscaleMode
                      ? t('resume.preview.switchToColorMode')
                      : t('resume.preview.switchToGrayscaleMode')
                  }
                >
                  {isGrayscaleMode
                    ? t('resume.preview.grayscaleMode')
                    : t('resume.preview.colorMode')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex flex-col items-center">
        {instance.loading && !isTimedOut ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary"></div>
            <span className="ml-3 text-theme-text-secondary">
              {t('resume.preview.generating', { defaultValue: 'Generating PDF...' })}
            </span>
          </div>
        ) : isTimedOut ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="text-theme-text-secondary text-center">
              {t('resume.preview.timeout', {
                defaultValue: 'PDF generation is taking longer than expected.',
              })}
              <br />
              {t('resume.preview.timeoutHint', {
                defaultValue: 'This may be due to font loading issues.',
              })}
            </span>
            <button
              onClick={handleRetry}
              className="px-4 py-2 text-sm font-medium text-white bg-theme-primary rounded-soft hover:bg-theme-primary-hover transition-colors"
            >
              {t('resume.preview.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : instance.error ? (
          <div className="flex items-center justify-center py-20 text-theme-status-error-text">
            <span>
              {t('resume.preview.error', { defaultValue: 'Error generating PDF' })}:{' '}
              {instance.error}
            </span>
          </div>
        ) : instance.blob ? (
          <>
            {/* Page Navigation (for paginated mode) */}
            {viewMode === 'paginated' && numPages > 1 && (
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-sm font-medium text-theme-text-primary bg-theme-bg-card border border-theme-border-default rounded-soft hover:bg-theme-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('resume.preview.prevPage', { defaultValue: 'Previous' })}
                </button>
                <span className="text-sm text-theme-text-secondary">
                  {currentPage} / {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= numPages}
                  className="px-3 py-1 text-sm font-medium text-theme-text-primary bg-theme-bg-card border border-theme-border-default rounded-soft hover:bg-theme-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('resume.preview.nextPage', { defaultValue: 'Next' })}
                </button>
              </div>
            )}

            {/* PDF Document */}
            <Document
              file={instance.blob}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
                </div>
              }
              error={
                <div className="flex items-center justify-center py-20 text-theme-status-error-text">
                  {t('resume.preview.loadError', { defaultValue: 'Failed to load PDF' })}
                </div>
              }
              className="flex flex-col items-center"
            >
              {viewMode === 'continuous' ? (
                // Show all pages
                Array.from(new Array(numPages), (_, index) => (
                  <div key={`page_${index + 1}`} className="mb-4 shadow-theme-lg">
                    <Page
                      pageNumber={index + 1}
                      width={displayWidth}
                      devicePixelRatio={devicePixelRatio}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className={isGrayscaleMode ? 'grayscale' : ''}
                    />
                  </div>
                ))
              ) : (
                // Show single page
                <div className="shadow-theme-lg">
                  <Page
                    pageNumber={currentPage}
                    width={displayWidth}
                    devicePixelRatio={devicePixelRatio}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className={isGrayscaleMode ? 'grayscale' : ''}
                  />
                </div>
              )}
            </Document>
          </>
        ) : null}
      </div>
    </div>
  );
}
