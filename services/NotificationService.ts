import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

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

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export class NotificationService {
    /**
     * Request notification permissions from the user
     */
    static async requestPermissions(): Promise<{ granted: boolean; status: string }> {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            console.log('📱 Current permission status:', existingStatus);
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                console.log('⚠️ Requesting notification permissions...');
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                console.log('📱 New permission status:', finalStatus);
            }

            if (finalStatus !== 'granted') {
                console.log('❌ Notification permissions denied. Status:', finalStatus);
                return { granted: false, status: finalStatus };
            }

            // Check exact alarm permission for Android 12+
            if (Platform.OS === 'android' && Platform.Version >= 31) {
                try {
                    // Check if we can schedule exact alarms
                    console.log('🔍 Checking exact alarm permissions (Android 12+)...');

                    // Note: There's no direct API to check SCHEDULE_EXACT_ALARM in Expo
                    // We'll try to schedule and catch errors
                    console.log('⚠️ Android 12+ detected. If notifications don\'t work, enable "Alarms & reminders" permission in system settings.');
                } catch (error) {
                    console.error('⚠️ Exact alarm check failed:', error);
                }
            }

            // Configure notification channel for Android
            if (Platform.OS === 'android') {
                console.log('🔧 Configuring Android notification channel...');
                await Notifications.setNotificationChannelAsync('appointments', {
                    name: 'Recordatorios de Citas',
                    description: 'Notificaciones para recordar citas programadas',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#4A90E2',
                    sound: 'default',
                    enableVibrate: true,
                    showBadge: true,
                    enableLights: true,
                });
                console.log('✅ Android notification channel configured');
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
     * Create a unique identifier for a patient's notification
     */
    private static getNotificationId(patientId: string): string {
        return `appointment_${patientId}`;
    }

    /**
     * Schedule a notification for a patient's appointment
     */
    static async scheduleAppointmentNotification(
        patientId: string,
        patientName: string,
        appointmentDate: Date
    ): Promise<boolean> {
        try {
            const settings = await this.getSettings();

            // Check if notifications are enabled
            if (!settings.enabled) {
                console.log('⏸️ Notifications disabled, skipping');
                return false;
            }

            // Check permissions
            const permissionResult = await this.requestPermissions();
            if (!permissionResult.granted) {
                console.error('❌ Cannot schedule notification - permissions not granted:', permissionResult.status);

                // Show detailed error to user
                Alert.alert(
                    'Permisos requeridos',
                    `No se pueden programar notificaciones.\n\nEstado: ${permissionResult.status}\n\nPor favor, habilita los permisos de notificaciones y alarmas en la configuración del sistema.`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Abrir Configuración',
                            onPress: () => {
                                if (Platform.OS === 'android') {
                                    Linking.openSettings();
                                }
                            }
                        }
                    ]
                );
                return false;
            }

            // Cancel existing notification for this patient
            await this.cancelAppointmentNotification(patientId);

            // Calculate trigger date - keep the appointment time, just change the date
            const triggerDate = new Date(appointmentDate);
            triggerDate.setDate(triggerDate.getDate() - settings.daysInAdvance);
            // Don't change the time - use the appointment's original time

            // Don't schedule if the trigger date is in the past
            const now = new Date();
            if (triggerDate <= now) {
                console.log(`⚠️ Trigger date ${triggerDate.toLocaleString('es-ES')} is in the past for ${patientName}, skipping notification`);
                Alert.alert(
                    'Fecha en el pasado',
                    `La notificación se programaría para ${triggerDate.toLocaleString('es-ES')} que ya pasó.\n\nAumenta los días de anticipación o programa la cita más adelante.`
                );
                return false;
            }

            console.log('📅 Scheduling details:', {
                patient: patientName,
                appointmentDate: appointmentDate.toLocaleString('es-ES'),
                triggerDate: triggerDate.toLocaleString('es-ES'),
                daysInAdvance: settings.daysInAdvance,
            });

            // Format the appointment date for the notification
            const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });

            const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Determine how many days in advance
            let advanceText = 'mañana';
            if (settings.daysInAdvance === 2) advanceText = 'pasado mañana';
            else if (settings.daysInAdvance === 3) advanceText = 'en 3 días';
            else if (settings.daysInAdvance === 7) advanceText = 'la próxima semana';

            // Schedule the notification
            const identifier = this.getNotificationId(patientId);
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🦷 Recordatorio de Cita',
                    body: `${advanceText.charAt(0).toUpperCase() + advanceText.slice(1)} tienes cita con ${patientName} a las ${formattedTime}`,
                    data: {
                        patientId,
                        patientName,
                        appointmentDate: appointmentDate.toISOString(),
                    },
                    sound: 'default',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    vibrate: [0, 250, 250, 250],
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    channelId: Platform.OS === 'android' ? 'appointments' : undefined,
                    date: triggerDate,
                } as Notifications.DateTriggerInput,
                identifier,
            });

            // Verify the notification was actually scheduled
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const wasScheduled = scheduled.some(n => n.identifier === identifier);

            if (!wasScheduled) {
                console.error('❌ Notification was not found in scheduled list after creation');
                Alert.alert(
                    'Error de programación',
                    'La notificación no se pudo programar. Esto puede ocurrir si:\n\n1. Android 12+: Debes habilitar "Alarmas y recordatorios" en configuración\n2. La batería está optimizada para esta app\n\nIntenta desactivar la optimización de batería para esta app.'
                );
                return false;
            }

            console.log(`✅ Scheduled notification for ${patientName} at ${triggerDate.toLocaleString('es-ES')}`);
            console.log(`   Notification ID: ${notificationId}`);
            console.log(`   Identifier: ${identifier}`);
            console.log(`   Total scheduled: ${scheduled.length}`);
            return true;

        } catch (error) {
            console.error('❌ Error scheduling notification:', error);
            if (error instanceof Error) {
                console.error('   Error message:', error.message);
                console.error('   Error stack:', error.stack);

                Alert.alert(
                    'Error al programar',
                    `No se pudo programar la notificación:\n\n${error.message}\n\nVerifica los permisos en Configuración del sistema.`
                );
            }
            return false;
        }
    }

    /**
     * Cancel a patient's appointment notification
     */
    static async cancelAppointmentNotification(patientId: string): Promise<void> {
        try {
            const identifier = this.getNotificationId(patientId);
            await Notifications.cancelScheduledNotificationAsync(identifier);
            console.log(`🗑️ Cancelled notification for patient ${patientId}`);
        } catch (error) {
            console.error('❌ Error cancelling notification:', error);
        }
    }

    /**
     * Cancel all scheduled notifications
     */
    static async cancelAllNotifications(): Promise<void> {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log('🗑️ Cancelled all notifications');
        } catch (error) {
            console.error('❌ Error cancelling all notifications:', error);
        }
    }

    /**
     * Get all scheduled notifications
     */
    static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
        try {
            const notifications = await Notifications.getAllScheduledNotificationsAsync();
            console.log(`📋 Found ${notifications.length} scheduled notifications`);
            return notifications;
        } catch (error) {
            console.error('❌ Error getting scheduled notifications:', error);
            return [];
        }
    }

    /**
     * Reschedule all notifications for all patients with appointments
     */
    static async rescheduleAllNotifications(
        patients: Array<{ id: string; name: string; nextControlDate?: string }>
    ): Promise<void> {
        try {
            console.log('🔄 Rescheduling all notifications...');

            // Cancel all existing notifications first
            await this.cancelAllNotifications();

            // Schedule new ones for each patient with a next control date
            let scheduledCount = 0;
            for (const patient of patients) {
                if (patient.nextControlDate) {
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
