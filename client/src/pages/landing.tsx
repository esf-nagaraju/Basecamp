import { Button } from "@/components/ui/button";
import { ClipboardList, BarChart3, TrendingUp, CheckCircle2 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
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

              <div className="space-y-6">
                <Button
                  data-testid="button-login"
                  onClick={handleLogin}
                  className="w-full h-12 text-base bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  size="lg"
                >
                  Sign in with Microsoft
                </Button>

                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Secure authentication powered by Microsoft
                  </p>
                </div>
              </div>
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
