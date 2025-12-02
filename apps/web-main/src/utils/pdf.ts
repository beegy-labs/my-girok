import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PAPER_SIZES, PaperSizeKey, PDF_EXPORT_SETTINGS } from '../constants/paper';

interface PDFExportOptions {
  paperSize: PaperSizeKey;
  fileName?: string;
  /** ID of the capture layer element (default: 'resume-capture-source') */
  captureElementId?: string;
}

/**
 * Export resume to PDF with proper page view (A4/Letter format)
 *
 * Priority order:
 * 1. Capture Layer Paged.js (.capture-pagedjs-container) - Consistent quality across all devices
 * 2. Capture Layer continuous - Fallback if Paged.js not ready
 * 3. Screen Paged.js container - Fallback (may have quality variations)
 * 4. Fallback element (elementId) - Legacy support
 *
 * Capture Layer is prioritized because it always renders at original paper size
 * (no CSS transforms), ensuring identical PDF quality on mobile/tablet/desktop.
 */
export async function exportResumeToPDF(
  elementId: string,
  options: PDFExportOptions
): Promise<void> {
  const {
    paperSize,
    fileName = 'resume.pdf',
    captureElementId = 'resume-capture-source'
  } = options;

  const paper = PAPER_SIZES[paperSize];

  // PRIORITY 1: Use Capture Layer's Paged.js container (consistent quality)
  const captureLayer = document.getElementById(captureElementId);
  if (captureLayer) {
    const capturePagedContainer = captureLayer.querySelector('.capture-pagedjs-container') as HTMLElement;
    if (capturePagedContainer && capturePagedContainer.querySelector('.pagedjs_page')) {
      console.log('PDF Export: Using Capture Layer Paged.js (consistent quality)');
      await exportPagedJSToPDF(capturePagedContainer, paperSize, fileName);
      return;
    }

    // PRIORITY 2: Use Capture Layer continuous view
    console.log('PDF Export: Using Capture Layer continuous view');
    await exportCaptureLayerToPDF(captureLayer, paperSize, fileName);
    return;
  }

  // PRIORITY 3: Use screen Paged.js container (may have quality variations based on scale)
  const pagedContainer = document.querySelector('.pagedjs-container') as HTMLElement;
  if (pagedContainer && pagedContainer.querySelector('.pagedjs_page')) {
    console.log('PDF Export: Using screen Paged.js container (fallback)');
    await exportPagedJSToPDF(pagedContainer, paperSize, fileName);
    return;
  }

  // FALLBACK: Use specified element (legacy support)
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  console.log('PDF Export: Using fallback element');
  await exportElementToPDF(element, paperSize, paper.height.mm, fileName);
}

/**
 * Export Capture Layer to PDF
 *
 * The Capture Layer is always rendered at original paper size (no scaling),
 * ensuring identical output quality across all devices.
 */
async function exportCaptureLayerToPDF(
  captureLayer: HTMLElement,
  paperSize: PaperSizeKey,
  fileName: string
): Promise<void> {
  const paper = PAPER_SIZES[paperSize];

  // Temporarily make capture layer visible for html2canvas
  const originalStyles = {
    position: captureLayer.style.position,
    left: captureLayer.style.left,
    top: captureLayer.style.top,
    visibility: captureLayer.style.visibility,
  };

  // Move to visible area temporarily (still off-screen but renderable)
  captureLayer.style.position = 'fixed';
  captureLayer.style.left = '0';
  captureLayer.style.top = '0';
  captureLayer.style.visibility = 'visible';

  try {
    // Capture at original size with high resolution
    const canvas = await html2canvas(captureLayer, {
      scale: PDF_EXPORT_SETTINGS.canvasScale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      width: paper.width.px,
      windowWidth: paper.width.px,
      imageTimeout: PDF_EXPORT_SETTINGS.imageTimeout,
      onclone: (clonedDoc, clonedElement) => {
        // Ensure cloned element has correct dimensions
        clonedElement.style.width = `${paper.width.px}px`;
        clonedElement.style.transform = 'none';

        // Wait for all images to load
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img: HTMLImageElement) => {
          if (!img.complete) {
            console.warn('Image not fully loaded:', img.src);
          }
        });
      },
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperSize === 'A4' ? 'a4' : 'letter',
    });

    // Calculate image dimensions maintaining aspect ratio
    const imgWidth = paper.width.mm;
    const imgHeight = (canvas.height * paper.width.mm) / canvas.width;

    const imgData = canvas.toDataURL(
      `image/${PDF_EXPORT_SETTINGS.imageFormat.toLowerCase()}`,
      PDF_EXPORT_SETTINGS.imageQuality
    );

    // Handle multi-page content
    if (imgHeight <= paper.height.mm) {
      // Single page - center vertically if needed
      const yOffset = (paper.height.mm - imgHeight) / 2;
      pdf.addImage(imgData, PDF_EXPORT_SETTINGS.imageFormat, 0, Math.max(0, yOffset), imgWidth, imgHeight);
    } else {
      // Multiple pages
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, PDF_EXPORT_SETTINGS.imageFormat, 0, position, imgWidth, imgHeight);
      heightLeft -= paper.height.mm;

      // Additional pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, PDF_EXPORT_SETTINGS.imageFormat, 0, position, imgWidth, imgHeight);
        heightLeft -= paper.height.mm;
      }
    }

    // Save PDF
    pdf.save(fileName);
  } finally {
    // Restore original styles
    captureLayer.style.position = originalStyles.position;
    captureLayer.style.left = originalStyles.left;
    captureLayer.style.top = originalStyles.top;
    captureLayer.style.visibility = originalStyles.visibility;
  }
}

