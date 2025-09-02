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
}

export class BatchScanner {
  private activeSessions = new Map<number, ScanProgress>();
  private readonly MIN_BALANCE_THRESHOLD = 0.001; // Minimum balance to save wallet
  private readonly MIN_ACTIVITY_THRESHOLD = 1; // Minimum transaction count for active wallet

  /**
   * Start a new random scan session (no template)
   */
  async startRandomScan(params: { maxVariations: number; parallelThreads: number }): Promise<BatchScanResult> {
    // Create scan session in database
    const session = await storage.createScanSession({
      template: 'RANDOM_SCAN',
    });

    // Initialize progress tracking
    const progress: ScanProgress = {
      sessionId: session.id,
      template: 'RANDOM_SCAN',
      totalGenerated: 0,
      totalScanned: 0,
      totalFound: 0,
      foundWallets: [],
      isCompleted: false,
      isRunning: true,
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
   */
  async startBatchScan(template: PrivateKeyTemplate): Promise<BatchScanResult> {
    // Validate template
    const validation = privateKeyGenerator.validateTemplate(template.template);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid template');
    }

    // Create scan session in database
    const session = await storage.createScanSession({
      template: template.template,
    });

    // Initialize progress tracking
    const progress: ScanProgress = {
      sessionId: session.id,
      template: template.template,
      totalGenerated: 0,
      totalScanned: 0,
      totalFound: 0,
      foundWallets: [],
      isCompleted: false,
      isRunning: true,
    };

    this.activeSessions.set(session.id, progress);

    // Start scanning asynchronously
    this.performBatchScan(session.id, template).catch((error) => {
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

        // Update session progress
        if (promises.length % 5 === 0) {
          await storage.updateScanSession(sessionId, {
            totalGenerated: progress.totalGenerated,
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
   * Perform the actual batch scanning with template
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

        // Update session progress every few batches
        if (promises.length % 10 === 0) {
          await storage.updateScanSession(sessionId, {
            totalGenerated: progress.totalGenerated,
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
   * Process a batch of private keys
   */
  private async processBatch(sessionId: number, privateKeys: string[]): Promise<void> {
    const progress = this.activeSessions.get(sessionId);
    if (!progress || !progress.isRunning) return;

    const concurrentChecks = privateKeys.map(async (privateKey) => {
      if (!progress.isRunning) return;

      try {
        // Generate address from private key
        const address = await tronService.generateAddressFromPrivateKey(privateKey);
        
        // Get wallet info
        const walletInfo = await this.getWalletInfo(address);
        
        progress.totalScanned++;

        // Check if wallet is truly active (has balance OR transaction history)
        const totalBalanceUsd = walletInfo.trxBalanceUsd + 
          walletInfo.tokens.reduce((sum, token) => sum + token.balanceUsd, 0);
        const hasTransactions = walletInfo.transactions.length >= this.MIN_ACTIVITY_THRESHOLD;
        const hasSignificantBalance = totalBalanceUsd >= this.MIN_BALANCE_THRESHOLD;

        if (hasSignificantBalance || hasTransactions) {
          // Save wallet to database
          await storage.saveWalletRecord({
            privateKey,
            address: walletInfo.address,
            trxBalance: walletInfo.trxBalance.toString(),
            trxBalanceUsd: walletInfo.trxBalanceUsd.toString(),
            tokensCount: walletInfo.tokens.length,
            totalBalanceUsd: totalBalanceUsd.toString(),
          });

          // Add to current session results
          progress.foundWallets.push({
            address: walletInfo.address,
            privateKey,
            trxBalance: walletInfo.trxBalance,
            totalBalanceUsd,
          });

          progress.totalFound++;

          console.log(`Found wallet with balance: ${address} (${totalBalanceUsd} USD)`);
        }

      } catch (error) {
        console.error(`Error checking private key ${privateKey.slice(0, 8)}...`, error);
        progress.totalScanned++;
      }
    });

    await Promise.all(concurrentChecks);
  }

  /**
   * Get wallet info with caching and error handling
   */
  private async getWalletInfo(address: string): Promise<WalletInfo> {
    try {
      const [trxBalance, resources, tokens, transactions] = await Promise.all([
        tronService.getTrxBalance(address),
        tronService.getAccountResources(address),
        tronService.getTrc20Balances(address),
        tronService.getRecentTransactions(address),
      ]);

      return {
        address,
        trxBalance: trxBalance.balance,
        trxBalanceUsd: trxBalance.balanceUsd,
        energy: resources.energy,
        bandwidth: resources.bandwidth,
        tokens,
        transactions,
      };
    } catch (error) {
      // Return empty wallet info if there's an error
      return {
        address,
        trxBalance: 0,
        trxBalanceUsd: 0,
        energy: { used: 0, total: 0 },
        bandwidth: { used: 0, total: 0 },
        tokens: [],
        transactions: [],
      };
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

      await storage.completeScanSession(sessionId, progress.totalFound);
      
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