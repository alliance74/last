

// import { Button } from "@/components/ui/button-variants";
// import { ArrowRight } from "lucide-react";
// import { useAuth } from "@/contexts/AuthContext";
// import { useNavigate } from "react-router-dom";
// import { useToast } from "@/components/ui/use-toast";
// import { useState } from "react";

// interface HeroSectionProps {
//   onGetStarted?: () => void;
// }

// export const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
//   const { currentUser } = useAuth();
//   const navigate = useNavigate();
//   const { toast } = useToast();
//   const [loading, setLoading] = useState(false);

//   const handleGetStarted = async () => {
//     setLoading(true);
//     try {
//       if (currentUser) {
//         navigate("/dashboard");
//       } else {
//         navigate("/login");
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to redirect. Please try again.",
//         variant: "destructive",
//       });
//       console.error("Redirection error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <section className="flex flex-col items-center justify-center min-h-screen px-4 py-8 text-center bg-black-dark-gradient text-white">
//       <div className="flex flex-col items-center gap-6 p-8 rounded-lg">
//         {/* App Icon */}
//         <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             viewBox="0 0 24 24"
//             fill="white"
//             className="w-12 h-12"
//           >
//             <path
//               fillRule="evenodd"
//               d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.237-2.779-1.643V5.653Z"
//               clipRule="evenodd"
//             />
//           </svg>
//         </div>

//         {/* Title */}
//         <div className="flex flex-col items-center gap-2">
//           <h1 className="text-4xl font-bold">RizzChat Pro</h1>
//           <p className="text-sm text-gray-400">AI-Powered Conversation Assistant</p>
//         </div>

//         {/* Stats */}
//         <div className="flex justify-center gap-8 mt-4">
//           <div className="flex flex-col items-center">
//             <span className="text-xl font-bold">50K+</span>
//             <span className="text-sm text-gray-400">users</span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="text-xl font-bold">98%</span>
//             <span className="text-sm text-gray-400">success rate</span>
//           </div>
//           <div className="flex flex-col items-center">
//             <span className="text-xl font-bold">1M+</span>
//             <span className="text-sm text-gray-400">messages sent</span>
//           </div>
//         </div>

//         {/* Get Started Button */}
//         <div className="mt-8 w-full">
//           <Button
//             variant="hero"
//             size="xl"
//             className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
//             onClick={onGetStarted ? onGetStarted : handleGetStarted}
//             disabled={loading}
//           >
//             {loading ? "Redirecting..." : "Get Started"}
//             <ArrowRight className="w-5 h-5 ml-2" />
//           </Button>
//         </div>
//       </div>
//     </section>
//   );
// };
import React, { useState, useEffect } from "react";
import { MessageCircle, Users, TrendingUp, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button-variants";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const phraseLines = ["RizzChat", "AI-powered Conversation Assistant"];

const typingSpeed = 200; // slow typing for title
const subtitleTypingSpeed = 100; // faster typing for subtitle
const pauseBetweenLines = 500;
const pauseAfterPhrase = 2000;

export const HeroSection = ({ onGetStarted }: { onGetStarted?: () => void }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(["", ""]);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const speed = lineIndex === 0 ? typingSpeed : subtitleTypingSpeed;

    if (isTyping) {
      if (charIndex < phraseLines[lineIndex].length) {
        timeoutId = setTimeout(() => {
          setDisplayedText((prev) => {
            const newText = [...prev];
            newText[lineIndex] = phraseLines[lineIndex].slice(0, charIndex + 1);
            return newText;
          });
          setCharIndex((prev) => prev + 1);
        }, speed);
      } else {
        if (lineIndex < phraseLines.length - 1) {
          setTimeout(() => {
            setLineIndex((prev) => prev + 1);
            setCharIndex(0);
          }, pauseBetweenLines);
        } else {
          setTimeout(() => setIsTyping(false), pauseAfterPhrase);
        }
      }
    }

    return () => clearTimeout(timeoutId);
  }, [isTyping, lineIndex, charIndex]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      if (currentUser) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to redirect. Please try again.",
        variant: "destructive",
      });
      console.error("Redirection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cursorStyle = `inline-block w-[3px] h-[1em] bg-[#ccffff] ml-1 align-baseline transition-opacity duration-100 ${
    showCursor ? "opacity-100" : "opacity-0"
  }`;

  return (
    <section className="min-h-screen relative flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-[#1a0a1f] to-[#1a0a1f]"></div>
      <div className="absolute inset-0 top-1/2 bg-gradient-to-b from-transparent to-black/95"></div>

      {/* Floating icons */}
      <div className="absolute inset-0 opacity-10">
        <MessageCircle className="absolute top-20 left-10 w-8 h-8 text-white/30 rotate-12" />
        <MessageSquare className="absolute top-32 right-16 w-6 h-6 text-white/20 -rotate-6" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* App Icon */}
        <div className="mb-8 animate-pulse-slow">
          <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Typing Title */}
        <h1 className="text-5xl md:text-6xl font-bold mb-3 text-center">
          {displayedText[0]}
          {lineIndex === 0 && isTyping && <span className={cursorStyle} />}
        </h1>

        {/* Typing Subtitle */}
        <p className="text-xl md:text-2xl italic text-center mb-12">
          {displayedText[1]}
          {lineIndex === 1 && isTyping && <span className={cursorStyle} />}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-12 w-full max-w-md">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30">
            <Users className="w-7 h-7 text-pink-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">5K+</div>
            <div className="text-sm text-gray-200">Users</div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30">
            <TrendingUp className="w-7 h-7 text-pink-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">98%</div>
            <div className="text-sm text-gray-200">Success Rate</div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30">
            <MessageSquare className="w-7 h-7 text-pink-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">1M+</div>
            <div className="text-sm text-gray-200">Messages</div>
          </div>
        </div>

        {/* Get Started Button */}
        <Button
          variant="hero"
          size="xl"
          className="w-full max-w-xs bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center"
          onClick={onGetStarted ? onGetStarted : handleGetStarted}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Get Started"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      <style>
        {`
          @keyframes pulse-slow {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 2.5s ease-in-out infinite;
          }
        `}
      </style>
    </section>
  );
};
