import { useState, useEffect } from "react";
import { Loader2, StopCircle, Eye, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { BatchScanResult } from "@shared/schema";

interface ScanProgressProps {
  scanResult: BatchScanResult;
  onStopScan: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function ScanProgress({ scanResult, onStopScan, onRefresh, isLoading }: ScanProgressProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto refresh progress every 2 seconds if scan is active
  useEffect(() => {
    if (!scanResult.isCompleted && autoRefresh) {
      const interval = setInterval(() => {
        onRefresh();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [scanResult.isCompleted, autoRefresh, onRefresh]);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Address copied to clipboard",
        description: address,
      });
    } catch (err) {
      toast({
        title: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const viewOnExplorer = (address: string) => {
    window.open(`https://tronscan.org/#/address/${address}`, '_blank');
  };

  const formatBalance = (balance: number) => {
    return balance.toLocaleString('en-US', { maximumFractionDigits: 6 });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground" data-testid="scan-progress-title">
            {t("scanProgress")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("sessionId")}: #{scanResult.sessionId}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            data-testid="button-refresh-progress"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          {!scanResult.isCompleted && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStopScan}
              data-testid="button-stop-scan"
            >
              <StopCircle size={16} className="mr-1" />
              {t("stopScan")}
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        {scanResult.isCompleted ? (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400 border border-green-500/30">
            {t("scanCompleted")}
          </div>
        ) : (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Loader2 className="animate-spin mr-2" size={14} />
            {t("scanInProgress")}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">
            {t("scanProgress")}
          </span>
          <span className="text-sm text-muted-foreground" data-testid="progress-percentage">
            {scanResult.progress}%
          </span>
        </div>
        <Progress value={scanResult.progress} className="h-2" />
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("generated")}</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-generated">
                {scanResult.totalGenerated.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("scanned")}</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-scanned">
                {scanResult.totalScanned.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("found")}</p>
              <p className="text-2xl font-bold text-success" data-testid="stat-found">
                {scanResult.totalFound.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Found Wallets */}
      {scanResult.foundWallets.length > 0 ? (
        <div>
          <h3 className="text-md font-semibold text-foreground mb-4" data-testid="found-wallets-title">
            {t("walletsFound")} ({scanResult.foundWallets.length})
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {scanResult.foundWallets.map((wallet, index) => (
              <div
                key={wallet.address}
                className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                data-testid={`found-wallet-${index}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-foreground text-sm" data-testid={`wallet-address-${index}`}>
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                    </p>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span data-testid={`wallet-trx-balance-${index}`}>
                      TRX: {formatBalance(wallet.trxBalance)}
                    </span>
                    <span data-testid={`wallet-total-balance-${index}`}>
                      Total: ${wallet.totalBalanceUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAddress(wallet.address)}
                    data-testid={`button-copy-wallet-${index}`}
                    title="Copy Address"
                  >
                    <Copy size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewOnExplorer(wallet.address)}
                    data-testid={`button-view-wallet-${index}`}
                    title="View on TronScan"
                  >
                    <ExternalLink size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8" data-testid="no-wallets-found">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Eye className="text-muted-foreground" size={24} />
          </div>
          <p className="text-muted-foreground">{t("noWalletsFound")}</p>
        </div>
      )}

      {/* Auto Refresh Toggle */}
      {!scanResult.isCompleted && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Auto-refresh progress</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                autoRefresh ? 'bg-primary' : 'bg-muted'
              } transition-colors`}
              data-testid="toggle-auto-refresh"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}