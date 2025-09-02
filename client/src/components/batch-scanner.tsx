import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TemplateInput } from "./template-input";
import { ScanProgress } from "./scan-progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shuffle, Search, Zap } from "lucide-react";
import type { BatchScanResult } from "@shared/schema";

export function BatchScanner() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  const [scanMode, setScanMode] = useState<'template' | 'random'>('random');
  const [randomScanParams, setRandomScanParams] = useState({
    maxVariations: 5000,
    parallelThreads: 5,
  });

  // Start scan mutation (template or random)
  const startScanMutation = useMutation({
    mutationFn: async (params: {
      scanMode: 'template' | 'random';
      template?: string;
      maxVariations: number;
      parallelThreads: number;
    }) => {
      const response = await apiRequest('POST', '/api/scan/start', params);
      return response.json() as Promise<BatchScanResult>;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      toast({
        title: t("scanStartedSuccessfully"),
        description: `${t("sessionId")}: ${data.sessionId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start scan",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Stop scan mutation
  const stopScanMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('POST', `/api/scan/stop/${sessionId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("scanStoppedSuccessfully"),
      });
      // Refresh progress to get final state
      refetchProgress();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to stop scan",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Query scan progress
  const {
    data: scanProgress,
    refetch: refetchProgress,
    isLoading: isLoadingProgress,
  } = useQuery({
    queryKey: ['scan-progress', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return null;
      const response = await apiRequest('GET', `/api/scan/progress/${currentSessionId}`, undefined);
      return response.json() as Promise<BatchScanResult>;
    },
    enabled: !!currentSessionId,
    refetchInterval: (data) => {
      // Auto-refetch every 2 seconds if scan is still running
      return data?.data?.isCompleted ? false : 2000;
    },
  });

  const handleStartScan = (template: string, maxVariations: number, parallelThreads: number) => {
    startScanMutation.mutate({
      scanMode: 'template',
      template,
      maxVariations,
      parallelThreads,
    });
  };

  const handleStartRandomScan = () => {
    startScanMutation.mutate({
      scanMode: 'random',
      maxVariations: randomScanParams.maxVariations,
      parallelThreads: randomScanParams.parallelThreads,
    });
  };

  const handleStopScan = () => {
    if (currentSessionId) {
      stopScanMutation.mutate(currentSessionId);
    }
  };

  const handleRefreshProgress = () => {
    refetchProgress();
  };

  const isScanning = startScanMutation.isPending || 
    (scanProgress && !scanProgress.isCompleted) ||
    stopScanMutation.isPending;

  return (
    <div className="space-y-6">
      <Tabs value={scanMode} onValueChange={(value) => setScanMode(value as 'template' | 'random')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="random" className="flex items-center gap-2" data-testid="tab-random-scan">
            <Shuffle size={16} />
            {t("randomScan")}
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2" data-testid="tab-template-scan">
            <Search size={16} />
            {t("templateScan")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="random" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                {t("quickRandomScan")}
              </CardTitle>
              <CardDescription>
                {t("randomScanDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxVariations">{t("maxVariations")}</Label>
                  <Input
                    id="maxVariations"
                    type="number"
                    min="100"
                    max="50000"
                    value={randomScanParams.maxVariations}
                    onChange={(e) => setRandomScanParams(prev => ({ ...prev, maxVariations: parseInt(e.target.value) || 5000 }))}
                    data-testid="input-max-variations"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parallelThreads">{t("parallelThreads")}</Label>
                  <Input
                    id="parallelThreads"
                    type="number"
                    min="1"
                    max="10"
                    value={randomScanParams.parallelThreads}
                    onChange={(e) => setRandomScanParams(prev => ({ ...prev, parallelThreads: parseInt(e.target.value) || 5 }))}
                    data-testid="input-parallel-threads"
                  />
                </div>
              </div>
              <Button
                onClick={handleStartRandomScan}
                disabled={isScanning}
                className="w-full"
                size="lg"
                data-testid="button-start-random-scan"
              >
                <Shuffle className="mr-2" size={16} />
                {isScanning ? t("scanning") : t("startRandomScan")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template">
          <TemplateInput
            onStartScan={handleStartScan}
            isScanning={isScanning}
          />
        </TabsContent>
      </Tabs>

      {/* Scan Progress */}
      {scanProgress && (
        <ScanProgress
          scanResult={scanProgress}
          onStopScan={handleStopScan}
          onRefresh={handleRefreshProgress}
          isLoading={isLoadingProgress}
        />
      )}
    </div>
  );
}