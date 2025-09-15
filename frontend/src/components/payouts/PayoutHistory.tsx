import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpRight, Gift, AlertCircle } from 'lucide-react';
import { Payout } from '@/services/stripeConnect.service';
import { formatCurrency } from '@/lib/utils';

interface PayoutHistoryProps {
  payouts: Payout[];
  availableBalance: number;
  minimumPayout: number;
  isLoading: boolean;
  onRefresh: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'processing':
      return <Badge variant="secondary">Processing</Badge>;
    case 'pending':
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

export function PayoutHistory({
  payouts,
  availableBalance,
  minimumPayout,
  isLoading,
  onRefresh,
}: PayoutHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Your recent payout requests and transactions</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {payouts.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="text-sm font-medium">No payouts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {availableBalance > 0 
                ? `Request a payout when you've earned at least ${formatCurrency(minimumPayout)}`
                : 'Your earnings will appear here when you receive them'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium flex items-center">
                    {payout.amount >= 0 ? (
                      <span className="text-green-500 mr-2">+{formatCurrency(payout.amount)}</span>
                    ) : (
                      <span className="text-foreground">{formatCurrency(payout.amount)}</span>
                    )}
                    {payout.status === 'completed' && payout.netAmount !== undefined && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Net: {formatCurrency(payout.netAmount)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {payout.transferId 
                      ? `Payout to bank account${payout.destination ? ` (${payout.destination})` : ''}`
                      : 'Referral earnings'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(payout.createdAt), 'MMM d, yyyy • h:mm a')}
                  </div>
                  
                  {payout.error && (
                    <div className="flex items-center text-xs text-destructive mt-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      <span>{payout.error}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(payout.status)}
                  {payout.status === 'completed' && payout.completedAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Paid on {format(new Date(payout.completedAt), 'MMM d')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
