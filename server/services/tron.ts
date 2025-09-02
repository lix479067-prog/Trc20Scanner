// Dynamic import for TronWeb (CommonJS module)
let TronWeb: any;
let tronWeb: any;

// Initialize TronWeb asynchronously
async function initTronWeb() {
  if (!TronWeb) {
    TronWeb = (await import('tronweb')).default;
    tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || '' },
    });
  }
  return tronWeb;
}

export interface TRC20Token {
  symbol: string;
  name: string;
  balance: number;
  balanceUsd: number;
  contractAddress: string;
}

export interface TronTransaction {
  hash: string;
  type: 'send' | 'receive';
  amount: number;
  symbol: string;
  timestamp: number;
  fromAddress: string;
  toAddress: string;
}

export class TronService {
  /**
   * Generate TRON address from private key
   */
  async generateAddressFromPrivateKey(privateKey: string): Promise<string> {
    try {
      const tronWebInstance = await initTronWeb();
      
      // Remove 0x prefix if present
      const cleanPrivateKey = privateKey.replace(/^0x/, '');
      
      // Validate private key format
      if (!/^[a-fA-F0-9]{64}$/.test(cleanPrivateKey)) {
        throw new Error('Invalid private key format');
      }

      // Generate address using TronWeb
      const address = tronWebInstance.address.fromPrivateKey(cleanPrivateKey);
      
      if (!address || !tronWebInstance.isAddress(address)) {
        throw new Error('Failed to generate valid address');
      }

      return address;
    } catch (error: any) {
      console.error('Error generating address:', error);
      throw new Error(`Failed to generate address: ${error.message}`);
    }
  }

  /**
   * Get TRX balance for an address
   */
  async getTrxBalance(address: string): Promise<{ balance: number; balanceUsd: number }> {
    try {
      const tronWebInstance = await initTronWeb();
      const balance = await tronWebInstance.trx.getBalance(address);
      const trxAmount = tronWebInstance.fromSun(balance);
      
      // Get TRX price (simplified - in production use a proper price API)
      const trxPrice = await this.getTrxPrice();
      const balanceUsd = parseFloat(trxAmount) * trxPrice;

      return {
        balance: parseFloat(trxAmount),
        balanceUsd,
      };
    } catch (error: any) {
      console.error('Error getting TRX balance:', error);
      throw new Error(`Failed to get TRX balance: ${error.message}`);
    }
  }

  /**
   * Get account resources (energy and bandwidth)
   */
  async getAccountResources(address: string): Promise<{
    energy: { used: number; total: number };
    bandwidth: { used: number; total: number };
  }> {
    try {
      const tronWebInstance = await initTronWeb();
      const resources = await tronWebInstance.trx.getAccountResources(address);
      
      return {
        energy: {
          used: resources.EnergyUsed || 0,
          total: resources.EnergyLimit || 0,
        },
        bandwidth: {
          used: resources.NetUsed || 0,
          total: resources.NetLimit || 0,
        },
      };
    } catch (error: any) {
      console.error('Error getting account resources:', error);
      return {
        energy: { used: 0, total: 0 },
        bandwidth: { used: 0, total: 0 },
      };
    }
  }

  /**
   * Get TRC20 token balances
   */
  async getTrc20Balances(address: string): Promise<TRC20Token[]> {
    try {
      // Common TRC20 token contracts
      const commonTokens = [
        {
          contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
        },
        {
          contract: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', // USDC
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        },
        {
          contract: 'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S', // SUN
          symbol: 'SUN',
          name: 'SUN Token',
          decimals: 18,
        },
      ];

      const tokens: TRC20Token[] = [];

      const tronWebInstance = await initTronWeb();
      
      for (const tokenInfo of commonTokens) {
        try {
          const contract = await tronWebInstance.contract().at(tokenInfo.contract);
          const balance = await contract.balanceOf(address).call();
          
          const balanceFormatted = parseFloat(tronWebInstance.toBigNumber(balance).div(Math.pow(10, tokenInfo.decimals)).toString());
          
          if (balanceFormatted > 0) {
            // Get token price (simplified)
            const tokenPrice = await this.getTokenPrice(tokenInfo.symbol);
            const balanceUsd = balanceFormatted * tokenPrice;

            tokens.push({
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              balance: balanceFormatted,
              balanceUsd,
              contractAddress: tokenInfo.contract,
            });
          }
        } catch (error: any) {
          console.error(`Error getting balance for ${tokenInfo.symbol}:`, error);
          // Continue with other tokens
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error getting TRC20 balances:', error);
      return [];
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(address: string): Promise<TronTransaction[]> {
    try {
      // Use TronGrid API to get transactions
      const response = await fetch(
        `https://api.trongrid.io/v1/accounts/${address}/transactions?limit=10&order_by=block_timestamp,desc`,
        {
          headers: {
            'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const transactions: TronTransaction[] = [];

      if (data.data && Array.isArray(data.data)) {
        for (const tx of data.data.slice(0, 5)) {
          try {
            const txInfo = tx.raw_data?.contract?.[0];
            if (txInfo?.type === 'TransferContract') {
              const tronWebInstance = await initTronWeb();
              const value = txInfo.parameter.value;
              const amount = tronWebInstance.fromSun(value.amount);
              const fromAddress = tronWebInstance.address.fromHex(value.owner_address);
              const toAddress = tronWebInstance.address.fromHex(value.to_address);
              
              transactions.push({
                hash: tx.txID,
                type: toAddress === address ? 'receive' : 'send',
                amount: parseFloat(amount),
                symbol: 'TRX',
                timestamp: tx.block_timestamp,
                fromAddress,
                toAddress,
              });
            }
          } catch (error) {
            console.error('Error parsing transaction:', error);
          }
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  /**
   * Get TRX price in USD (simplified implementation)
   */
  private async getTrxPrice(): Promise<number> {
    try {
      // In production, use a reliable price API like CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
      const data = await response.json();
      return data.tron?.usd || 0.07; // Fallback price
    } catch (error) {
      console.error('Error getting TRX price:', error);
      return 0.07; // Fallback price
    }
  }

  /**
   * Get token price in USD (simplified implementation)
   */
  private async getTokenPrice(symbol: string): Promise<number> {
    try {
      const coinIds: Record<string, string> = {
        'USDT': 'tether',
        'USDC': 'usd-coin',
        'SUN': 'sun-token',
      };

      const coinId = coinIds[symbol];
      if (!coinId) return 1; // Default for stablecoins

      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      const data = await response.json();
      return data[coinId]?.usd || 1;
    } catch (error: any) {
      console.error(`Error getting ${symbol} price:`, error);
      return symbol === 'USDT' || symbol === 'USDC' ? 1 : 0.01; // Fallback prices
    }
  }
}

export const tronService = new TronService();
