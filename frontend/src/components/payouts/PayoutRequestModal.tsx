import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CreditCard, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { requestPayout } from '@/services/stripeConnect.service';

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  minimumPayout: number;
  onPayoutRequested: () => void;
  isConnected: boolean;
  onConnectStripe: () => void;
  isConnectingStripe: boolean;
}

export function PayoutRequestModal({
  isOpen,
  onClose,
  availableBalance,
  minimumPayout,
  onPayoutRequested,
  isConnected,
  onConnectStripe,
  isConnectingStripe,
}: PayoutRequestModalProps) {
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  // Calculate fees and net amount when payout amount changes
  useEffect(() => {
    if (!payoutAmount || isNaN(parseFloat(payoutAmount))) {
      setFee(0);
      setNetAmount(0);
      return;
    }
    
    const amount = parseFloat(payoutAmount);
    const feePercent = 2.9; // 2.9% platform fee
    const fixedFee = 0.30; // $0.30 fixed fee
    
    const calculatedFee = Math.min(
      amount * (feePercent / 100) + fixedFee,
      amount // Ensure fee doesn't exceed the amount
    );
    
    setFee(calculatedFee);
    setNetAmount(amount - calculatedFee);
  }, [payoutAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payoutAmount || isNaN(parseFloat(payoutAmount)) || parseFloat(payoutAmount) <= 0) {
      setError('Please enter a valid payout amount');
      return;
    }
    
    const amount = parseFloat(payoutAmount);
    
    if (amount > availableBalance) {
      setError(`Amount exceeds your available balance of ${formatCurrency(availableBalance)}`);
      return;
    }
    
    if (amount < minimumPayout) {
      setError(`Minimum payout amount is ${formatCurrency(minimumPayout)}`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await requestPayout(amount);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to request payout');
      }
      
      onPayoutRequested();
      onClose();
    } catch (err) {
      console.error('Error requesting payout:', err);
      setError(err instanceof Error ? err.message : 'Failed to request payout');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Request Payout</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {!isConnected ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Account Not Connected</AlertTitle>
              <AlertDescription>
                Please connect your payment account before requesting a payout.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading || isConnectingStripe}
              >
                Cancel
              </Button>
              <Button
                onClick={onConnectStripe}
                disabled={isLoading || isConnectingStripe}
              >
                {isConnectingStripe ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Connect Payment Account
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="payout-amount">Amount (USD)</Label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">$</span>
                </div>
                <Input
                  id="payout-amount"
                  type="number"
                  min={minimumPayout}
                  step="0.01"
                  max={availableBalance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-7"
                  placeholder={`Min ${formatCurrency(minimumPayout)} - Max ${formatCurrency(availableBalance)}`}
                  disabled={isLoading}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Available: {formatCurrency(availableBalance)} • Min: {formatCurrency(minimumPayout)}
              </p>
            </div>
            
            {parseFloat(payoutAmount) > 0 && (
              <div className="space-y-2 text-sm bg-muted/30 p-3 rounded-md">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout Amount:</span>
                  <span>{formatCurrency(parseFloat(payoutAmount) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fee (~2.9% + $0.30):</span>
                  <span className="text-destructive">-{formatCurrency(fee)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-medium">
                  <span>You'll receive:</span>
                  <span className="text-green-500">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !payoutAmount || parseFloat(payoutAmount) < minimumPayout}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Request Payout'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
