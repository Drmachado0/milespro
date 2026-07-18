import { useState, useEffect, useCallback } from 'react';
import { logger } from "@/lib/logger";

interface UseNotificationsReturn {
  permission: NotificationPermission | 'unsupported';
  isEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (title: string, options?: NotificationOptions) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      logger.warn('Browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Send test notification
        new Notification('Notificações Ativadas! 🔔', {
          body: 'Você receberá alertas de novas promoções de milhas.',
          icon: '/favicon.ico',
          tag: 'permission-granted',
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      logger.log('Notifications not permitted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        silent: false,
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }, [permission]);

  return {
    permission,
    isEnabled: permission === 'granted',
    requestPermission,
    sendNotification,
  };
}
