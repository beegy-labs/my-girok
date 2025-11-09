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
 */
export async function exportResumeToPDF(
  elementId: string,
  options: PDFExportOptions
): Promise<void> {
  const { paperSize, fileName = 'resume.pdf' } = options;
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Get paper dimensions
    const { width: paperWidth, height: paperHeight } = PAPER_DIMENSIONS[paperSize];

    // Capture element as canvas with high quality
    // Using scale 2 for better quality (adjust if needed for performance)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
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

/**
 * Print resume directly using browser print dialog
 */
export function printResume(): void {
  window.print();
}
