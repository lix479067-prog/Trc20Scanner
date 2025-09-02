import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Key, Search, Download } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { SecurityNotice } from "@/components/security-notice";
import { PrivateKeyInput } from "@/components/private-key-input";
import { LoadingState } from "@/components/loading-state";
import { WalletInfo } from "@/components/wallet-info";
import { BatchScanner } from "@/components/batch-scanner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WalletInfo as WalletInfoType } from "@shared/schema";

type ViewMode = 'single' | 'batch';

export default function Home() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [walletInfo, setWalletInfo] = useState<WalletInfoType | null>(null);

  const importWalletMutation = useMutation({
    mutationFn: async (privateKey: string) => {
      const response = await apiRequest('POST', '/api/wallet/import', { privateKey });
      return response.json();
    },
    onSuccess: (data: WalletInfoType) => {
      setWalletInfo(data);
      toast({
        title: "Wallet imported successfully",
        description: `Address: ${data.address}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to import wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!walletInfo) throw new Error("No wallet imported");
      const response = await apiRequest('GET', `/api/wallet/balance/${walletInfo.address}`);
      return response.json();
    },
    onSuccess: (data: WalletInfoType) => {
      setWalletInfo(data);
      toast({
        title: "Wallet refreshed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to refresh wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = (privateKey: string) => {
    importWalletMutation.mutate(privateKey);
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleClear = () => {
    setWalletInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Key className="text-primary-foreground" size={16} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground" data-testid="app-title">
                  {t("appTitle")}
                </h1>
                <p className="text-sm text-muted-foreground" data-testid="app-subtitle">
                  {t("appSubtitle")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'single' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('single')}
                  className="text-sm"
                  data-testid="button-single-mode"
                >
                  <Download size={14} className="mr-1" />
                  {t("singleImport")}
                </Button>
                <Button
                  variant={viewMode === 'batch' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('batch')}
                  className="text-sm"
                  data-testid="button-batch-mode"
                >
                  <Search size={14} className="mr-1" />
                  {t("batchScan")}
                </Button>
              </div>
              
              <LanguageToggle />
              <div className="status-indicator text-sm text-success font-medium" data-testid="network-status">
                {t("networkConnected")}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <SecurityNotice />

        {viewMode === 'single' ? (
          // Single Private Key Import Mode
          <>
            <PrivateKeyInput 
              onImport={handleImport} 
              isLoading={importWalletMutation.isPending}
            />

            {importWalletMutation.isPending && <LoadingState />}

            {walletInfo && (
              <WalletInfo 
                walletInfo={walletInfo}
                onRefresh={handleRefresh}
                onClear={handleClear}
                isRefreshing={refreshMutation.isPending}
              />
            )}
          </>
        ) : (
          // Batch Scanning Mode
          <BatchScanner />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>© 2024 TRC20 Importer</span>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Powered by TRON Network</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
