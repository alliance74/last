import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Heart } from 'lucide-react';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  // If a referral code is in the URL, enable using it by default
  const [useUrlReferral, setUseUrlReferral] = useState<boolean>(true);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = location.state?.from?.pathname || '/';
  const referredBy = new URLSearchParams(location.search).get('ref') || undefined;
  const storedRef = (() => {
    try {
      return localStorage.getItem('pendingRef') || undefined;
    } catch {
      return undefined;
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !displayName) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      // Use the manually entered referral code if provided. If user dismissed URL referral, don't send it.
      const effectiveUrlRef = referredBy || storedRef;
      const finalReferralCode = referralCode || (useUrlReferral ? effectiveUrlRef : undefined);
      await signup(email, password, displayName, finalReferralCode);
      toast({
        title: '🎉 Account Created!',
        description: 'Welcome to our platform! Redirecting you to your dashboard...',
        className: 'bg-green-100 border-green-400 text-green-700',
      });
      
      // Clear any stored pending referral after successful signup
      try { localStorage.removeItem('pendingRef'); } catch {}

      // Add a slight delay for better UX
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" 
      style={{ background: 'linear-gradient(to right, #4B0082, #1A0A26)' }}
    >
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(to right, rgba(57,28,95,255) 0%, #0e121a',
        }}
      ></div>

      <div className="flex flex-col items-center justify-center mb-8 z-10 space-y-2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-700 to-purple-950 flex items-center justify-center shadow-lg">
          <Heart className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-white text-xl font-semibold">Welcome to RizzChat</h2>
      </div>

      <div className="w-full max-w-md space-y-8 z-10 bg-background/50 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#7e468a]">Create an account</h1>
          <p className="text-gray-300 mt-2">Join our community of AI enthusiasts</p>
        </div>
          {(referredBy || storedRef) && useUrlReferral && (
            <div className="mb-4 rounded-md border border-primary/20 bg-primary/10 text-primary px-3 py-2 text-sm flex items-center justify-between">
              <div>
                Using referral code: <span className="font-mono font-semibold">{referredBy || storedRef}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs underline hover:no-underline"
                  onClick={() => setReferralCode((referredBy || storedRef) || '')}
                >
                  Use as input
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:no-underline"
                  onClick={() => setUseUrlReferral(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 bg-white text-black border-gray-700 h-10"
              />
            </div>
            <div>
              <Label htmlFor="displayName" className="text-white">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="mt-1 bg-white text-black border-gray-700 h-10"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 bg-white text-black border-gray-700 h-10"
              />
              <p className="text-xs text-gray-400 mt-1">
                Must be at least 8 characters
              </p>
            </div>
            <div>
              <Label htmlFor="referralCode" className="text-white">Referral Code (optional)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter referral code if any"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="mt-1 bg-white text-black border-gray-700 h-10"
              />
              {(referredBy || storedRef) && !referralCode && useUrlReferral && (
                <p className="text-xs text-gray-400 mt-1">Auto-applied from your invite link</p>
              )}
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-[#cc4583] hover:bg-purple-700 text-white h-10" 
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
          
          <div className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-purple-400 hover:underline"
              state={{ from: location.state?.from }}
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
