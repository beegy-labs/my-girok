import { forwardRef } from 'react';
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
 * positioned off-screen. It serves as the capture source for:
 * - PDF export via html2canvas
 * - Print via Paged.js
 *
 * Key features:
 * - Always renders at exact paper dimensions (A4: 794px, Letter: 816px)
 * - No CSS transforms or scaling applied
 * - Ensures identical output quality across all devices
 * - Hidden from view but accessible for capture
 */
const ResumeCaptureLayer = forwardRef<HTMLDivElement, ResumeCaptureLayerProps>(
  ({ resume, paperSize, captureId = 'resume-capture-source', isGrayscaleMode = false }, ref) => {
    const paper = PAPER_SIZES[paperSize];

    return (
      <div
        ref={ref}
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
          // Prevent any inherited transforms
          willChange: 'auto',
          // Ensure crisp text rendering
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <ResumeContent
          resume={resume}
          paperSize={paperSize}
          isGrayscaleMode={isGrayscaleMode}
        />
      </div>
    );
  }
);

ResumeCaptureLayer.displayName = 'ResumeCaptureLayer';

export default ResumeCaptureLayer;
