import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tronService } from "./services/tron";
import { batchScanner } from "./services/batch-scanner";
import { privateKeyGenerator } from "./services/private-key-generator";
import { setupAuth, requireAuth } from "./auth";
import { privateKeySchema, privateKeyTemplateSchema, randomScanSchema } from "@shared/schema";
import type { WalletInfo } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  setupAuth(app);
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

  // Start batch scan with template or random
  app.post("/api/scan/start", requireAuth, async (req: any, res) => {
    try {
      const scanParams = randomScanSchema.parse(req.body);
      
      if (scanParams.scanMode === 'template' && scanParams.template) {
        // Validate template
        const validation = privateKeyGenerator.validateTemplate(scanParams.template);
        if (!validation.isValid) {
          return res.status(400).json({
            message: validation.error || "Invalid template",
            wildcardCount: validation.wildcardCount,
          });
        }
        
        // Get user ID from authenticated request
        const userId = req.user.id;
        
        // Convert to legacy format for compatibility with user ID
        const template = {
          template: scanParams.template,
          maxVariations: scanParams.maxVariations,
          parallelThreads: scanParams.parallelThreads,
          userId: userId, // Associate scan with user
        };
        
        const result = await batchScanner.startBatchScan(template);
        res.json(result);
      } else {
        // Get user ID from authenticated request
        const userId = req.user.id;
        
        // Pure random scanning with user association
        const result = await batchScanner.startRandomScan({
          maxVariations: scanParams.maxVariations,
          parallelThreads: scanParams.parallelThreads,
          userId: userId, // Associate scan with user
        });
        res.json(result);
      }
    } catch (error: any) {
      console.error("Error starting scan:", error);
      res.status(400).json({
        message: error.message || "Failed to start scan"
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
  app.get("/api/scan/sessions", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getAllScanSessions(userId);
      res.json(sessions);
    } catch (error: any) {
      console.error("Error getting scan sessions:", error);
      res.status(500).json({
        message: error.message || "Failed to get scan sessions"
      });
    }
  });

  // Get discovered wallets (user-specific when authenticated)
  // Get user's wallet records (requires authentication)
  app.get("/api/wallets", requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get wallets for the authenticated user only
      const userId = req.user.id;
      const wallets = await storage.getAllWalletRecords(limit, offset, userId);
      res.json(wallets);
    } catch (error: any) {
      console.error("Error getting wallets:", error);
      res.status(500).json({
        message: error.message || "Failed to get wallets"
      });
    }
  });

  // Get statistics (user-specific when authenticated)
  app.get("/api/stats", async (req: any, res) => {
    try {
      // Get user ID if authenticated (optional)
      let userId: string | undefined;
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
        userId = req.user.id;
      }
      
      const stats = await storage.getWalletStatistics(userId);
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

  // Test route for debugging the complete flow
  app.post("/api/test-flow", async (req, res) => {
    try {
      console.log('\n=== TESTING COMPLETE FLOW ===');
      
      // Test 1: Generate random private keys
      console.log('1. Generating random private keys...');
      const testPrivateKeys = [];
      for (let i = 0; i < 3; i++) {
        const randomHex = Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        testPrivateKeys.push(randomHex);
        console.log(`   Generated: ${randomHex.slice(0, 8)}...${randomHex.slice(-8)}`);
      }
      
      // Test 2: Convert to addresses and query transactions
      console.log('\n2. Converting to addresses and querying transactions...');
      const testResults = [];
      
      for (const privateKey of testPrivateKeys) {
        try {
          // Step 2a: Convert private key to address
          const address = await tronService.generateAddressFromPrivateKey(privateKey);
          console.log(`   ${privateKey.slice(0, 8)}... → ${address}`);
          
          // Step 2b: Query transactions
          console.log(`   Querying transactions for ${address}...`);
          const startTime = Date.now();
          const transactions = await tronService.getRecentTransactions(address);
          const queryTime = Date.now() - startTime;
          console.log(`   Found ${transactions.length} transactions in ${queryTime}ms`);
          
          testResults.push({
            privateKey: privateKey.slice(0, 8) + '...',
            address,
            transactionCount: transactions.length,
            queryTimeMs: queryTime,
            success: true
          });
          
        } catch (error) {
          console.error(`   ERROR for ${privateKey.slice(0, 8)}...:`, error.message);
          testResults.push({
            privateKey: privateKey.slice(0, 8) + '...',
            address: 'FAILED',
            transactionCount: 0,
            queryTimeMs: 0,
            success: false,
            error: error.message
          });
        }
        
        // Add delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('\n=== TEST RESULTS ===');
      console.log(JSON.stringify(testResults, null, 2));
      
      const successCount = testResults.filter(r => r.success).length;
      const avgQueryTime = testResults.filter(r => r.success).reduce((sum, r) => sum + r.queryTimeMs, 0) / successCount || 0;
      
      res.json({
        success: true,
        message: 'Flow test completed',
        summary: {
          totalTests: testResults.length,
          successful: successCount,
          failed: testResults.length - successCount,
          averageQueryTime: Math.round(avgQueryTime)
        },
        results: testResults
      });
      
    } catch (error) {
      console.error('Test flow error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Test specific address transaction parsing
  app.post("/api/test-specific-address", async (req, res) => {
    try {
      const { address } = req.body;
      console.log(`\n=== TESTING SPECIFIC ADDRESS: ${address} ===`);
      
      // Test our transaction parsing
      const transactions = await tronService.getRecentTransactions(address);
      console.log(`Found ${transactions.length} transactions with our parser`);
      
      // Show details of parsed transactions
      console.log('Parsed transactions:', JSON.stringify(transactions, null, 2));
      
      res.json({
        success: true,
        address,
        transactionCount: transactions.length,
        transactions,
        shouldBeDetectedAsActive: transactions.length > 0
      });
      
    } catch (error) {
      console.error('Test specific address error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Test if template covers target address
  app.post("/api/test-template-coverage", async (req, res) => {
    try {
      const { template, targetAddress } = req.body;
      console.log(`\n=== TESTING TEMPLATE COVERAGE ===`);
      console.log(`Template: ${template}`);
      console.log(`Target Address: ${targetAddress}`);
      
      // Generate all possible private keys from template
      const allKeys = [];
      const validation = privateKeyGenerator.validateTemplate(template);
      if (!validation.isValid) {
        throw new Error(`Invalid template: ${validation.error}`);
      }
      
      // Generate all 256 combinations (16x16 for two hex digits)
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          const hex1 = i.toString(16);
          const hex2 = j.toString(16);
          const privateKey = template.replace('??', hex1 + hex2);
          allKeys.push(privateKey);
        }
      }
      console.log(`Generated ${allKeys.length} private keys from template`);
      
      // Test each private key to see if it generates the target address
      let foundMatch = false;
      let matchingPrivateKey = '';
      
      for (const privateKey of allKeys) {
        try {
          const address = await tronService.generateAddressFromPrivateKey(privateKey);
          if (address === targetAddress) {
            foundMatch = true;
            matchingPrivateKey = privateKey;
            console.log(`✅ FOUND MATCH! Private key: ${privateKey}`);
            console.log(`✅ Generates address: ${address}`);
            break;
          }
        } catch (error) {
          console.error(`Error testing private key ${privateKey.slice(0, 8)}...:`, error.message);
        }
      }
      
      if (!foundMatch) {
        console.log(`❌ NO MATCH FOUND - Template does not cover target address`);
      }
      
      res.json({
        success: true,
        template,
        targetAddress,
        totalKeysGenerated: allKeys.length,
        foundMatch,
        matchingPrivateKey: foundMatch ? matchingPrivateKey : null,
        conclusion: foundMatch ? 
          "Template covers target address - scanning should detect it" : 
          "Template does NOT cover target address - this explains why scanning failed"
      });
      
    } catch (error) {
      console.error('Test template coverage error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Test generateAll method
  app.post("/api/test-generate-all", async (req, res) => {
    try {
      const { template, targetPrivateKey } = req.body;
      console.log(`\n=== TESTING GENERATE ALL METHOD ===`);
      console.log(`Template: ${template}`);
      console.log(`Target: ${targetPrivateKey}`);
      
      // Generate all keys using the new method
      const allKeys = privateKeyGenerator.generateAll(template, 256);
      console.log(`Generated ${allKeys.length} keys`);
      
      // Check if target key is in the list
      const foundIndex = allKeys.findIndex(key => key === targetPrivateKey.toLowerCase());
      const isFound = foundIndex !== -1;
      
      console.log(`Target key found: ${isFound} (index: ${foundIndex})`);
      
      if (isFound) {
        console.log(`✅ GENERATEALL WORKS - Target key found at index ${foundIndex}`);
      } else {
        console.log(`❌ GENERATEALL PROBLEM - Target key missing from generated list`);
        console.log(`First 5 keys: ${allKeys.slice(0, 5).join(', ')}`);
        console.log(`Last 5 keys: ${allKeys.slice(-5).join(', ')}`);
      }
      
      res.json({
        success: true,
        template,
        targetPrivateKey,
        totalGenerated: allKeys.length,
        foundInList: isFound,
        foundAtIndex: foundIndex,
        firstFiveKeys: allKeys.slice(0, 5),
        lastFiveKeys: allKeys.slice(-5),
        conclusion: isFound ? 'generateAll method works correctly' : 'generateAll method has a bug'
      });
      
    } catch (error) {
      console.error('Test generateAll error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Test user's specific private key
  app.post("/api/test-your-key", async (req, res) => {
    try {
      const { privateKey } = req.body;
      console.log(`\n=== TESTING YOUR PRIVATE KEY ===`);
      console.log(`Private Key: ${privateKey.slice(0, 8)}...${privateKey.slice(-8)}`);
      
      // Step 1: Generate address
      const address = await tronService.generateAddressFromPrivateKey(privateKey);
      console.log(`Generated Address: ${address}`);
      
      // Step 2: Check transactions 
      const transactions = await tronService.getRecentTransactions(address);
      console.log(`Found ${transactions.length} transactions`);
      
      // Step 3: Apply our scanning logic
      const hasTransactions = transactions.length >= 1; // MIN_ACTIVITY_THRESHOLD
      console.log(`Meets activity threshold (≥1): ${hasTransactions}`);
      
      // Step 4: Simulate what batch scanner would do
      if (hasTransactions) {
        console.log(`✅ WOULD BE SAVED as active wallet`);
      } else {
        console.log(`❌ WOULD BE SKIPPED - not active`);
      }
      
      res.json({
        success: true,
        privateKey: privateKey.slice(0, 8) + '...',
        address,
        transactionCount: transactions.length,
        meetsThreshold: hasTransactions,
        shouldBeSaved: hasTransactions,
        transactions: transactions.slice(0, 3) // Show first 3
      });
      
    } catch (error) {
      console.error('Test your key error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
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
