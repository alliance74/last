import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { currentUser, loading, initialAuthCheckComplete } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth state
  if (loading || !initialAuthCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!currentUser) {
    // Only redirect if we're not already on the login page to prevent infinite loops
    if (location.pathname !== '/login') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return null;
  }

  // If authenticated, render the protected content
  return children;
}
