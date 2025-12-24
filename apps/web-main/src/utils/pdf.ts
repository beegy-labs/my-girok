import { pdf, DocumentProps } from '@react-pdf/renderer';
import { createElement, ReactElement } from 'react';
import { PaperSizeKey } from '../constants/paper';
import ResumePdfDocument from '../components/resume/ResumePdfDocument';
import { Resume } from '../api/resume';
import { imageToBase64 } from './imageProxy';

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
export async function exportResumeToPDF(resume: Resume, options: PDFExportOptions): Promise<void> {
  const { paperSize, fileName = 'resume.pdf', isGrayscaleMode = false } = options;

  try {
    // Fetch profile image and convert to base64 if exists
    const profileImageBase64 = await imageToBase64(resume.profileImage);

    // Create PDF document element
    const documentElement = createElement(ResumePdfDocument, {
      resume,
      paperSize,
      isGrayscaleMode,
      profileImageBase64,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to export PDF:', errorMessage, error);
    throw new Error(`Failed to export resume to PDF: ${errorMessage}`);
  }
}

/**
 * Generate PDF blob for resume (without downloading)
 *
 * Useful for uploading to server or other programmatic uses.
 */
export async function generateResumePDFBlob(
  resume: Resume,
  options: Omit<PDFExportOptions, 'fileName'>,
): Promise<Blob> {
  const { paperSize, isGrayscaleMode = false } = options;

  // Fetch profile image and convert to base64 if exists
  const profileImageBase64 = await imageToBase64(resume.profileImage);

  const documentElement = createElement(ResumePdfDocument, {
    resume,
    paperSize,
    isGrayscaleMode,
    profileImageBase64,
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
  options: Omit<PDFExportOptions, 'fileName'>,
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

/**
 * Print resume PDF directly
 *
 * Opens the PDF in a new window/tab for printing.
 * This ensures proper PDF rendering with all fonts and styling.
 */
export async function printResumePDF(
  resume: Resume,
  options: Omit<PDFExportOptions, 'fileName'>,
): Promise<void> {
  const { paperSize, isGrayscaleMode = false } = options;

  try {
    // Fetch profile image and convert to base64 if exists
    const profileImageBase64 = await imageToBase64(resume.profileImage);

    const documentElement = createElement(ResumePdfDocument, {
      resume,
      paperSize,
      isGrayscaleMode,
      profileImageBase64,
    }) as unknown as ReactElement<DocumentProps>;

    const blob = await pdf(documentElement).toBlob();
    const url = URL.createObjectURL(blob);

    // Open PDF in new window for printing
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      // Wait for PDF to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      // Fallback: if popup blocked, download instead
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Cleanup URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to print PDF:', errorMessage, error);
    throw new Error(`Failed to print resume PDF: ${errorMessage}`);
  }
}
