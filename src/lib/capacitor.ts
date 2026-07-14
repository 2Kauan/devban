import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

// Helper for checking if we're on a native mobile app
export const isNative = Capacitor.isNativePlatform();

/**
 * Triggers a light vibration for drag-and-drop or minor actions.
 */
export const hapticLight = async () => {
  if (isNative) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  }
};

/**
 * Triggers a medium vibration for important clicks (e.g. Save, Delete).
 */
export const hapticMedium = async () => {
  if (isNative) {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  }
};

/**
 * Opens a URL in the native In-App Browser instead of tossing the user to Chrome/Safari.
 * This is crucial for Asaas payments inside the APK.
 */
export const openUrlNatively = async (url: string) => {
  if (isNative) {
    try {
      await Browser.open({ url, presentationStyle: 'popover' });
    } catch (e) {
      console.warn('Browser plugin failed, falling back to window.open', e);
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
};

/**
 * Programmatically hides the soft keyboard
 */
export const hideKeyboard = async () => {
  if (isNative) {
    try {
      await Keyboard.hide();
    } catch (e) {
      console.warn('Keyboard plugin failed', e);
    }
  }
};

/**
 * Initializes listeners for the App (e.g. back button on Android)
 */
export const initAppListeners = () => {
  if (isNative) {
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  }
};
