// import { ChatInterface } from "@/components/ChatInterface";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Crown } from "lucide-react";
// import { useAuth } from "@/contexts/AuthContext";
// import { useSubscription } from "@/contexts/SubscriptionContext";

// const Dashboard = () => {
//   const { subscription } = useSubscription();
//   const planName = subscription?.planName || (subscription?.planId === 'free' ? 'Free' : 'Premium');
//   const isFree = subscription?.isFree ?? true;
//   const isActive = subscription?.isActive ?? true;
//   const messagesLimit = subscription?.maxMessages ?? (isFree ? 10 : -1);
//   const usedMessages = subscription?.usedMessages ?? 0;
//   const remaining = subscription?.remainingMessages ?? (isFree ? Math.max(0, (messagesLimit || 0) - usedMessages) : undefined);

//   return (
//     <div className=" h-[90vh] bg-background p-4  hidden md:flex">
//       {/* Plan Info Card */}
//       <div className="w-1/3 pr-4">
//         <Card className="h-full flex flex-col">
//           <CardHeader className="border-b">
//             <div className="flex items-center justify-between">
//               <CardTitle>Your Plan</CardTitle>
//               <Badge variant={isFree ? 'secondary' : 'default'} className="gap-1">
//                 <Crown className="w-3.5 h-3.5" />
//                 {planName}
//               </Badge>
//             </div>
//           </CardHeader>
//           <CardContent className="flex-1 p-6 space-y-4">
//             <div className="space-y-2">
//               <div className="flex justify-between text-sm">
//                 <span className="text-muted-foreground">Messages Used</span>
//                 <span>{isFree ? `${usedMessages}/${messagesLimit}` : 'Unlimited'}</span>
//               </div>
//               {isFree && (
//                 <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
//                   <div 
//                     className="h-full bg-primary rounded-full" 
//                     style={{ width: `${Math.min(100, (usedMessages / messagesLimit) * 100)}%` }}
//                   />
//                 </div>
//               )}
//             </div>
            
//             <div className="pt-4">
//               <Button 
//                 className="w-full" 
//                 onClick={() => window.location.href = isFree ? '/pricing' : '/profile?tab=subscription'}
//               >
//                 {isFree ? 'Upgrade Plan' : 'Manage Subscription'}
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
      
//       {/* Chat Interface */}
//       <div className="w-2/3">
//         <Card className="h-full flex flex-col">
//           <CardHeader className="border-b">
//             <CardTitle>Chat</CardTitle>
//           </CardHeader>
//           <CardContent className="flex-1 p-0 overflow-hidden">
//             {isFree && remaining !== undefined && remaining <= 0 ? (
//               <div className="h-full flex flex-col items-center justify-center p-6 text-center">
//                 <p className="text-muted-foreground mb-4">
//                   You've reached your message limit. Upgrade to continue chatting.
//                 </p>
//                 <Button onClick={() => window.location.href = '/pricing'}>
//                   Upgrade to Premium
//                 </Button>
//               </div>
//             ) : (
//               <div className="h-full">
//                 <ChatInterface />
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;
import { ChatInterface } from "@/components/ChatInterface";

const Dashboard = () => {
  return (
    <div className=" w-full bg-background flex flex-col">
      {/* Chat takes the whole screen */}
      <ChatInterface />
    </div>
  );
};

export default Dashboard;

