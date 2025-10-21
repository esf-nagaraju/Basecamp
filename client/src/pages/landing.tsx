import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, BarChart3, TrendingUp, CheckCircle2, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMicrosoftLogin = () => {
    window.location.href = "/api/login";
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (response.ok) {
        // Redirect to dashboard
        window.location.href = "/";
      } else {
        const data = await response.json();
        toast({
          title: "Login failed",
          description: data.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (response.ok) {
        // Redirect to dashboard
        window.location.href = "/";
      } else {
        toast({
          title: "Login failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden m-4">
        <div className="grid lg:grid-cols-2 min-h-[600px]">
          {/* Left side - Login form */}
          <div className="flex flex-col p-8 lg:p-12">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg">
                <ClipboardList className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">Basecamp</span>
            </div>

            {/* Login form area */}
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
                  Welcome Back
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Sign in to access your healthcare AR dashboard
                </p>
              </div>

              {!showUserLogin && !showAdminLogin ? (
                <div className="space-y-6">
                  <Button
                    data-testid="button-email-login-toggle"
                    onClick={() => setShowUserLogin(true)}
                    className="w-full h-12 text-base bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    size="lg"
                  >
                    Sign in with Email
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-300 dark:border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
                        Or
                      </span>
                    </div>
                  </div>

                  <Button
                    data-testid="button-login"
                    onClick={handleMicrosoftLogin}
                    variant="outline"
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    Sign in with Microsoft
                  </Button>

                  <button
                    onClick={() => setShowAdminLogin(true)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  >
                    <Shield className="w-3 h-3 inline mr-1" />
                    System Administrator Login
                  </button>

                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Choose your authentication method
                    </p>
                  </div>
                </div>
              ) : showUserLogin ? (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg mb-4">
                      <span className="text-sm font-medium">Email Login</span>
                    </div>
                  </div>

                  <form onSubmit={handleUserLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                        Email
                      </Label>
                      <Input
                        id="email"
                        data-testid="input-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user-password" className="text-slate-700 dark:text-slate-300">
                        Password
                      </Label>
                      <Input
                        id="user-password"
                        data-testid="input-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="h-12"
                      />
                    </div>

                    <Button
                      data-testid="button-user-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 text-base bg-indigo-600 text-white"
                      size="lg"
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </form>

                  <Button
                    data-testid="button-back-to-options"
                    onClick={() => {
                      setShowUserLogin(false);
                      setEmail("");
                      setPassword("");
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to login options
                  </Button>
                </div>
              ) : showAdminLogin ? (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg mb-4">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-medium">Administrator Login</span>
                    </div>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">
                        Username
                      </Label>
                      <Input
                        id="username"
                        data-testid="input-admin-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter admin username"
                        required
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                        Password
                      </Label>
                      <Input
                        id="password"
                        data-testid="input-admin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter admin password"
                        required
                        className="h-12"
                      />
                    </div>

                    <Button
                      data-testid="button-admin-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 text-base bg-indigo-600 text-white"
                      size="lg"
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </form>

                  <Button
                    data-testid="button-back-to-options-admin"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setUsername("");
                      setPassword("");
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to login options
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              © 2025 Basecamp. All rights reserved.
            </div>
          </div>

          {/* Right side - Blue gradient showcase */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-8 lg:p-12 flex flex-col justify-center text-white">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full opacity-20 blur-3xl" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full opacity-20 blur-3xl" aria-hidden="true" />
            
            <div className="relative z-10 space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-4">
                  Effortlessly manage your healthcare AR operations
                </h2>
                <p className="text-indigo-100 text-lg">
                  Access your comprehensive claims dashboard and streamline your revenue cycle management
                </p>
              </div>

              {/* Dashboard preview mockup */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20" data-testid="dashboard-preview">
                <div className="space-y-4">
                  {/* Metric cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-lg p-4" data-testid="metric-total-balance">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-indigo-300" />
                        <span className="text-sm text-indigo-200">Total Balance</span>
                      </div>
                      <p className="text-2xl font-bold">$857.1K</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4" data-testid="metric-claims">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-green-300" />
                        <span className="text-sm text-indigo-200">Claims</span>
                      </div>
                      <p className="text-2xl font-bold">1,247</p>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-300" />
                      <span className="text-indigo-100">Real-time claim tracking</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-300" />
                      <span className="text-indigo-100">Automated denial management</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-300" />
                      <span className="text-indigo-100">Performance analytics</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-4" data-testid="stats-bar">
                <div className="text-center" data-testid="stat-claims-processed">
                  <p className="text-3xl font-bold">5M+</p>
                  <p className="text-sm text-indigo-200">Claims Processed</p>
                </div>
                <div className="h-12 w-px bg-white/30" aria-hidden="true" />
                <div className="text-center" data-testid="stat-uptime">
                  <p className="text-3xl font-bold">99.9%</p>
                  <p className="text-sm text-indigo-200">Uptime</p>
                </div>
                <div className="h-12 w-px bg-white/30" aria-hidden="true" />
                <div className="text-center" data-testid="stat-support">
                  <p className="text-3xl font-bold">24/7</p>
                  <p className="text-sm text-indigo-200">Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
