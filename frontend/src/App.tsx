import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";
import { checkStripeRedirect } from "@/services/subscription.service";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import  Referrals  from "./pages/Referrals";
import Profile from "./pages/Profile";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
// import { ReferralPage } from "./pages/ReferralPage";
import ReferralRedirect from "./pages/ReferralRedirect";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check for Stripe redirect when component mounts
  useEffect(() => {
    const checkRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        try {
          const success = await checkStripeRedirect();
          if (success) {
            // Refresh user data after successful subscription
            window.location.href = '/profile?tab=subscription';
          }
        } catch (error) {
          console.error('Error handling Stripe redirect:', error);
        }
      }
    };

    checkRedirect();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Layout without footer for Dashboard
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  // Check for Stripe redirect on initial load
  useEffect(() => {
    const checkRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        try {
          const success = await checkStripeRedirect();
          if (success) {
            // Redirect to profile page after successful subscription
            window.location.href = '/profile?tab=subscription';
          }
        } catch (error) {
          console.error('Error handling Stripe redirect:', error);
        }
      }
    };

    checkRedirect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pt-16">
        {children}
      </main>
    </div>
  );
};

// Main Layout Component with footer
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  // Check for Stripe redirect on initial load
  useEffect(() => {
    const checkRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        try {
          const success = await checkStripeRedirect();
          if (success) {
            // Redirect to profile page after successful subscription
            window.location.href = '/profile?tab=subscription';
          }
        } catch (error) {
          console.error('Error handling Stripe redirect:', error);
        }
      }
    };

    checkRedirect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};

const queryClient = new QueryClient();

// App Routes Component
const AppRoutes = () => (
  <Routes>
    {/* Pretty referral link -> redirects to /signup?ref=... */}
    <Route path="/r/:code" element={<ReferralRedirect />} />
    {/* Public Routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    
    {/* Protected Routes */}
    <Route path="/" element={
      <MainLayout>
        <Index />
      </MainLayout>
    } />
    
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/pricing" element={
      <MainLayout>
        <Pricing />
      </MainLayout>
    } />
    
    <Route path="/referrals" element={
      <ProtectedRoute>
        <MainLayout>
          <Referrals />
        </MainLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/profile" element={
      <ProtectedRoute>
        <MainLayout>
          <Profile />
        </MainLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/success" element={
      <MainLayout>
        <Success />
      </MainLayout>
    } />
    
    {/* 404 - Not Found */}
    <Route path="*" element={
      <MainLayout>
        <NotFound />
      </MainLayout>
    } />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
