import { z } from "zod";

// Private key validation schema
export const privateKeySchema = z.object({
  privateKey: z.string()
    .length(64, "Private key must be exactly 64 characters")
    .regex(/^[a-fA-F0-9]+$/, "Private key must contain only hexadecimal characters"),
});

// Wallet info response schema
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

export type PrivateKeyInput = z.infer<typeof privateKeySchema>;
export type WalletInfo = z.infer<typeof walletInfoSchema>;
