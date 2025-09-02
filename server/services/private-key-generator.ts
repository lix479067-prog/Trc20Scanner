/**
 * High-Performance Private Key Generator Service
 * Optimized for random generation and scanning efficiency
 */

export class PrivateKeyGenerator {
  private readonly hexChars = '0123456789abcdef';
  private randomBuffer: Uint8Array;
  private bufferIndex: number = 0;
  
  constructor() {
    // Pre-generate random bytes for better performance
    this.randomBuffer = new Uint8Array(10000);
    this.refreshRandomBuffer();
  }

  /**
   * Generate random private key variations from a template
   * Uses optimized random generation for high performance
   */
  generateFromTemplate(template: string, maxVariations: number = 1000): string[] {
    if (template.length !== 64) {
      throw new Error('Template must be exactly 64 characters');
    }

    if (!/^[a-fA-F0-9\?]+$/.test(template)) {
      throw new Error('Template must contain only hexadecimal characters and ? for wildcards');
    }

    const wildcardPositions = this.findWildcardPositions(template);
    
    if (wildcardPositions.length === 0) {
      return [template.toLowerCase()];
    }

    const variations = new Set<string>();
    const baseTemplate = template.toLowerCase();

    // Use high-performance random generation
    while (variations.size < maxVariations) {
      const privateKey = this.generateRandomVariation(baseTemplate, wildcardPositions);
      variations.add(privateKey);
      
      // Break if we're hitting duplicates too often (unlikely with good randomness)
      if (variations.size > 0 && (variations.size * 3) < maxVariations) {
        break;
      }
    }

    return Array.from(variations);
  }

  /**
   * Refresh the random buffer with new crypto-strong random bytes
   */
  private refreshRandomBuffer(): void {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(this.randomBuffer);
    } else {
      // Fallback for Node.js
      const crypto = require('crypto');
      const randomBytes = crypto.randomBytes(this.randomBuffer.length);
      this.randomBuffer.set(randomBytes);
    }
    this.bufferIndex = 0;
  }

  /**
   * Get next random byte from buffer, refreshing if needed
   */
  private getRandomByte(): number {
    if (this.bufferIndex >= this.randomBuffer.length) {
      this.refreshRandomBuffer();
    }
    return this.randomBuffer[this.bufferIndex++];
  }

  /**
   * Generate a single random variation optimized for performance
   */
  private generateRandomVariation(template: string, wildcardPositions: number[]): string {
    let result = template;
    
    for (const position of wildcardPositions) {
      const randomByte = this.getRandomByte();
      const hexIndex = randomByte & 0xF; // Use only lower 4 bits for hex (0-15)
      const randomHex = this.hexChars[hexIndex];
      result = result.substring(0, position) + randomHex + result.substring(position + 1);
    }

    return result;
  }

  /**
   * Generate private keys in continuous stream for high-speed scanning
   */
  *generateBatches(template: string, maxVariations: number, batchSize: number = 50): Generator<string[], void, unknown> {
    const wildcardPositions = this.findWildcardPositions(template);
    
    if (wildcardPositions.length === 0) {
      yield [template.toLowerCase()];
      return;
    }

    const baseTemplate = template.toLowerCase();
    let generated = 0;

    while (generated < maxVariations) {
      const currentBatchSize = Math.min(batchSize, maxVariations - generated);
      const batch: string[] = [];

      // Generate batch without checking for duplicates for speed
      // Duplicates are extremely rare with good randomness
      for (let i = 0; i < currentBatchSize; i++) {
        const privateKey = this.generateRandomVariation(baseTemplate, wildcardPositions);
        batch.push(privateKey);
      }

      generated += batch.length;
      yield batch;
    }
  }

  /**
   * Validate a private key template
   */
  validateTemplate(template: string): { isValid: boolean; error?: string; wildcardCount: number } {
    if (template.length !== 64) {
      return {
        isValid: false,
        error: 'Template must be exactly 64 characters',
        wildcardCount: 0
      };
    }

    if (!/^[a-fA-F0-9\?]+$/.test(template)) {
      return {
        isValid: false,
        error: 'Template must contain only hexadecimal characters and ? for wildcards',
        wildcardCount: 0
      };
    }

    const wildcardCount = (template.match(/\?/g) || []).length;

    if (wildcardCount > 20) {
      return {
        isValid: false,
        error: 'Too many wildcards (max 20 for performance)',
        wildcardCount
      };
    }

    return {
      isValid: true,
      wildcardCount
    };
  }

  /**
   * Calculate total possible combinations for a template
   */
  calculateTotalCombinations(template: string): number {
    const wildcardCount = (template.match(/\?/g) || []).length;
    return Math.pow(16, wildcardCount);
  }

  /**
   * Generate high-entropy random private keys (no template)
   * For pure random scanning
   */
  generateRandomKeys(count: number): string[] {
    const keys: string[] = [];
    
    for (let i = 0; i < count; i++) {
      let key = '';
      for (let j = 0; j < 64; j++) {
        const randomByte = this.getRandomByte();
        const hexIndex = randomByte & 0xF;
        key += this.hexChars[hexIndex];
      }
      keys.push(key);
    }
    
    return keys;
  }

  /**
   * Generate continuous stream of random keys
   */
  *generateRandomStream(batchSize: number = 50): Generator<string[], void, unknown> {
    while (true) {
      const batch: string[] = [];
      
      for (let i = 0; i < batchSize; i++) {
        let key = '';
        for (let j = 0; j < 64; j++) {
          const randomByte = this.getRandomByte();
          const hexIndex = randomByte & 0xF;
          key += this.hexChars[hexIndex];
        }
        batch.push(key);
      }
      
      yield batch;
    }
  }

  /**
   * Find all wildcard positions in the template
   */
  private findWildcardPositions(template: string): number[] {
    const positions: number[] = [];
    for (let i = 0; i < template.length; i++) {
      if (template[i] === '?') {
        positions.push(i);
      }
    }
    return positions;
  }

  /**
   * Smart random generation with entropy distribution
   * Avoids common weak patterns
   */
  generateSmartRandom(template: string, count: number): string[] {
    const wildcardPositions = this.findWildcardPositions(template);
    const baseTemplate = template.toLowerCase();
    const keys: string[] = [];
    
    for (let i = 0; i < count; i++) {
      let result = baseTemplate;
      
      // Use different entropy sources for different positions
      for (let j = 0; j < wildcardPositions.length; j++) {
        const position = wildcardPositions[j];
        let hexValue: number;
        
        // Mix entropy sources to avoid patterns
        if (j % 3 === 0) {
          // Use timestamp-based entropy
          hexValue = (Date.now() + i + j) & 0xF;
        } else if (j % 3 === 1) {
          // Use random buffer
          hexValue = this.getRandomByte() & 0xF;
        } else {
          // Use mixed entropy
          const byte1 = this.getRandomByte();
          const byte2 = (Date.now() + position) & 0xFF;
          hexValue = (byte1 ^ byte2) & 0xF;
        }
        
        const hexChar = this.hexChars[hexValue];
        result = result.substring(0, position) + hexChar + result.substring(position + 1);
      }
      
      keys.push(result);
    }
    
    return keys;
  }
}

export const privateKeyGenerator = new PrivateKeyGenerator();