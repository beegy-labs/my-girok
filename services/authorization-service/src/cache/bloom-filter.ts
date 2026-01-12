/**
 * Bloom Filter
 *
 * A probabilistic data structure for fast negative lookups.
 * Used to quickly determine if a permission is definitely NOT granted.
 *
 * False positives are possible (might say "yes" when answer is "no"),
 * but false negatives are not (never says "no" when answer is "yes").
 */

/**
 * Simple hash functions for Bloom filter
 */
function hashFnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function hashDjb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function hashSdbm(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
  }
  return hash >>> 0;
}

/**
 * Bloom Filter implementation
 */
export class BloomFilter {
  private readonly size: number;
  private readonly hashCount: number;
  private readonly bits: Uint8Array;
  private itemCount: number = 0;

  /**
   * Create a Bloom filter
   * @param expectedItems Expected number of items
   * @param falsePositiveRate Desired false positive rate (e.g., 0.01 for 1%)
   */
  constructor(expectedItems: number, falsePositiveRate: number = 0.01) {
    // Calculate optimal size: m = -n * ln(p) / (ln(2)^2)
    this.size = Math.ceil(
      (-expectedItems * Math.log(falsePositiveRate)) / Math.pow(Math.log(2), 2),
    );

    // Calculate optimal number of hash functions: k = (m/n) * ln(2)
    this.hashCount = Math.ceil((this.size / expectedItems) * Math.log(2));

    // Limit hash count to reasonable range
    this.hashCount = Math.max(1, Math.min(this.hashCount, 10));

    // Create bit array (using Uint8Array, 8 bits per element)
    const byteSize = Math.ceil(this.size / 8);
    this.bits = new Uint8Array(byteSize);
  }

  /**
   * Add an item to the filter
   */
  add(item: string): void {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      const index = hash % this.size;
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bits[byteIndex] |= 1 << bitIndex;
    }

    this.itemCount++;
  }

  /**
   * Check if an item might be in the filter
   * Returns false if definitely not in filter, true if possibly in filter
   */
  mightContain(item: string): boolean {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      const index = hash % this.size;
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;

      if ((this.bits[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get multiple hash values for an item
   */
  private getHashes(item: string): number[] {
    const hash1 = hashFnv1a(item);
    const hash2 = hashDjb2(item);
    const hash3 = hashSdbm(item);

    const hashes: number[] = [];

    // Use double hashing technique: h(i) = h1 + i * h2
    for (let i = 0; i < this.hashCount; i++) {
      const hash = (hash1 + i * hash2 + (i * i * hash3) / 2) >>> 0;
      hashes.push(hash);
    }

    return hashes;
  }

  /**
   * Get the number of items added
   */
  getItemCount(): number {
    return this.itemCount;
  }

  /**
   * Get the size of the filter in bits
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get the fill ratio (approximate)
   */
  getFillRatio(): number {
    let setBits = 0;
    for (let i = 0; i < this.bits.length; i++) {
      let byte = this.bits[i];
      while (byte) {
        setBits += byte & 1;
        byte >>= 1;
      }
    }
    return setBits / this.size;
  }

  /**
   * Clear the filter
   */
  clear(): void {
    this.bits.fill(0);
    this.itemCount = 0;
  }

  /**
   * Estimate current false positive rate
   */
  estimateFalsePositiveRate(): number {
    const fillRatio = this.getFillRatio();
    return Math.pow(fillRatio, this.hashCount);
  }
}

/**
 * Build a cache key for permission checks
 */
export function buildPermissionCacheKey(user: string, relation: string, object: string): string {
  return `${user}|${relation}|${object}`;
}
