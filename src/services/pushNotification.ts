import { sounds } from '../utils/audio';

export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  distanceMeters?: number;
  driverName?: string;
  carModel?: string;
  isTest?: boolean;
}

type NotificationListener = (notification: PushNotificationPayload) => void;
const listeners: Set<NotificationListener> = new Set();

/**
 * Subscribe to in-app push notifications
 */
export function subscribeToPushNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Check browser notification support and permission
 */
export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestPushPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('Push notification permission request error:', err);
    return Notification.permission || 'default';
  }
}

/**
 * Trigger customer proximity push notification (< 100 meters)
 */
export async function sendProximityPushNotification(options: {
  distanceMeters: number;
  driverName?: string;
  carModel?: string;
  rideId?: string;
  isTest?: boolean;
}): Promise<PushNotificationPayload> {
  const distance = Math.max(10, Math.round(options.distanceMeters));
  const cleanDriver = options.driverName?.trim() || 'سائق التاكسي';
  const cleanCar = options.carModel?.trim() || 'السيارة';

  const title = options.isTest
    ? '🔔 [إشعار دفع تجريبي] السائق قريب منك (< 100م) 🚕'
    : '🚕 تاكسي الأبيض سيدي الشيخ: السائق قريب جداً منك!';

  const body = options.isTest
    ? `تجربة إشعار الدفع: سيارة ${cleanCar} بقيادة ${cleanDriver} تبعد الآن ${distance} متر فقط (أقل من 100م). يرجى الاستعداد للركوب!`
    : `سائق التاكسي ${cleanDriver} (${cleanCar}) على بعد ${distance} متر فقط من موقعك ويصل في لحظات. يرجى الاستعداد للركوب!`;

  const notification: PushNotificationPayload = {
    id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    body,
    timestamp: Date.now(),
    distanceMeters: distance,
    driverName: cleanDriver,
    carModel: cleanCar,
    isTest: options.isTest,
  };

  // 1. Browser Native Web Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const nativeNotification = new Notification(title, {
          body,
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          tag: options.isTest ? `test-proximity-${Date.now()}` : 'driver-proximity-100m',
          dir: 'rtl',
          lang: 'ar',
          silent: false,
        });

        nativeNotification.onclick = () => {
          window.focus();
          nativeNotification.close();
        };

        // Auto close native notification after 8 seconds
        setTimeout(() => {
          try {
            nativeNotification.close();
          } catch {
            // ignore
          }
        }, 8000);
      } catch (err) {
        console.warn('Native Notification constructor error:', err);
      }
    } else if (Notification.permission === 'default') {
      // Try to ask for permission silently
      Notification.requestPermission().catch(() => {});
    }
  }

  // 2. Device Vibration API
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 400]);
    } catch {
      // ignore
    }
  }

  // 3. Play audio chime and voice alert
  sounds.playArrivalChime();
  setTimeout(() => {
    sounds.speakCustomerProximityAlert(options.rideId, options.isTest);
  }, 400);

  // 4. Notify in-app subscribers (floating push card for instant feedback)
  listeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (err) {
      console.error('Error in push notification listener:', err);
    }
  });

  return notification;
}
