import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Requests push permission from the user.
 * Wraps @capacitor/push-notifications with a Capacitor.isNativePlatform() check.
 * Falls back gracefully on web.
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Push notifications are not supported on the web platform.');
      return false;
    }

    const { receive } = await PushNotifications.checkPermissions();
    if (receive === 'prompt' || receive === 'prompt-with-rationale') {
      const { receive: newPermission } = await PushNotifications.requestPermissions();
      return newPermission === 'granted';
    }

    return receive === 'granted';
  } catch (error) {
    console.error('Error requesting push permission:', error);
    return false;
  }
}

/**
 * Saves the FCM token to users/{uid}/fcmTokens subcollection in Firestore.
 */
export async function registerFCMToken(uid: string, token: string): Promise<void> {
  try {
    if (!uid || !token) {
      throw new Error('UID and token must be provided to register FCM token.');
    }
    const tokenDocRef = doc(db, `users/${uid}/fcmTokens`, token);
    await setDoc(tokenDocRef, {
      token,
      createdAt: new Date(),
      platform: Capacitor.getPlatform()
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    throw error;
  }
}

/**
 * Listens for foreground push events from @capacitor/push-notifications
 * and routes them to the toast system.
 * (Note: The actual ToastContext should be consumed where this is called,
 * or the addToast function should be passed in as a callback).
 */
export async function setupPushListeners(addToast: (message: string, type?: 'success' | 'error' | 'info') => void): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      // NOTE: Call registerFCMToken separately with the authenticated user ID
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push received: ' + JSON.stringify(notification));
      addToast(notification.title || notification.body || 'New notification', 'info');
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });

    // We must register for push notifications.
    const permission = await requestPushPermission();
    if (permission) {
      await PushNotifications.register();
    }
  } catch (error) {
    console.error('Error setting up push listeners:', error);
  }
}
