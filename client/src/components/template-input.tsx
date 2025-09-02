import { useState, useEffect } from "react";
import { Eye, EyeOff, Search, Trash2, Info } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

interface TemplateValidation {
  isValid: boolean;
  error?: string;
  wildcardCount: number;
  totalCombinations: number;
  recommendedMaxVariations: number;
}

interface TemplateInputProps {
  onStartScan: (template: string, maxVariations: number, parallelThreads: number) => void;
  isScanning: boolean;
}

export function TemplateInput({ onStartScan, isScanning }: TemplateInputProps) {
  const { t } = useLanguage();
  const [template, setTemplate] = useState("");
  const [maxVariations, setMaxVariations] = useState(1000);
  const [parallelThreads, setParallelThreads] = useState(3);
  const [showTemplate, setShowTemplate] = useState(false);
  const [validation, setValidation] = useState<TemplateValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleClear = () => {
    setTemplate("");
    setValidation(null);
  };

  const handleStartScan = () => {
    if (validation?.isValid && !isScanning) {
      onStartScan(template.trim(), maxVariations, parallelThreads);
    }
  };

  // Validate template when it changes
  useEffect(() => {
    if (template.length === 0) {
      setValidation(null);
      return;
    }

    if (template.length !== 64) {
      setValidation({
        isValid: false,
        error: "Template must be exactly 64 characters",
        wildcardCount: 0,
        totalCombinations: 0,
        recommendedMaxVariations: 0,
      });
      return;
    }

    const validateTemplate = async () => {
      setIsValidating(true);
      try {
        const response = await apiRequest('POST', '/api/template/validate', {
          template: template.trim(),
        });
        const result = await response.json();
        setValidation(result);
        
        // Update recommended max variations
        if (result.isValid) {
          setMaxVariations(Math.min(maxVariations, result.recommendedMaxVariations));
        }
      } catch (error) {
        setValidation({
          isValid: false,
          error: "Failed to validate template",
          wildcardCount: 0,
          totalCombinations: 0,
          recommendedMaxVariations: 0,
        });
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validateTemplate, 500);
    return () => clearTimeout(timeoutId);
  }, [template]);

  const getValidationStatus = () => {
    if (template.length === 0) {
      return {
        text: t("enterPrivateKey"),
        className: "text-xs text-muted-foreground",
        dotClassName: "w-2 h-2 rounded-full bg-muted",
      };
    } else if (isValidating) {
      return {
        text: "Validating...",
        className: "text-xs text-muted-foreground",
        dotClassName: "w-2 h-2 rounded-full bg-muted animate-pulse",
      };
    } else if (validation?.isValid) {
      return {
        text: `${validation.wildcardCount} wildcards, ${validation.totalCombinations.toLocaleString()} combinations`,
        className: "text-xs text-success",
        dotClassName: "w-2 h-2 rounded-full bg-success",
      };
    } else {
      return {
        text: validation?.error || t("invalidTemplate"),
        className: "text-xs text-destructive",
        dotClassName: "w-2 h-2 rounded-full bg-destructive",
      };
    }
  };

  const status = getValidationStatus();

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="template-title">
          {t("templateInput")}
        </h2>
        <p className="text-muted-foreground text-sm" data-testid="template-description">
          {t("templateDescription")}
        </p>
      </div>

      <div className="space-y-4">
        {/* Template Input */}
        <div>
          <Label htmlFor="template" className="block text-sm font-medium text-foreground mb-2">
            {t("templateInput")}
          </Label>
          <div className="relative">
            <Input
              id="template"
              type={showTemplate ? "text" : "password"}
              placeholder={t("templatePlaceholder")}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full font-mono text-sm pr-12"
              maxLength={64}
              data-testid="input-template"
            />
            <button
              type="button"
              onClick={() => setShowTemplate(!showTemplate)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-template-visibility"
            >
              {showTemplate ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground" data-testid="template-char-count">
              {template.length}/64 {t("characters")}
            </span>
            <div className="flex items-center space-x-2">
              <div className={status.dotClassName} />
              <span className={status.className} data-testid="template-validation-text">
                {status.text}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        {validation?.isValid && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="maxVariations" className="text-sm font-medium text-foreground">
                {t("maxVariations")}
              </Label>
              <Input
                id="maxVariations"
                type="number"
                min={1}
                max={validation.recommendedMaxVariations}
                value={maxVariations}
                onChange={(e) => setMaxVariations(parseInt(e.target.value) || 1000)}
                className="mt-1"
                data-testid="input-max-variations"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("totalCombinations")}: {validation.totalCombinations.toLocaleString()}
              </p>
            </div>
            <div>
              <Label htmlFor="parallelThreads" className="text-sm font-medium text-foreground">
                {t("parallelThreads")}
              </Label>
              <Input
                id="parallelThreads"
                type="number"
                min={1}
                max={10}
                value={parallelThreads}
                onChange={(e) => setParallelThreads(parseInt(e.target.value) || 3)}
                className="mt-1"
                data-testid="input-parallel-threads"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 3-5 threads
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="flex items-start space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Info className="text-blue-400 mt-0.5 flex-shrink-0" size={16} />
          <div className="text-sm text-foreground/80">
            <p className="font-medium mb-1">Template Guidelines:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Use ? for positions you want to randomize</li>
              <li>• Keep fixed characters for known parts of keys</li>
              <li>• More wildcards = longer scan time</li>
              <li>• Maximum 20 wildcards recommended</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={handleStartScan}
            disabled={!validation?.isValid || isScanning}
            className="flex-1"
            data-testid="button-start-scan"
          >
            <Search size={16} className="mr-2" />
            {t("startScan")}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isScanning}
            data-testid="button-clear-template"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}