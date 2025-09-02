import { Key, LogIn, Github, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";

export default function Landing() {
  const { t } = useLanguage();

  const handleLogin = () => {
    window.location.href = "/api/login";
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
                <h1 className="text-xl font-semibold text-foreground">
                  {t("appTitle")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("appSubtitle")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              <Button 
                onClick={handleLogin}
                className="flex items-center gap-2"
                data-testid="login-button"
              >
                <LogIn size={16} />
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Discover Active{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
              TRON Wallets
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Advanced TRC20 private key scanner that finds active wallets with transaction history. 
            Scan millions of variations and discover valuable TRON addresses.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="text-lg px-8 py-6 h-auto"
            data-testid="hero-login-button"
          >
            <LogIn className="mr-2" size={20} />
            Start Scanning - Login Required
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="text-yellow-500" size={24} />
                High-Speed Scanner
              </CardTitle>
              <CardDescription>
                Scan hundreds of thousands of private key variations daily with our optimized parallel processing engine.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Up to 50,000 scans per session</li>
                <li>• Multi-threaded processing</li>
                <li>• Real-time progress tracking</li>
                <li>• Automatic error recovery</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="text-blue-500" size={24} />
                Template-Based Search
              </CardTitle>
              <CardDescription>
                Use custom templates with wildcards to target specific private key patterns and increase discovery rates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Custom pattern matching</li>
                <li>• Wildcard support (?)</li>
                <li>• Intelligent targeting</li>
                <li>• Pattern validation</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="text-green-500" size={24} />
                Active Wallet Detection
              </CardTitle>
              <CardDescription>
                Only saves wallets with real transaction history, filtering out empty addresses automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Transaction history verification</li>
                <li>• Balance checking</li>
                <li>• Token detection</li>
                <li>• Smart filtering</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-500">🔐 Security & Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• All scanning is performed client-side for maximum security</li>
              <li>• Private keys are never transmitted to our servers</li>
              <li>• Only discovered wallet addresses are stored</li>
              <li>• Your scan results are private to your account</li>
              <li>• Use discovered wallets responsibly and ethically</li>
            </ul>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Ready to Start Scanning?
          </h3>
          <p className="text-muted-foreground mb-6">
            Login to access your personal scanning dashboard and start discovering active TRON wallets.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="text-lg px-8 py-6 h-auto"
            data-testid="cta-login-button"
          >
            <LogIn className="mr-2" size={20} />
            Access Your Scanner Dashboard
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>© 2024 TRC20 Scanner</span>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Powered by TRON Network</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}