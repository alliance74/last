import { useEffect, useMemo, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getReferralStats, type ReferralItem, type ReferralStats } from "@/services/referral.service";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Users, Share2, Trophy, Gift, CreditCard, ArrowUpRight, Clock, Check, X, Loader2 } from "lucide-react";
import { PayoutAccountStatus } from "@/components/payouts/PayoutAccountStatus";
import { PayoutHistory } from "@/components/payouts/PayoutHistory";
import { PayoutRequestModal } from "@/components/payouts/PayoutRequestModal";
import { getStripeConnectStatus, initStripeOnboarding, getPayouts, requestPayout } from "@/services/stripeConnect.service";

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types
type PayoutStatus = 'pending' | 'completed' | 'failed' | 'processing';

type StripeConnectStatus = 'not_connected' | 'pending' | 'complete' | 'incomplete';

interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  completedAt?: string;
  currency: string;
  destination: string;
  transferId?: string;
  fee?: number;
  netAmount?: number;
  error?: string;
  type?: 'payout' | 'referral_earning';
  referredUser?: string;
}

interface StripeConnectAccount {
  id: string;
  status: StripeConnectStatus;
  payoutsEnabled: boolean;
  requirements?: {
    currently_due: string[];
    pending_verification: string[];
  };
}

const Referrals = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { currentUser } = useAuth();
  const { subscription } = useSubscription();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key to force re-fetch
  
  // Payout state
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [stripeConnectAccount, setStripeConnectAccount] = useState<StripeConnectAccount | null>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isLoadingStripeStatus, setIsLoadingStripeStatus] = useState(true);
  const [minimumPayout, setMinimumPayout] = useState(10); // $10 minimum by default
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Share referral link
  const handleShare = async () => {
    if (!referralLink) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join me on this awesome platform!',
          text: `Sign up using my referral link and get started today!`,
          url: referralLink,
        });
      } else {
        copyToClipboard(referralLink, 'Referral link');
      }
      
      // Refresh stats after sharing to ensure we have the latest data
      refreshStats().catch(console.error);
    } catch (err) {
      console.error('Error sharing:', err);
      copyToClipboard(referralLink, 'Referral link');
    }
  };
  
  // Function to manually refresh stats
  const handleRefreshStats = async () => {
    try {
      await refreshStats();
      toast({
        title: 'Updated!',
        description: 'Referral stats have been refreshed',
      });
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  // Get status badge
  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${description} copied to clipboard`,
    });
  };

  // Generate referral link with referral code
  const referralLink = useMemo(() => {
    if (!stats?.referralCode) return '';
    return `${window.location.origin}/signup?ref=${encodeURIComponent(stats.referralCode)}`;
  }, [stats?.referralCode]);

  // Function to refresh stats with error handling and logging
  const refreshStats = useCallback(async () => {
    if (!currentUser) return null;
    
    setLoading(true);
    try {
      console.log('Fetching referral stats...');
      const data = await getReferralStats();
      console.log('Received referral stats:', data);
      
      // Ensure we have valid numbers
      const stats = {
        ...data,
        totalReferrals: Number(data.totalReferrals) || 0,
        activeReferrals: Number(data.activeReferrals) || 0,
        totalEarned: Number(data.totalEarned) || 0,
      };
      
      setStats(stats);
      return stats;
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral stats',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast]);

  // Fetch referral stats
  useEffect(() => {
    refreshStats();
  }, [currentUser, refreshKey, refreshStats]);
  
  // Set up polling to refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats().catch(console.error);
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [refreshStats]);
  
  // Fetch Stripe Connect account status
  const fetchStripeConnectStatus = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoadingStripeStatus(true);
    try {
      const result = await getStripeConnectStatus();
      
      if (result.success && result.account) {
        setStripeConnectAccount(result.account);
      }
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment account status',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingStripeStatus(false);
    }
  }, [currentUser, toast]);
  
  // Handle Stripe Connect onboarding
  const handleConnectStripe = async () => {
    if (!currentUser?.email) {
      toast({
        title: 'Error',
        description: 'Please sign in to connect your payment account',
        variant: 'destructive',
      });
      return;
    }
    
    setIsConnectingStripe(true);
    try {
      // Create a clean return URL without query parameters
      const returnUrl = new URL(window.location.origin + '/referrals');
      returnUrl.searchParams.set('stripe_redirect', 'true');
      
      // Pass the return URL to the backend
      const result = await initStripeOnboarding(currentUser.email, returnUrl.toString());
      
      // Redirect to Stripe onboarding
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect payment account',
        variant: 'destructive',
      });
    } finally {
      setIsConnectingStripe(false);
    }
  };
  
  // Fetch transactions, payouts, and available balance
  const fetchPayouts = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const result = await getPayouts();
      
      if (result.success) {
        if (result.payouts) {
          setPayouts(result.payouts);
        }
        
        if (result.availableBalance !== undefined) {
          setAvailableBalance(result.availableBalance);
        }
        
        if (result.minimumPayoutAmount) {
          setMinimumPayout(result.minimumPayoutAmount);
        }
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout data',
        variant: 'destructive',
      });
    }
  }, [currentUser, toast]);
  
  // Check for Stripe redirect and refresh status
  useEffect(() => {
    const checkStripeRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('stripe_redirect') === 'true') {
        // Remove the query param to prevent duplicate processing
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show loading state
        setIsLoadingStripeStatus(true);
        
        try {
          // Give Stripe a moment to process the account
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Force refresh all data
          await Promise.all([
            fetchStripeConnectStatus(),
            fetchPayouts(),
            refreshStats()
          ]);
          
          // Show success message
          toast({
            title: 'Success',
            description: 'Payment account connected successfully!',
          });
        } catch (error) {
          console.error('Error after Stripe redirect:', error);
          toast({
            title: 'Error',
            description: 'Failed to verify payment account status',
            variant: 'destructive',
          });
        } finally {
          setIsLoadingStripeStatus(false);
        }
      }
    };
    
    checkStripeRedirect();
  }, [fetchStripeConnectStatus, fetchPayouts, refreshStats]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchPayouts(),
          fetchStripeConnectStatus()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load referral data',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [fetchPayouts, fetchStripeConnectStatus]);

  // Handle payout request
  const handleRequestPayout = async () => {
    if (!payoutAmount || isNaN(parseFloat(payoutAmount)) || parseFloat(payoutAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payout amount',
        variant: 'destructive',
      });
      return;
    }
    
    const amount = parseFloat(payoutAmount);
    
    if (amount > availableBalance) {
      toast({
        title: 'Insufficient balance',
        description: `Your available balance is ${formatCurrency(availableBalance)}`,
        variant: 'destructive',
      });
      return;
    }
    
    if (amount < minimumPayout) {
      toast({
        title: 'Amount too low',
        description: `Minimum payout amount is ${formatCurrency(minimumPayout)}`,
        variant: 'destructive',
      });
      return;
    }
    
    setPayoutLoading(true);
    
    try {
      const result = await requestPayout(amount);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to request payout');
      }
      
      toast({
        title: 'Success',
        description: 'Payout requested successfully',
      });
      
      // Refresh data
      setPayoutAmount('');
      setIsPayoutModalOpen(false);
      
      // Refresh data
      await Promise.all([
        fetchPayouts(),
        fetchStripeConnectStatus()
      ]);
      
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request payout',
        variant: 'destructive',
      });
    } finally {
      setPayoutLoading(false);
    }
  };

  // Handle refresh of all data
  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    await Promise.all([
      fetchPayouts(),
      fetchStripeConnectStatus()
    ]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Referral Program</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats and Referral Link */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Referrals</span>
                  <span className="font-medium" data-testid="total-referrals">
                    {stats?.totalReferrals?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Referrals</span>
                  <span className="font-medium" data-testid="active-referrals">
                    {stats?.activeReferrals?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Earned</span>
                  <span className="font-medium" data-testid="total-earned">
                    {formatCurrency(stats?.totalEarned || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Your Referral Link
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Share your link and earn rewards
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      value={referralLink} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(referralLink, "Referral link")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={handleShare}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Payouts */}
          <div className="space-y-6 lg:col-span-2">
            <PayoutAccountStatus
              account={stripeConnectAccount}
              availableBalance={availableBalance}
              minimumPayout={minimumPayout}
              isLoading={isLoadingStripeStatus}
              isConnecting={isConnectingStripe}
              onConnect={handleConnectStripe}
              onRequestPayout={() => setIsPayoutModalOpen(true)}
            />

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Payouts
                  </CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => setIsPayoutModalOpen(true)}
                    disabled={availableBalance <= 0}
                  >
                    Request Payout
                  </Button>
                </div>
                <CardDescription>
                  Your available balance: <span className="font-semibold text-foreground">{formatCurrency(availableBalance)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No payouts yet</p>
                    <p className="text-sm mt-1">Earn money by referring friends and request payouts here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-medium">Payout History</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payouts.map((tx) => (
                            <tr key={`${tx.type}-${tx.id}`} className="border-b border-border/10">
                              <td className="py-3 px-4 text-sm">
                                {tx.completedAt ? format(new Date(tx.completedAt), 'MMM d, yyyy') : 'Pending'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {tx.type === 'referral_earning' ? (
                                    <Gift className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <CreditCard className="w-4 h-4 text-blue-500" />
                                  )}
                                  <span className="text-sm">
                                    {tx.type === 'referral_earning' 
                                      ? `Referral: ${tx.referredUser || 'Unknown'}`
                                      : 'Payout'}
                                  </span>
                                </div>
                              </td>
                              <td className={`py-3 px-4 text-right font-medium ${
                                tx.type === 'referral_earning' ? 'text-green-600' : 'text-amber-600'
                              }`}>
                                {tx.type === 'referral_earning' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Referral History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Your Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading referrals...
                  </div>
                ) : stats?.recentReferrals && stats.recentReferrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/20">
                          <th className="text-left py-3 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="text-left py-3 text-sm font-medium text-muted-foreground">Join Date</th>
                          <th className="text-left py-3 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-right py-3 text-sm font-medium text-muted-foreground">Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentReferrals.map((ref, index) => (
                          <tr key={index} className="border-b border-border/10">
                            <td className="py-3 text-foreground font-medium">{ref.email}</td>
                            <td className="py-3 text-muted-foreground">
                              {format(new Date(ref.date), 'MMM d, yyyy')}
                            </td>
                            <td className="py-3">
                              <Badge 
                                variant={ref.status === 'completed' ? 'default' : 'secondary'}
                                className={ref.status === 'completed' ? 'bg-success/10 text-success' : ''}
                              >
                                {ref.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-right text-foreground font-medium">
                              {formatCurrency(ref.earned || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No referrals yet</p>
                    <p className="text-sm mt-1">Share your referral link to invite friends</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Request Payout</h2>
              <button 
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to withdraw</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                    min="1"
                    max={availableBalance}
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Available: {formatCurrency(availableBalance)}
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-sm mb-2">Payout Method</h3>
                <div className="flex items-center justify-between p-3 bg-background rounded border">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Stripe</p>
                      <p className="text-xs text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    Default
                  </Badge>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full" 
                  onClick={handleRequestPayout}
                  disabled={payoutLoading || !payoutAmount || parseFloat(payoutAmount) <= 0}
                >
                  {payoutLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Request Payout
                    </>
                  )}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Payouts typically take 2-5 business days to process
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;





