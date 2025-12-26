/**
 * RFC 9562 UUIDv7 Generator
 *
 * Structure (128 bits):
 * - 48 bits: Unix timestamp (milliseconds)
 * - 4 bits: Version (0111 = 7)
 * - 12 bits: rand_a (sub-millisecond precision/counter)
 * - 2 bits: Variant (10)
 * - 62 bits: rand_b (random)
 *
 * @see https://www.rfc-editor.org/rfc/rfc9562.html
 */
export class UUIDv7 {
  private static counter = 0;
  private static lastTimestamp = 0;

  /**
   * Generate RFC 9562 compliant UUIDv7
   * @returns UUID string in format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
   */
  static generate(): string {
    const timestamp = Date.now();

    // Counter for sub-millisecond ordering (monotonic)
    if (timestamp === this.lastTimestamp) {
      this.counter++;
      // Overflow protection: if counter exceeds 12 bits, wait for next ms
      if (this.counter > 0xfff) {
        this.counter = 0;
        // Busy wait for next millisecond
        while (Date.now() === timestamp) {
          // spin
        }
        return this.generate();
      }
    } else {
      this.counter = Math.floor(Math.random() * 0x100); // Random start for new ms
      this.lastTimestamp = timestamp;
    }

    // 48-bit timestamp
    const timestampHex = timestamp.toString(16).padStart(12, '0');

    // 12-bit rand_a (using counter for monotonicity)
    const randA = (this.counter & 0xfff).toString(16).padStart(3, '0');

    // 62-bit rand_b (random bytes)
    const randB = this.generateRandomHex(15);

    // Construct UUID: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
    // y = 8, 9, a, or b (variant bits: 10xx)
    const variantByte = 0x80 | (Math.floor(Math.random() * 64) & 0x3f);
    const variantHex = variantByte.toString(16).padStart(2, '0');

    return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8, 12)}-7${randA}-${variantHex}${randB.slice(0, 2)}-${randB.slice(2, 14)}`;
  }

  /**
   * Extract timestamp from UUIDv7
   * @param uuid - UUIDv7 string
   * @returns Date object
   */
  static extractTimestamp(uuid: string): Date {
    const hex = uuid.replace(/-/g, '').slice(0, 12);
    return new Date(parseInt(hex, 16));
  }

  /**
   * Validate UUIDv7 format specifically
   * @param uuid - String to validate
   * @returns boolean - true if valid UUIDv7
   */
  static isValid(uuid: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  }

  /**
   * Validate any UUID format (v1-v8)
   * @param uuid - String to validate
   * @returns boolean - true if valid UUID
   */
  static isValidUUID(uuid: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  }

  /**
   * Compare two UUIDs lexicographically
   * UUIDv7s compare in time order due to timestamp prefix
   * @returns -1, 0, or 1
   */
  static compare(a: string, b: string): number {
    return a.localeCompare(b);
  }

  /**
   * Generate UUIDv7 from specific timestamp (for testing)
   * @param time - Date or timestamp
   * @returns UUIDv7 string
   */
  static fromTime(time: Date | number): string {
    const ts = typeof time === 'number' ? time : time.getTime();
    const timestampHex = ts.toString(16).padStart(12, '0');
    const randA = Math.floor(Math.random() * 0xfff)
      .toString(16)
      .padStart(3, '0');
    const randB = this.generateRandomHex(15);
    const variantByte = 0x80 | (Math.floor(Math.random() * 64) & 0x3f);
    const variantHex = variantByte.toString(16).padStart(2, '0');

    return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8, 12)}-7${randA}-${variantHex}${randB.slice(0, 2)}-${randB.slice(2, 14)}`;
  }

  /**
   * Get timestamp as ISO string from UUIDv7
   * @param uuid - UUIDv7 string
   * @returns ISO date string
   */
  static getTimestampISO(uuid: string): string {
    return this.extractTimestamp(uuid).toISOString();
  }

  private static generateRandomHex(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  }
}

/**
 * Primary ID generator - alias for UUIDv7
 * Drop-in replacement for ULID-based ID
 */
export const ID = {
  /**
   * Generate a new UUIDv7
   * @returns UUID string (36 characters with hyphens)
   */
  generate: (): string => UUIDv7.generate(),

  /**
   * Extract timestamp from UUIDv7
   * @param id - UUIDv7 string
   * @returns Date object
   */
  getTimestamp: (id: string): Date => UUIDv7.extractTimestamp(id),

  /**
   * Validate UUID format (any version)
   * @param id - String to validate
   * @returns boolean
   */
  isValid: (id: string): boolean => UUIDv7.isValidUUID(id),

  /**
   * Compare two UUIDs (for sorting)
   * @returns -1, 0, or 1
   */
  compare: (a: string, b: string): number => UUIDv7.compare(a, b),

  /**
   * Generate UUIDv7 from specific timestamp (for testing)
   * @param time - Date or timestamp
   * @returns UUIDv7 string
   */
  fromTime: (time: Date | number): string => UUIDv7.fromTime(time),

  /**
   * Get timestamp as ISO string from UUIDv7
   * @param id - UUIDv7 string
   * @returns ISO date string
   */
  getTimestampISO: (id: string): string => UUIDv7.getTimestampISO(id),
};
