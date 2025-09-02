import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Copy, ExternalLink, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SavedWallet {
  address: string;
  privateKey: string;
  trxBalance: number;
  totalBalanceUsd: number;
  tokensCount: number;
  isActive: boolean;
  scannedAt: string;
  lastCheckedAt: string;
}

interface WalletStats {
  totalWallets: number;
  totalBalance: number;
  totalSessions: number;
  activeSessions: number;
}

export function SavedWallets() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);

  // Fetch saved wallets
  const {
    data: wallets = [],
    isLoading,
    refetch: refetchWallets,
  } = useQuery({
    queryKey: ['/api/wallets'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/wallets');
      return response.json() as Promise<SavedWallet[]>;
    },
  });

  // Fetch statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stats');
      return response.json() as Promise<WalletStats>;
    },
  });

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied!",
      description: address,
    });
  };

  const handleCopyPrivateKey = (privateKey: string) => {
    navigator.clipboard.writeText(privateKey);
    toast({
      title: "Private key copied!",
      description: "Keep it secure!",
    });
  };

  const handleViewOnExplorer = (address: string) => {
    window.open(`https://tronscan.org/#/address/${address}`, '_blank');
  };

  const formatBalance = (balance: number) => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(2)}M`;
    } else if (balance >= 1000) {
      return `${(balance / 1000).toFixed(2)}K`;
    } else {
      return balance.toFixed(6);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="text-green-500" size={20} />
            {t("savedWallets") || "Saved Wallets"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading saved wallets...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && !isLoadingStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-500">{stats.totalWallets}</div>
              <div className="text-sm text-muted-foreground">Total Wallets</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-500">${(typeof stats.totalBalance === 'number' ? stats.totalBalance : parseFloat(stats.totalBalance) || 0).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-500">{stats.totalSessions}</div>
              <div className="text-sm text-muted-foreground">Total Scans</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-500">{stats.activeSessions}</div>
              <div className="text-sm text-muted-foreground">Active Scans</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallets List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="text-green-500" size={20} />
              {t("savedWallets") || "Saved Wallets"} ({wallets.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                className="flex items-center gap-2"
                data-testid="toggle-private-keys"
              >
                {showPrivateKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPrivateKeys ? "Hide Keys" : "Show Keys"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchWallets()}
                className="flex items-center gap-2"
                data-testid="refresh-wallets"
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {wallets.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {wallets.map((wallet, index) => (
                <div
                  key={wallet.address}
                  className="p-4 border rounded-lg bg-green-500/5 border-green-500/20"
                  data-testid={`saved-wallet-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Address */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm" data-testid={`address-${index}`}>
                          {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyAddress(wallet.address)}
                          data-testid={`copy-address-${index}`}
                        >
                          <Copy size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOnExplorer(wallet.address)}
                          data-testid={`view-explorer-${index}`}
                        >
                          <ExternalLink size={12} />
                        </Button>
                      </div>

                      {/* Private Key */}
                      {showPrivateKeys && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {wallet.privateKey.slice(0, 16)}...{wallet.privateKey.slice(-16)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyPrivateKey(wallet.privateKey)}
                            data-testid={`copy-private-key-${index}`}
                          >
                            <Copy size={12} />
                          </Button>
                        </div>
                      )}

                      {/* Balances */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          TRX: <span className="text-foreground font-medium">{formatBalance(wallet.trxBalance)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Value: <span className="text-green-500 font-medium">${wallet.totalBalanceUsd.toFixed(2)}</span>
                        </span>
                        {wallet.tokensCount > 0 && (
                          <span className="text-muted-foreground">
                            Tokens: <span className="text-blue-500 font-medium">{wallet.tokensCount}</span>
                          </span>
                        )}
                      </div>

                      {/* Scan Time */}
                      <div className="text-xs text-muted-foreground">
                        Scanned: {new Date(wallet.scannedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" data-testid="no-saved-wallets">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wallet className="text-muted-foreground" size={24} />
              </div>
              <p className="text-muted-foreground mb-2">No wallets saved yet</p>
              <p className="text-sm text-muted-foreground">
                Start scanning to discover and save active TRON wallets
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}