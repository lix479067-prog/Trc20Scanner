import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tronService } from "./services/tron";
import { batchScanner } from "./services/batch-scanner";
import { privateKeyGenerator } from "./services/private-key-generator";
import { privateKeySchema, privateKeyTemplateSchema } from "@shared/schema";
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

  // Start batch scan with template
  app.post("/api/scan/start", async (req, res) => {
    try {
      const template = privateKeyTemplateSchema.parse(req.body);
      
      // Validate template
      const validation = privateKeyGenerator.validateTemplate(template.template);
      if (!validation.isValid) {
        return res.status(400).json({
          message: validation.error || "Invalid template",
          wildcardCount: validation.wildcardCount,
        });
      }

      const result = await batchScanner.startBatchScan(template);
      res.json(result);
    } catch (error: any) {
      console.error("Error starting batch scan:", error);
      res.status(400).json({
        message: error.message || "Failed to start batch scan"
      });
    }
  });

  // Get scan progress
  app.get("/api/scan/progress/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const progress = await batchScanner.getScanProgress(sessionId);
      if (!progress) {
        return res.status(404).json({ message: "Scan session not found" });
      }

      res.json(progress);
    } catch (error: any) {
      console.error("Error getting scan progress:", error);
      res.status(500).json({
        message: error.message || "Failed to get scan progress"
      });
    }
  });

  // Stop scan session
  app.post("/api/scan/stop/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const stopped = await batchScanner.stopScanSession(sessionId);
      res.json({ success: stopped, sessionId });
    } catch (error: any) {
      console.error("Error stopping scan:", error);
      res.status(500).json({
        message: error.message || "Failed to stop scan"
      });
    }
  });

  // Get all scan sessions
  app.get("/api/scan/sessions", async (req, res) => {
    try {
      const activeSessions = await storage.getActiveScanSessions();
      res.json(activeSessions);
    } catch (error: any) {
      console.error("Error getting scan sessions:", error);
      res.status(500).json({
        message: error.message || "Failed to get scan sessions"
      });
    }
  });

  // Get discovered wallets
  app.get("/api/wallets", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const wallets = await storage.getAllWalletRecords(limit, offset);
      res.json(wallets);
    } catch (error: any) {
      console.error("Error getting wallets:", error);
      res.status(500).json({
        message: error.message || "Failed to get wallets"
      });
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getWalletStatistics();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting statistics:", error);
      res.status(500).json({
        message: error.message || "Failed to get statistics"
      });
    }
  });

  // Validate private key template
  app.post("/api/template/validate", (req, res) => {
    try {
      const { template } = req.body;
      if (!template || typeof template !== 'string') {
        return res.status(400).json({ message: "Template is required" });
      }

      const validation = privateKeyGenerator.validateTemplate(template);
      const totalCombinations = privateKeyGenerator.calculateTotalCombinations(template);

      res.json({
        ...validation,
        totalCombinations,
        recommendedMaxVariations: Math.min(totalCombinations, 5000),
      });
    } catch (error: any) {
      console.error("Error validating template:", error);
      res.status(500).json({
        message: error.message || "Failed to validate template"
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
