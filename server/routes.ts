import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tronService } from "./services/tron";
import { privateKeySchema } from "@shared/schema";
import type { WalletInfo } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Import wallet from private key
  app.post("/api/wallet/import", async (req, res) => {
    try {
      // Validate request body
      const { privateKey } = privateKeySchema.parse(req.body);

      // Generate address from private key
      const address = await tronService.generateAddressFromPrivateKey(privateKey);

      // Get wallet information
      const walletInfo = await getWalletInfo(address);

      res.json(walletInfo);
    } catch (error: any) {
      console.error("Error importing wallet:", error);
      res.status(400).json({ 
        message: error.message || "Failed to import wallet" 
      });
    }
  });

  // Get wallet balance by address
  app.get("/api/wallet/balance/:address", async (req, res) => {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      // Get wallet information
      const walletInfo = await getWalletInfo(address);

      res.json(walletInfo);
    } catch (error: any) {
      console.error("Error getting wallet balance:", error);
      res.status(500).json({ 
        message: error.message || "Failed to get wallet balance" 
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Get comprehensive wallet information
 */
async function getWalletInfo(address: string): Promise<WalletInfo> {
  try {
    // Fetch all wallet data in parallel
    const [
      trxBalance,
      resources,
      tokens,
      transactions
    ] = await Promise.all([
      tronService.getTrxBalance(address),
      tronService.getAccountResources(address),
      tronService.getTrc20Balances(address),
      tronService.getRecentTransactions(address),
    ]);

    const walletInfo: WalletInfo = {
      address,
      trxBalance: trxBalance.balance,
      trxBalanceUsd: trxBalance.balanceUsd,
      energy: resources.energy,
      bandwidth: resources.bandwidth,
      tokens,
      transactions,
    };

    return walletInfo;
  } catch (error: any) {
    console.error("Error getting wallet info:", error);
    throw new Error(`Failed to get wallet information: ${error.message}`);
  }
}
