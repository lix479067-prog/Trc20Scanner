import { db } from "./db";
import { walletRecords, scanSessions, users } from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import type { 
  WalletRecord, 
  InsertWalletRecord, 
  ScanSession, 
  InsertScanSession,
  User,
  UpsertUser
} from "@shared/schema";

export interface IStorage {
  // User operations (REQUIRED for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Wallet Records
  saveWalletRecord(record: InsertWalletRecord): Promise<WalletRecord>;
  getWalletRecord(address: string): Promise<WalletRecord | undefined>;
  getWalletRecordsBySession(sessionId: number): Promise<WalletRecord[]>;
  getAllWalletRecords(limit?: number, offset?: number, userId?: string): Promise<WalletRecord[]>;
  updateWalletRecord(address: string, updates: Partial<InsertWalletRecord>): Promise<WalletRecord | undefined>;
  deleteWalletRecord(address: string): Promise<boolean>;
  
  // Scan Sessions
  createScanSession(session: InsertScanSession): Promise<ScanSession>;
  getScanSession(id: number): Promise<ScanSession | undefined>;
  getActiveScanSessions(userId?: string): Promise<ScanSession[]>;
  updateScanSession(id: number, updates: Partial<ScanSession>): Promise<ScanSession | undefined>;
  completeScanSession(id: number, totalFound: number): Promise<ScanSession | undefined>;
  
  // Statistics
  getWalletStatistics(userId?: string): Promise<{
    totalWallets: number;
    totalBalance: number;
    totalSessions: number;
    activeSessions: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (REQUIRED for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Wallet Records
  async saveWalletRecord(record: InsertWalletRecord): Promise<WalletRecord> {
    const [wallet] = await db.insert(walletRecords).values(record).returning();
    return wallet;
  }

  async getWalletRecord(address: string): Promise<WalletRecord | undefined> {
    const [wallet] = await db
      .select()
      .from(walletRecords)
      .where(eq(walletRecords.address, address))
      .limit(1);
    return wallet;
  }

  async getWalletRecordsBySession(sessionId: number): Promise<WalletRecord[]> {
    // For now, we'll get wallets created during the session timeframe
    // In a more complex system, we'd have a direct session-wallet relationship
    const session = await this.getScanSession(sessionId);
    if (!session) return [];

    return await db
      .select()
      .from(walletRecords)
      .where(gte(walletRecords.scannedAt, session.startedAt))
      .orderBy(desc(walletRecords.scannedAt));
  }

  async getAllWalletRecords(limit: number = 50, offset: number = 0, userId?: string): Promise<WalletRecord[]> {
    let query = db
      .select()
      .from(walletRecords)
      .where(eq(walletRecords.isActive, true));
    
    // Filter by user if provided
    if (userId) {
      query = query.where(and(eq(walletRecords.isActive, true), eq(walletRecords.userId, userId)));
    }
    
    return await query
      .orderBy(desc(walletRecords.scannedAt))
      .limit(limit)
      .offset(offset);
  }

  async updateWalletRecord(address: string, updates: Partial<InsertWalletRecord>): Promise<WalletRecord | undefined> {
    const [wallet] = await db
      .update(walletRecords)
      .set({ ...updates, lastCheckedAt: new Date() })
      .where(eq(walletRecords.address, address))
      .returning();
    return wallet;
  }

  async deleteWalletRecord(address: string): Promise<boolean> {
    const result = await db
      .update(walletRecords)
      .set({ isActive: false })
      .where(eq(walletRecords.address, address));
    return (result.rowCount || 0) > 0;
  }

  // Scan Sessions
  async createScanSession(session: InsertScanSession): Promise<ScanSession> {
    const [newSession] = await db.insert(scanSessions).values(session).returning();
    return newSession;
  }

  async getScanSession(id: number): Promise<ScanSession | undefined> {
    const [session] = await db
      .select()
      .from(scanSessions)
      .where(eq(scanSessions.id, id))
      .limit(1);
    return session;
  }

  async getActiveScanSessions(userId?: string): Promise<ScanSession[]> {
    let query = db
      .select()
      .from(scanSessions)
      .where(eq(scanSessions.isActive, true));
    
    // Filter by user if provided
    if (userId) {
      query = query.where(and(eq(scanSessions.isActive, true), eq(scanSessions.userId, userId)));
    }
    
    return await query.orderBy(desc(scanSessions.startedAt));
  }

  async updateScanSession(id: number, updates: Partial<ScanSession>): Promise<ScanSession | undefined> {
    const [session] = await db
      .update(scanSessions)
      .set(updates)
      .where(eq(scanSessions.id, id))
      .returning();
    return session;
  }

  async completeScanSession(id: number, totalFound: number): Promise<ScanSession | undefined> {
    const [session] = await db
      .update(scanSessions)
      .set({
        totalFound,
        isActive: false,
        completedAt: new Date(),
      })
      .where(eq(scanSessions.id, id))
      .returning();
    return session;
  }

  // Statistics
  async getWalletStatistics(userId?: string): Promise<{
    totalWallets: number;
    totalBalance: number;
    totalSessions: number;
    activeSessions: number;
  }> {
    // Build base queries with optional user filtering
    let walletQuery = db.select().from(walletRecords).where(eq(walletRecords.isActive, true));
    let sessionQuery = db.select().from(scanSessions);
    let activeSessionQuery = db.select().from(scanSessions).where(eq(scanSessions.isActive, true));
    let balanceQuery = db.select({ totalBalanceUsd: walletRecords.totalBalanceUsd })
      .from(walletRecords).where(eq(walletRecords.isActive, true));

    // Apply user filter if provided
    if (userId) {
      walletQuery = walletQuery.where(and(eq(walletRecords.isActive, true), eq(walletRecords.userId, userId)));
      sessionQuery = sessionQuery.where(eq(scanSessions.userId, userId));
      activeSessionQuery = activeSessionQuery.where(and(eq(scanSessions.isActive, true), eq(scanSessions.userId, userId)));
      balanceQuery = balanceQuery.where(and(eq(walletRecords.isActive, true), eq(walletRecords.userId, userId)));
    }

    // Execute queries
    const [totalWalletsResult, totalSessionsResult, activeSessionsResult, allWallets] = await Promise.all([
      walletQuery,
      sessionQuery,
      activeSessionQuery,
      balanceQuery
    ]);

    const totalBalance = allWallets.reduce((sum, wallet) => {
      return sum + parseFloat(wallet.totalBalanceUsd);
    }, 0);

    return {
      totalWallets: totalWalletsResult.length,
      totalBalance,
      totalSessions: totalSessionsResult.length,
      activeSessions: activeSessionsResult.length,
    };
  }
}

export const storage = new DatabaseStorage();