/**
 * Export Paged.js container to PDF (multi-page support)
 *
 * Captures each Paged.js page at original paper dimensions (not scaled)
 * to ensure consistent PDF quality across all devices.
 */
async function exportPagedJSToPDF(
  container: HTMLElement,
  paperSize: PaperSizeKey,
  fileName: string
): Promise<void> {
  const paper = PAPER_SIZES[paperSize];

  // Get all pages from Paged.js
  const pages = container.querySelectorAll('.pagedjs_page');
  if (pages.length === 0) {
    throw new Error('No pages found in Paged.js container');
  }

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: paperSize === 'A4' ? 'a4' : 'letter',
  });

  // Temporarily remove transform scale from container for accurate capture
  const originalTransform = container.style.transform;
  const originalTransition = container.style.transition;
  container.style.transform = 'none';
  container.style.transition = 'none';

  try {
    // Capture each page at original paper dimensions
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;

      const canvas = await html2canvas(page, {
        scale: PDF_EXPORT_SETTINGS.canvasScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        // Use original paper dimensions for consistent quality
        width: paper.width.px,
        windowWidth: paper.width.px,
        imageTimeout: PDF_EXPORT_SETTINGS.imageTimeout,
        onclone: (clonedDoc, clonedElement) => {
          // Ensure cloned element has no transforms
          clonedElement.style.transform = 'none';

          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img: HTMLImageElement) => {
            if (!img.complete) {
              console.warn('Image not fully loaded:', img.src);
            }
          });
        },
      });

      if (i > 0) {
        pdf.addPage();
      }

      const imgData = canvas.toDataURL(
        `image/${PDF_EXPORT_SETTINGS.imageFormat.toLowerCase()}`,
        PDF_EXPORT_SETTINGS.imageQuality
      );

      // Add image to fill entire page
      pdf.addImage(
        imgData,
        PDF_EXPORT_SETTINGS.imageFormat,
        0,
        0,
        paper.width.mm,
        paper.height.mm
      );
    }

    pdf.save(fileName);
  } finally {
    // Restore original transform
    container.style.transform = originalTransform;
    container.style.transition = originalTransition;
  }
}

/**
 * Fallback: Export an element to PDF (legacy support)
 */
async function exportElementToPDF(
  element: HTMLElement,
  paperSize: PaperSizeKey,
  paperHeight: number,
  fileName: string
): Promise<void> {
  const paper = PAPER_SIZES[paperSize];

  try {
    const canvas = await html2canvas(element, {
      scale: PDF_EXPORT_SETTINGS.canvasScale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      imageTimeout: PDF_EXPORT_SETTINGS.imageTimeout,
      onclone: (clonedDoc) => {
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img: HTMLImageElement) => {
          if (!img.complete) {
            console.warn('Image not fully loaded:', img.src);
          }
        });
      },
    });

    const imgWidth = paper.width.mm;
    const imgHeight = (canvas.height * paper.width.mm) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperSize === 'A4' ? 'a4' : 'letter',
    });

    const imgData = canvas.toDataURL(
      `image/${PDF_EXPORT_SETTINGS.imageFormat.toLowerCase()}`,
      PDF_EXPORT_SETTINGS.imageQuality
    );

    if (imgHeight <= paperHeight) {
      pdf.addImage(imgData, PDF_EXPORT_SETTINGS.imageFormat, 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, PDF_EXPORT_SETTINGS.imageFormat, 0, position, imgWidth, imgHeight);
      heightLeft -= paperHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, PDF_EXPORT_SETTINGS.imageFormat, 0, position, imgWidth, imgHeight);
        heightLeft -= paperHeight;
      }
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error('Failed to export resume to PDF');
  }
}
