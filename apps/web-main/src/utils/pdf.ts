import type { PaperSize } from '../api/resume';
import { personalApi } from '../api/resume';

interface PDFExportOptions {
  paperSize: PaperSize;
  fileName?: string;
  resumeId: string;
}

/**
 * Export resume as PDF using server-side generation
 * Server generates PDF with Puppeteer, ensuring:
 * - Selectable text (not images)
 * - Embedded images
 * - ATS-friendly format
 * - High quality output
 */
export async function exportResumeToPDF(
  options: PDFExportOptions
): Promise<void> {
  const { paperSize, fileName = 'resume.pdf', resumeId } = options;

  try {
    // Call server-side PDF generation endpoint
    const response = await personalApi.get(
      `/v1/resume/${resumeId}/export/pdf`,
      {
        params: { paperSize },
        responseType: 'blob',
      }
    );

    // Create blob from response
    const blob = new Blob([response.data], { type: 'application/pdf' });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
