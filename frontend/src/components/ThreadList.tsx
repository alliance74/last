import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { API_URL } from '@/config';
import { getAuthToken } from '@/services/auth.service';
import { useToast } from '@/hooks/use-toast';

// Helper function to safely format dates with full date and time
const formatDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Format as: MMM D, YYYY, HH:MM AM/PM
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

interface ThreadListProps {
  currentThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => Promise<void>;
  onThreadDelete: (threadId: string) => Promise<void>;
  isCreatingThread: boolean;
}

export const ThreadList = ({ 
  currentThreadId, 
  onThreadSelect, 
  onNewThread, 
  onThreadDelete, 
  isCreatingThread 
}: ThreadListProps) => {
  const [deletingThread, setDeletingThread] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      setDeletingThread(threadId);
      try {
        await onThreadDelete(threadId);
        // Remove the deleted thread from the list
        setThreads(prev => prev.filter(t => t.id !== threadId));
        toast({
          title: 'Success',
          description: 'Chat deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting thread:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete chat',
          variant: 'destructive',
        });
      } finally {
        setDeletingThread(null);
      }
    }
  };

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/chat/threads`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to load threads');
        
        const data = await response.json();
        if (data.success && Array.isArray(data.threads)) {
          setThreads(data.threads);
        } else {
          // No threads yet (brand new user) — benign empty state
          setThreads([]);
        }
      } catch (error) {
        console.error('Error fetching threads:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat threads',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, [toast, currentThreadId, isCreatingThread]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button 
          onClick={onNewThread}
          className="w-full justify-start gap-2"
          variant="outline"
          disabled={isCreatingThread}
        >
          {isCreatingThread ? (
            <>
              <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              New Chat
            </>
          )}
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {threads.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground p-4">
            No chat history
          </div>
        ) : (
          <div className="space-y-1">
            {threads.map((thread) => (
              <div 
                key={thread.id}
                onClick={() => onThreadSelect(thread.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer ${currentThreadId === thread.id ? 'bg-accent' : 'hover:bg-muted'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate pr-2">{thread.title}</p>
                    {deletingThread === thread.id ? (
                      <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate" title={new Date(thread.updatedAt).toLocaleString()}>
                    {formatDate(thread.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
