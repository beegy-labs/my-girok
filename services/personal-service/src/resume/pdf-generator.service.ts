import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  printBackground?: boolean;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private browser: Browser | null = null;

  async onModuleInit() {
    // Initialize browser on module init for better performance
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      this.logger.log('Puppeteer browser initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Puppeteer browser', error);
    }
  }

  async onModuleDestroy() {
    // Clean up browser on module destroy
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser closed');
    }
  }

  /**
   * Generate PDF from HTML content
   */
  async generatePDF(
    htmlContent: string,
    options: PDFGenerationOptions = {},
  ): Promise<Buffer> {
    const { format = 'A4', printBackground = true } = options;

    let page: Page | null = null;

    try {
      // Ensure browser is initialized
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
      }

      page = await this.browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      // Set content with proper encoding
      // networkidle0 waits for all network requests (including images) to finish
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000,
      });

      // Add small delay to ensure all resources are fully loaded
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format,
        printBackground,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        preferCSSPageSize: true,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate PDF', error);
      throw new Error('Failed to generate PDF');
    } finally {
      if (page) {
        await page.close();
      }
    }
  }
}
