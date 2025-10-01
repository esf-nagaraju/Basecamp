import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">ClaimFlowPro</CardTitle>
          <CardDescription className="text-lg">
            Healthcare AR Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Streamline your accounts receivable workflow with intelligent claim management, 
            denial tracking, and productivity analytics.
          </p>
          <Button 
            data-testid="button-login" 
            className="w-full" 
            size="lg"
            onClick={handleLogin}
          >
            Log In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
