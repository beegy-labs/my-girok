import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn().mockResolvedValue(new Blob(['mock pdf content'], { type: 'application/pdf' })),
  })),
  DocumentProps: {},
}));

// Mock ResumePdfDocument
vi.mock('../components/resume/ResumePdfDocument', () => ({
  default: vi.fn(() => null),
}));

import { exportResumeToPDF, generateResumePDFBlob, generateResumePDFBase64 } from './pdf';
import { Resume, Gender, SectionType, DegreeType } from '../api/resume';

// Sample resume data for testing
const mockResume: Resume = {
  id: 'test-id',
  userId: 'user-id',
  title: 'Test Resume',
  isDefault: true,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '010-1234-5678',
  summary: 'Experienced developer',
  sections: [
    { id: '1', type: SectionType.SKILLS, order: 0, visible: true },
    { id: '2', type: SectionType.EXPERIENCE, order: 1, visible: true },
  ],
  skills: [],
  experiences: [],
  projects: [],
  educations: [],
  certificates: [],
  paperSize: 'A4',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

describe('PDF Export Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);
  });

  describe('exportResumeToPDF', () => {
    it('should export PDF with default filename', async () => {
      await exportResumeToPDF(mockResume, { paperSize: 'A4' });

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should export PDF with custom filename', async () => {
      await exportResumeToPDF(mockResume, {
        paperSize: 'A4',
        fileName: 'my-resume.pdf',
      });

      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should export PDF with Letter size', async () => {
      await exportResumeToPDF(mockResume, {
        paperSize: 'LETTER',
        fileName: 'resume-letter.pdf',
      });

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('generateResumePDFBlob', () => {
    it('should generate PDF blob', async () => {
      const blob = await generateResumePDFBlob(mockResume, { paperSize: 'A4' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should generate PDF blob with grayscale mode', async () => {
      const blob = await generateResumePDFBlob(mockResume, {
        paperSize: 'A4',
        isGrayscaleMode: true,
      });

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('generateResumePDFBase64', () => {
    it('should generate base64 string', async () => {
      // Mock FileReader as a class
      class MockFileReader {
        result = 'data:application/pdf;base64,bW9jayBwZGYgY29udGVudA==';
        onloadend: (() => void) | null = null;
        onerror: (() => void) | null = null;

        readAsDataURL() {
          // Simulate async behavior
          setTimeout(() => {
            if (this.onloadend) {
              this.onloadend();
            }
          }, 0);
        }
      }

      vi.stubGlobal('FileReader', MockFileReader);

      const base64 = await generateResumePDFBase64(mockResume, { paperSize: 'A4' });

      expect(base64).toBe('bW9jayBwZGYgY29udGVudA==');

      vi.unstubAllGlobals();
    });
  });
});

describe('Resume Data Validation for PDF', () => {
  it('should handle resume with minimal data', () => {
    const minimalResume: Resume = {
      id: 'min-id',
      userId: 'user-id',
      title: 'Minimal Resume',
      isDefault: false,
      name: 'Test',
      email: 'test@test.com',
      sections: [],
      skills: [],
      experiences: [],
      projects: [],
      educations: [],
      certificates: [],
      paperSize: 'A4',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    // Should not throw
    expect(() => minimalResume).not.toThrow();
  });

  it('should handle resume with all optional fields', () => {
    const fullResume: Resume = {
      id: 'full-id',
      userId: 'user-id',
      title: 'Full Resume',
      isDefault: true,
      name: 'Full Name',
      email: 'full@example.com',
      phone: '010-1234-5678',
      address: 'Seoul, Korea',
      summary: 'Full summary',
      gender: Gender.MALE,
      birthDate: '1990-01-15', // YYYY-MM-DD format for accurate age calculation
      github: 'https://github.com/test',
      linkedin: 'https://linkedin.com/in/test',
      blog: 'https://blog.test.com',
      portfolio: 'https://portfolio.test.com',
      militaryService: 'COMPLETED',
      militaryRank: 'Sergeant',
      militaryDischargeType: 'Honorable',
      keyAchievements: ['Achievement 1', 'Achievement 2'],
      applicationReason: 'Reason for applying',
      coverLetter: 'Cover letter content',
      sections: [
        { id: '1', type: SectionType.SKILLS, order: 0, visible: true },
        { id: '2', type: SectionType.EXPERIENCE, order: 1, visible: true },
        { id: '3', type: SectionType.EDUCATION, order: 2, visible: true },
        { id: '4', type: SectionType.CERTIFICATE, order: 3, visible: true },
      ],
      skills: [
        {
          category: 'Frontend',
          items: [
            { name: 'React', descriptions: [] },
            { name: 'TypeScript', descriptions: [] },
          ],
          order: 0,
          visible: true,
        },
      ],
      experiences: [
        {
          company: 'Test Company',
          startDate: '2020-01',
          endDate: '2023-12',
          finalPosition: 'Senior Developer',
          jobTitle: 'Developer',
          projects: [],
          order: 0,
          visible: true,
        },
      ],
      projects: [],
      educations: [
        {
          school: 'Test University',
          degree: DegreeType.BACHELOR,
          major: 'Computer Science',
          startDate: '2010-03',
          endDate: '2014-02',
          order: 0,
          visible: true,
        },
      ],
      certificates: [
        {
          name: 'AWS Certified',
          issuer: 'Amazon',
          issueDate: '2022-01',
          order: 0,
          visible: true,
        },
      ],
      paperSize: 'A4',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    // Should not throw
    expect(() => fullResume).not.toThrow();
    expect(fullResume.keyAchievements?.length).toBe(2);
    expect(fullResume.skills.length).toBe(1);
  });
});
