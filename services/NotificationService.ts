import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export interface NotificationSettings {
    enabled: boolean;
    daysInAdvance: number; // 1, 2, 3, or 7
    notificationHour: number; // 0-23
    notificationMinute: number; // 0-59
}

const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    daysInAdvance: 1,
    notificationHour: 9,
    notificationMinute: 0,
};

const SETTINGS_KEY = 'NOTIFICATION_SETTINGS';

// Comprobar si estamos en Expo Go en Android (donde expo-notifications fue removido desde SDK 53)
const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants as any).appOwnership === 'expo';

const isNotificationsSupported = !(Platform.OS === 'android' && isExpoGo);

let Notifications: typeof import('expo-notifications') | null = null;
let isHandlerConfigured = false;

async function getNotifications() {
    if (!isNotificationsSupported) {
        return null;
    }
    if (Notifications) {
        return Notifications;
    }
    try {
        const mod = await import('expo-notifications');
        Notifications = mod;
        if (!isHandlerConfigured && mod.setNotificationHandler) {
            mod.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
            isHandlerConfigured = true;
        }
        return Notifications;
    } catch (error) {
        console.warn('⚠️ No se pudo inicializar expo-notifications:', error);
        return null;
    }
}

export class NotificationService {
    /**
     * Request notification permissions from the user
     */
    static async requestPermissions(): Promise<{ granted: boolean; status: string }> {
        try {
            const notif = await getNotifications();
            if (!notif) {
                console.log('ℹ️ Notificaciones locales no disponibles en Expo Go (Android SDK 53+). Requiere Development Build para notificaciones nativas.');
                return { granted: false, status: 'unsupported' };
            }

            const { status: existingStatus } = await notif.getPermissionsAsync();
            console.log('📱 Current permission status:', existingStatus);
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                console.log('⚠️ Requesting notification permissions...');
                const { status } = await notif.requestPermissionsAsync();
                finalStatus = status;
                console.log('📱 New permission status:', finalStatus);
            }

            if (finalStatus !== 'granted') {
                console.log('❌ Notification permissions denied. Status:', finalStatus);
                return { granted: false, status: finalStatus };
            }

            // Configure notification channel for Android
            if (Platform.OS === 'android') {
                try {
                    console.log('🔧 Configuring Android notification channel...');
                    await notif.setNotificationChannelAsync('appointments', {
                        name: 'Recordatorios de Citas',
                        description: 'Notificaciones para recordar citas programadas',
                        importance: notif.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#4A90E2',
                        // NOTE: do NOT pass sound: 'default' — causes NullPointerException
                        // in expo-notifications 58.x on Android. Leave undefined for default.
                        enableVibrate: true,
                        showBadge: true,
                        enableLights: true,
                    });
                    console.log('✅ Android notification channel configured');
                } catch (channelError) {
                    console.warn('⚠️ Could not configure notification channel (non-fatal):', channelError);
                }
            }

            console.log('✅ Notification permissions granted');
            return { granted: true, status: finalStatus };
        } catch (error) {
            console.error('❌ Error requesting permissions:', error);
            return { granted: false, status: 'error' };
        }
    }

    /**
     * Get notification settings from storage
     */
    static async getSettings(): Promise<NotificationSettings> {
        try {
            const stored = await AsyncStorage.getItem(SETTINGS_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
            return DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Error loading notification settings:', error);
            return DEFAULT_SETTINGS;
        }
    }

    /**
     * Save notification settings to storage
     */
    static async saveSettings(settings: NotificationSettings): Promise<void> {
        try {
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            console.log('✅ Notification settings saved:', settings);
        } catch (error) {
            console.error('❌ Error saving notification settings:', error);
            throw error;
        }
    }

    /**
     * Create a unique identifier for a patient's appointment notification
     */
    private static getNotificationId(patientId: string, appointmentId?: string): string {
        return appointmentId ? `appointment_${patientId}_${appointmentId}` : `appointment_${patientId}`;
    }

    /**
     * Schedule a notification for a patient's appointment
     */
    static async scheduleAppointmentNotification(
        patientId: string,
        patientName: string,
        appointmentDate: Date,
        appointmentId?: string,
        reason?: string
    ): Promise<boolean> {
        try {
            const notif = await getNotifications();
            if (!notif) return false;

            const settings = await this.getSettings();

            if (!settings.enabled) {
                console.log('⏸️ Notifications disabled, skipping');
                return false;
            }

            const permissionResult = await this.requestPermissions();
            if (!permissionResult.granted) {
                console.error('❌ Cannot schedule notification - permissions not granted:', permissionResult.status);
                return false;
            }

            await this.cancelAppointmentNotification(patientId, appointmentId);

            const triggerDate = new Date(appointmentDate);
            triggerDate.setDate(triggerDate.getDate() - settings.daysInAdvance);

            const now = new Date();
            if (triggerDate <= now) {
                console.log(`⚠️ Trigger date ${triggerDate.toLocaleString('es-ES')} is in the past for ${patientName}, skipping notification`);
                return false;
            }

            console.log('📅 Scheduling details:', {
                patient: patientName,
                appointmentDate: appointmentDate.toLocaleString('es-ES'),
                triggerDate: triggerDate.toLocaleString('es-ES'),
                daysInAdvance: settings.daysInAdvance,
                appointmentId,
            });

            const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            let advanceText = 'mañana';
            if (settings.daysInAdvance === 2) advanceText = 'pasado mañana';
            else if (settings.daysInAdvance === 3) advanceText = 'en 3 días';
            else if (settings.daysInAdvance === 7) advanceText = 'la próxima semana';

            const detailText = reason ? ` (${reason})` : '';
            const identifier = this.getNotificationId(patientId, appointmentId);

            await notif.scheduleNotificationAsync({
                content: {
                    title: '🦷 Recordatorio de Cita',
                    body: `${advanceText.charAt(0).toUpperCase() + advanceText.slice(1)} tienes cita con ${patientName}${detailText} a las ${formattedTime}`,
                    data: {
                        patientId,
                        patientName,
                        appointmentId,
                        appointmentDate: appointmentDate.toISOString(),
                    },
                    sound: 'default',
                    priority: notif.AndroidNotificationPriority.MAX,
                    vibrate: [0, 250, 250, 250],
                },
                trigger: {
                    type: notif.SchedulableTriggerInputTypes.DATE,
                    channelId: Platform.OS === 'android' ? 'appointments' : undefined,
                    date: triggerDate,
                } as any,
                identifier,
            });

            console.log(`✅ Scheduled notification for ${patientName} at ${triggerDate.toLocaleString('es-ES')}`);
            return true;
        } catch (error) {
            console.error('❌ Error scheduling notification:', error);
            return false;
        }
    }

    /**
     * Cancel a patient's appointment notification (specific appointment or all for patient)
     */
    static async cancelAppointmentNotification(patientId: string, appointmentId?: string): Promise<void> {
        try {
            const notif = await getNotifications();
            if (!notif) return;

            if (appointmentId) {
                const identifier = this.getNotificationId(patientId, appointmentId);
                await notif.cancelScheduledNotificationAsync(identifier);
                console.log(`🗑️ Cancelled notification for patient ${patientId}, appointment ${appointmentId}`);
            } else {
                await notif.cancelScheduledNotificationAsync(this.getNotificationId(patientId));
                const allScheduled = await notif.getAllScheduledNotificationsAsync();
                for (const n of allScheduled) {
                    if (n.identifier.startsWith(`appointment_${patientId}`)) {
                        await notif.cancelScheduledNotificationAsync(n.identifier);
                    }
                }
                console.log(`🗑️ Cancelled all notifications for patient ${patientId}`);
            }
        } catch (error) {
            console.error('❌ Error cancelling notification:', error);
        }
    }

    /**
     * Cancel all scheduled notifications
     */
    static async cancelAllNotifications(): Promise<void> {
        try {
            const notif = await getNotifications();
            if (!notif) return;
            await notif.cancelAllScheduledNotificationsAsync();
            console.log('🗑️ Cancelled all notifications');
        } catch (error) {
            console.error('❌ Error cancelling all notifications:', error);
        }
    }

    /**
     * Get all scheduled notifications
     */
    static async getAllScheduledNotifications(): Promise<any[]> {
        try {
            const notif = await getNotifications();
            if (!notif) return [];
            return await notif.getAllScheduledNotificationsAsync();
        } catch (error) {
            console.error('❌ Error getting scheduled notifications:', error);
            return [];
        }
    }

    /**
     * Reschedule all notifications for all patients with appointments
     */
    static async rescheduleAllNotifications(
        patients: Array<{ id: string; name: string; nextControlDate?: string; appointments?: Array<{ id: string; date: string; reason?: string }> }>
    ): Promise<void> {
        try {
            const notif = await getNotifications();
            if (!notif) return;

            console.log('🔄 Rescheduling all notifications...');
            await this.cancelAllNotifications();

            let scheduledCount = 0;
            for (const patient of patients) {
                if (patient.appointments && patient.appointments.length > 0) {
                    for (const appt of patient.appointments) {
                        const apptDate = new Date(appt.date);
                        if (apptDate > new Date()) {
                            const success = await this.scheduleAppointmentNotification(
                                patient.id,
                                patient.name,
                                apptDate,
                                appt.id,
                                appt.reason
                            );
                            if (success) scheduledCount++;
                        }
                    }
                } else if (patient.nextControlDate) {
                    const success = await this.scheduleAppointmentNotification(
                        patient.id,
                        patient.name,
                        new Date(patient.nextControlDate)
                    );
                    if (success) scheduledCount++;
                }
            }

            console.log(`✅ Rescheduled ${scheduledCount} notifications`);
        } catch (error) {
            console.error('❌ Error rescheduling notifications:', error);
        }
    }
}
