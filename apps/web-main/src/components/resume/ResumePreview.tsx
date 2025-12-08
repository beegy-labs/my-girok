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

interface ResumePreviewProps {
  resume: Resume;
  paperSize?: PaperSizeKey;
  /** External scale factor - controlled by parent container */
  scale?: number;
  /** Show toolbar with view mode toggle */
  showToolbar?: boolean;
}

/**
 * Resume Preview Component
 *
 * Uses @react-pdf/renderer to generate PDF and react-pdf to display it.
 * This approach ensures pixel-perfect PDF preview without CSS transform issues.
 */
export default function ResumePreview({
  resume,
  paperSize = 'A4',
  scale = 1,
  showToolbar = true,
}: ResumePreviewProps) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState<number>(0);
  const [isGrayscaleMode, setIsGrayscaleMode] = useState(false);
  const [viewMode, setViewMode] = useState<'continuous' | 'paginated'>('paginated');
  const [currentPage, setCurrentPage] = useState(1);

  const paper = PAPER_SIZES[paperSize];

  // Generate PDF document
  const pdfDocument = useMemo(
    () => (
      <ResumePdfDocument
        resume={resume}
        paperSize={paperSize}
        isGrayscaleMode={isGrayscaleMode}
      />
    ),
    [resume, paperSize, isGrayscaleMode]
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

  // Page navigation handlers (memoized)
  const goToPrevPage = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(() => setCurrentPage(prev => Math.min(numPages, prev + 1)), [numPages]);

  // View mode handlers (memoized)
  const handleSetContinuousView = useCallback(() => setViewMode('continuous'), []);
  const handleSetPaginatedView = useCallback(() => setViewMode('paginated'), []);
  const handleToggleGrayscale = useCallback(() => setIsGrayscaleMode(prev => !prev), []);

  return (
    <div className="relative">
      {/* Toolbar (hidden in print) */}
      {showToolbar && (
        <div className="print:hidden mb-6 relative z-0">
          <div className="max-w-5xl mx-auto bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle rounded-xl sm:rounded-2xl shadow-sm dark:shadow-dark-sm px-4 py-3 transition-colors duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-gray-100 dark:bg-dark-bg-elevated border border-gray-300 dark:border-dark-border-default rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-dark-text-primary">
                  {paperSize} ({paper.css.width} x {paper.css.height})
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1 text-xs text-blue-700 dark:text-blue-300">
                  {Math.round(scale * 100)}%
                </div>
                {numPages > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-2 py-1 text-xs text-green-700 dark:text-green-300">
                    {numPages} {t('resume.preview.pages', { defaultValue: 'pages' })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-bg-elevated rounded-lg p-1">
                  <button
                    onClick={handleSetContinuousView}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      viewMode === 'continuous'
                        ? 'bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary shadow-sm'
                        : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary'
                    }`}
                    title={t('resume.preview.continuousView')}
                  >
                    {t('resume.preview.continuousView')}
                  </button>
                  <button
                    onClick={handleSetPaginatedView}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      viewMode === 'paginated'
                        ? 'bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary shadow-sm'
                        : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary'
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
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200 hover:bg-gray-900 dark:hover:bg-gray-100'
                      : 'bg-white dark:bg-dark-bg-elevated text-gray-700 dark:text-dark-text-primary border-gray-300 dark:border-dark-border-default hover:border-gray-400 dark:hover:border-dark-border-hover hover:bg-gray-50 dark:hover:bg-dark-bg-hover'
                  }`}
                  title={isGrayscaleMode ? t('resume.preview.switchToColorMode') : t('resume.preview.switchToGrayscaleMode')}
                >
                  {isGrayscaleMode ? t('resume.preview.grayscaleMode') : t('resume.preview.colorMode')}
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">{t('resume.preview.generating', { defaultValue: 'Generating PDF...' })}</span>
          </div>
        ) : instance.error ? (
          <div className="flex items-center justify-center py-20 text-red-600">
            <span>{t('resume.preview.error', { defaultValue: 'Error generating PDF' })}: {instance.error}</span>
          </div>
        ) : instance.blob ? (
          <>
            {/* Page Navigation (for paginated mode) */}
            {viewMode === 'paginated' && numPages > 1 && (
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('resume.preview.prevPage', { defaultValue: 'Previous' })}
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} / {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= numPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }
              error={
                <div className="flex items-center justify-center py-20 text-red-600">
                  {t('resume.preview.loadError', { defaultValue: 'Failed to load PDF' })}
                </div>
              }
              className="flex flex-col items-center"
            >
              {viewMode === 'continuous' ? (
                // Show all pages
                Array.from(new Array(numPages), (_, index) => (
                  <div key={`page_${index + 1}`} className="mb-4 shadow-lg">
                    <Page
                      pageNumber={index + 1}
                      width={displayWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className={isGrayscaleMode ? 'grayscale' : ''}
                    />
                  </div>
                ))
              ) : (
                // Show single page
                <div className="shadow-lg">
                  <Page
                    pageNumber={currentPage}
                    width={displayWidth}
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
