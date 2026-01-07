'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Target,
  Map,
  ListTodo,
  Calendar,
  Trophy,
  BookOpen,
  Shield,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Chatbot } from '@/components/chatbot';
import { BootSequence } from '@/components/boot-sequence';
import { startNotificationPolling, requestNotificationPermission } from '@/lib/notifications';

const navigation = [
  { name: 'Grand Strategy', href: '/dashboard/strategy', icon: Target },
  { name: 'War Map', href: '/dashboard/warmap', icon: Map },
  { name: 'Master Missions', href: '/dashboard/missions', icon: ListTodo },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Scoreboard', href: '/dashboard/scoreboard', icon: Trophy },
  { name: 'System Builder', href: '/dashboard/systems', icon: BookOpen },
  { name: 'War Room', href: '/dashboard/warroom', icon: Shield },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBootSequence, setShowBootSequence] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !loading) {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const navType = navEntries[0]?.type;
      const isReload = navType === 'reload';
      const isNewLoad = navType === 'navigate' || navType === 'back_forward';
      const introDone = sessionStorage.getItem('gos_intro_done');
      const lastBootTime = sessionStorage.getItem('gos_boot_time');
      const now = Date.now();

      if (isReload || !introDone || (lastBootTime && now - parseInt(lastBootTime) > 3600000)) {
        sessionStorage.setItem('gos_boot_time', now.toString());
        setShowBootSequence(true);
      } else {
        setBootComplete(true);
      }
    }
  }, [user, loading]);

  const handleBootComplete = () => {
    sessionStorage.setItem('gos_intro_done', '1');
    setShowBootSequence(false);
    setBootComplete(true);
  };

  useEffect(() => {
    if (bootComplete && user) {
      requestNotificationPermission();
      const cleanup = startNotificationPolling(user.id);
      return cleanup;
    }
  }, [bootComplete, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-blue-950">
        <div className="text-white text-xl">Loading command center...</div>
      </div>
    );
  }

  if (showBootSequence) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  if (!bootComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-blue-950">
      <div className="lg:flex">
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/90 backdrop-blur-sm border-r border-slate-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
              <h1 className="text-xl font-bold text-white">GOS COMMAND</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-700 space-y-2">
              <Link
                href="/dashboard/notifications"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="font-medium">Notifications</span>
              </Link>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="lg:ml-64 flex-1">
          <div className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-slate-700">
            <button onClick={() => setSidebarOpen(true)} className="text-white">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-white">GOS COMMAND</h1>
            <div className="w-6" />
          </div>

          <main className="p-6">{children}</main>
        </div>
      </div>
      <Chatbot />
    </div>
  );
}
