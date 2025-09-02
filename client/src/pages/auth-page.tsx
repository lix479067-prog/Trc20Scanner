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
    email: "",
    password: "",
    firstName: "",
    lastName: "",
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
        title: "Login successful!",
        description: `Welcome back, ${user.username}!`,
      });
      // Redirect to home
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
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
        title: "Registration successful!",
        description: `Welcome, ${user.username}! Your account has been created.`,
      });
      // Redirect to home
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.username || !registerForm.password) {
      toast({
        title: "Validation error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }
    if (registerForm.password.length < 6) {
      toast({
        title: "Validation error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
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
                Access your personal TRC20 wallet scanner dashboard
              </p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2" data-testid="tab-login">
                  <LogIn size={16} />
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2" data-testid="tab-register">
                  <UserPlus size={16} />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>
                      Sign in to your account to continue scanning
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                          id="login-username"
                          type="text"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                          data-testid="input-login-username"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
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
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create account</CardTitle>
                    <CardDescription>
                      Create a new account to start scanning for TRON wallets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-username">Username *</Label>
                          <Input
                            id="register-username"
                            type="text"
                            value={registerForm.username}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                            data-testid="input-register-username"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-email">Email</Label>
                          <Input
                            id="register-email"
                            type="email"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                            data-testid="input-register-email"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstname">First Name</Label>
                          <Input
                            id="register-firstname"
                            type="text"
                            value={registerForm.firstName}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                            data-testid="input-register-firstname"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-lastname">Last Name</Label>
                          <Input
                            id="register-lastname"
                            type="text"
                            value={registerForm.lastName}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                            data-testid="input-register-lastname"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
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