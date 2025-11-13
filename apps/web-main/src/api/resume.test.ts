import { describe, it, expect } from 'vitest';
import {
  calculateExperienceDuration,
  calculateTotalExperience,
  calculateTotalExperienceWithOverlap,
  Experience,
} from './resume';

describe('Resume Utility Functions', () => {
  describe('calculateExperienceDuration', () => {
    it('should calculate duration for completed experience', () => {
      const result = calculateExperienceDuration('2020-01', '2022-06');
      expect(result).toEqual({ years: 2, months: 5 });
    });

    it('should calculate duration for currently working experience', () => {
      const result = calculateExperienceDuration('2024-01', undefined, true);
      // Result depends on current date, just check it returns valid numbers
      expect(result.years).toBeGreaterThanOrEqual(0);
      expect(result.months).toBeGreaterThanOrEqual(0);
    });

    it('should handle same start and end month', () => {
      const result = calculateExperienceDuration('2020-01', '2020-01');
      expect(result).toEqual({ years: 0, months: 0 });
    });

    it('should handle experience spanning exactly one year', () => {
      const result = calculateExperienceDuration('2020-01', '2021-01');
      expect(result).toEqual({ years: 1, months: 0 });
    });
  });

  describe('calculateTotalExperience (legacy)', () => {
    it('should sum up all experience durations without overlap handling', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2022-06',
          finalPosition: 'Developer',
          jobTitle: 'Senior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B',
          startDate: '2022-03',
          endDate: '2023-12',
          finalPosition: 'Lead',
          jobTitle: 'Staff',
          projects: [],
          order: 1,
          visible: true,
        },
      ];

      const result = calculateTotalExperience(experiences);
      // Company A: 2y 5m, Company B: 1y 9m = 4y 2m (without overlap handling)
      expect(result).toEqual({ years: 4, months: 2 });
    });

    it('should handle empty experiences', () => {
      const result = calculateTotalExperience([]);
      expect(result).toEqual({ years: 0, months: 0 });
    });
  });

  describe('calculateTotalExperienceWithOverlap', () => {
    it('should handle non-overlapping experiences', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2021-12',
          finalPosition: 'Developer',
          jobTitle: 'Junior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B',
          startDate: '2022-01',
          endDate: '2023-12',
          finalPosition: 'Developer',
          jobTitle: 'Senior',
          projects: [],
          order: 1,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      // 2020-01 to 2021-12 (1y 11m) + 2022-01 to 2023-12 (1y 11m) = 3y 10m
      expect(result).toEqual({ years: 3, months: 10 });
    });

    it('should merge completely overlapping experiences', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2023-12',
          finalPosition: 'Developer',
          jobTitle: 'Senior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B (Freelance)',
          startDate: '2021-06',
          endDate: '2022-06',
          finalPosition: 'Consultant',
          jobTitle: 'Freelancer',
          projects: [],
          order: 1,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      // Merged: 2020-01 to 2023-12 = 3y 11m
      expect(result).toEqual({ years: 3, months: 11 });
    });

    it('should merge partially overlapping experiences', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2022-06',
          finalPosition: 'Developer',
          jobTitle: 'Senior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B',
          startDate: '2022-03',
          endDate: '2023-12',
          finalPosition: 'Lead',
          jobTitle: 'Staff',
          projects: [],
          order: 1,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      // Overlap: 2022-03 to 2022-06 (4 months)
      // Merged: 2020-01 to 2023-12 = 3y 11m
      expect(result).toEqual({ years: 3, months: 11 });
    });

    it('should handle currently working experiences', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2022-06',
          finalPosition: 'Developer',
          jobTitle: 'Senior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B',
          startDate: '2022-03',
          isCurrentlyWorking: true,
          finalPosition: 'Lead',
          jobTitle: 'Staff',
          projects: [],
          order: 1,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      // Merged from 2020-01 to current date
      expect(result.years).toBeGreaterThanOrEqual(3);
    });

    it('should handle example from user: 2025-05~현재 and 2025-01~2025-05', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2025-01',
          endDate: '2025-05',
          finalPosition: 'Developer',
          jobTitle: 'Junior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B',
          startDate: '2025-05',
          isCurrentlyWorking: true, // Currently working
          finalPosition: 'Developer',
          jobTitle: 'Senior',
          projects: [],
          order: 1,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      // Merged: 2025-01 to current (at least to 2025-05)
      // Depending on test date, should be at least 4 months
      expect(result.years >= 0 && result.months >= 4).toBe(true);
    });

    it('should handle multiple overlapping experiences', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2022-12',
          finalPosition: 'Developer',
          jobTitle: 'Junior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B (Part-time)',
          startDate: '2021-06',
          endDate: '2023-06',
          finalPosition: 'Consultant',
          jobTitle: 'Part-time',
          projects: [],
          order: 1,
          visible: true,
        },
        {
          company: 'Company C',
          startDate: '2023-01',
          endDate: '2024-12',
          finalPosition: 'Lead',
          jobTitle: 'Senior',
          projects: [],
          order: 2,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      // Merged: 2020-01 to 2024-12 = 4y 11m
      expect(result).toEqual({ years: 4, months: 11 });
    });

    it('should handle experiences in random order', () => {
      const experiences: Experience[] = [
        {
          company: 'Company C',
          startDate: '2023-01',
          endDate: '2024-12',
          finalPosition: 'Lead',
          jobTitle: 'Senior',
          projects: [],
          order: 2,
          visible: true,
        },
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2021-12',
          finalPosition: 'Developer',
          jobTitle: 'Junior',
          projects: [],
          order: 0,
          visible: true,
        },
        {
          company: 'Company B',
          startDate: '2022-01',
          endDate: '2022-12',
          finalPosition: 'Developer',
          jobTitle: 'Mid',
          projects: [],
          order: 1,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      // 2020-01 to 2021-12, 2022-01 to 2022-12, 2023-01 to 2024-12
      // = 1y 11m + 11m + 1y 11m = 4y 9m
      expect(result).toEqual({ years: 4, months: 9 });
    });

    it('should handle empty experiences', () => {
      const result = calculateTotalExperienceWithOverlap([]);
      expect(result).toEqual({ years: 0, months: 0 });
    });

    it('should handle single experience', () => {
      const experiences: Experience[] = [
        {
          company: 'Company A',
          startDate: '2020-01',
          endDate: '2022-06',
          finalPosition: 'Developer',
          jobTitle: 'Senior',
          projects: [],
          order: 0,
          visible: true,
        },
      ];

      const result = calculateTotalExperienceWithOverlap(experiences);
      expect(result).toEqual({ years: 2, months: 5 });
    });
  });
});
