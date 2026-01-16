import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import { pdf } from '@react-pdf/renderer';
import { Resume } from '../../api/resume';
import { PAPER_SIZES, PaperSizeKey } from '../../constants/paper';
import ResumePdfDocument from './ResumePdfDocument';
import { imageToBase64 } from '../../utils/imageProxy';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker (local, no external CDN)
// Worker file is copied to public folder during build
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

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
 * Uses @react-pdf/renderer pdf() function (NOT usePDF hook) to generate PDF.
 * This bypasses React reconciler to avoid "Eo is not a function" errors with React 19.
 * GitHub Issues: #3164, #3187, #2756
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

  // PDF generation state (replaces usePDF hook)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use external paper size if provided, otherwise use internal state
  const paperSize = externalPaperSize || internalPaperSize;
  const paper = PAPER_SIZES[paperSize];

  // Check if resume has a valid profile image URL
  const hasProfileImage = Boolean(
    resume.profileImage?.trim() && !resume.profileImage.startsWith('blob:'),
  );

  // Load profile image as base64 (Best Practice 2025: avoids CORS issues in PDF generation)
  useEffect(() => {
    let isMounted = true;
    const imageUrl = resume.profileImage?.trim();

    if (imageUrl && !imageUrl.startsWith('blob:')) {
      setIsImageLoading(true);
      imageToBase64(imageUrl)
        .then((base64) => {
          if (isMounted) {
            setProfileImageBase64(base64);
          }
        })
        .catch(() => {
          // Silently handle errors - placeholder will be shown in PDF
          if (isMounted) {
            setProfileImageBase64(null);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsImageLoading(false);
          }
        });
    } else {
      setProfileImageBase64(null);
      setIsImageLoading(false);
    }

    return () => {
      isMounted = false;
    };
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
      profileImage:
        resume.profileImage?.trim() && !resume.profileImage.startsWith('blob:')
          ? resume.profileImage
          : undefined,
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

  // Determine if we should wait for image loading
  const shouldWaitForImage = hasProfileImage && !profileImageBase64 && isImageLoading;

  // Generate PDF using pdf() function (bypasses React reconciler)
  // This is the key fix for React 19 compatibility
  useEffect(() => {
    // Don't generate if waiting for image
    if (shouldWaitForImage) {
      return;
    }

    // Cancel previous generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const generatePdf = async () => {
      setPdfLoading(true);
      setPdfError(null);
      setIsTimedOut(false);

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        setIsTimedOut(true);
        setPdfLoading(false);
      }, PDF_GENERATION_TIMEOUT);

      try {
        // Create document element (not rendered to React tree)
        const doc = (
          <ResumePdfDocument
            resume={safeResume}
            paperSize={paperSize}
            isGrayscaleMode={isGrayscaleMode}
            profileImageBase64={profileImageBase64}
          />
        );

        // Generate PDF blob using pdf() function
        // This does NOT use React reconciler, avoiding the "Eo is not a function" error
        const blob = await pdf(doc).toBlob();

        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setPdfBlob(blob);
        setPdfError(null);
      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        console.error('PDF generation error:', error);
        setPdfError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setPdfLoading(false);
      }
    };

    generatePdf();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [safeResume, paperSize, isGrayscaleMode, profileImageBase64, shouldWaitForImage]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setIsTimedOut(false);
    setPdfBlob(null);
    // Trigger re-generation by updating a dummy state
    setPdfError(null);
  }, []);

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
          <div className="w-full lg:max-w-5xl mx-auto bg-theme-bg-card border border-theme-border-subtle rounded-soft shadow-sm shadow-theme-sm px-4 py-4 transition-colors duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
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
        {/* Show loading state for both image loading and PDF generation */}
        {(shouldWaitForImage || pdfLoading) && !isTimedOut ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary"></div>
            <span className="ml-3 text-theme-text-secondary">
              {shouldWaitForImage
                ? t('resume.preview.loadingImage', { defaultValue: 'Loading image...' })
                : t('resume.preview.generating', { defaultValue: 'Generating PDF...' })}
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
        ) : pdfError ? (
          <div className="flex items-center justify-center py-20 text-theme-status-error-text">
            <span>
              {t('resume.preview.error', { defaultValue: 'Error generating PDF' })}: {pdfError}
            </span>
          </div>
        ) : pdfBlob ? (
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
              file={pdfBlob}
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
