import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore - pagedjs doesn't have type definitions
import { Previewer } from 'pagedjs';
import { Resume } from '../../api/resume';
import { PAPER_SIZES, PaperSizeKey } from '../../constants/paper';
import ResumeContent from './ResumeContent';
import '../../styles/resume-print.css';

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
 * This component handles:
 * - Display of resume content with optional scaling (controlled by parent)
 * - View mode toggle (continuous vs paginated)
 * - Paged.js integration for print-optimized paginated view
 * - Grayscale mode toggle
 *
 * IMPORTANT: Scale is now controlled externally by ResumePreviewContainer.
 * This component no longer calculates its own scale - it receives scale as a prop.
 */
export default function ResumePreview({
  resume,
  paperSize = 'A4',
  scale = 1,
  showToolbar = true,
}: ResumePreviewProps) {
  const { t } = useTranslation();
  const [isGrayscaleMode, setIsGrayscaleMode] = useState(false);
  const [viewMode, setViewMode] = useState<'continuous' | 'paginated'>('paginated');
  const [pagedContainerHeight, setPagedContainerHeight] = useState<number>(0);
  const [continuousContainerHeight, setContinuousContainerHeight] = useState<number>(0);
  const pagedContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const paper = PAPER_SIZES[paperSize];

  // Update container heights after render
  const updateContainerHeights = useCallback(() => {
    if (pagedContainerRef.current) {
      const height = pagedContainerRef.current.scrollHeight || pagedContainerRef.current.offsetHeight;
      setPagedContainerHeight(height);
    }
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight || contentRef.current.offsetHeight;
      setContinuousContainerHeight(height);
    }
  }, []);

  // Inject dynamic @page style based on paperSize
  useEffect(() => {
    const styleId = 'resume-page-size-style';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const pageSize = paperSize === 'A4' ? 'A4' : 'letter';
    styleElement.textContent = `
      @media print {
        @page {
          size: ${pageSize};
          margin: 0;
        }
      }
    `;

    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [paperSize]);

  // Paged.js integration - Always render for print readiness
  useEffect(() => {
    if (contentRef.current && pagedContainerRef.current) {
      const paged = new Previewer();

      pagedContainerRef.current.innerHTML = '';

      const contentClone = contentRef.current.cloneNode(true) as HTMLElement;

      const stylesheets = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');

      const pageSize = paperSize === 'A4' ? 'A4' : 'letter';
      const dynamicCSS = `
        ${stylesheets}

        @page {
          size: ${pageSize};
          margin: 0;
        }

        html, body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #1f2937;
        }

        ${isGrayscaleMode ? `
        img {
          filter: grayscale(100%) !important;
        }
        ` : ''}

        @media print {
          @page {
            size: ${pageSize};
            margin: 0;
          }

          .resume-section {
            break-inside: auto;
            page-break-inside: auto;
          }

          .resume-item {
            break-inside: auto;
            page-break-inside: auto;
          }

          .resume-item > h3,
          .resume-item > p:only-child {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          h1, h2, h3, h4, h5, h6 {
            break-after: avoid;
            page-break-after: avoid;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        .resume-page-number {
          display: none !important;
        }
      `;

      const htmlWithEmbeddedStyles = `<style>${dynamicCSS}</style>${contentClone.innerHTML}`;

      paged.preview(
        htmlWithEmbeddedStyles,
        [],
        pagedContainerRef.current
      ).then((flow: any) => {
        console.log('Paged.js rendered', flow.total, 'pages with', pageSize, 'size');
        // Update container height after Paged.js finishes rendering
        updateContainerHeights();
      }).catch((error: any) => {
        console.error('Paged.js error:', error);
      });
    }
  }, [resume, paperSize, isGrayscaleMode, updateContainerHeights]);

  // Also update heights when continuous content changes
  useEffect(() => {
    updateContainerHeights();
  }, [resume, updateContainerHeights]);

  // Calculate wrapper height for scaled content
  // When scale < 1, the visual size decreases but layout space remains the same
  // We need to set a wrapper height to correctly contain the scaled content
  const getScaledWrapperHeight = (originalHeight: number): number => {
    if (scale >= 1 || originalHeight === 0) return 0;
    return originalHeight * scale;
  };

  const pagedWrapperHeight = getScaledWrapperHeight(pagedContainerHeight);
  const continuousWrapperHeight = getScaledWrapperHeight(continuousContainerHeight);

  return (
    <div className="relative">
      {/* Fixed Toolbar (hidden in print) */}
      {showToolbar && (
        <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm mb-6">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800">
                📄 {paperSize} ({paper.css.width} × {paper.css.height})
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs text-blue-700">
                {Math.round(scale * 100)}%
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('continuous')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    viewMode === 'continuous'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={t('resume.preview.continuousView')}
                >
                  📜 {t('resume.preview.continuousView')}
                </button>
                <button
                  onClick={() => setViewMode('paginated')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    viewMode === 'paginated'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={t('resume.preview.paginatedView')}
                >
                  📄 {t('resume.preview.paginatedView')}
                </button>
              </div>
              {/* Grayscale Toggle */}
              <button
                onClick={() => setIsGrayscaleMode(!isGrayscaleMode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
                  isGrayscaleMode
                    ? 'bg-gray-800 text-white border-gray-800 hover:bg-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                title={isGrayscaleMode ? t('resume.preview.switchToColorMode') : t('resume.preview.switchToGrayscaleMode')}
              >
                {isGrayscaleMode ? `🖤 ${t('resume.preview.grayscaleMode')}` : `🎨 ${t('resume.preview.colorMode')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Content - Continuous View (source for Paged.js) */}
      {/* Wrapper div handles the scaled height to prevent content clipping */}
      <div
        style={{
          display: viewMode === 'paginated' ? 'none' : 'block',
          height: continuousWrapperHeight > 0 ? `${continuousWrapperHeight}px` : 'auto',
          overflow: 'visible',
        }}
      >
        <div
          ref={contentRef}
          id="resume-content"
          className={viewMode === 'paginated' ? 'resume-page-container' : ''}
          style={{
            transform: `scale(${scale}) translate3d(0, 0, 0)`,
            transformOrigin: 'top center',
            willChange: 'transform',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <div
            className={viewMode === 'paginated' ? '' : 'bg-white shadow-lg'}
            style={viewMode === 'continuous' ? {
              width: paper.css.width,
              minWidth: paper.css.width,
              margin: '0 auto',
            } : {
              padding: 0,
              margin: 0,
            }}
          >
            <ResumeContent
              resume={resume}
              paperSize={paperSize}
              isGrayscaleMode={isGrayscaleMode}
            />
          </div>
        </div>
      </div>

      {/* Paged.js Output - Always rendered, hidden in continuous mode on screen */}
      {/* Wrapper div handles the scaled height to prevent content clipping */}
      <div
        style={{
          display: viewMode === 'continuous' ? 'none' : 'block',
          height: pagedWrapperHeight > 0 ? `${pagedWrapperHeight}px` : 'auto',
          overflow: 'visible',
        }}
        className="print:!h-auto print:!overflow-visible"
      >
        <div
          ref={pagedContainerRef}
          className={`pagedjs-container print-content ${viewMode === 'continuous' ? 'screen-hidden' : ''}`}
          style={{
            transform: `scale(${scale}) translate3d(0, 0, 0)`,
            transformOrigin: 'top center',
            willChange: 'transform',
            transition: 'transform 0.15s ease-out',
          }}
        />
      </div>
    </div>
  );
}
