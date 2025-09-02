import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "zh";

interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}

const translations: Translations = {
  appTitle: {
    en: "TRC20 Private Key Importer",
    zh: "TRC20私钥导入器",
  },
  appSubtitle: {
    en: "Secure wallet balance checker",
    zh: "安全钱包余额查询",
  },
  networkConnected: {
    en: "TRON Network Connected",
    zh: "TRON网络已连接",
  },
  securityNotice: {
    en: "Security Notice",
    zh: "安全提示",
  },
  securityText: {
    en: "Your private key is processed locally and never stored on our servers. Always verify the authenticity of this application before inputting sensitive information.",
    zh: "您的私钥在本地处理，绝不会存储在我们的服务器上。在输入敏感信息之前，请务必验证此应用程序的真实性。",
  },
  importPrivateKey: {
    en: "Import Private Key",
    zh: "导入私钥",
  },
  privateKeyDescription: {
    en: "Enter your 64-character TRC20 private key to check wallet balance",
    zh: "输入您的64位TRC20私钥以查询钱包余额",
  },
  privateKeyLabel: {
    en: "Private Key (64 characters)",
    zh: "私钥（64位字符）",
  },
  privateKeyPlaceholder: {
    en: "Enter your 64-character private key...",
    zh: "输入您的64位私钥...",
  },
  importWallet: {
    en: "Import Wallet",
    zh: "导入钱包",
  },
  enterPrivateKey: {
    en: "Enter private key",
    zh: "输入私钥",
  },
  validPrivateKey: {
    en: "Valid private key",
    zh: "有效私钥",
  },
  invalidFormat: {
    en: "Invalid format",
    zh: "格式无效",
  },
  processing: {
    en: "Processing Private Key",
    zh: "处理私钥中",
  },
  processingDescription: {
    en: "Generating address and fetching balance...",
    zh: "生成地址并获取余额中...",
  },
  walletAddress: {
    en: "Wallet Address",
    zh: "钱包地址",
  },
  tronAddress: {
    en: "TRON Address",
    zh: "TRON地址",
  },
  networkResources: {
    en: "Network Resources",
    zh: "网络资源",
  },
  energy: {
    en: "Energy",
    zh: "能量",
  },
  bandwidth: {
    en: "Bandwidth",
    zh: "带宽",
  },
  trc20Tokens: {
    en: "TRC20 Tokens",
    zh: "TRC20代币",
  },
  refresh: {
    en: "Refresh",
    zh: "刷新",
  },
  recentTransactions: {
    en: "Recent Transactions",
    zh: "最近交易",
  },
  viewAll: {
    en: "View All",
    zh: "查看全部",
  },
  quickActions: {
    en: "Quick Actions",
    zh: "快速操作",
  },
  exportData: {
    en: "Export Data",
    zh: "导出数据",
  },
  printReport: {
    en: "Print Report",
    zh: "打印报告",
  },
  shareAddress: {
    en: "Share Address",
    zh: "分享地址",
  },
  clearData: {
    en: "Clear Data",
    zh: "清除数据",
  },
  noTokensFound: {
    en: "No TRC20 tokens found in this wallet",
    zh: "此钱包中未找到TRC20代币",
  },
  received: {
    en: "Received",
    zh: "收到",
  },
  sent: {
    en: "Sent",
    zh: "发送",
  },
  hoursAgo: {
    en: "hours ago",
    zh: "小时前",
  },
  dayAgo: {
    en: "day ago",
    zh: "天前",
  },
  characters: {
    en: "characters",
    zh: "字符",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
