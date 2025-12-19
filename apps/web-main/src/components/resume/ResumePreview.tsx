import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import { usePDF } from '@react-pdf/renderer';
import { Resume } from '../../api/resume';
import { PAPER_SIZES, PaperSizeKey } from '../../constants/paper';
import ResumePdfDocument from './ResumePdfDocument';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

  // Use external paper size if provided, otherwise use internal state
  const paperSize = externalPaperSize || internalPaperSize;
  const paper = PAPER_SIZES[paperSize];

  // Handle paper size change
  const handlePaperSizeChange = useCallback(
    (size: PaperSizeKey) => {
      setInternalPaperSize(size);
      onPaperSizeChange?.(size);
    },
    [onPaperSizeChange],
  );

  // Generate PDF document
  const pdfDocument = useMemo(
    () => (
      <ResumePdfDocument resume={resume} paperSize={paperSize} isGrayscaleMode={isGrayscaleMode} />
    ),
    [resume, paperSize, isGrayscaleMode],
  );

  // Use PDF hook to generate blob
  const [instance, updateInstance] = usePDF({ document: pdfDocument });

  // Re-generate PDF when resume or settings change
  useEffect(() => {
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
          <div className="max-w-5xl mx-auto bg-theme-bg-card border border-theme-border-subtle rounded-xl sm:rounded-2xl shadow-sm shadow-theme-sm px-4 py-3 transition-colors duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Paper Size Selector */}
                <div className="flex items-center gap-1 bg-theme-bg-elevated rounded-lg p-1">
                  <button
                    onClick={() => handlePaperSizeChange('A4')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      paperSize === 'A4'
                        ? 'bg-theme-bg-card text-theme-text-primary shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text-primary'
                    }`}
                    title={t('resume.paperSize.a4Title', { defaultValue: 'A4 (210mm x 297mm)' })}
                  >
                    A4
                  </button>
                  <button
                    onClick={() => handlePaperSizeChange('LETTER')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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
                <div className="bg-theme-status-info-bg border border-theme-status-info-border rounded-lg px-2 py-1 text-xs text-theme-status-info-text">
                  {Math.round(scale * 100)}%
                </div>
                {numPages > 0 && (
                  <div className="bg-theme-status-success-bg border border-theme-status-success-border rounded-lg px-2 py-1 text-xs text-theme-status-success-text">
                    {numPages} {t('resume.preview.pages', { defaultValue: 'pages' })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-theme-bg-elevated rounded-lg p-1">
                  <button
                    onClick={handleSetContinuousView}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
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
        {instance.loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary"></div>
            <span className="ml-3 text-theme-text-secondary">
              {t('resume.preview.generating', { defaultValue: 'Generating PDF...' })}
            </span>
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
                  className="px-3 py-1 text-sm font-medium text-theme-text-primary bg-theme-bg-card border border-theme-border-default rounded-md hover:bg-theme-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('resume.preview.prevPage', { defaultValue: 'Previous' })}
                </button>
                <span className="text-sm text-theme-text-secondary">
                  {currentPage} / {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= numPages}
                  className="px-3 py-1 text-sm font-medium text-theme-text-primary bg-theme-bg-card border border-theme-border-default rounded-md hover:bg-theme-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
