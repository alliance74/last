import { Button } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "./HeroSection";
import { 
  MessageSquare, 
  Sparkles, 
  Zap, 
  Shield, 
  Crown,
  Star,
  CheckCircle,
  ArrowRight,
  Users,
  TrendingUp,
  LogIn,
  User
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

import heroImage from "@/assets/hero-image.jpg";

interface LandingPageProps {
  onGetStarted?: () => void;
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const { currentUser } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isPremium = subscription?.status === 'active' || subscription?.status === 'trialing';

  const handleGetStarted = () => {
    window.location.href = '/login';
  };

  const getButtonIcon = () => {
    return <LogIn className="w-5 h-5 ml-2" />;
  };

  const getButtonText = () => {
    return 'Get Started';
  };
  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI-Powered Rizz Lines",
      description: "Get clever, personalized responses using advanced AI technology"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Instant Generation",
      description: "Lightning-fast responses in multiple styles: smooth, funny, flirty, confident"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Screenshot Upload",
      description: "Upload chat screenshots for contextual, perfect responses"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Referral System",
      description: "Earn $2/month for every friend you bring who subscribes"
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      text: "RizzChat literally changed my dating game. Went from 0 matches to multiple dates!",
      rating: 5
    },
    {
      name: "Jordan Smith", 
      text: "The AI suggestions are so good, people think I'm naturally witty 😂",
      rating: 5
    },
    {
      name: "Taylor Brown",
      text: "Best $10 I ever spent. Already made back the cost in confidence alone!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}

    <HeroSection />

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why RizzChat is a Game Changer
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to level up your conversation game
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="glass p-6 hover-lift animate-slide-up" style={{animationDelay: `${index * 100}ms`}}>
                <div className="text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join Thousands of Happy Users
            </h2>
            <div className="flex items-center justify-center gap-2 text-lg">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-muted-foreground">4.9/5 from 2,500+ users</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass p-6 animate-slide-up" style={{animationDelay: `${index * 150}ms`}}>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                <p className="font-semibold">- {testimonial.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you're ready to unlock unlimited rizz
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <Card className="glass p-8 animate-slide-up">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">Free Starter</h3>
                <div className="text-4xl font-bold mb-4">$0</div>
                <p className="text-muted-foreground mb-6">Perfect for trying us out</p>
                
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    10 free rizz lines
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    All 4 response styles
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Basic chat interface
                  </li>
                </ul>
                
                <Button 
                  variant="glass" 
                  size="lg" 
                  className="w-full" 
                  onClick={handleGetStarted}
                  disabled={loading}
                >
                  {getButtonText()}
                  {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </div>
            </Card>
            
            {/* Premium Plan */}
            <Card className="glass p-8 relative animate-slide-up delay-100 ring-2 ring-primary/50">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">$9.99</span>
                  <span className="text-lg text-muted-foreground line-through">$20.00</span>
                </div>
                <p className="text-muted-foreground mb-6">Unlimited rizz power</p>
                
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Unlimited rizz lines
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Premium AI models
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Screenshot uploads
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Chat history saved
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Referral earnings ($2/month per referral)
                  </li>
                </ul>
                
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="w-full" 
                  onClick={handleGetStarted}
                  disabled={loading}
                >
                  {!loading && <Crown className="w-5 h-5 mr-2" />}
                  {getButtonText()}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="glass p-12 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Never Run Out of Rizz?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands who've already leveled up their conversation game
            </p>
            <Button 
              variant="hero" 
              size="xl" 
              onClick={handleGetStarted}
              disabled={loading}
              className="w-full sm:w-auto min-w-[150px] sm:min-w-[200px] text-sm sm:text-base px-4 py-6 sm:px-6 sm:py-3"
            >
              {getButtonText()}
              {getButtonIcon()}
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
};