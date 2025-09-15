import React, { useState, useEffect } from 'react';
import {
  CardElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  Paper,
} from '@mui/material';
import { usePayment } from '@/contexts/PaymentProvider';

interface PaymentMethodFormProps {
  onSuccess?: (paymentMethod: any) => void;
  onCancel?: () => void;
  submitButtonText?: string;
  showCancelButton?: boolean;
  amount?: number;
  planId?: string;
}

const StripePaymentForm: React.FC<PaymentMethodFormProps> = ({
  onSuccess,
  onCancel,
  submitButtonText = 'Add Payment Method',
  showCancelButton = true,
  amount,
  planId,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { addPaymentMethod, createPaymentIntent, isProcessing } = usePayment();
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (planId && amount) {
      const createIntent = async () => {
        try {
          const intent = await createPaymentIntent(planId);
          setClientSecret(intent.clientSecret);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create payment intent');
        }
      };
      createIntent();
    }
  }, [planId, amount, createPaymentIntent]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (planId && clientSecret) {
        // Handle subscription payment
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: elements.getElement(CardElement)!,
              billing_details: {
                name,
                email,
              },
            },
          }
        );

        if (stripeError) {
          throw new Error(stripeError.message || 'Payment failed');
        }

        if (paymentIntent.status === 'succeeded') {
          setSucceeded(true);
          onSuccess?.(paymentIntent);
        }
      } else {
        // Handle adding payment method only
        const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: elements.getElement(CardElement)!,
          billing_details: {
            name,
            email,
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message || 'Failed to create payment method');
        }

        const newPaymentMethod = await addPaymentMethod(paymentMethod.id);
        setSucceeded(true);
        onSuccess?.(newPaymentMethod);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="h6" color="primary" gutterBottom>
          Success!
        </Typography>
        <Typography variant="body1">
          Your payment method has been added successfully.
        </Typography>
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Paper elevation={2} sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name on Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Card Details
            </Typography>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
              }}
            >
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
          </Grid>
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          {amount && (
            <Grid item xs={12}>
              <Typography variant="h6" align="right">
                Total: ${amount.toFixed(2)}
              </Typography>
            </Grid>
          )}
          <Grid item xs={12} container justifyContent="flex-end" spacing={2}>
            {showCancelButton && (
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={processing || isProcessing}
                >
                  Cancel
                </Button>
              </Grid>
            )}
            <Grid item>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!stripe || processing || isProcessing}
                startIcon={processing || isProcessing ? <CircularProgress size={20} /> : null}
              >
                {processing || isProcessing ? 'Processing...' : submitButtonText}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </form>
  );
};

// Wrap with Elements provider
const PaymentMethodForm: React.FC<PaymentMethodFormProps> = (props) => {
  return (
    <Elements stripe={null}>
      <StripePaymentForm {...props} />
    </Elements>
  );
};

export default PaymentMethodForm;
