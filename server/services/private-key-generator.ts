/**
 * Private Key Generator Service
 * Generates multiple private key variations based on a template with wildcards
 */

export class PrivateKeyGenerator {
  private readonly hexChars = '0123456789abcdef';

  /**
   * Generate private key variations from a template
   * @param template - 64-character template with '?' as wildcards
   * @param maxVariations - Maximum number of variations to generate
   * @returns Array of generated private keys
   */
  generateFromTemplate(template: string, maxVariations: number = 1000): string[] {
    if (template.length !== 64) {
      throw new Error('Template must be exactly 64 characters');
    }

    if (!/^[a-fA-F0-9\?]+$/.test(template)) {
      throw new Error('Template must contain only hexadecimal characters and ? for wildcards');
    }

    const wildcardPositions = this.findWildcardPositions(template);
    const wildcardCount = wildcardPositions.length;

    if (wildcardCount === 0) {
      // No wildcards, return the template as-is
      return [template.toLowerCase()];
    }

    // Calculate total possible combinations
    const totalCombinations = Math.pow(16, wildcardCount);
    const actualVariations = Math.min(maxVariations, totalCombinations);

    const variations = new Set<string>();
    const baseTemplate = template.toLowerCase();

    // Generate variations
    for (let i = 0; i < actualVariations * 2 && variations.size < actualVariations; i++) {
      const privateKey = this.generateSingleVariation(baseTemplate, wildcardPositions);
      variations.add(privateKey);
    }

    return Array.from(variations);
  }

  /**
   * Generate private keys in batches for better memory management
   */
  *generateBatches(template: string, maxVariations: number, batchSize: number = 100): Generator<string[], void, unknown> {
    const wildcardPositions = this.findWildcardPositions(template);
    const wildcardCount = wildcardPositions.length;

    if (wildcardCount === 0) {
      yield [template.toLowerCase()];
      return;
    }

    const totalCombinations = Math.pow(16, wildcardCount);
    const actualVariations = Math.min(maxVariations, totalCombinations);
    const baseTemplate = template.toLowerCase();

    let generated = 0;
    const variations = new Set<string>();

    while (generated < actualVariations) {
      const currentBatchSize = Math.min(batchSize, actualVariations - generated);
      variations.clear();

      // Generate unique variations for this batch
      let attempts = 0;
      while (variations.size < currentBatchSize && attempts < currentBatchSize * 3) {
        const privateKey = this.generateSingleVariation(baseTemplate, wildcardPositions);
        variations.add(privateKey);
        attempts++;
      }

      const batch = Array.from(variations);
      generated += batch.length;
      
      if (batch.length > 0) {
        yield batch;
      }

      if (batch.length < currentBatchSize) {
        // Couldn't generate enough unique variations
        break;
      }
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
   * Generate a single random variation of the template
   */
  private generateSingleVariation(template: string, wildcardPositions: number[]): string {
    let result = template;
    
    for (const position of wildcardPositions) {
      const randomHex = this.hexChars[Math.floor(Math.random() * 16)];
      result = result.substring(0, position) + randomHex + result.substring(position + 1);
    }

    return result;
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
   * Generate systematic variations (sequential rather than random)
   * Useful for thorough scanning of a space
   */
  generateSystematicVariations(template: string, maxVariations: number = 1000): string[] {
    const wildcardPositions = this.findWildcardPositions(template);
    const wildcardCount = wildcardPositions.length;

    if (wildcardCount === 0) {
      return [template.toLowerCase()];
    }

    const totalCombinations = Math.pow(16, wildcardCount);
    const actualVariations = Math.min(maxVariations, totalCombinations);
    const variations: string[] = [];
    const baseTemplate = template.toLowerCase();

    for (let i = 0; i < actualVariations; i++) {
      let result = baseTemplate;
      let remaining = i;

      // Convert number to hex digits for each wildcard position
      for (let j = wildcardPositions.length - 1; j >= 0; j--) {
        const hexDigit = this.hexChars[remaining % 16];
        remaining = Math.floor(remaining / 16);
        result = result.substring(0, wildcardPositions[j]) + hexDigit + result.substring(wildcardPositions[j] + 1);
      }

      variations.push(result);
    }

    return variations;
  }
}

export const privateKeyGenerator = new PrivateKeyGenerator();