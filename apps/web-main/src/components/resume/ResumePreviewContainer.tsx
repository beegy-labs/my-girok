import { ReactNode } from 'react';
import { Resume, PaperSize } from '../../api/resume';
import ResumePreview from './ResumePreview';

interface ResumePreviewContainerProps {
  /** Resume data to display */
  resume: Resume;
  /** Paper size for the preview (defaults to resume.paperSize or 'A4') */
  paperSize?: PaperSize;
  /** Optional scale factor for the preview (e.g., 0.75 for 75% size) */
  scale?: number;
  /** Maximum height for the container (e.g., 'calc(100vh-200px)') */
  maxHeight?: string;
  /** Additional CSS classes for the outer container */
  containerClassName?: string;
  /** Additional CSS classes for the inner container */
  innerClassName?: string;
  /** Whether to show responsive padding (smaller on mobile) */
  responsivePadding?: boolean;
  /** Whether to enable horizontal overflow scrolling */
  enableHorizontalScroll?: boolean;
  /** Optional custom content to render above the preview */
  headerContent?: ReactNode;
}

/**
 * Shared container component for resume previews
 * Provides consistent styling across edit, preview, shared, and public pages
 */
export default function ResumePreviewContainer({
  resume,
  paperSize,
  scale,
  maxHeight,
  containerClassName = '',
  innerClassName = '',
  responsivePadding = false,
  enableHorizontalScroll = false,
  headerContent,
}: ResumePreviewContainerProps) {
  const effectivePaperSize = paperSize || resume.paperSize || 'A4';

  // Build container classes
  const outerClasses = [
    'bg-gray-100 dark:bg-dark-bg-secondary/50',
    responsivePadding ? 'p-4 md:p-8' : 'p-8',
    'rounded-lg shadow-inner dark:shadow-dark-inner',
    'transition-colors duration-200',
    enableHorizontalScroll ? 'w-full max-w-[100vw] overflow-auto' : '',
    containerClassName,
  ].filter(Boolean).join(' ');

  const innerClasses = [
    'bg-white rounded shadow-lg',
    enableHorizontalScroll ? 'min-w-fit' : '',
    innerClassName,
  ].filter(Boolean).join(' ');

  // Build style object for scaling
  const containerStyle: React.CSSProperties = {};
  if (maxHeight) {
    containerStyle.maxHeight = maxHeight;
    containerStyle.overflowY = 'auto';
  }

  const previewWrapperStyle: React.CSSProperties = {};
  if (scale && scale !== 1) {
    previewWrapperStyle.transform = `scale(${scale})`;
    previewWrapperStyle.transformOrigin = 'top center';
    // No width adjustment needed - let content determine natural width
  }

  return (
    <div className={outerClasses} style={containerStyle}>
      {headerContent}
      <div
        className={innerClasses}
        style={{
          // Ensure container properly wraps scaled content
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={previewWrapperStyle}>
          <ResumePreview resume={resume} paperSize={effectivePaperSize} />
        </div>
      </div>
    </div>
  );
}
