import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { subscribeToPlan, getSubscriptionPlans, SubscriptionPlan, CurrentSubscription } from "@/services/subscription.service";
import { useAuth } from "@/contexts/AuthContext";

const Pricing = () => {
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [plansData, setPlansData] = useState<SubscriptionPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Default plans in case API fails
  const defaultPlans: SubscriptionPlan[] = [
    {
      id: "free",
      name: "Free",
      price: 0,
      description: "Perfect for trying out RizzChat",
      billingCycle: 'monthly',
      features: [
        "10 free messages",
        "Basic support",
        "Access to free features"
      ],
      credits: 10,
      limits: {
        messages: 10,
        history: 24,
        responseLength: 500
      },
      stripe: {
        priceId: 'price_free'
      }
    },
    {
      id: "premium",
      name: "Premium",
      price: 9.99,
      description: "Unlimited rizz for serious charmers",
      billingCycle: 'monthly',
      features: [
        "Unlimited messages",
        "Priority support",
        "Access to all premium features",
        "Cancel anytime"
      ],
      credits: -1, // -1 for unlimited
      limits: {
        messages: -1, // -1 for unlimited
        history: 168,
        responseLength: 1000
      },
      stripe: {
        priceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID,
        productId: 'prod_T1CsGdiSNCRV9L'
      }
    }
  ];
  
  
  // Helper function to format price for display
  const formatPrice = (price: number) => {
    return price === -1 ? 'Unlimited' : `$${price.toFixed(2)}`;
  };

  const [isLoading, setIsLoading] = useState(true);

  // Fetch plans from the server
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const { plans, currentPlan } = await getSubscriptionPlans();
        
        // Ensure plans data is consistent with our defaults
        const processedPlans = (plans || defaultPlans).map(plan => {
          // For premium plan, ensure unlimited messages are shown correctly
          if (plan.id === 'premium') {
            return {
              ...plan,
              features: plan.features.map(f => 
                typeof f === 'string' && f.toLowerCase().includes('message') ? 'Unlimited messages' : f
              ),
              credits: -1,
              limits: {
                ...plan.limits,
                messages: -1
              }
            };
          }
          return plan;
        });
        
        setPlansData(processedPlans);
        
        if (currentPlan) {
          setCurrentPlan(currentPlan);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        setPlansData(defaultPlans);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Use plansData if available, otherwise use defaultPlans
  const plansToRender = plansData.length > 0 ? plansData : defaultPlans;
  
  // Add display properties to plans
  const plansWithDisplayProps = plansToRender.map(plan => {
    const isPremium = plan.id === 'premium';
    return {
      ...plan,
      displayPrice: formatPrice(plan.price),
      displayPeriod: '',
      isPopular: isPremium,
      buttonText: plan.id === 'free' ? 'Get Started Free' : 'Get Premium',
      showDiscount: isPremium && plan.billingCycle === 'monthly',
      originalPrice: isPremium ? 19.98 : 0,
      price: plan.price || (isPremium ? 9.99 : 0)
    };
  });

  const handleSubscribe = async (planId: string) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    setLoading(prev => ({ ...prev, [planId]: true }));

    try {
      toast({
        title: "Processing...",
        description: `Setting up your ${planId} subscription...`,
      });

      await subscribeToPlan(planId);
      
      toast({
        title: "Success!",
        description: `You've successfully subscribed to the ${planId} plan!`,
      });
      
      // Refresh the page to show updated subscription status
      window.location.reload();
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to process subscription. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [planId]: false }));
    }
  };

  const getButtonText = (planId: string, defaultText: string) => {
    if (loading[planId]) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      );
    }
    
    if (currentPlan?.planId === planId) {
      return 'Current Plan';
    }
    
    return defaultText;
  };

  const isCurrentPlan = (planId: string) => {
    return currentPlan?.planId === planId;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Choose Your <span className="gradient-text">Rizz Level</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free or go premium for unlimited charm. Cancel anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {plansWithDisplayProps.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative glass hover-lift transition-smooth ${
                  plan.isPopular ? 'ring-2 ring-primary shadow-glow' : ''
                }`}
              >
                {plan.isPopular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 gradient-primary text-primary-foreground"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold text-primary">
                      ${plan.price.toFixed(2)}
                    </span>
                    {plan.originalPrice > 0 && (
                      <span className="text-lg text-muted-foreground line-through">
                        ${plan.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      /month
                    </span>
                  </div>
                  {plan.showDiscount && (
                    <Badge variant="secondary" className="mx-auto mt-2">
                      50% OFF Launch Sale!
                    </Badge>
                  )}
                  <p className="text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-success flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${
                      plan.isPopular 
                        ? 'gradient-primary text-primary-foreground hover-lift' 
                        : 'variant-outline'
                    } ${isCurrentPlan(plan.id) ? 'bg-muted hover:bg-muted cursor-default' : ''}`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan(plan.id) || loading[plan.id]}
                  >
                    {getButtonText(plan.id, plan.buttonText || 'Subscribe')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-foreground mb-8">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              {[
                {
                  q: "Can I cancel my subscription anytime?",
                  a: "Yes! You can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period."
                },
                {
                  q: "What happens to my chat history if I downgrade?",
                  a: "Your chat history is always saved. If you downgrade, you'll still be able to view your previous conversations, but you'll be limited to the free plan's message quota."
                },
                {
                  q: "How does the referral program work?",
                  a: "Premium users earn $2/month for each person they refer who subscribes. Earnings are credited to your account monthly."
                }
              ].map((faq, index) => (
                <Card key={index} className="glass">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">
                      {faq.q}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
