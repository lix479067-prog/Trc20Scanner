import { useState } from "react";
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  Printer, 
  Share, 
  Trash2,
  Coins,
  History,
  ArrowRight,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { WalletInfo } from "@shared/schema";

interface WalletInfoProps {
  walletInfo: WalletInfo;
  onRefresh: () => void;
  onClear: () => void;
  isRefreshing: boolean;
}

export function WalletInfo({ walletInfo, onRefresh, onClear, isRefreshing }: WalletInfoProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletInfo.address);
      toast({
        title: "Address copied to clipboard",
        description: walletInfo.address,
      });
    } catch (err) {
      toast({
        title: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const viewOnExplorer = () => {
    window.open(`https://tronscan.org/#/address/${walletInfo.address}`, '_blank');
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ${t("dayAgo")}`;
    } else {
      return `${hours} ${t("hoursAgo")}`;
    }
  };

  return (
    <div id="walletInfo" className="space-y-6">
      {/* Address Information */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
          <Wallet className="text-primary" size={20} />
          <span data-testid="wallet-address-title">{t("walletAddress")}</span>
        </h3>
        
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">{t("tronAddress")}</p>
              <p className="font-mono text-sm text-foreground break-all" data-testid="wallet-address">
                {walletInfo.address}
              </p>
            </div>
            <div className="flex space-x-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                data-testid="button-copy-address"
                title="Copy Address"
              >
                <Copy size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={viewOnExplorer}
                data-testid="button-view-explorer"
                title="View on TronScan"
              >
                <ExternalLink size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TRX Balance */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">TRX</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">TRON</h4>
                <p className="text-xs text-muted-foreground">TRX</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground" data-testid="trx-balance">
                {walletInfo.trxBalance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="trx-balance-usd">
                ≈ ${walletInfo.trxBalanceUsd.toFixed(2)} USD
              </p>
            </div>
          </div>
          <div className="h-1 bg-muted rounded-full">
            <div className="h-1 bg-red-500 rounded-full" style={{ width: "65%" }}></div>
          </div>
        </div>

        {/* Energy & Bandwidth */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="font-semibold text-foreground mb-4" data-testid="network-resources-title">
            {t("networkResources")}
          </h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{t("energy")}</span>
                <span className="text-sm font-medium text-foreground" data-testid="energy-usage">
                  {walletInfo.energy.used.toLocaleString()} / {walletInfo.energy.total.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full" 
                  style={{ width: `${(walletInfo.energy.used / walletInfo.energy.total) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{t("bandwidth")}</span>
                <span className="text-sm font-medium text-foreground" data-testid="bandwidth-usage">
                  {walletInfo.bandwidth.used.toLocaleString()} / {walletInfo.bandwidth.total.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div 
                  className="h-2 bg-green-500 rounded-full" 
                  style={{ width: `${(walletInfo.bandwidth.used / walletInfo.bandwidth.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRC20 Tokens */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Coins className="text-primary" size={20} />
            <span data-testid="tokens-title">{t("trc20Tokens")}</span>
          </h3>
          <Button
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-primary hover:text-primary/80"
            data-testid="button-refresh"
          >
            <RefreshCw size={16} className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t("refresh")}
          </Button>
        </div>

        {walletInfo.tokens.length > 0 ? (
          <div className="space-y-3">
            {walletInfo.tokens.map((token, index) => (
              <div key={token.contractAddress} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`token-${index}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {token.symbol.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground" data-testid={`token-name-${index}`}>
                      {token.name}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`token-symbol-${index}`}>
                      {token.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground" data-testid={`token-balance-${index}`}>
                    {token.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`token-balance-usd-${index}`}>
                    ≈ ${token.balanceUsd.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" data-testid="empty-tokens">
            <Coins className="text-muted-foreground text-2xl mb-3 mx-auto" size={48} />
            <p className="text-muted-foreground">{t("noTokensFound")}</p>
          </div>
        )}
      </div>

      {/* Transaction History Preview */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <History className="text-primary" size={20} />
            <span data-testid="transactions-title">{t("recentTransactions")}</span>
          </h3>
          <Button
            variant="ghost"
            className="text-primary hover:text-primary/80"
            data-testid="button-view-all-transactions"
          >
            {t("viewAll")}
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>

        {walletInfo.transactions.length > 0 ? (
          <div className="space-y-3">
            {walletInfo.transactions.slice(0, 5).map((tx, index) => (
              <div key={tx.hash} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg" data-testid={`transaction-${index}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {tx.type === 'receive' ? (
                      <ArrowDown className="text-success" size={16} />
                    ) : (
                      <ArrowUp className="text-destructive" size={16} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground" data-testid={`transaction-type-${index}`}>
                      {tx.type === 'receive' ? t("received") : t("sent")} {tx.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`transaction-time-${index}`}>
                      {formatTimeAgo(tx.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    tx.type === 'receive' ? 'text-success' : 'text-destructive'
                  }`} data-testid={`transaction-amount-${index}`}>
                    {tx.type === 'receive' ? '+' : '-'}{tx.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {tx.symbol}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`transaction-hash-${index}`}>
                    {tx.hash.slice(0, 6)}...{tx.hash.slice(-6)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" data-testid="empty-transactions">
            <History className="text-muted-foreground text-2xl mb-3 mx-auto" size={48} />
            <p className="text-muted-foreground">No recent transactions found</p>
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4" data-testid="quick-actions-title">
          {t("quickActions")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="ghost"
            className="p-4 h-auto flex-col space-y-2 bg-muted/30 hover:bg-muted/50"
            data-testid="button-export"
          >
            <Download className="text-primary" size={20} />
            <span className="text-sm font-medium text-foreground">{t("exportData")}</span>
          </Button>
          <Button
            variant="ghost"
            className="p-4 h-auto flex-col space-y-2 bg-muted/30 hover:bg-muted/50"
            data-testid="button-print"
          >
            <Printer className="text-primary" size={20} />
            <span className="text-sm font-medium text-foreground">{t("printReport")}</span>
          </Button>
          <Button
            variant="ghost"
            className="p-4 h-auto flex-col space-y-2 bg-muted/30 hover:bg-muted/50"
            data-testid="button-share"
          >
            <Share className="text-primary" size={20} />
            <span className="text-sm font-medium text-foreground">{t("shareAddress")}</span>
          </Button>
          <Button
            variant="ghost"
            onClick={onClear}
            className="p-4 h-auto flex-col space-y-2 bg-muted/30 hover:bg-muted/50"
            data-testid="button-clear-data"
          >
            <Trash2 className="text-destructive" size={20} />
            <span className="text-sm font-medium text-foreground">{t("clearData")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
