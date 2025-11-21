import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Resume, PaperSize } from '../../api/resume';
import ResumePreview from './ResumePreview';

interface ResumePreviewContainerProps {
  /** Resume data to display */
  resume: Resume;
  /** Paper size for the preview (defaults to resume.paperSize or 'A4') */
  paperSize?: PaperSize;
  /** Optional scale factor for the preview (e.g., 0.75 for 75% size). If not provided, auto-scales based on container width */
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
 * Automatically scales content to fit container width when scale is not provided
 */
export default function ResumePreviewContainer({
  resume,
  paperSize,
  scale: propScale,
  maxHeight,
  containerClassName = '',
  innerClassName = '',
  responsivePadding = false,
  enableHorizontalScroll = false,
  headerContent,
}: ResumePreviewContainerProps) {
  const effectivePaperSize = paperSize || resume.paperSize || 'A4';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicScale, setDynamicScale] = useState(1);

  // A4: 210mm = 794px, Letter: 215.9mm = 816px at 96 DPI
  const paperWidthPx = effectivePaperSize === 'A4' ? 794 : 816;

  // Calculate dynamic scale based on container width
  const calculateDynamicScale = useCallback(() => {
    if (!containerRef.current || propScale !== undefined) return;

    const containerWidth = containerRef.current.offsetWidth;
    // Subtract minimal padding (16px on each side)
    const availableWidth = containerWidth - 32;

    // Calculate scale to fit, max 1.0 (don't scale up)
    const newScale = Math.min(1, availableWidth / paperWidthPx);

    // Round to 2 decimal places to avoid unnecessary re-renders
    const roundedScale = Math.round(newScale * 100) / 100;

    setDynamicScale(prevScale => {
      const roundedPrevScale = Math.round(prevScale * 100) / 100;
      return roundedPrevScale !== roundedScale ? roundedScale : prevScale;
    });
  }, [paperWidthPx, propScale]);

  // Calculate scale on mount and window resize
  useEffect(() => {
    if (propScale !== undefined) return; // Skip if manual scale is provided

    calculateDynamicScale();

    const handleResize = () => {
      calculateDynamicScale();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDynamicScale, propScale]);

  const effectiveScale = propScale !== undefined ? propScale : dynamicScale;

  // Build container classes - minimize padding for full-width experience
  const outerClasses = [
    'bg-gray-100 dark:bg-dark-bg-secondary/50',
    responsivePadding ? 'p-2 md:p-4' : 'p-4', // Reduced padding
    'rounded-lg shadow-inner dark:shadow-dark-inner',
    'transition-colors duration-200',
    'w-full',
    containerClassName,
  ].filter(Boolean).join(' ');

  const innerClasses = [
    'bg-white rounded shadow-lg',
    'mx-auto', // Center the preview
    innerClassName,
  ].filter(Boolean).join(' ');

  // Build style object for container
  const containerStyle: React.CSSProperties = {
    position: 'relative',
  };

  if (maxHeight) {
    containerStyle.maxHeight = maxHeight;
    containerStyle.overflowY = 'auto';
  }

  // Build style object for inner wrapper
  const innerWrapperStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    overflow: enableHorizontalScroll ? 'auto' : 'hidden',
    minHeight: 'fit-content',
  };

  // Build style object for preview wrapper with transform
  const previewWrapperStyle: React.CSSProperties = {
    transformOrigin: 'top center',
    transition: 'transform 0.2s ease-out',
  };

  if (effectiveScale !== 1) {
    previewWrapperStyle.transform = `scale(${effectiveScale})`;
    // Add bottom margin to account for scaled height reduction
    previewWrapperStyle.marginBottom = `${(1 - effectiveScale) * 100}%`;
  }

  return (
    <div ref={containerRef} className={outerClasses} style={containerStyle}>
      {headerContent}
      <div className={innerClasses} style={innerWrapperStyle}>
        <div style={previewWrapperStyle}>
          <ResumePreview resume={resume} paperSize={effectivePaperSize} />
        </div>
      </div>
    </div>
  );
}
