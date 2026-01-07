import { toast } from 'sonner';
import { supabase } from './supabase';
import { differenceInMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';

export type NotificationPermission = 'granted' | 'denied' | 'default';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    toast.error('Notifications not supported in this browser');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notifications enabled');
    } else {
      toast.info('Notifications blocked. Enable them in settings to get mission reminders.');
    }
    return permission as NotificationPermission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export function checkNotificationSupport(): boolean {
  return 'Notification' in window;
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (!checkNotificationSupport()) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}

export async function scheduleNotificationForMission(
  userId: string,
  missionId: string,
  missionTitle: string,
  startTime: Date,
  battlefrontName?: string
) {
  const reminderTime = new Date(startTime.getTime() - 15 * 60 * 1000);

  const message = battlefrontName
    ? `${missionTitle} • ${battlefrontName}`
    : missionTitle;

  try {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('mission_id', missionId)
      .eq('type', 'mission_reminder')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('notifications')
        .update({
          title: '15 min reminder',
          message,
          scheduled_for: reminderTime.toISOString(),
          sent_at: null,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('notifications').insert({
        user_id: userId,
        mission_id: missionId,
        title: '15 min reminder',
        message,
        scheduled_for: reminderTime.toISOString(),
        type: 'mission_reminder',
      });
    }
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

export async function cancelNotificationForMission(missionId: string) {
  try {
    await supabase
      .from('notifications')
      .delete()
      .eq('mission_id', missionId)
      .eq('type', 'mission_reminder')
      .is('sent_at', null);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

export async function checkAndSendPendingNotifications(userId: string) {
  try {
    const now = new Date();
    const zonedNow = toZonedTime(now, TIMEZONE);

    const { data: pending } = await supabase
      .from('notifications')
      .select(`
        *,
        mission:missions(title, battlefront:battlefronts(name))
      `)
      .eq('user_id', userId)
      .is('sent_at', null)
      .lte('scheduled_for', zonedNow.toISOString());

    if (pending && pending.length > 0) {
      for (const notification of pending) {
        showNotification(notification.title, {
          body: notification.message,
          tag: notification.id,
          requireInteraction: false,
        });

        toast.info(notification.message, {
          description: notification.title,
          duration: 10000,
        });

        await supabase
          .from('notifications')
          .update({ sent_at: now.toISOString() })
          .eq('id', notification.id);
      }
    }
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

export function startNotificationPolling(userId: string) {
  checkAndSendPendingNotifications(userId);

  const interval = setInterval(() => {
    checkAndSendPendingNotifications(userId);
  }, 60000);

  return () => clearInterval(interval);
}
