'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type FileAttachment = {
  file: File;
  preview?: string;
  type: 'image' | 'pdf' | 'text' | 'unknown';
};

type Message = {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
  fileAttachment?: {
    fileName: string;
    fileType: string;
    fileUrl?: string;
    preview?: string;
  };
};

type PendingAnalysis = {
  suggestions: any[];
  summary: string;
  itemCount: number;
};

const QUICK_SUGGESTIONS = [
  'Show my system status',
  'Create a new battlefront',
  'List my missions',
  'Help me plan my week',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
];

export function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pendingFile, setPendingFile] = useState<FileAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0 && user) {
      loadOrCreateConversation();
    }
  }, [isOpen, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOrCreateConversation = async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const { data: existingConversations, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let currentConversationId: string;

      if (existingConversations) {
        currentConversationId = existingConversations.id;
        setConversationId(currentConversationId);
        await loadMessages(currentConversationId);
      } else {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title: 'New Conversation',
          })
          .select()
          .single();

        if (createError) throw createError;

        currentConversationId = newConversation.id;
        setConversationId(currentConversationId);

        const welcomeMessage: Message = {
          role: 'assistant',
          content: `Hey! I'm your GOS Commander - think of me as your personal strategic coach.\n\nI'm here to help you win at life by:\n- Organizing your goals into battlefronts\n- Breaking down big objectives into missions\n- Planning your time strategically\n- Tracking what's working (and what's not)\n\nYou can also **upload files** (screenshots, PDFs, task lists) and I'll help you turn them into actionable missions!\n\nWhat's on your mind?`,
          timestamp: new Date(),
        };

        await saveMessage(currentConversationId, welcomeMessage);
        setMessages([welcomeMessage]);
      }
    } catch (error: any) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation history');

      const fallbackMessage: Message = {
        role: 'assistant',
        content: `Hey! I'm your GOS Commander.\n\nI'm here to help you organize your goals, plan strategically, and execute with confidence.\n\nYou can upload files and I'll analyze them for tasks!\n\nWhat's on your mind?`,
        timestamp: new Date(),
      };
      setMessages([fallbackMessage]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (messagesData && messagesData.length > 0) {
        const loadedMessages: Message[] = messagesData.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.metadata,
          fileAttachment: msg.metadata?.fileAttachment,
        }));
        setMessages(loadedMessages);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
    }
  };

  const saveMessage = async (convId: string, message: Message) => {
    if (!user) return;

    try {
      await supabase.from('messages').insert({
        conversation_id: convId,
        user_id: user.id,
        role: message.role,
        content: message.content,
        metadata: {
          ...message.metadata,
          fileAttachment: message.fileAttachment,
        },
      });
    } catch (error: any) {
      console.error('Failed to save message:', error);
    }
  };

  const getFileType = (mimeType: string): 'image' | 'pdf' | 'text' | 'unknown' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'text/plain') return 'text';
    return 'unknown';
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Use PNG, JPG, PDF, or TXT files.');
      return;
    }

    const fileType = getFileType(file.type);
    let preview: string | undefined;

    if (fileType === 'image') {
      preview = URL.createObjectURL(file);
    }

    setPendingFile({ file, preview, type: fileType });
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const removePendingFile = () => {
    if (pendingFile?.preview) {
      URL.revokeObjectURL(pendingFile.preview);
    }
    setPendingFile(null);
  };

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim();
    if ((!content && !pendingFile) || isLoading || !user) return;

    let currentConvId = conversationId;

    if (!currentConvId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: 'New Conversation' })
        .select()
        .single();

      if (newConv) {
        currentConvId = newConv.id;
        setConversationId(currentConvId);
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: content || (pendingFile ? `Uploaded: ${pendingFile.file.name}` : ''),
      timestamp: new Date(),
      fileAttachment: pendingFile
        ? {
            fileName: pendingFile.file.name,
            fileType: pendingFile.file.type,
            preview: pendingFile.preview,
          }
        : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (currentConvId) {
      await saveMessage(currentConvId, userMessage);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      let response;

      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile.file);
        if (currentConvId) {
          formData.append('conversationId', currentConvId);
        }

        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        });

        removePendingFile();
      } else {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userId: user.id,
            conversationId: currentConvId,
            pendingAnalysis: pendingAnalysis,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.error || 'Request failed');
      }

      const data = await response.json();

      if (data.pendingAnalysis) {
        setPendingAnalysis(data.pendingAnalysis);
      } else if (data.pendingAnalysis === null) {
        setPendingAnalysis(null);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        metadata: data.analysis ? { analysis: data.analysis } : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (currentConvId) {
        await saveMessage(currentConvId, assistantMessage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to get response');
      const errorMessage: Message = {
        role: 'assistant',
        content: `I encountered an issue: ${error.message || 'Failed to get response'}\n\nPlease try again or rephrase your request.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const FileIconComponent = ({ type }: { type: 'image' | 'pdf' | 'text' | 'unknown' }) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Open GOS Commander"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] h-[680px] max-h-[calc(100vh-3rem)] flex flex-col">
      <Card
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden rounded-2xl relative"
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-blue-500 rounded-2xl">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                Drop file to upload
              </p>
              <p className="text-sm text-blue-500/70">PNG, JPG, PDF, or TXT</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-sm">
                GOS Commander
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Your Strategic Coach
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {message.fileAttachment && (
                      <div className="mb-2 p-2 bg-white/10 dark:bg-black/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileIconComponent type={getFileType(message.fileAttachment.fileType)} />
                          <span className="text-sm truncate">
                            {message.fileAttachment.fileName}
                          </span>
                        </div>
                        {message.fileAttachment.preview && (
                          <img
                            src={message.fileAttachment.preview}
                            alt="Uploaded"
                            className="mt-2 max-h-32 rounded-lg object-cover"
                          />
                        )}
                      </div>
                    )}
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === 'user'
                          ? 'text-blue-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {pendingFile ? 'Analyzing file...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
          {pendingFile && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              {pendingFile.preview ? (
                <img
                  src={pendingFile.preview}
                  alt="Preview"
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded flex items-center justify-center">
                  <FileIconComponent type={pendingFile.type} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {pendingFile.file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(pendingFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={removePendingFile}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                aria-label="Remove file"
              >
                <XCircle className="w-5 h-5 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          )}

          {messages.length <= 1 && !pendingFile && (
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickSuggestion(suggestion)}
                  disabled={isLoading}
                  className="text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.txt,image/png,image/jpeg,application/pdf,text/plain"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || !!pendingFile}
              variant="outline"
              className="h-12 w-12 rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center p-0"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingFile ? 'Add a message or send the file...' : 'Ask me anything...'}
              className="flex-1 min-h-[48px] max-h-[120px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              rows={1}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={isLoading || (!input.trim() && !pendingFile)}
              className="bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 h-12 w-12 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Send message"
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
