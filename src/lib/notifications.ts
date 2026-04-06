/**
 * Enterprise Notification Utility
 * Handles audio alerts and browser push notifications consistently across the CRM.
 */

let lastNotificationTime = 0;

export const playNotificationSound = async () => {
    const now = Date.now();
    // Debounce to prevent spamming sounds (2 seconds)
    if (now - lastNotificationTime < 2000) return;
    lastNotificationTime = now;

    try {
        // Support all user-provided paths and common variations
        const paths = [
            '/sound/notification.mp3.mp3',
            '/sounds/notification.mp3',
            '/sound/notification.mp3',
            '/notification.mp3'
        ];

        const playFirstAvailable = async (idx: number): Promise<boolean> => {
            if (idx >= paths.length) return false;
            try {
                const audio = new Audio(paths[idx]);
                await audio.play();
                return true;
            } catch {
                return playFirstAvailable(idx + 1);
            }
        };

        return await playFirstAvailable(0);
    } catch (e) {
        console.warn('[Notifications] Audio playback blocked or failed', e);
        return false;
    }
};

export const showBrowserNotification = (title: string, body: string, icon = '/logo.png') => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body,
                icon,
                tag: 'gtt-crm-alert', // Collapse multiple alerts
                silent: true // We handle our own audio
            });
        } catch (e) {
            console.error('[Notifications] Failed to show browser notification', e);
        }
    }
};
