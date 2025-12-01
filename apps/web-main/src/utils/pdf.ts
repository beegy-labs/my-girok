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
 * Export resume to PDF using the Dual-Layer architecture
 *
 * Priority order:
 * 1. Capture Layer (#resume-capture-source) - Always original size, best quality
 * 2. Paged.js container (.pagedjs-container) - For paginated view
 * 3. Fallback element (elementId) - Legacy support
 *
 * The Capture Layer ensures identical PDF output across all devices
 * because it always renders at the original paper dimensions without scaling.
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

  // PRIORITY 1: Use Capture Layer (always original size, best quality)
  const captureLayer = document.getElementById(captureElementId);
  if (captureLayer) {
    console.log('PDF Export: Using Capture Layer for consistent quality');
    await exportCaptureLayerToPDF(captureLayer, paperSize, fileName);
    return;
  }

  // PRIORITY 2: Use Paged.js container for paginated view
  const pagedContainer = document.querySelector('.pagedjs-container') as HTMLElement;
  if (pagedContainer && window.getComputedStyle(pagedContainer).display !== 'none') {
    console.log('PDF Export: Using Paged.js container');
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

  // Capture each page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;

    const canvas = await html2canvas(page, {
      scale: PDF_EXPORT_SETTINGS.canvasScale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
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

    if (i > 0) {
      pdf.addPage();
    }

    const imgData = canvas.toDataURL(
      `image/${PDF_EXPORT_SETTINGS.imageFormat.toLowerCase()}`,
      PDF_EXPORT_SETTINGS.imageQuality
    );
    const imgWidth = paper.width.mm;
    const imgHeight = (canvas.height * paper.width.mm) / canvas.width;

    const yOffset = imgHeight < paper.height.mm ? (paper.height.mm - imgHeight) / 2 : 0;
    pdf.addImage(
      imgData,
      PDF_EXPORT_SETTINGS.imageFormat,
      0,
      yOffset,
      imgWidth,
      Math.min(imgHeight, paper.height.mm)
    );
  }

  pdf.save(fileName);
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
