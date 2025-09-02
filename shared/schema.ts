import { z } from "zod";
import { pgTable, text, integer, decimal, timestamp, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Database Tables
export const walletRecords = pgTable("wallet_records", {
  id: serial("id").primaryKey(),
  privateKey: text("private_key").notNull(),
  address: text("address").notNull().unique(),
  trxBalance: decimal("trx_balance", { precision: 20, scale: 6 }).notNull(),
  trxBalanceUsd: decimal("trx_balance_usd", { precision: 20, scale: 2 }).notNull(),
  tokensCount: integer("tokens_count").notNull().default(0),
  totalBalanceUsd: decimal("total_balance_usd", { precision: 20, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
  lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
});

export const scanSessions = pgTable("scan_sessions", {
  id: serial("id").primaryKey(),
  template: text("template").notNull(),
  totalGenerated: integer("total_generated").notNull().default(0),
  totalFound: integer("total_found").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Validation schemas
export const privateKeySchema = z.object({
  privateKey: z.string()
    .length(64, "Private key must be exactly 64 characters")
    .regex(/^[a-fA-F0-9]+$/, "Private key must contain only hexadecimal characters"),
});

export const privateKeyTemplateSchema = z.object({
  template: z.string()
    .length(64, "Template must be exactly 64 characters")
    .regex(/^[a-fA-F0-9\?]+$/, "Template must contain only hexadecimal characters and ? for wildcards"),
  maxVariations: z.number().min(1).max(10000).default(1000),
  parallelThreads: z.number().min(1).max(10).default(5),
});

export const randomScanSchema = z.object({
  maxVariations: z.number().min(1).max(50000).default(5000),
  parallelThreads: z.number().min(1).max(10).default(5),
  scanMode: z.enum(['random', 'template']).default('random'),
  template: z.string().optional(),
});

export const walletInfoSchema = z.object({
  address: z.string(),
  trxBalance: z.number(),
  trxBalanceUsd: z.number(),
  energy: z.object({
    used: z.number(),
    total: z.number(),
  }),
  bandwidth: z.object({
    used: z.number(),
    total: z.number(),
  }),
  tokens: z.array(z.object({
    symbol: z.string(),
    name: z.string(),
    balance: z.number(),
    balanceUsd: z.number(),
    contractAddress: z.string(),
  })),
  transactions: z.array(z.object({
    hash: z.string(),
    type: z.enum(['send', 'receive']),
    amount: z.number(),
    symbol: z.string(),
    timestamp: z.number(),
    fromAddress: z.string(),
    toAddress: z.string(),
  })),
});

export const batchScanResultSchema = z.object({
  sessionId: z.number(),
  totalGenerated: z.number(),
  totalScanned: z.number(),
  totalFound: z.number(),
  foundWallets: z.array(z.object({
    address: z.string(),
    privateKey: z.string(),
    trxBalance: z.number(),
    totalBalanceUsd: z.number(),
  })),
  isCompleted: z.boolean(),
  progress: z.number(),
});

// Insert schemas
export const insertWalletRecordSchema = createInsertSchema(walletRecords).omit({
  id: true,
  scannedAt: true,
  lastCheckedAt: true,
});

export const insertScanSessionSchema = createInsertSchema(scanSessions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

// Types
export type PrivateKeyInput = z.infer<typeof privateKeySchema>;
export type PrivateKeyTemplate = z.infer<typeof privateKeyTemplateSchema>;
export type WalletInfo = z.infer<typeof walletInfoSchema>;
export type WalletRecord = typeof walletRecords.$inferSelect;
export type InsertWalletRecord = z.infer<typeof insertWalletRecordSchema>;
export type ScanSession = typeof scanSessions.$inferSelect;
export type InsertScanSession = z.infer<typeof insertScanSessionSchema>;
export type BatchScanResult = z.infer<typeof batchScanResultSchema>;
