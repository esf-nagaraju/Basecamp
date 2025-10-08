import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, AlertCircle, BarChart3, Clock, DollarSign } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Purple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600" />
      
      {/* Decorative medical cross */}
      <div className="absolute top-8 right-8 opacity-20">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-white">
          <path d="M50 10H30V30H10V50H30V70H50V50H70V30H50V10Z" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-6xl bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-0">
          {/* Left side - Feature showcase */}
          <div className="p-8 lg:p-12 flex flex-col justify-center space-y-8 relative">
            {/* Decorative gradient orbs */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-3xl" />
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500 rounded-full opacity-20 blur-3xl" />
            
            <div className="relative space-y-6">
              {/* Feature card 1 */}
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 hover-elevate transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500 rounded-xl">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Manage Claims</h3>
                    <p className="text-blue-200 text-sm mt-1">Track and process medical claims efficiently</p>
                  </div>
                </div>
              </div>

              {/* Feature card 2 */}
              <div className="bg-purple-500/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30 hover-elevate transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Track Denials</h3>
                    <p className="text-purple-200 text-sm mt-1">Monitor and resolve claim denials quickly</p>
                  </div>
                </div>
              </div>

              {/* Feature card 3 */}
              <div className="bg-indigo-500/20 backdrop-blur-sm rounded-2xl p-6 border border-indigo-400/30 hover-elevate transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-500 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Analytics Dashboard</h3>
                    <p className="text-indigo-200 text-sm mt-1">Real-time insights on AR performance</p>
                  </div>
                </div>
              </div>

              {/* Additional mini features */}
              <div className="flex gap-4 pt-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Time Tracking</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Revenue Cycle</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Performance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login card */}
          <div className="p-8 lg:p-12 flex items-center justify-center bg-slate-800/50">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Login to your account
                  </h1>
                  <p className="text-slate-600">
                    One place for all your AR management needs
                  </p>
                </div>

                <div className="space-y-6">
                  <Button
                    data-testid="button-login"
                    onClick={handleLogin}
                    className="w-full h-12 text-base bg-purple-600 text-white"
                    size="lg"
                  >
                    Sign in with Replit
                  </Button>

                  <div className="text-center text-sm text-slate-500">
                    Secure authentication powered by Replit
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-slate-400 italic">
                  "Fast, simple, and trusted healthcare AR management"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
