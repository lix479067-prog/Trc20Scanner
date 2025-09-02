import { Shield } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export function SecurityNotice() {
  const { t } = useLanguage();

  return (
    <div className="mb-8 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <Shield className="text-warning mt-0.5" size={16} />
        <div>
          <h3 className="font-medium text-warning mb-1" data-testid="security-title">
            {t("securityNotice")}
          </h3>
          <p className="text-sm text-foreground/80" data-testid="security-text">
            {t("securityText")}
          </p>
        </div>
      </div>
    </div>
  );
}
