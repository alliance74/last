import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button-variants";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image, Copy, MessageSquare, Sparkles, Heart, Flame, Zap, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/config";
import { getAuthToken } from "@/services/auth.service";
import { ThreadList } from "./ThreadList";

interface Message {
  id: string;
  type: "user" | "ai";
  role?: "user" | "assistant";
  content: string | { content: string; [key: string]: any };
  timestamp: string;
  imageUrl?: string;
  [key: string]: any; // Allow additional properties
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; type: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [style, setStyle] = useState("Confident"); 
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // <-- for auto-scroll
  const { toast } = useToast();
  // Get thread ID from localStorage if it exists
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentThreadId');
    }
    return null;
  });
  const [showThreadList, setShowThreadList] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  // Update localStorage when threadId changes
  useEffect(() => {
    if (currentThreadId) {
      localStorage.setItem('currentThreadId', currentThreadId);
    } else {
      localStorage.removeItem('currentThreadId');
    }
  }, [currentThreadId]);

  const handleNewThread = async () => {
    try {
      setIsCreatingThread(true);
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/chat/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'New Chat' })
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      const data = await response.json();
      if (data.threadId) {
        setCurrentThreadId(data.threadId);
        setMessages([]);
        setShowThreadList(false);
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to create a new chat',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingThread(false);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    setCurrentThreadId(threadId);
    setShowThreadList(false);
  };

  const handleThreadDelete = async (threadId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/chat/threads/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete thread');
      }

      // If the deleted thread was the current one, clear messages
      if (currentThreadId === threadId) {
        setMessages([]);
        setCurrentThreadId(null);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw error;
    }
  };

  /** Helper to get or create a thread */
  const getOrCreateThread = async (token: string): Promise<string | null> => {
    try {
      // If we already have a thread ID, verify it exists
      if (currentThreadId) {
        try {
          const verifyResp = await fetch(`${API_URL}/chat/threads/${currentThreadId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (verifyResp.ok) {
            return currentThreadId;
          }
          // If verification fails, clear the invalid thread ID
          setCurrentThreadId(null);
        } catch (error) {
          console.error('Error verifying thread:', error);
          setCurrentThreadId(null);
        }
      }

      // Create a new thread
      const newThreadResp = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          message: 'New chat started',
          style: styleMap[style] || 'confident'
          // Don't include threadId to ensure a new thread is created
        })
      });

      if (newThreadResp.ok) {
        const newThreadData = await newThreadResp.json();
        if (newThreadData.threadId) {
          setCurrentThreadId(newThreadData.threadId);
          return newThreadData.threadId;
        }
      }

      throw new Error('Failed to create a new thread');
    } catch (error) {
      console.error('Error getting/creating thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize chat thread',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const styleMap: Record<string, string> = {
    Confident: "confident",
    Flirty: "flirty",
    Funny: "funny",
    Chill: "smooth",
  };

  const rizzStyles = [
    { name: "Confident", icon: Sparkles, color: "from-purple-500 to-pink-500" },
    { name: "Flirty", icon: Heart, color: "from-rose-500 to-red-500" },
    { name: "Funny", icon: Flame, color: "from-orange-500 to-yellow-500" },
    { name: "Chill", icon: Zap, color: "from-blue-500 to-cyan-500" },
  ];

  // Toggle thread list on mobile and handle keyboard shortcuts
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowThreadList(true);
      } else {
        setShowThreadList(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-scroll to bottom when messages change or thread changes
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Small timeout to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, currentThreadId]);

  // Add keyboard shortcut to focus the input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const input = document.querySelector('textarea');
        input?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentThreadId) return;
      
      try {
        setIsLoadingMessages(true);
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chat/threads/${currentThreadId}/messages`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // If the thread doesn't exist (e.g., brand new user or stale localStorage), treat it as empty state
        if (response.status === 404) {
          setMessages([]);
          return;
        }

        if (!response.ok) throw new Error('Failed to load messages');
        
        const data = await response.json();
        if (data.success && Array.isArray(data.messages)) {
          // Sort messages by timestamp and ensure user messages come before AI responses
          const formattedMessages = data.messages
            .map((msg: any) => ({
              id: msg.id,
              type: msg.role === 'user' ? 'user' : 'ai',
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp || new Date().toISOString(),
              // Add a sort key that ensures user messages come first when timestamps are close
              _sortKey: `${msg.timestamp}_${msg.role === 'user' ? '0' : '1'}`
            }))
            .sort((a, b) => a._sortKey.localeCompare(b._sortKey));
            
          // Remove the temporary sort key before setting state
          const cleanMessages = formattedMessages.map(({ _sortKey, ...rest }) => rest);
          setMessages(cleanMessages);
        } else {
          // No messages returned: benign empty state for brand new users
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // Suppress error toasts for benign scenarios (e.g., no history yet)
        const msg = (error as Error)?.message || '';
        if (msg.includes('THREAD_NOT_FOUND') || msg.includes('404')) {
          setMessages([]);
          return;
        }
        // Show toast for genuine errors only
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive'
        });
      }
      finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [currentThreadId]);

  /** Send message */
  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !imageData) || !currentThreadId) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: "user",
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    // Optimistically update UI with user message
    setMessages(prev => {
      // Create a new array with the new message and sort to maintain order
      const updated = [...prev, {
        ...userMessage,
        // Include image preview in the message if available
        ...(imagePreview && { imageUrl: imagePreview })
      }];
      return updated.sort((a, b) => {
        // If timestamps are the same, user messages come first
        if (a.timestamp === b.timestamp) {
          return a.role === 'user' ? -1 : 1;
        }
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
    });
    
    setInputMessage('');
    setImageData(null);
    setImagePreview(null);
    
    setIsLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Prepare the message payload with the thread ID
      const payload: any = { 
        message: inputMessage,
        style: styleMap[style] || 'confident',
        threadId: currentThreadId,
        ...(imageData?.base64 && { 
          imageBase64: imageData.base64, 
          imageType: imageData.type 
        }) 
      };

      // Send the message
      const resp = await fetch(`${API_URL}/chat/send`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await resp.json();
      
      // Add AI response to messages
      if (data.success && data.response) {
        const aiMessage: Message = {
          id: data.response.id || `msg-${Date.now()}`,
          type: "ai",
          role: "assistant",
          content: data.response.content || data.response,
          timestamp: data.response.timestamp || new Date().toISOString(),
        };
        
        // Update messages with the AI response, ensuring proper order
        setMessages(prev => {
          // Create a new array with the AI message and sort to maintain order
          const updated = [...prev, aiMessage];
          return updated.sort((a, b) => {
            // If timestamps are the same, user messages come first
            if (a.timestamp === b.timestamp) {
              return a.role === 'user' ? -1 : 1;
            }
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          });
        });
        
        // Update thread ID if this is a new thread
        if (data.threadId && data.threadId !== currentThreadId) {
          setCurrentThreadId(data.threadId);
        }
      } else {
        throw new Error(data.message || 'Failed to get response from server');
      }
    } catch (e: any) {
      console.error("Send message error:", e);
      toast({ title: "Error", description: e.message || "Unexpected error", variant: "destructive" });
    } finally {
      setInputMessage("");
      setImageData(null);
      setImagePreview(null);
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Response copied to clipboard" });
  };

  const onUploadClick = () => fileInputRef.current?.click();
  
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract base64 data without the data URL prefix
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type and size (max 20MB for GPT-4 Vision)
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload an image file (JPEG, PNG, GIF, WEBP)", 
        variant: "destructive" 
      });
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      toast({ 
        title: "File too large", 
        description: "Maximum image size is 20MB", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      setUploadingImage(true);
      const base64 = await toBase64(file);
      setImageData({ base64, type: file.type });
      setImagePreview(URL.createObjectURL(file));
    } catch (error) {
      console.error('Error processing image:', error);
      toast({ 
        title: "Error", 
        description: "Failed to process image", 
        variant: "destructive" 
      });
    } finally {
      setUploadingImage(false);
      // Reset the file input
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="flex w-full h-[90vh] relative overflow-hidden">
      {/* Thread List Sidebar */}
      <div className={`absolute inset-y-0 left-0 z-20 w-64 bg-background transition-transform duration-300 ease-in-out transform ${
        showThreadList ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0 border-r`}>
        <ThreadList 
          currentThreadId={currentThreadId}
          onThreadSelect={handleThreadSelect}
          onNewThread={handleNewThread}
          onThreadDelete={handleThreadDelete}
          isCreatingThread={isCreatingThread}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-gray-900">
        
        {/* Mobile menu button */}
        <button 
          onClick={() => setShowThreadList(!showThreadList)}
          className="md:hidden absolute top-4 left-4 z-10 p-2 rounded-md text-white bg-black/20 hover:bg-black/30"
        >
          <Menu className="h-5 w-5" />
        </button>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
        {isLoading || isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-center space-y-2">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} p-3 rounded-lg max-w-[85%]`}>
                {msg.imageUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    <img 
                      src={msg.imageUrl} 
                      alt="Uploaded content" 
                      className="max-w-full max-h-64 object-contain rounded"
                    />
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="text-xs font-medium mb-1 text-blue-600 dark:text-blue-400">
                    {style} Style
                  </div>
                )}
                <div className="break-words text-base">
                  {typeof msg.content === 'string' ? msg.content : msg.content?.content || ''}
                </div>
                {msg.role === 'assistant' && (
                  <div className="mt-2 flex justify-end">
                    <button 
                      onClick={() => copyToClipboard(typeof msg.content === 'string' ? msg.content : msg.content?.content || '')}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Copy message"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2 relative z-10 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
        {isLoading && (
          <div className="absolute -top-6 left-0 right-0 flex justify-center">
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-3 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              AI is typing...
            </div>
          </div>
        )}
        <Textarea
          placeholder={`Message in ${style} style...`}
          value={inputMessage}
          disabled={isLoading}
          onChange={(e) => setInputMessage(e.target.value)}
          className="min-h-[80px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none rounded-lg p-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading) { e.preventDefault(); handleSendMessage(); } }}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <Button variant="ghost" size="sm" className="text-white/70" onClick={onUploadClick}>
              <Image className="w-4 h-4 mr-2" /> {imagePreview ? "Change Image" : "Upload Image"}
            </Button>
            {imagePreview && <img src={imagePreview} alt="preview" className="h-10 w-10 rounded object-cover border border-border/40" />}
          </div>

          <Button 
            onClick={handleSendMessage} 
            disabled={(!inputMessage.trim() && !imageData) || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Send
              </>
            )}
          </Button>
        </div>

        {/* Rizz Style Buttons */}
        <div className="flex gap-2 mt-2">
          {rizzStyles.map((s) => {
            const Icon = s.icon;
            const isActive = style === s.name;
            return (
              <button
                key={s.name}
                onClick={() => setStyle(s.name)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition
                  ${isActive ? `bg-gradient-to-r ${s.color} text-white shadow` : "bg-muted text-foreground hover:bg-muted/70"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {s.name}
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};
