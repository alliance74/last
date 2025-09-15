import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CreditCard, Loader2, Check, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StripeConnectAccount } from '@/services/stripeConnect.service';
import { Badge } from '@/components/ui/badge';

interface PayoutAccountStatusProps {
  account: StripeConnectAccount | null;
  availableBalance: number;
  minimumPayout: number;
  isLoading: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onRequestPayout: () => void;
}

export function PayoutAccountStatus({
  account,
  availableBalance,
  minimumPayout,
  isLoading,
  isConnecting,
  onConnect,
  onRequestPayout,
}: PayoutAccountStatusProps) {
  const isConnected = account?.payoutsEnabled === true;
  const isIncomplete = account?.status === 'incomplete';
  const isPending = account?.status === 'pending';
  const isComplete = account?.status === 'complete';
  
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded-md mb-2"></div>
          <div className="h-4 w-64 bg-muted rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-full bg-muted rounded-md"></div>
        </CardContent>
      </Card>
    );
  }

  const renderStatusBadge = () => {
    if (isConnected) {
      return (
        <Badge variant="outline" className="border-green-500 text-green-500">
          <Check className="h-3 w-3 mr-1" /> Connected
        </Badge>
      );
    }
    
    if (account?.id) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500">
          {isPending ? 'Pending Verification' : 'Setup Incomplete'}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not Connected
      </Badge>
    );
  };

  const renderAccountLink = () => {
    if (!account?.id) return null;
    
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
        <span>Account ID: {account.id}</span>
        <a 
          href={`https://dashboard.stripe.com/${account.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline flex items-center gap-1"
        >
          View in Stripe <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  };

  const renderRequirements = () => {
    if (!isIncomplete || !account?.requirements) return null;
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Account Setup Incomplete</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="font-medium">Additional information required:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {account.requirements.currently_due?.map((req, i) => (
              <li key={i} className="text-sm">
                {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  const renderConnectButton = () => {
    if (account?.id) {
      return (
        <>
          <Button 
            variant="outline" 
            onClick={onConnect}
            disabled={isConnecting}
            className="flex-1"
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Update Account
              </>
            )}
          </Button>
          <Button 
            onClick={onRequestPayout} 
            disabled={!isConnected || availableBalance < minimumPayout}
            className="flex-1"
          >
            Request Payout
          </Button>
        </>
      );
    }
    
    return (
      <Button 
        onClick={onConnect} 
        disabled={isConnecting}
        className="w-full"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Connect Stripe Account
          </>
        )}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <CardTitle>Payout Account</CardTitle>
          {renderStatusBadge()}
        </div>
        {renderAccountLink()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Available Balance</span>
            <span className="font-semibold">{formatCurrency(availableBalance)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Minimum payout amount: {formatCurrency(minimumPayout)}
          </div>
        </div>

        {renderRequirements()}

        {isPending && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Pending Verification</AlertTitle>
            <AlertDescription>
              Your account is being reviewed by our payment processor. This usually takes 1-2 business days.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {renderConnectButton()}
        </div>
        
        <CardDescription>
          {isConnected 
            ? "Request a payout to your connected bank account"
            : "Connect your payment account to request payouts"
          }
        </CardDescription>
      </CardContent>
    </Card>
  );
}
