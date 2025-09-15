import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Share2, UserPlus } from 'lucide-react';

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  creditsEarned: number;
  recentReferrals: Array<{
    email: string;
    date: string;
    status: 'pending' | 'completed';
  }>;
}

export function ReferralPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const referralLink = `${window.location.origin}/signup?ref=${currentUser?.uid || ''}`;

  useEffect(() => {
    const fetchReferralStats = async () => {
      try {
        const response = await apiFetch('/referrals/stats');
        setStats(response);
      } catch (error) {
        console.error('Failed to fetch referral stats:', error);
        toast({
          title: 'Error',
          description: 'Failed to load referral statistics',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchReferralStats();
    }
  }, [currentUser, toast]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
  };

  const shareLink = async () => {
    try {
      await navigator.share({
        title: 'Join me on RizzChat',
        text: 'Sign up with my referral link and get bonus credits!',
        url: referralLink,
      });
    } catch (err) {
      console.error('Error sharing:', err);
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          RizzChat Referral Program
        </h1>
        <p className="text-muted-foreground mt-2">
          Invite friends and earn credits when they sign up!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Referral Code</CardDescription>
            <CardTitle className="text-2xl font-mono">
              {stats?.referralCode || currentUser?.uid?.substring(0, 8).toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Share this code with friends</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>People Referred</CardDescription>
            <CardTitle className="text-2xl">{stats?.referralCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total signups from your link</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credits Earned</CardDescription>
            <CardTitle className="text-2xl">{stats?.creditsEarned || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">From successful referrals</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends and earn 10 credits for each successful signup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-2">
              <Input
                value={referralLink}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button onClick={copyToClipboard} variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={shareLink}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>You'll both receive 10 credits when they sign up</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentReferrals.map((referral, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{referral.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(referral.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    referral.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {referral.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
