import { z } from "zod";
import { pgTable, text, integer, decimal, timestamp, serial, boolean, varchar, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  password: varchar("password", { length: 255 }).notNull(), // Hashed password
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Database Tables
export const walletRecords = pgTable("wallet_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // Link to user
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
  userId: varchar("user_id").references(() => users.id), // Link to user
  template: text("template").notNull(),
  scanMode: varchar("scan_mode", { length: 20 }).notNull().default('random'), // 'random' or 'template'
  maxVariations: integer("max_variations").notNull().default(1000),
  parallelThreads: integer("parallel_threads").notNull().default(5),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  totalGenerated: integer("total_generated").notNull().default(0),
  totalScanned: integer("total_scanned").notNull().default(0),
  totalFound: integer("total_found").notNull().default(0),
  errorMessage: text("error_message"),
  isActive: boolean("is_active").notNull().default(true),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  lastProgressAt: timestamp("last_progress_at").notNull().defaultNow(),
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

// User validation schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional(),
  password: z.string().min(6),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// User Types
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Types
export type PrivateKeyInput = z.infer<typeof privateKeySchema>;
export type PrivateKeyTemplate = z.infer<typeof privateKeyTemplateSchema>;
export type WalletInfo = z.infer<typeof walletInfoSchema>;
export type WalletRecord = typeof walletRecords.$inferSelect;
export type InsertWalletRecord = z.infer<typeof insertWalletRecordSchema>;
export type ScanSession = typeof scanSessions.$inferSelect;
export type InsertScanSession = z.infer<typeof insertScanSessionSchema>;
export type UpdateScanSession = Partial<Omit<ScanSession, 'id' | 'userId' | 'startedAt'>>;
export type BatchScanResult = z.infer<typeof batchScanResultSchema>;

// Scan session status enum
export const ScanSessionStatus = {
  PENDING: 'pending',
  RUNNING: 'running', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type ScanSessionStatusType = typeof ScanSessionStatus[keyof typeof ScanSessionStatus];
