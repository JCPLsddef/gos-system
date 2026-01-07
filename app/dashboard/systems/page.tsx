'use client';

import { useAuth } from '@/lib/auth-context';
import { BookOpen } from 'lucide-react';
import { SystemThinkingDoc } from '@/components/system-thinking/system-thinking-doc';

export default function SystemBuilderPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Please log in</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-4xl font-bold text-white">SYSTEM THINKING</h1>
          <p className="text-slate-400 text-lg mt-1">Input → Process → Output</p>
        </div>
      </div>

      <SystemThinkingDoc userId={user.id} />
    </div>
  );
}
