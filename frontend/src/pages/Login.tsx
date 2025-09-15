// import { useState } from 'react';
// import { useNavigate, Link, useLocation } from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { useToast } from '@/components/ui/use-toast';

// export function Login() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { toast } = useToast();
//   const from = location.state?.from?.pathname || '/';

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!email || !password) {
//       toast({
//         title: 'Error',
//         description: 'Please enter both email and password',
//         variant: 'destructive',
//       });
//       return;
//     }

//     try {
//       setLoading(true);
//       const response = await login(email, password);
      
//       if (response && response.user) {
//         toast({
//           title: 'Success',
//           description: 'You have been logged in successfully!',
//         });
//         // Redirect to the intended page or home
//         navigate(from === '/login' ? '/' : from, { replace: true });
//       } else {
//         throw new Error('Invalid response from server');
//       }
//     } catch (error) {
//       console.error('Login error:', error);
//       let errorMessage = 'Failed to log in. Please check your credentials.';
      
//       if (error instanceof Error) {
//         if (error.message.includes('auth/user-not-found') || 
//             error.message.includes('auth/wrong-password')) {
//           errorMessage = 'Invalid email or password';
//         } else if (error.message.includes('auth/too-many-requests')) {
//           errorMessage = 'Too many failed attempts. Please try again later.';
//         } else {
//           errorMessage = error.message;
//         }
//       }
      
//       toast({
//         title: 'Error',
//         description: errorMessage,
//         variant: 'destructive',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background p-4">
//       <div className="w-full max-w-md space-y-8">
//         <div className="text-center">
//           <h1 className="text-3xl font-bold">Welcome back</h1>
//           <p className="text-muted-foreground mt-2">Enter your credentials to access your account</p>
//         </div>
        
//         <form className="space-y-6" onSubmit={handleSubmit}>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="name@example.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 disabled={loading}
//                 className="mt-1"
//                 required
//               />
//             </div>
            
//             <div>
//               <div className="flex items-center justify-between">
//                 <Label htmlFor="password">Password</Label>
//                 <Link 
//                   to="/forgot-password" 
//                   className="text-sm font-medium text-primary hover:underline"
//                 >
//                   Forgot password?
//                 </Link>
//               </div>
//               <Input
//                 id="password"
//                 type="password"
//                 placeholder="••••••••"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 disabled={loading}
//                 className="mt-1"
//                 required
//               />
//             </div>
//           </div>
          
//           <Button 
//             type="submit" 
//             className="w-full" 
//             disabled={loading}
//           >
//             {loading ? 'Signing in...' : 'Sign in'}
//           </Button>
          
//           <div className="text-center text-sm">
//             Don't have an account?{' '}
//             <Link 
//               to="/signup" 
//               className="font-medium text-primary hover:underline"
//               state={{ from: location.state?.from }}
//             >
//               Sign up
//             </Link>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }





import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Heart } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await login(email, password);
      
      if (response && response.user) {
        toast({
          title: 'Success',
          description: 'You have been logged in successfully!',
        });
        navigate(from === '/login' ? '/' : from, { replace: true });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to log in. Please check your credentials.';
      
      if (error instanceof Error) {
        if (error.message.includes('auth/user-not-found') || 
            error.message.includes('auth/wrong-password')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('auth/too-many-requests')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
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
        <h2 className="text-white text-xl font-semibold">RizzChat</h2>
      </div>

      <div className="w-full max-w-md space-y-8 z-10 bg-background/50 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-800">
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#7e468a]">Welcome back</h1>
          <p className="text-gray-300 mt-2">Enter your credentials to access your account</p>
        </div>
        
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
                disabled={loading}
                className="mt-1 bg-white text-black border-gray-700"
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white">Password</Label>
               
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="mt-1 bg-white text-black border-gray-700"
                required
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-[#cc4583] hover:bg-purple-700 text-white" 
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          
          <div className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="font-medium text-purple-400 hover:underline"
              state={{ from: location.state?.from }}
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}