import { Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export function LoadingState() {
  const { t } = useLanguage();

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8">
      <div className="flex items-center justify-center space-x-3 py-8">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <div className="text-center">
          <p className="text-foreground font-medium" data-testid="loading-title">
            {t("processing")}
          </p>
          <p className="text-muted-foreground text-sm" data-testid="loading-description">
            {t("processingDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
