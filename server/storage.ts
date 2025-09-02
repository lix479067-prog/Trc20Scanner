import { db } from "./db";
import { walletRecords, scanSessions, users } from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import type { 
  WalletRecord, 
  InsertWalletRecord, 
  ScanSession, 
  InsertScanSession,
  User,
  InsertUser
} from "@shared/schema";

export interface IStorage {
  // User operations for local authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  
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
  // User operations for local authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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
    const conditions = [eq(walletRecords.isActive, true)];
    
    // Filter by user if provided
    if (userId) {
      conditions.push(eq(walletRecords.userId, userId));
    }
    
    return await db
      .select()
      .from(walletRecords)
      .where(and(...conditions))
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
    const conditions = [eq(scanSessions.isActive, true)];
    
    if (userId) {
      conditions.push(eq(scanSessions.userId, userId));
    }
    
    return await db
      .select()
      .from(scanSessions)
      .where(and(...conditions))
      .orderBy(desc(scanSessions.startedAt));
  }

  async getAllScanSessions(userId?: string): Promise<ScanSession[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(scanSessions.userId, userId));
    }
    
    const baseQuery = db.select().from(scanSessions);
    
    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(desc(scanSessions.startedAt));
    } else {
      return await baseQuery.orderBy(desc(scanSessions.startedAt));
    }
  }

  async updateScanSession(id: number, updates: Partial<ScanSession>): Promise<ScanSession | undefined> {
    const [session] = await db
      .update(scanSessions)
      .set(updates)
      .where(eq(scanSessions.id, id))
      .returning();
    return session;
  }

  async completeScanSession(id: number, totalFound: number, totalScanned?: number): Promise<ScanSession | undefined> {
    const updates: any = {
      totalFound,
      isActive: false,
      status: 'completed',
      completedAt: new Date(),
    };
    
    if (totalScanned !== undefined) {
      updates.totalScanned = totalScanned;
    }
    
    const [session] = await db
      .update(scanSessions)
      .set(updates)
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
    // Build wallet conditions
    const walletConditions = [eq(walletRecords.isActive, true)];
    const sessionConditions = [];
    const activeSessionConditions = [eq(scanSessions.isActive, true)];

    if (userId) {
      walletConditions.push(eq(walletRecords.userId, userId));
      sessionConditions.push(eq(scanSessions.userId, userId));
      activeSessionConditions.push(eq(scanSessions.userId, userId));
    }

    // Build queries
    const walletQuery = db.select().from(walletRecords).where(and(...walletConditions));
    const sessionQuery = sessionConditions.length > 0 
      ? db.select().from(scanSessions).where(and(...sessionConditions))
      : db.select().from(scanSessions);
    const activeSessionQuery = db.select().from(scanSessions).where(and(...activeSessionConditions));
    const balanceQuery = db.select({ totalBalanceUsd: walletRecords.totalBalanceUsd })
      .from(walletRecords).where(and(...walletConditions));

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
