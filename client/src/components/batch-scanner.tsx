import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TemplateInput } from "./template-input";
import { ScanProgress } from "./scan-progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import type { BatchScanResult } from "@shared/schema";

export function BatchScanner() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // Start batch scan mutation
  const startScanMutation = useMutation({
    mutationFn: async (params: {
      template: string;
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
      template,
      maxVariations,
      parallelThreads,
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
    <div>
      {/* Template Input */}
      <TemplateInput
        onStartScan={handleStartScan}
        isScanning={isScanning}
      />

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