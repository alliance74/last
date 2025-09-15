import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Box, Button, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';
import { paymentService } from '../../services/payment.service';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface PaymentFormProps {
  planId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ planId, amount, onSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    // Check for any existing error
    if (error) setError(null);
  }, [planId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Create payment intent
      const { clientSecret } = await paymentService.createPaymentIntent(planId);
      
      // 2. Confirm card payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      // 3. Handle successful payment
      if (paymentIntent.status === 'succeeded') {
        setSucceeded(true);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="h6" color="primary" gutterBottom>
          Payment Successful!
        </Typography>
        <Typography variant="body1">
          Thank you for your subscription. Your account has been updated.
        </Typography>
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Details
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your subscription will be billed at ${amount.toFixed(2)} per month.
          </Typography>

          <Box display="flex" justifyContent="space-between" mt={3}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!stripe || processing}
            >
              {processing ? <CircularProgress size={24} /> : `Pay $${amount.toFixed(2)}`}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </form>
  );
};

const PaymentForm = (props: PaymentFormProps) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default PaymentForm;
