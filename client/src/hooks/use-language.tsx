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
  
  // Batch Scanning
  batchScan: {
    en: "Batch Scan",
    zh: "批量扫描",
  },
  singleImport: {
    en: "Single Import",
    zh: "单个导入",
  },
  randomScan: {
    en: "Random Scan",
    zh: "随机扫描",
  },
  templateScan: {
    en: "Template Scan",
    zh: "模板扫描",
  },
  quickRandomScan: {
    en: "Quick Random Scan",
    zh: "快速随机扫描",
  },
  randomScanDescription: {
    en: "Generate completely random private keys for high-speed scanning without templates",
    zh: "完全随机生成私钥进行高速扫描，无需模板",
  },
  startRandomScan: {
    en: "Start Random Scan",
    zh: "开始随机扫描",
  },
  scanning: {
    en: "Scanning...",
    zh: "扫描中...",
  },
  templateInput: {
    en: "Private Key Template",
    zh: "私钥模板",
  },
  templateDescription: {
    en: "Enter a 64-character template with ? as wildcards for random positions",
    zh: "输入64位字符模板，使用?作为随机位置的通配符",
  },
  templatePlaceholder: {
    en: "e.g., 1234567890abcdef????????????????1234567890abcdef????????????????",
    zh: "例如：1234567890abcdef????????????????1234567890abcdef????????????????",
  },
  wildcardCount: {
    en: "Wildcard positions",
    zh: "通配符位置",
  },
  maxVariations: {
    en: "Max variations to generate",
    zh: "最大生成变化数",
  },
  parallelThreads: {
    en: "Parallel threads",
    zh: "并行线程数",
  },
  totalCombinations: {
    en: "Total possible combinations",
    zh: "总可能组合数",
  },
  startScan: {
    en: "Start Scan",
    zh: "开始扫描",
  },
  stopScan: {
    en: "Stop Scan",
    zh: "停止扫描",
  },
  scanProgress: {
    en: "Scan Progress",
    zh: "扫描进度",
  },
  generated: {
    en: "Generated",
    zh: "已生成",
  },
  scanned: {
    en: "Scanned",
    zh: "已扫描",
  },
  found: {
    en: "Found",
    zh: "已发现",
  },
  walletsFound: {
    en: "Wallets with balance found",
    zh: "发现有余额的钱包",
  },
  noWalletsFound: {
    en: "No wallets with balance found yet",
    zh: "暂未发现有余额的钱包",
  },
  scanCompleted: {
    en: "Scan completed",
    zh: "扫描完成",
  },
  scanInProgress: {
    en: "Scanning in progress...",
    zh: "扫描进行中...",
  },
  sessionId: {
    en: "Session ID",
    zh: "会话ID",
  },
  discoveredWallets: {
    en: "Discovered Wallets",
    zh: "发现的钱包",
  },
  statistics: {
    en: "Statistics",
    zh: "统计信息",
  },
  totalWallets: {
    en: "Total wallets",
    zh: "总钱包数",
  },
  totalBalance: {
    en: "Total balance",
    zh: "总余额",
  },
  totalSessions: {
    en: "Total sessions",
    zh: "总会话数",
  },
  activeSessions: {
    en: "Active sessions",
    zh: "活跃会话",
  },
  invalidTemplate: {
    en: "Invalid template format",
    zh: "模板格式无效",
  },
  templateTooManyWildcards: {
    en: "Too many wildcards (max 20)",
    zh: "通配符过多（最多20个）",
  },
  scanStartedSuccessfully: {
    en: "Batch scan started successfully",
    zh: "批量扫描启动成功",
  },
  scanStoppedSuccessfully: {
    en: "Scan stopped successfully",
    zh: "扫描停止成功",
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
