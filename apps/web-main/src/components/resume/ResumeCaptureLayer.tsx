import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
// @ts-ignore - pagedjs doesn't have type definitions
import { Previewer } from 'pagedjs';
import { Resume } from '../../api/resume';
import { PAPER_SIZES, PaperSizeKey } from '../../constants/paper';
import ResumeContent from './ResumeContent';

interface ResumeCaptureLayerProps {
  /** Resume data to render */
  resume: Resume;
  /** Paper size for rendering */
  paperSize: PaperSizeKey;
  /** ID for html2canvas capture target */
  captureId?: string;
  /** Whether to enable grayscale mode */
  isGrayscaleMode?: boolean;
}

/**
 * Hidden layer for PDF/Print capture
 *
 * This component renders the resume at its original paper size (no scaling)
 * positioned off-screen. It serves as the capture source for PDF export.
 *
 * Key features:
 * - Always renders at exact paper dimensions (A4: 794px, Letter: 816px)
 * - Includes Paged.js rendering for proper page breaks in PDF
 * - No CSS transforms or scaling applied
 * - Ensures identical output quality across all devices (mobile/tablet/desktop)
 * - Hidden from view but accessible for capture
 */
const ResumeCaptureLayer = forwardRef<HTMLDivElement, ResumeCaptureLayerProps>(
  ({ resume, paperSize, captureId = 'resume-capture-source', isGrayscaleMode = false }, ref) => {
    const paper = PAPER_SIZES[paperSize];
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const pagedContainerRef = useRef<HTMLDivElement>(null);

    // Forward ref to container
    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    // Render Paged.js in the capture layer for consistent PDF output
    useEffect(() => {
      if (!contentRef.current || !pagedContainerRef.current) return;

      const paged = new Previewer();
      pagedContainerRef.current.innerHTML = '';

      const contentClone = contentRef.current.cloneNode(true) as HTMLElement;

      // Collect all stylesheets
      const stylesheets = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
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

        .resume-section {
          break-inside: auto;
          page-break-inside: auto;
        }

        .resume-item {
          break-inside: auto;
          page-break-inside: auto;
        }

        h1, h2, h3, h4, h5, h6 {
          break-after: avoid;
          page-break-after: avoid;
        }
      `;

      const htmlWithEmbeddedStyles = `<style>${dynamicCSS}</style>${contentClone.innerHTML}`;

      paged.preview(
        htmlWithEmbeddedStyles,
        [],
        pagedContainerRef.current
      ).then((flow: any) => {
        console.log('Capture Layer: Paged.js rendered', flow.total, 'pages');
      }).catch((error: any) => {
        console.error('Capture Layer: Paged.js error:', error);
      });
    }, [resume, paperSize, isGrayscaleMode]);

    return (
      <div
        ref={containerRef}
        id={captureId}
        aria-hidden="true"
        className="resume-capture-layer"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: `${paper.width.px}px`,
          minHeight: `${paper.height.px}px`,
          transform: 'none',
          transformOrigin: 'top left',
          backgroundColor: '#ffffff',
          overflow: 'visible',
          willChange: 'auto',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {/* Source content for Paged.js (hidden) */}
        <div ref={contentRef} style={{ display: 'none' }}>
          <ResumeContent
            resume={resume}
            paperSize={paperSize}
            isGrayscaleMode={isGrayscaleMode}
          />
        </div>

        {/* Paged.js output container for PDF capture */}
        <div
          ref={pagedContainerRef}
          className="capture-pagedjs-container"
          style={{
            width: `${paper.width.px}px`,
          }}
        />
      </div>
    );
  }
);

ResumeCaptureLayer.displayName = 'ResumeCaptureLayer';

export default ResumeCaptureLayer;
