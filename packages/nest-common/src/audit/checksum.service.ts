import { createHash } from 'crypto';
import type { AuditLogChecksumFields } from './checksum.types';

/**
 * Service for calculating and verifying SHA-256 checksums for audit log chain integrity.
 *
 * The checksum chain works as follows:
 * 1. Each log entry's checksum includes the previous entry's checksum
 * 2. If any entry is modified, all subsequent checksums become invalid
 * 3. This provides tamper-evident logging for compliance requirements
 *
 * @example
 * ```typescript
 * const service = new ChecksumService();
 *
 * // Calculate checksum for a new entry
 * const checksum = service.calculateChecksum({
 *   id: 'entry-id',
 *   timestamp: new Date(),
 *   actorId: 'user-123',
 *   actorType: 'user',
 *   action: 'create',
 *   resourceType: 'document',
 *   resourceId: 'doc-456',
 *   previousChecksum: 'abc123...',
 * });
 *
 * // Verify a chain of entries
 * const isValid = service.verifyChain(entries);
 * ```
 */
export class ChecksumService {
  private readonly algorithm = 'sha256';

  /**
   * Calculate SHA-256 checksum for an audit log entry.
   *
   * The checksum is calculated over a canonical JSON representation
   * of the entry fields to ensure consistent results.
   *
   * @param entry - Audit log entry fields
   * @returns Hex-encoded SHA-256 checksum
   */
  calculateChecksum(entry: AuditLogChecksumFields): string {
    // Create canonical representation for consistent hashing
    const canonical = this.canonicalize(entry);
    const hash = createHash(this.algorithm);
    hash.update(canonical, 'utf8');
    return hash.digest('hex');
  }

  /**
   * Verify that a checksum matches the entry fields.
   *
   * @param entry - Audit log entry fields
   * @param expectedChecksum - The checksum to verify against
   * @returns True if checksum matches
   */
  verifyChecksum(entry: AuditLogChecksumFields, expectedChecksum: string): boolean {
    const calculated = this.calculateChecksum(entry);
    return this.secureCompare(calculated, expectedChecksum);
  }

  /**
   * Verify a chain of audit log entries.
   *
   * Checks that:
   * 1. Each entry's checksum is valid
   * 2. Each entry's previousChecksum matches the actual previous entry
   *
   * @param entries - Array of entries in chronological order
   * @param storedChecksums - Map of entry ID to stored checksum
   * @returns Object with verification results
   */
  verifyChain(
    entries: AuditLogChecksumFields[],
    storedChecksums: Map<string, string>,
  ): {
    valid: boolean;
    invalidEntries: Array<{ id: string; reason: string }>;
  } {
    const invalidEntries: Array<{ id: string; reason: string }> = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const storedChecksum = storedChecksums.get(entry.id);

      if (!storedChecksum) {
        invalidEntries.push({ id: entry.id, reason: 'Missing stored checksum' });
        continue;
      }

      // Verify entry checksum
      const calculatedChecksum = this.calculateChecksum(entry);
      if (!this.secureCompare(calculatedChecksum, storedChecksum)) {
        invalidEntries.push({
          id: entry.id,
          reason: `Checksum mismatch: expected ${storedChecksum.substring(0, 16)}..., got ${calculatedChecksum.substring(0, 16)}...`,
        });
        continue;
      }

      // Verify chain linkage (skip first entry)
      if (i > 0) {
        const previousEntry = entries[i - 1];
        const previousChecksum = storedChecksums.get(previousEntry.id);

        if (entry.previousChecksum !== previousChecksum) {
          invalidEntries.push({
            id: entry.id,
            reason: `Chain break: previousChecksum doesn't match entry ${previousEntry.id}`,
          });
        }
      }
    }

    return {
      valid: invalidEntries.length === 0,
      invalidEntries,
    };
  }

  /**
   * Create the canonical JSON representation for hashing.
   *
   * Uses a deterministic key ordering and consistent formatting
   * to ensure the same input always produces the same output.
   */
  private canonicalize(entry: AuditLogChecksumFields): string {
    // Create ordered object with only defined values
    const ordered: Record<string, unknown> = {};

    // Add fields in deterministic order
    ordered.id = entry.id;
    ordered.timestamp = this.normalizeTimestamp(entry.timestamp);
    ordered.actorId = entry.actorId;
    ordered.actorType = entry.actorType;

    if (entry.serviceId !== undefined) {
      ordered.serviceId = entry.serviceId;
    }

    ordered.action = entry.action;
    ordered.resourceType = entry.resourceType;

    if (entry.resourceId !== undefined) {
      ordered.resourceId = entry.resourceId;
    }

    if (entry.beforeState !== undefined) {
      ordered.beforeState = this.sortObjectKeys(entry.beforeState);
    }

    if (entry.afterState !== undefined) {
      ordered.afterState = this.sortObjectKeys(entry.afterState);
    }

    if (entry.previousChecksum !== undefined) {
      ordered.previousChecksum = entry.previousChecksum;
    }

    return JSON.stringify(ordered);
  }

  /**
   * Normalize timestamp to ISO string for consistent hashing.
   */
  private normalizeTimestamp(timestamp: Date | string): string {
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    // Parse and re-format to ensure consistent format
    return new Date(timestamp).toISOString();
  }

  /**
   * Recursively sort object keys for deterministic JSON output.
   */
  private sortObjectKeys(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    if (typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      for (const key of keys) {
        sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key]);
      }
      return sorted;
    }

    return obj;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks.
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

/**
 * Singleton instance for convenience.
 */
let checksumServiceInstance: ChecksumService | null = null;

/**
 * Get the shared ChecksumService instance.
 */
export function getChecksumService(): ChecksumService {
  if (!checksumServiceInstance) {
    checksumServiceInstance = new ChecksumService();
  }
  return checksumServiceInstance;
}

/**
 * Calculate checksum for an audit log entry (convenience function).
 */
export function calculateAuditChecksum(entry: AuditLogChecksumFields): string {
  return getChecksumService().calculateChecksum(entry);
}

/**
 * Verify checksum for an audit log entry (convenience function).
 */
export function verifyAuditChecksum(
  entry: AuditLogChecksumFields,
  expectedChecksum: string,
): boolean {
  return getChecksumService().verifyChecksum(entry, expectedChecksum);
}
