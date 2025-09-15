import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Crown, Gift, MessageSquare } from "lucide-react";

const Success = () => {
  useEffect(() => {
    // Mock success tracking
    console.log("Payment success tracked");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onSignIn={() => {}} 
        onGetStarted={() => window.location.href = '/dashboard'}
      />
      
      <div className="pt-20 pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to Premium! 🎉
            </h1>
            <p className="text-xl text-muted-foreground">
              Your payment was successful. You now have access to all premium features!
            </p>
          </div>

          <Card className="glass mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-primary" />
                Premium Features Unlocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <span className="text-foreground">Unlimited AI Responses</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="text-foreground">All Response Styles</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-foreground">Priority Processing</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-foreground">Referral Earnings</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass mb-8">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Start Chatting</h3>
                  <p className="text-muted-foreground text-sm">Head to your dashboard and start generating unlimited rizz lines</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Share & Earn</h3>
                  <p className="text-muted-foreground text-sm">Refer friends and earn $2/month for each premium subscriber</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Level Up Your Game</h3>
                  <p className="text-muted-foreground text-sm">Use AI-powered responses to improve your conversation skills</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="gradient-primary text-primary-foreground hover-lift"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/referrals'}
            >
              <Gift className="w-4 h-4 mr-2" />
              Start Earning
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Success;