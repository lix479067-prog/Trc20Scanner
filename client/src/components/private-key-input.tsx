import { useState } from "react";
import { Eye, EyeOff, Download, Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PrivateKeyInputProps {
  onImport: (privateKey: string) => void;
  isLoading: boolean;
}

export function PrivateKeyInput({ onImport, isLoading }: PrivateKeyInputProps) {
  const { t } = useLanguage();
  const [privateKey, setPrivateKey] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const isValid = /^[a-fA-F0-9]{64}$/.test(privateKey.trim());
  const length = privateKey.length;

  const handleClear = () => {
    setPrivateKey("");
  };

  const handleImport = () => {
    if (isValid && !isLoading) {
      onImport(privateKey.trim());
    }
  };

  const getValidationStatus = () => {
    if (length === 0) {
      return {
        text: t("enterPrivateKey"),
        className: "text-xs text-muted-foreground",
        dotClassName: "w-2 h-2 rounded-full bg-muted",
      };
    } else if (isValid) {
      return {
        text: t("validPrivateKey"),
        className: "text-xs text-success",
        dotClassName: "w-2 h-2 rounded-full bg-success",
      };
    } else {
      return {
        text: t("invalidFormat"),
        className: "text-xs text-destructive",
        dotClassName: "w-2 h-2 rounded-full bg-destructive",
      };
    }
  };

  const validation = getValidationStatus();

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="import-title">
          {t("importPrivateKey")}
        </h2>
        <p className="text-muted-foreground text-sm" data-testid="import-description">
          {t("privateKeyDescription")}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="privateKey" className="block text-sm font-medium text-foreground mb-2">
            {t("privateKeyLabel")}
          </Label>
          <div className="relative">
            <Input
              id="privateKey"
              type={showPrivateKey ? "text" : "password"}
              placeholder={t("privateKeyPlaceholder")}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="w-full font-mono text-sm pr-12"
              maxLength={64}
              data-testid="input-private-key"
            />
            <button
              type="button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-visibility"
            >
              {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground" data-testid="char-count">
              {length}/64 {t("characters")}
            </span>
            <div className="flex items-center space-x-2">
              <div className={validation.dotClassName} />
              <span className={validation.className} data-testid="validation-text">
                {validation.text}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleImport}
            disabled={!isValid || isLoading}
            className="flex-1"
            data-testid="button-import"
          >
            <Download size={16} className="mr-2" />
            {t("importWallet")}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isLoading}
            data-testid="button-clear"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
