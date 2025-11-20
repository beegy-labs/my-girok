import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { PaperSize } from '../api/resume';

interface PDFExportOptions {
  paperSize: PaperSize;
  fileName?: string;
}

// Paper dimensions in mm
const PAPER_DIMENSIONS = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

/**
 * Export resume HTML element to PDF
 * Optimized for print with high quality rendering
 * IMPORTANT: Resume export prioritizes paginated view (Paged.js) for print-optimized output
 */
export async function exportResumeToPDF(
  elementId: string,
  options: PDFExportOptions
): Promise<void> {
  const { paperSize, fileName = 'resume.pdf' } = options;

  // PRIORITY: Use paginated view (Paged.js) for PDF export as it's optimized for print
  const pagedContainer = document.querySelector('.pagedjs-container') as HTMLElement;
  if (pagedContainer && window.getComputedStyle(pagedContainer).display !== 'none') {
    // Export paginated view (each .pagedjs_page is a separate page)
    await exportPagedJSToPDF(pagedContainer, paperSize, fileName);
    return;
  }

  // Fallback: Use continuous view if paginated view is not available
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  await exportElementToPDF(element, paperSize, (PAPER_DIMENSIONS as Record<PaperSize, { width: number; height: number }>)[paperSize].height, fileName);
}

/**
 * Export Paged.js container to PDF (multi-page support)
 */
async function exportPagedJSToPDF(
  container: HTMLElement,
  paperSize: PaperSize,
  fileName: string
): Promise<void> {
  const { width: paperWidth, height: paperHeight } = (PAPER_DIMENSIONS as Record<PaperSize, { width: number; height: number }>)[paperSize];

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

    // Capture page as canvas with image support via proxy
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true, // Enable CORS for proxy images
      allowTaint: false, // Keep canvas untainted for toDataURL()
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
      imageTimeout: 15000, // Wait up to 15 seconds for images to load
      onclone: (clonedDoc) => {
        // Ensure all images are loaded before rendering
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img: HTMLImageElement) => {
          if (!img.complete) {
            console.warn('Image not fully loaded:', img.src);
          }
        });
      },
    });

    // Add page to PDF
    if (i > 0) {
      pdf.addPage();
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = paperWidth;
    const imgHeight = (canvas.height * paperWidth) / canvas.width;

    // Center image on page if it's smaller than page height
    const yOffset = imgHeight < paperHeight ? (paperHeight - imgHeight) / 2 : 0;
    pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidth, Math.min(imgHeight, paperHeight));
  }

  // Save PDF
  pdf.save(fileName);
}

/**
 * Internal function to export an element to PDF
 */
async function exportElementToPDF(
  element: HTMLElement,
  paperSize: PaperSize,
  paperHeight: number,
  fileName: string
): Promise<void> {
  try {
    // Get paper dimensions
    const { width: paperWidth } = (PAPER_DIMENSIONS as Record<PaperSize, { width: number; height: number }>)[paperSize];

    // Capture element as canvas with high quality and image support via proxy
    // Using scale 2 for better quality (adjust if needed for performance)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true, // Enable CORS for proxy images
      allowTaint: false, // Keep canvas untainted for toDataURL()
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      imageTimeout: 15000, // Wait up to 15 seconds for images to load
      onclone: (clonedDoc) => {
        // Ensure all images are loaded before rendering
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img: HTMLImageElement) => {
          if (!img.complete) {
            console.warn('Image not fully loaded:', img.src);
          }
        });
      },
    });

    // Calculate dimensions
    const imgWidth = paperWidth;
    const imgHeight = (canvas.height * paperWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation: imgHeight > paperHeight ? 'portrait' : 'portrait',
      unit: 'mm',
      format: paperSize === 'A4' ? 'a4' : 'letter',
    });

    // Add image to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (imgHeight <= paperHeight) {
      // Single page
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // Multiple pages
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= paperHeight;

      // Additional pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= paperHeight;
      }
    }

    // Save PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error('Failed to export resume to PDF');
  }
}

