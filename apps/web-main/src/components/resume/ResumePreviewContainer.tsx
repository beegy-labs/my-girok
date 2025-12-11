import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Resume } from '../../api/resume';
import { PaperSizeKey, calculateFitScale } from '../../constants/paper';
import ResumePreview from './ResumePreview';

interface ResumePreviewContainerProps {
  /** Resume data to display */
  resume: Resume;
  /** Paper size for the preview (defaults to resume.paperSize or 'A4') */
  paperSize?: PaperSizeKey;
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
  /** Optional custom content to render above the preview */
  headerContent?: ReactNode;
  /** Whether to show the toolbar in ResumePreview */
  showToolbar?: boolean;
  /** Whether to enable horizontal scroll on overflow (useful for mobile) */
  enableHorizontalScroll?: boolean;
  /** Minimum scale to enforce (default: 0.5 for mobile readability) */
  minScale?: number;
}

/**
 * Resume Preview Container
 *
 * This component provides a responsive container for the resume preview.
 * It automatically calculates the optimal scale based on container width.
 *
 * The preview uses @react-pdf/renderer to generate a PDF which is then
 * displayed using react-pdf. This ensures pixel-perfect rendering without
 * any CSS transform scaling issues.
 */
export default function ResumePreviewContainer({
  resume,
  paperSize,
  scale: propScale,
  maxHeight,
  containerClassName = '',
  innerClassName = '',
  responsivePadding = false,
  headerContent,
  showToolbar = true,
  enableHorizontalScroll = true,
  minScale = 0.5,
}: ResumePreviewContainerProps) {
  const effectivePaperSize: PaperSizeKey = (paperSize || resume.paperSize || 'A4') as PaperSizeKey;
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate display scale based on container width (with debouncing)
  const calculateDisplayScale = useCallback(() => {
    if (!containerRef.current || propScale !== undefined) return;

    const container = containerRef.current;
    const computedStyle = window.getComputedStyle(container);
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingRight = parseFloat(computedStyle.paddingRight);

    const containerWidth = container.offsetWidth;
    const availableWidth = containerWidth - paddingLeft - paddingRight;

    // Calculate scale to fit container, max 1.0 (never scale up)
    let newScale = calculateFitScale(effectivePaperSize, availableWidth, 1);

    // Enforce minimum scale for readability (allows horizontal scroll if needed)
    if (enableHorizontalScroll && newScale < minScale) {
      newScale = minScale;
    }

    // Round to 2 decimal places
    const roundedScale = Math.round(newScale * 100) / 100;

    setDisplayScale(prevScale => {
      const roundedPrevScale = Math.round(prevScale * 100) / 100;
      return roundedPrevScale !== roundedScale ? roundedScale : prevScale;
    });
  }, [effectivePaperSize, propScale, enableHorizontalScroll, minScale]);

  // Calculate scale on mount and window resize (debounced)
  useEffect(() => {
    if (propScale !== undefined) return;

    // Initial calculation
    calculateDisplayScale();

    // Debounced resize handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(calculateDisplayScale, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [calculateDisplayScale, propScale]);

  // Use prop scale if provided, otherwise use calculated display scale
  const effectiveScale = propScale !== undefined ? propScale : displayScale;

  // Build container classes
  const outerClasses = [
    'bg-gray-100 dark:bg-dark-bg-secondary/50',
    responsivePadding ? 'p-1 sm:p-2 md:p-4' : 'p-2 sm:p-4',
    'rounded-lg shadow-inner dark:shadow-dark-inner',
    'transition-colors duration-200',
    'w-full',
    'max-w-full',
    containerClassName,
  ].filter(Boolean).join(' ');

  const innerClasses = [
    innerClassName,
  ].filter(Boolean).join(' ');

  // Container style
  const containerStyle: React.CSSProperties = {
    maxWidth: '100%',
  };

  if (maxHeight) {
    containerStyle.maxHeight = maxHeight;
    containerStyle.overflowY = 'auto';
  }

  // Enable horizontal scroll when content exceeds container
  if (enableHorizontalScroll) {
    containerStyle.overflowX = 'auto';
  }

  // Inner wrapper style - centers content while allowing overflow
  const innerWrapperStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minWidth: 'fit-content',
    minHeight: 'fit-content',
    padding: enableHorizontalScroll ? '0 16px' : undefined,
  };

  return (
    <div ref={containerRef} className={outerClasses} style={containerStyle}>
      {headerContent}

      {/* PDF Preview */}
      <div className={innerClasses} style={innerWrapperStyle}>
        <ResumePreview
          resume={resume}
          paperSize={effectivePaperSize}
          scale={effectiveScale}
          showToolbar={showToolbar}
        />
      </div>
    </div>
  );
}
