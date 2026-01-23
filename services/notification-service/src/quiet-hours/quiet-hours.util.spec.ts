import { describe, it, expect } from 'vitest';
import {
  isInQuietHours,
  getTimeInTimezone,
  parseTimeToMinutes,
  formatMinutesToTime,
  isValidTimezone,
  getQuietHoursEndTime,
  QuietHoursConfig,
} from './quiet-hours.util';

describe('Quiet Hours Utilities', () => {
  describe('isInQuietHours', () => {
    const enabledConfig: QuietHoursConfig = {
      enabled: true,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'UTC',
    };

    const disabledConfig: QuietHoursConfig = {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'UTC',
    };

    it('should return false when quiet hours are disabled', () => {
      const result = isInQuietHours(disabledConfig);
      expect(result).toBe(false);
    });

    it('should detect quiet hours during night time (before midnight)', () => {
      // 23:00 UTC should be in quiet hours (22:00-08:00)
      const checkTime = new Date('2024-01-15T23:00:00Z');
      const result = isInQuietHours(enabledConfig, checkTime);
      expect(result).toBe(true);
    });

    it('should detect quiet hours during early morning (after midnight)', () => {
      // 03:00 UTC should be in quiet hours (22:00-08:00)
      const checkTime = new Date('2024-01-15T03:00:00Z');
      const result = isInQuietHours(enabledConfig, checkTime);
      expect(result).toBe(true);
    });

    it('should detect outside quiet hours during day', () => {
      // 12:00 UTC should not be in quiet hours (22:00-08:00)
      const checkTime = new Date('2024-01-15T12:00:00Z');
      const result = isInQuietHours(enabledConfig, checkTime);
      expect(result).toBe(false);
    });

    it('should handle exact start time (boundary condition)', () => {
      // 22:00 UTC should be in quiet hours
      const checkTime = new Date('2024-01-15T22:00:00Z');
      const result = isInQuietHours(enabledConfig, checkTime);
      expect(result).toBe(true);
    });

    it('should handle exact end time (boundary condition)', () => {
      // 08:00 UTC should NOT be in quiet hours (end is exclusive)
      const checkTime = new Date('2024-01-15T08:00:00Z');
      const result = isInQuietHours(enabledConfig, checkTime);
      expect(result).toBe(false);
    });

    it('should handle same-day quiet hours', () => {
      const sameDayConfig: QuietHoursConfig = {
        enabled: true,
        startTime: '13:00',
        endTime: '15:00',
        timezone: 'UTC',
      };

      // 14:00 should be in quiet hours (13:00-15:00)
      const inQuietHours = isInQuietHours(sameDayConfig, new Date('2024-01-15T14:00:00Z'));
      expect(inQuietHours).toBe(true);

      // 12:00 should not be in quiet hours
      const beforeQuietHours = isInQuietHours(sameDayConfig, new Date('2024-01-15T12:00:00Z'));
      expect(beforeQuietHours).toBe(false);

      // 16:00 should not be in quiet hours
      const afterQuietHours = isInQuietHours(sameDayConfig, new Date('2024-01-15T16:00:00Z'));
      expect(afterQuietHours).toBe(false);
    });
  });

  describe('isInQuietHours with various timezones', () => {
    it('should correctly handle Asia/Seoul timezone', () => {
      const seoulConfig: QuietHoursConfig = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Asia/Seoul',
      };

      // 2024-01-15 14:00 UTC = 2024-01-15 23:00 KST (in quiet hours)
      const inQuietHours = isInQuietHours(seoulConfig, new Date('2024-01-15T14:00:00Z'));
      expect(inQuietHours).toBe(true);

      // 2024-01-15 05:00 UTC = 2024-01-15 14:00 KST (not in quiet hours)
      const notInQuietHours = isInQuietHours(seoulConfig, new Date('2024-01-15T05:00:00Z'));
      expect(notInQuietHours).toBe(false);
    });

    it('should correctly handle America/New_York timezone', () => {
      const nyConfig: QuietHoursConfig = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York',
      };

      // 2024-01-15 04:00 UTC = 2024-01-14 23:00 EST (in quiet hours)
      const inQuietHours = isInQuietHours(nyConfig, new Date('2024-01-15T04:00:00Z'));
      expect(inQuietHours).toBe(true);

      // 2024-01-15 19:00 UTC = 2024-01-15 14:00 EST (not in quiet hours)
      const notInQuietHours = isInQuietHours(nyConfig, new Date('2024-01-15T19:00:00Z'));
      expect(notInQuietHours).toBe(false);
    });

    it('should correctly handle Europe/London timezone', () => {
      const londonConfig: QuietHoursConfig = {
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
        timezone: 'Europe/London',
      };

      // During winter (GMT = UTC)
      const inQuietHours = isInQuietHours(londonConfig, new Date('2024-01-15T00:00:00Z'));
      expect(inQuietHours).toBe(true);

      const notInQuietHours = isInQuietHours(londonConfig, new Date('2024-01-15T12:00:00Z'));
      expect(notInQuietHours).toBe(false);
    });

    it('should fallback to UTC for invalid timezone', () => {
      const invalidConfig: QuietHoursConfig = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Invalid/Timezone',
      };

      // Should use UTC as fallback
      const checkTime = new Date('2024-01-15T23:00:00Z');
      const result = isInQuietHours(invalidConfig, checkTime);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle midnight crossing correctly', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '23:00',
        endTime: '01:00',
        timezone: 'UTC',
      };

      // At midnight
      const atMidnight = isInQuietHours(config, new Date('2024-01-15T00:00:00Z'));
      expect(atMidnight).toBe(true);

      // At 00:30
      const afterMidnight = isInQuietHours(config, new Date('2024-01-15T00:30:00Z'));
      expect(afterMidnight).toBe(true);

      // At 01:00 (end time, should be false)
      const atEndTime = isInQuietHours(config, new Date('2024-01-15T01:00:00Z'));
      expect(atEndTime).toBe(false);
    });

    it('should handle quiet hours spanning entire night', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '18:00',
        endTime: '09:00',
        timezone: 'UTC',
      };

      // 20:00 (in quiet hours)
      expect(isInQuietHours(config, new Date('2024-01-15T20:00:00Z'))).toBe(true);

      // 05:00 (in quiet hours)
      expect(isInQuietHours(config, new Date('2024-01-15T05:00:00Z'))).toBe(true);

      // 12:00 (not in quiet hours)
      expect(isInQuietHours(config, new Date('2024-01-15T12:00:00Z'))).toBe(false);
    });

    it('should handle single-minute quiet hours', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '12:00',
        endTime: '12:01',
        timezone: 'UTC',
      };

      expect(isInQuietHours(config, new Date('2024-01-15T12:00:00Z'))).toBe(true);
      expect(isInQuietHours(config, new Date('2024-01-15T12:00:30Z'))).toBe(true);
      expect(isInQuietHours(config, new Date('2024-01-15T12:01:00Z'))).toBe(false);
    });
  });

  describe('getTimeInTimezone', () => {
    it('should convert UTC to local timezone', () => {
      const utcDate = new Date('2024-01-15T10:30:45Z');
      const result = getTimeInTimezone(utcDate, 'UTC');

      expect(result.hours).toBe(10);
      expect(result.minutes).toBe(30);
      expect(result.seconds).toBe(45);
    });

    it('should handle Asia/Seoul timezone (UTC+9)', () => {
      const utcDate = new Date('2024-01-15T15:30:00Z');
      const result = getTimeInTimezone(utcDate, 'Asia/Seoul');

      // 15:30 UTC = 00:30 next day in Seoul (UTC+9)
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(30);
    });

    it('should fallback to UTC for invalid timezone', () => {
      const utcDate = new Date('2024-01-15T10:30:45Z');
      const result = getTimeInTimezone(utcDate, 'Invalid/Timezone');

      expect(result.hours).toBe(10);
      expect(result.minutes).toBe(30);
      expect(result.seconds).toBe(45);
    });
  });

  describe('parseTimeToMinutes', () => {
    it('should parse standard time format', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('01:00')).toBe(60);
      expect(parseTimeToMinutes('12:30')).toBe(750);
      expect(parseTimeToMinutes('23:59')).toBe(1439);
    });

    it('should handle single digit hours', () => {
      expect(parseTimeToMinutes('8:00')).toBe(480);
      expect(parseTimeToMinutes('9:30')).toBe(570);
    });

    it('should handle malformed input gracefully', () => {
      expect(parseTimeToMinutes('')).toBe(0);
      expect(parseTimeToMinutes(':')).toBe(0);
      expect(parseTimeToMinutes('invalid')).toBe(0);
    });
  });

  describe('formatMinutesToTime', () => {
    it('should format minutes to HH:MM', () => {
      expect(formatMinutesToTime(0)).toBe('00:00');
      expect(formatMinutesToTime(60)).toBe('01:00');
      expect(formatMinutesToTime(750)).toBe('12:30');
      expect(formatMinutesToTime(1439)).toBe('23:59');
    });

    it('should handle values over 24 hours', () => {
      expect(formatMinutesToTime(1440)).toBe('00:00'); // 24:00 -> 00:00
      expect(formatMinutesToTime(1500)).toBe('01:00'); // 25:00 -> 01:00
    });
  });

  describe('isValidTimezone', () => {
    it('should return true for valid timezones', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Asia/Seoul')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Australia/Sydney')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('ABC')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('Not/A/Valid/TZ')).toBe(false);
    });
  });

  describe('getQuietHoursEndTime', () => {
    it('should return null when quiet hours are disabled', () => {
      const config: QuietHoursConfig = {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      };

      const result = getQuietHoursEndTime(config);
      expect(result).toBeNull();
    });

    it('should calculate end time for same day', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      };

      // At 03:00 UTC, end time should be 08:00 UTC (5 hours later)
      const fromTime = new Date('2024-01-15T03:00:00Z');
      const result = getQuietHoursEndTime(config, fromTime);

      expect(result).not.toBeNull();
      expect(result!.getUTCHours()).toBe(8);
      expect(result!.getUTCMinutes()).toBe(0);
    });

    it('should calculate end time crossing midnight', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      };

      // At 23:00 UTC, end time should be 08:00 UTC next day (9 hours later)
      const fromTime = new Date('2024-01-15T23:00:00Z');
      const result = getQuietHoursEndTime(config, fromTime);

      expect(result).not.toBeNull();
      // Result should be next day at 08:00
      expect(result!.getUTCHours()).toBe(8);
      expect(result!.getUTCMinutes()).toBe(0);
    });
  });

  describe('DST (Daylight Saving Time) handling', () => {
    it('should handle US DST transition (spring forward)', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York',
      };

      // Before DST: 2024-03-09 (EST)
      // During DST transition weekend
      const beforeDST = isInQuietHours(config, new Date('2024-03-09T08:00:00Z')); // 03:00 EST
      expect(beforeDST).toBe(true);

      // After DST: 2024-03-11 (EDT)
      const afterDST = isInQuietHours(config, new Date('2024-03-11T07:00:00Z')); // 03:00 EDT
      expect(afterDST).toBe(true);
    });

    it('should handle US DST transition (fall back)', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York',
      };

      // Before DST ends: 2024-11-02 (EDT)
      const beforeDSTEnd = isInQuietHours(config, new Date('2024-11-02T07:00:00Z')); // 03:00 EDT
      expect(beforeDSTEnd).toBe(true);

      // After DST ends: 2024-11-04 (EST)
      const afterDSTEnd = isInQuietHours(config, new Date('2024-11-04T08:00:00Z')); // 03:00 EST
      expect(afterDSTEnd).toBe(true);
    });

    it('should handle European DST correctly', () => {
      const config: QuietHoursConfig = {
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
        timezone: 'Europe/London',
      };

      // During BST (British Summer Time)
      // 2024-07-15 02:00 UTC = 03:00 BST (in quiet hours)
      const duringBST = isInQuietHours(config, new Date('2024-07-15T02:00:00Z'));
      expect(duringBST).toBe(true);

      // During GMT (winter)
      // 2024-01-15 02:00 UTC = 02:00 GMT (in quiet hours)
      const duringGMT = isInQuietHours(config, new Date('2024-01-15T02:00:00Z'));
      expect(duringGMT).toBe(true);
    });
  });
});
