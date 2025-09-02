import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, UserPlus, LogIn, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";

interface AuthResponse {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

export default function AuthPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/login', credentials);
      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (user: AuthResponse) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "登录成功！",
        description: `欢迎回来，${user.username}！`,
        duration: 2000, // 2秒后自动消失
      });
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "登录失败",
        description: error.message,
        variant: "destructive",
        duration: 4000, // 4秒后自动消失
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: typeof registerForm) => {
      const response = await apiRequest('POST', '/api/register', userData);
      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (user: AuthResponse) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "注册成功！",
        description: `欢迎，${user.username}！您的账户已创建。`,
        duration: 2000, // 2秒后自动消失
      });
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "注册失败",
        description: error.message,
        variant: "destructive",
        duration: 4000, // 4秒后自动消失
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      toast({
        title: "请填写完整信息",
        description: "用户名和密码都是必填项",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.username || !registerForm.password) {
      toast({
        title: "请填写完整信息",
        description: "用户名和密码都是必填项",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (registerForm.password.length < 6) {
      toast({
        title: "密码太短",
        description: "密码至少需要6个字符",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    registerMutation.mutate(registerForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Auth forms */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Key className="text-primary-foreground" size={16} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t("appTitle")}
                </h1>
              </div>
              <p className="text-muted-foreground">
                访问您的个人TRC20钱包扫描仪控制台
              </p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2" data-testid="tab-login">
                  <LogIn size={16} />
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2" data-testid="tab-register">
                  <UserPlus size={16} />
                  注册
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>欢迎回来</CardTitle>
                    <CardDescription>
                      登录您的账户继续扫描
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">用户名</Label>
                        <Input
                          id="login-username"
                          type="text"
                          placeholder="输入用户名"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                          data-testid="input-login-username"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">密码</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="输入密码"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                            data-testid="input-login-password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? "登录中..." : "登录"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>创建账户</CardTitle>
                    <CardDescription>
                      创建新账户开始扫描TRON钱包
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-username">用户名 *</Label>
                        <Input
                          id="register-username"
                          type="text"
                          placeholder="输入用户名"
                          value={registerForm.username}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                          data-testid="input-register-username"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">密码 *</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="至少6个字符"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                            data-testid="input-register-password"
                            required
                            minLength={6}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "创建账户中..." : "创建账户"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-center">
              <LanguageToggle />
            </div>
          </div>

          {/* Right side - Hero content */}
          <div className="hidden lg:block space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Discover Active{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
                  TRON Wallets
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Advanced private key scanner with template matching and high-speed processing
              </p>
            </div>

            <div className="grid gap-4">
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-green-400 mb-2">🚀 High-Speed Scanning</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan up to 50,000 private key variations per session with parallel processing
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">🎯 Template Matching</h3>
                  <p className="text-sm text-muted-foreground">
                    Use custom patterns with wildcards to target specific private key ranges
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-500/20 bg-purple-500/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-purple-400 mb-2">🔐 Security First</h3>
                  <p className="text-sm text-muted-foreground">
                    All scanning performed locally - private keys never leave your browser
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}