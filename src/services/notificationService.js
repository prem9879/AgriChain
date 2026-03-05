import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect if running inside Expo Go (push notifications not supported since SDK 53)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Notifications = null;

// Only import expo-notifications when NOT in Expo Go to avoid the crash
const getNotifications = async () => {
    if (!Notifications) {
        Notifications = await import('expo-notifications');
    }
    return Notifications;
};

// Set up notification handler only outside Expo Go
if (!isExpoGo) {
    getNotifications().then((N) => {
        N.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
    });
}

export const setupNotifications = async () => {
    if (isExpoGo) {
        console.log('AGRI-मित्र: Push notifications are not available in Expo Go. Use a development build for full notification support.');
        return false;
    }

    try {
        const N = await getNotifications();

        if (Platform.OS === 'android') {
            await N.setNotificationChannelAsync('agrimitra-alerts', {
                name: 'AGRI-मित्र Alerts',
                importance: N.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#52B788',
                sound: 'default',
            });
        }

        const { status: existingStatus } = await N.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await N.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return false;
        }

        // Schedule demo notifications
        await scheduleDemoNotifications();
        return true;
    } catch (err) {
        console.warn('Notification setup failed:', err);
        return false;
    }
};

const scheduleDemoNotifications = async () => {
    if (isExpoGo) return;

    const N = await getNotifications();

    // Cancel any previously scheduled demo notifications
    await N.cancelAllScheduledNotificationsAsync();

    // T+60 seconds: Price alert
    await N.scheduleNotificationAsync({
        content: {
            title: '🌾 AGRI-मित्र Alert',
            body: 'Nashik मंडी में Onion का भाव आज 12% बढ़ा। बेचने का सही समय!',
            data: { type: 'price_alert' },
            sound: 'default',
        },
        trigger: {
            type: 'timeInterval',
            seconds: 60,
            repeats: false,
        },
    });

    // T+5 minutes: Weather alert
    await N.scheduleNotificationAsync({
        content: {
            title: '⚠️ मौसम अलर्ट',
            body: 'कल बारिश आने वाली है। आज ही फसल काटने पर विचार करें।',
            data: { type: 'weather_alert' },
            sound: 'default',
        },
        trigger: {
            type: 'timeInterval',
            seconds: 300,
            repeats: false,
        },
    });
};

export const showPermissionResult = (granted) => {
    if (isExpoGo) {
        // Silently skip — no alert needed in Expo Go
        return;
    }
    if (granted) {
        Alert.alert(
            '✅ Notifications Active',
            'हम आपको सही समय पर alert भेजेंगे — भाव बढ़ने, मौसम बदलने, और harvest window पर।'
        );
    }
};
