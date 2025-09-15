import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { usePayment, PaymentProvider } from '@/contexts/PaymentProvider';
import PaymentMethodForm from '@/components/payment/PaymentMethodForm';
import { SubscriptionPlan, getSubscriptionPlans } from '@/services/subscription.service';

const SubscriptionPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { paymentMethods, getPaymentMethods, loading, error } = usePayment();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch subscription plans and payment methods
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [plansData] = await Promise.all([
          getSubscriptionPlans(),
          getPaymentMethods(),
        ]);
        setPlans(plansData.plans || []);
      } catch (err) {
        setApiError('Failed to load subscription data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, [currentUser, getPaymentMethods]);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSuccessMessage('Payment method added successfully!');
    getPaymentMethods();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleClosePaymentForm = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || apiError) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error || apiError}
      </Alert>
    );
  }

  return (
    <Box sx={{ py: 4, maxWidth: 1200, mx: 'auto', px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Subscription Management
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Current Plan */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Plan
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {currentUser?.subscription ? (
                <Box>
                  <Typography variant="h5">{currentUser.subscription.planName}</Typography>
                  <Typography color="textSecondary" gutterBottom>
                    ${currentUser.subscription.price}/{currentUser.subscription.billingCycle}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Status: {currentUser.subscription.status}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Next Billing Date: {new Date(currentUser.subscription.currentPeriodEnd).toLocaleDateString()}
                  </Typography>
                  <Box mt={2}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => setShowPaymentForm(true)}
                      startIcon={<AddIcon />}
                    >
                      Change Payment Method
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography>No active subscription</Typography>
              )}
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Available Plans
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {plans.map((plan) => (
                <Grid item xs={12} md={6} key={plan.id}>
                  <Card
                    variant={currentUser?.subscription?.planId === plan.id ? 'outlined' : 'elevation'}
                    sx={{
                      height: '100%',
                      borderColor: 'primary.main',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {plan.name}
                      </Typography>
                      <Typography variant="h5" color="primary" gutterBottom>
                        ${plan.price}/{plan.billingCycle}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {plan.description}
                      </Typography>
                      <List dense>
                        {plan.features.map((feature, index) => (
                          <ListItem key={index} disableGutters>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={feature} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                    <CardActions>
                      <Button
                        fullWidth
                        variant={currentUser?.subscription?.planId === plan.id ? 'outlined' : 'contained'}
                        color="primary"
                        onClick={() => handlePlanSelect(plan)}
                        disabled={currentUser?.subscription?.planId === plan.id}
                      >
                        {currentUser?.subscription?.planId === plan.id ? 'Current Plan' : 'Select Plan'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>

        {/* Payment Methods */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Payment Methods</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowPaymentForm(true)}
                >
                  Add
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box display="flex" justifyContent="center">
                  <CircularProgress size={24} />
                </Box>
              ) : paymentMethods.length > 0 ? (
                <List>
                  {paymentMethods.map((method) => (
                    <ListItem
                      key={method.id}
                      secondaryAction={
                        <IconButton edge="end" aria-label="delete">
                          <CancelIcon color="error" />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <CreditCardIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`•••• •••• •••• ${method.card.last4}`}
                        secondary={`${method.card.brand} - Expires ${method.card.exp_month}/${method.card.exp_year}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No payment methods found
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Method Dialog */}
      <Dialog
        open={showPaymentForm}
        onClose={handleClosePaymentForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedPlan ? `Subscribe to ${selectedPlan.name}` : 'Add Payment Method'}
        </DialogTitle>
        <DialogContent>
          <PaymentMethodForm
            onSuccess={handlePaymentSuccess}
            onCancel={handleClosePaymentForm}
            submitButtonText={selectedPlan ? 'Subscribe' : 'Add Payment Method'}
            amount={selectedPlan?.price}
            planId={selectedPlan?.id}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Wrap with PaymentProvider to ensure Stripe Elements is available
const SubscriptionPageWithProvider: React.FC = () => (
  <PaymentProvider stripeKey={import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''}>
    <SubscriptionPage />
  </PaymentProvider>
);

export default SubscriptionPageWithProvider;
