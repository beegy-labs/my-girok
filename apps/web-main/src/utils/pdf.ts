import { pdf, DocumentProps } from '@react-pdf/renderer';
import { createElement, ReactElement } from 'react';
import { PaperSizeKey } from '../constants/paper';
import ResumePdfDocument from '../components/resume/ResumePdfDocument';
import { Resume } from '../api/resume';

interface PDFExportOptions {
  paperSize: PaperSizeKey;
  fileName?: string;
  isGrayscaleMode?: boolean;
}

/**
 * Export resume to PDF using @react-pdf/renderer
 *
 * This function generates a PDF from the Resume data using React PDF components.
 * Unlike the previous html2canvas approach, this creates a true vector PDF
 * with proper fonts and styling.
 */
export async function exportResumeToPDF(
  resume: Resume,
  options: PDFExportOptions
): Promise<void> {
  const {
    paperSize,
    fileName = 'resume.pdf',
    isGrayscaleMode = false,
  } = options;

  try {
    // Create PDF document element
    const documentElement = createElement(ResumePdfDocument, {
      resume,
      paperSize,
      isGrayscaleMode,
    }) as unknown as ReactElement<DocumentProps>;

    // Generate PDF blob
    const blob = await pdf(documentElement).toBlob();

    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error('Failed to export resume to PDF');
  }
}

/**
 * Generate PDF blob for resume (without downloading)
 *
 * Useful for uploading to server or other programmatic uses.
 */
export async function generateResumePDFBlob(
  resume: Resume,
  options: Omit<PDFExportOptions, 'fileName'>
): Promise<Blob> {
  const { paperSize, isGrayscaleMode = false } = options;

  const documentElement = createElement(ResumePdfDocument, {
    resume,
    paperSize,
    isGrayscaleMode,
  }) as unknown as ReactElement<DocumentProps>;

  return await pdf(documentElement).toBlob();
}

/**
 * Generate PDF as base64 string
 *
 * Useful for embedding or sending via API.
 */
export async function generateResumePDFBase64(
  resume: Resume,
  options: Omit<PDFExportOptions, 'fileName'>
): Promise<string> {
  const blob = await generateResumePDFBlob(resume, options);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix to get pure base64
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
