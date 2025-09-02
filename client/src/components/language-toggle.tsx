import { useLanguage } from "@/hooks/use-language";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-muted rounded-lg p-1">
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1 rounded text-sm font-medium transition-all ${
          language === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid="language-en"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("zh")}
        className={`px-3 py-1 rounded text-sm font-medium transition-all ${
          language === "zh"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid="language-zh"
      >
        中文
      </button>
    </div>
  );
}
