/**
 * Resume Utility Functions
 *
 * Helper functions for resume data processing and calculations.
 */
import type { Experience } from '@my-girok/types';
import type { CreateResumeDto, UpdateResumeDto } from './types';

/**
 * Calculate duration between two dates in months (inclusive of both start and end months)
 *
 * Example: 2021-10 ~ 2022-05
 * - Includes: Oct, Nov, Dec (2021) + Jan, Feb, Mar, Apr, May (2022) = 8 months
 * - Not 7 months (which would exclude the end month)
 */
export function calculateMonths(startDate: string, endDate?: string): number {
  // Return 0 if startDate is empty or invalid
  if (!startDate || startDate.trim() === '') {
    return 0;
  }

  const start = new Date(startDate + '-01');
  const end = endDate ? new Date(endDate + '-01') : new Date();

  // Return 0 if dates are invalid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();

  // Add 1 to include the end month in the calculation
  return years * 12 + months + 1;
}

/**
 * Calculate total work experience duration with overlap handling
 * Merges overlapping date ranges to avoid double-counting
 *
 * Example:
 * - Company A: 2020-01 ~ 2022-06
 * - Company B: 2022-03 ~ 2025-11 (current)
 * - Overlap: 2022-03 ~ 2022-06 (4 months)
 * - Total: 2020-01 ~ 2025-11 = 5 years 11 months (not 6 years 3 months)
 */
export function calculateTotalExperienceWithOverlap(experiences: Experience[]): {
  years: number;
  months: number;
} {
  if (experiences.length === 0) {
    return { years: 0, months: 0 };
  }

  // Convert experiences to date intervals
  interface DateInterval {
    start: Date;
    end: Date;
  }

  // Filter out experiences with invalid or empty startDate
  const validExperiences = experiences.filter(
    (exp) => exp.startDate && exp.startDate.trim() !== '',
  );

  if (validExperiences.length === 0) {
    return { years: 0, months: 0 };
  }

  const intervals: DateInterval[] = validExperiences
    .map((exp) => {
      const start = new Date(exp.startDate + '-01');
      const end =
        exp.isCurrentlyWorking || !exp.endDate ? new Date() : new Date(exp.endDate + '-01');
      return { start, end };
    })
    .filter((interval) => !isNaN(interval.start.getTime()) && !isNaN(interval.end.getTime()));

  // Return early if no valid intervals after filtering
  if (intervals.length === 0) {
    return { years: 0, months: 0 };
  }

  // Sort intervals by start date
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping intervals
  const merged: DateInterval[] = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i];

    // Check if current and next overlap or are adjacent
    if (next.start <= current.end) {
      // Merge: extend current end to the later of the two ends
      current = {
        start: current.start,
        end: new Date(Math.max(current.end.getTime(), next.end.getTime())),
      };
    } else {
      // No overlap: save current and move to next
      merged.push(current);
      current = next;
    }
  }

  // Don't forget the last interval
  merged.push(current);

  // Calculate total months from merged intervals (inclusive of both start and end months)
  const totalMonths = merged.reduce((total, interval) => {
    const years = interval.end.getFullYear() - interval.start.getFullYear();
    const months = interval.end.getMonth() - interval.start.getMonth();
    // Add 1 to include the end month in the calculation
    return total + (years * 12 + months + 1);
  }, 0);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/**
 * Calculate single experience duration
 */
export function calculateExperienceDuration(
  startDate: string,
  endDate?: string,
  isCurrentlyWorking?: boolean,
): { years: number; months: number } {
  const totalMonths = calculateMonths(startDate, isCurrentlyWorking ? undefined : endDate);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/**
 * Recursively strips database-specific fields and empty values from nested objects
 * This is needed because:
 * 1. DTOs don't accept database-generated fields for nested relations
 * 2. Backend validators reject empty strings (e.g., @IsDateString() on optional fields)
 */
export function stripIds<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => stripIds(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    // List of database-generated fields that should be removed before API submission
    const dbFields = [
      'id',
      'projectId',
      'resumeId',
      'experienceId',
      'parentId',
      'createdAt',
      'updatedAt',
    ];
    // Optional fields that should convert empty string to null for proper clearing
    // Required fields (startDate, name, email, etc.) should NOT be converted to null
    const optionalNullableFields = [
      // Date fields
      'endDate',
      'expiryDate',
      'birthDate',
      'militaryDischarge',
      'militaryServiceStartDate',
      'militaryServiceEndDate',
      // Text fields that can be cleared
      'description',
      'summary',
      'coverLetter',
      'applicationReason',
      'phone',
      'address',
      'github',
      'blog',
      'linkedin',
      'portfolio',
      'profileImage',
      'credentialId',
      'credentialUrl',
      'url',
      'githubUrl',
      'role',
      'gpa',
      'militaryRank',
      'militaryDischargeType',
      'salaryUnit',
    ];

    for (const [key, value] of Object.entries(obj)) {
      // Skip database-generated fields
      if (dbFields.includes(key)) {
        continue;
      }

      // Convert empty strings to null for optional nullable fields
      // This allows clearing fields properly in the database
      if (value === '' && optionalNullableFields.includes(key)) {
        result[key] = null;
        continue;
      }

      // Skip undefined values to avoid validation errors
      if (value === undefined) {
        continue;
      }

      // Recursively process nested objects and arrays
      result[key] = stripIds(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Prepares resume data for API submission by removing all id fields
 */
export function prepareResumeForSubmit<T extends CreateResumeDto | UpdateResumeDto>(data: T): T {
  return stripIds(data);
}
