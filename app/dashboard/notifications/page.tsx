'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, Check, Trash2, Settings, Smartphone, Monitor, BellRing, BellOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  requestNotificationPermission,
  startNotificationPolling,
  checkNotificationSupport,
} from '@/lib/notifications';

const TIMEZONE = 'America/Toronto';

type Notification = {
  id: string;
  title: string;
  message: string;
  scheduled_for: string;
  sent_at: string | null;
  read_at: string | null;
  mission_id: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    setIsSupported(checkNotificationSupport());
    if (typeof window !== 'undefined') {
      setPermissionStatus(Notification?.permission || 'default');
      const ua = navigator.userAgent;
      setIsIOS(/iPad|iPhone|iPod/.test(ua));
      setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
    } catch (error: any) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (error: any) {
      toast.error('Failed to mark as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);

      if (error) throw error;

      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error('Failed to delete');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Please log in</div>
      </div>
    );
  }

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setPermissionStatus(permission);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-4xl font-bold text-white">NOTIFICATIONS</h1>
            <p className="text-slate-400 text-lg mt-1">Mission reminders & updates</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      {showSettings && (
        <Card className="bg-slate-900/50 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Settings
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Browser Notifications</p>
                  <p className="text-slate-400 text-sm">
                    {isSupported ? 'Receive native browser notifications' : 'Not supported in this browser'}
                  </p>
                </div>
              </div>
              {isSupported && (
                <div className="flex items-center gap-3">
                  {permissionStatus === 'granted' ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <BellRing className="w-4 h-4" />
                      <span className="text-sm">Enabled</span>
                    </div>
                  ) : permissionStatus === 'denied' ? (
                    <div className="flex items-center gap-2 text-red-400">
                      <BellOff className="w-4 h-4" />
                      <span className="text-sm">Blocked</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleEnableNotifications}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Enable
                    </Button>
                  )}
                </div>
              )}
            </div>

            {isIOS && (
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">iOS Push Notifications</p>
                    <p className="text-slate-400 text-sm">
                      {isPWA
                        ? 'Push notifications available in installed app'
                        : 'Add to Home Screen for push notifications'}
                    </p>
                  </div>
                </div>
                {!isPWA && (
                  <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded">
                    Requires PWA
                  </span>
                )}
              </div>
            )}

            <div className="p-4 bg-blue-950/30 border border-blue-800/50 rounded-lg">
              <p className="text-blue-300 text-sm">
                Reminders are sent 15 minutes before each scheduled mission starts.
                In-app notifications (toasts) will always appear regardless of browser settings.
              </p>
            </div>

            {permissionStatus === 'denied' && (
              <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-lg">
                <p className="text-red-300 text-sm">
                  Browser notifications are blocked. To enable them:
                </p>
                <ol className="text-red-300 text-sm mt-2 list-decimal ml-4 space-y-1">
                  <li>Click the lock/info icon in your browser address bar</li>
                  <li>Find "Notifications" in the site settings</li>
                  <li>Change from "Block" to "Allow"</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
          <p className="text-slate-400">Loading...</p>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
          <Bell className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <p className="text-white text-lg mb-2">No notifications yet</p>
          <p className="text-slate-400">You'll receive reminders 15 minutes before your missions start</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const scheduledDate = toZonedTime(new Date(notification.scheduled_for), TIMEZONE);
            const isSent = !!notification.sent_at;
            const isRead = !!notification.read_at;

            return (
              <Card
                key={notification.id}
                className={`bg-slate-900/50 border-slate-700 p-4 transition-colors ${
                  !isRead && isSent ? 'border-blue-500/50 bg-blue-950/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{notification.message}</h3>
                      {!isRead && isSent && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{notification.title}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{format(scheduledDate, 'MMM d, yyyy h:mm a')}</span>
                      <span className={isSent ? 'text-green-500' : 'text-slate-500'}>
                        {isSent ? '✓ Sent' : 'Scheduled'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isRead && isSent && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                        className="text-slate-400 hover:text-green-400"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
