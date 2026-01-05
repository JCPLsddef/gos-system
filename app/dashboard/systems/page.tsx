'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function SystemBuilderPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-4xl font-bold text-white">SYSTEM BUILDER</h1>
          <p className="text-slate-400 text-lg mt-1">Document your execution systems</p>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
        <h3 className="text-xl text-white mb-2">Systems Documentation</h3>
        <p className="text-slate-400">Build your internal wiki for repeatable processes</p>
      </Card>
    </div>
  );
}
