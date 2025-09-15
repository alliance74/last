import { useState } from 'react';
import { Box, Button, Card, CardContent, Typography, Grid, Divider, CircularProgress } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import PaymentForm from '../payment/PaymentForm';

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  features: string[];
  credits: number;
  limits: {
    messages: number;
    files: number;
  };
  popular?: boolean;
}

interface PlanSelectionProps {
  plans: Plan[];
  currentPlanId?: string;
  loading?: boolean;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ plans, currentPlanId, loading }) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
    // You might want to refresh subscription data here
    window.location.reload();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (showPaymentForm && selectedPlan) {
    return (
      <Box my={4}>
        <Button 
          variant="text" 
          onClick={() => setShowPaymentForm(false)}
          sx={{ mb: 2 }}
        >
          ← Back to plans
        </Button>
        <PaymentForm
          planId={selectedPlan.id}
          amount={selectedPlan.price}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentForm(false)}
        />
      </Box>
    );
  }

  return (
    <Grid container spacing={3} justifyContent="center" my={4}>
      {plans.map((plan) => {
        const isCurrentPlan = currentPlanId === plan.id;
        const isUpgrade = currentPlanId && 
          plans.findIndex(p => p.id === currentPlanId) < plans.findIndex(p => p.id === plan.id);
        
        return (
          <Grid item xs={12} md={4} key={plan.id}>
            <Card 
              variant={plan.popular ? 'elevation' : 'outlined'}
              elevation={plan.popular ? 3 : 0}
              sx={{
                height: '100%',
                border: plan.popular ? '2px solid' : '1px solid',
                borderColor: plan.popular ? 'primary.main' : 'divider',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {plan.popular && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
                >
                  Most Popular
                </Box>
              )}
              
              <CardContent sx={{ pt: plan.popular ? 4 : 2 }}>
                <Typography variant="h5" component="h3" gutterBottom>
                  {plan.name}
                </Typography>
                
                <Box display="flex" alignItems="baseline" mb={2}>
                  <Typography variant="h4" component="div" color="primary">
                    ${plan.price}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" ml={1}>
                    /{plan.billingCycle}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" mb={3}>
                  {plan.credits} credits included
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box mb={3}>
                  {plan.features.map((feature, index) => (
                    <Box key={index} display="flex" alignItems="center" mb={1}>
                      <CheckCircle color="primary" fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">{feature}</Typography>
                    </Box>
                  ))}
                </Box>

                <Box mt="auto">
                  {isCurrentPlan ? (
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant={plan.popular ? 'contained' : 'outlined'}
                      onClick={() => handlePlanSelect(plan)}
                      disabled={!isUpgrade && !!currentPlanId}
                    >
                      {isUpgrade ? 'Upgrade' : currentPlanId ? 'Downgrade' : 'Get Started'}
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default PlanSelection;
