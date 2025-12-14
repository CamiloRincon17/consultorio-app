import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useApp } from '../context/AppContext';

export default function SettingsScreen() {
    const router = useRouter();
    const { patients, transactions, importData } = useApp();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleExport = async () => {
        try {
            setIsExporting(true);

            // Validar que hay datos para exportar
            if (patients.length === 0 && transactions.length === 0) {
                Alert.alert(
                    'Sin datos',
                    'No hay pacientes ni transacciones para exportar. Agrega algunos datos primero.'
                );
                return;
            }

            const backupData = {
                metadata: {
                    version: '1.0',
                    date: new Date().toISOString(),
                    appName: 'ConsultorioApp',
                    patientsCount: patients.length,
                    transactionsCount: transactions.length
                },
                patients,
                transactions
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const dateStr = new Date().toISOString().split('T')[0];
            const timeStr = new Date().toLocaleTimeString('es-ES').replace(/:/g, '-');
            const fileName = `backup_consultorio_${dateStr}_${timeStr}.json`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            console.log('📁 Guardando archivo en:', filePath);
            console.log('📊 Datos a exportar:', {
                pacientes: patients.length,
                transacciones: transactions.length
            });

            // Usar cache directory si está disponible, sino document directory
            const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            const safePath = cacheDir ? `${cacheDir}${fileName}` : filePath;

            await FileSystem.writeAsStringAsync(safePath, jsonString, {
                encoding: FileSystem.EncodingType.UTF8
            });

            console.log('✅ Archivo guardado correctamente');

            // Verificar que el archivo existe
            const fileInfo = await FileSystem.getInfoAsync(safePath);
            console.log('📄 Info del archivo:', fileInfo);

            if (!fileInfo.exists) {
                throw new Error('El archivo no se creó correctamente');
            }

            // Dar opción al usuario: descargar o compartir
            Alert.alert(
                '✅ Copia creada',
                `Se exportaron ${patients.length} pacientes y ${transactions.length} transacciones.\n\n¿Qué deseas hacer?`,
                [
                    {
                        text: 'Guardar en Descargas',
                        onPress: async () => {
                            try {
                                if (Platform.OS === 'android') {
                                    // Use Storage Access Framework to save to Downloads
                                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

                                    if (permissions.granted) {
                                        const fileContent = await FileSystem.readAsStringAsync(safePath);
                                        const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                                            permissions.directoryUri,
                                            fileName,
                                            'application/json'
                                        );
                                        await FileSystem.writeAsStringAsync(uri, fileContent);
                                        Alert.alert('✅ Guardado', 'Archivo guardado exitosamente en la carpeta seleccionada');
                                    } else {
                                        Alert.alert('Permiso denegado', 'No se pudo acceder al almacenamiento');
                                    }
                                }
                            } catch (downloadError: any) {
                                console.error('Error saving to downloads:', downloadError);
                                Alert.alert('Error', `No se pudo guardar: ${downloadError.message}`);
                            }
                        }
                    },
                    {
                        text: 'Compartir',
                        onPress: async () => {
                            const isAvailable = await Sharing.isAvailableAsync();
                            if (isAvailable) {
                                await Sharing.shareAsync(safePath, {
                                    UTI: 'public.json',
                                    mimeType: 'application/json',
                                    dialogTitle: 'Compartir copia de seguridad'
                                });
                            } else {
                                Alert.alert('Error', 'No se puede compartir en este dispositivo');
                            }
                        }
                    },
                    {
                        text: 'Cancelar',
                        style: 'cancel'
                    }
                ]
            );

        } catch (error: any) {
            console.error('❌ Error al exportar:', error);
            Alert.alert(
                'Error al exportar',
                `No se pudo crear la copia de seguridad.\n\nDetalles: ${error.message || 'Error desconocido'} \n\nIntenta nuevamente o contacta soporte.`,
                [{ text: 'OK' }]
            );
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async () => {
        try {
            setIsImporting(true);

            // Advertir al usuario
            Alert.alert(
                '⚠️ Advertencia',
                'Importar un respaldo reemplazará TODOS los datos actuales. ¿Estás seguro?',
                [
                    { text: 'Cancelar', style: 'cancel', onPress: () => setIsImporting(false) },
                    {
                        text: 'Sí, importar',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                const result = await DocumentPicker.getDocumentAsync({
                                    type: 'application/json',
                                    copyToCacheDirectory: true
                                });

                                if (result.canceled) {
                                    console.log('Importación cancelada por el usuario');
                                    return;
                                }

                                const fileUri = result.assets[0].uri;
                                console.log('📥 Importando desde:', fileUri);

                                // Leer el contenido del archivo
                                const fileContent = await FileSystem.readAsStringAsync(fileUri);
                                const backupData = JSON.parse(fileContent);

                                // Validar estructura del backup
                                if (!backupData.metadata || backupData.metadata.appName !== 'ConsultorioApp') {
                                    throw new Error('Archivo de respaldo inválido');
                                }

                                if (!backupData.patients || !backupData.transactions) {
                                    throw new Error('El archivo no contiene datos válidos');
                                }

                                console.log('📊 Datos a importar:', {
                                    pacientes: backupData.patients.length,
                                    transacciones: backupData.transactions.length,
                                    fecha: backupData.metadata.date
                                });

                                // Importar los datos
                                await importData(backupData.patients, backupData.transactions);

                                Alert.alert(
                                    '✅ Importación exitosa',
                                    `Se importaron ${backupData.patients.length} pacientes y ${backupData.transactions.length} transacciones.`,
                                    [{ text: 'OK' }]
                                );

                            } catch (importError: any) {
                                console.error('❌ Error al importar:', importError);
                                Alert.alert(
                                    'Error al importar',
                                    `No se pudo importar el respaldo.\n\nDetalles: ${importError.message || 'Error desconocido'} `,
                                    [{ text: 'OK' }]
                                );
                            }
                        }
                    }
                ],
                { cancelable: true, onDismiss: () => setIsImporting(false) }
            );

        } catch (error: any) {
            console.error('❌ Error:', error);
            Alert.alert('Error', error.message || 'Error al seleccionar archivo');
        } finally {
            setIsImporting(false);
        }
    };

    // Notification Settings
    const [notificationSettings, setNotificationSettings] = useState({
        enabled: true,
        daysInAdvance: 1,
        notificationHour: 9,
        notificationMinute: 0,
    });
    const [pendingNotifications, setPendingNotifications] = useState(0);

    useEffect(() => {
        loadNotificationSettings();
        loadPendingNotifications();
    }, []);

    const loadNotificationSettings = async () => {
        try {
            const { NotificationService } = await import('../services/NotificationService');
            const settings = await NotificationService.getSettings();
            setNotificationSettings(settings);
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    };

    const loadPendingNotifications = async () => {
        try {
            const { NotificationService } = await import('../services/NotificationService');
            const scheduled = await NotificationService.getAllScheduledNotifications();
            setPendingNotifications(scheduled.length);
        } catch (error) {
            console.error('Error loading pending notifications:', error);
        }
    };

    const handleToggleNotifications = async (enabled: boolean) => {
        try {
            const { NotificationService } = await import('../services/NotificationService');
            const newSettings = { ...notificationSettings, enabled };
            await NotificationService.saveSettings(newSettings);
            setNotificationSettings(newSettings);

            if (enabled) {
                // Reschedule all notifications
                await NotificationService.rescheduleAllNotifications(patients);
                Alert.alert('✅ Notificaciones activadas', 'Se han programado las notificaciones pendientes');
            } else {
                // Cancel all notifications
                await NotificationService.cancelAllNotifications();
                Alert.alert('Notificaciones desactivadas', 'Se cancelaron todas las notificaciones');
            }

            await loadPendingNotifications();
        } catch (error) {
            console.error('Error toggling notifications:', error);
            Alert.alert('Error', 'No se pudo cambiar la configuración de notificaciones');
        }
    };



    const handleChangeDaysInAdvance = async (days: number) => {
        try {
            const { NotificationService } = await import('../services/NotificationService');
            const newSettings = { ...notificationSettings, daysInAdvance: days };
            await NotificationService.saveSettings(newSettings);
            setNotificationSettings(newSettings);

            // Reschedule
            if (notificationSettings.enabled) {
                await NotificationService.rescheduleAllNotifications(patients);
                await loadPendingNotifications();
            }

            Alert.alert('✅ Guardado', `Se notificará ${days} día${days > 1 ? 's' : ''} antes`);
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar la configuración');
        }
    };

    const handleViewPendingNotifications = async () => {
        try {
            const { NotificationService } = await import('../services/NotificationService');
            const scheduled = await NotificationService.getAllScheduledNotifications();

            if (scheduled.length === 0) {
                Alert.alert('Sin notificaciones', 'No hay notificaciones programadas');
                return;
            }

            const list = scheduled.map((n, i) => {
                const patientName = n.content.data?.patientName || 'Desconocido';
                const trigger = n.trigger as any;
                const date = trigger.value ? new Date(trigger.value) : new Date();
                return `${i + 1}. ${patientName} - ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} `;
            }).join('\n\n');

            Alert.alert(
                `📋 ${scheduled.length} Notificaciones Programadas`,
                list,
                [
                    { text: 'OK' },
                    {
                        text: 'Cancelar todas',
                        style: 'destructive',
                        onPress: async () => {
                            await NotificationService.cancelAllNotifications();
                            await loadPendingNotifications();
                            Alert.alert('Canceladas', 'Todas las notificaciones fueron canceladas');
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error viewing notifications:', error);
            Alert.alert('Error', 'No se pudieron cargar las notificaciones');
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Notifications Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>

                {/* Enable/Disable Toggle */}
                <View style={styles.toggleItem}>
                    <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>Recordatorios de Citas</Text>
                        <Text style={styles.itemSubtitle}>
                            {notificationSettings.enabled
                                ? `Activas - ${pendingNotifications} programadas`
                                : 'Desactivadas'}
                        </Text>
                    </View>
                    <Switch
                        value={notificationSettings.enabled}
                        onValueChange={handleToggleNotifications}
                        trackColor={{ false: '#D1D5DB', true: Colors.primary + '60' }}
                        thumbColor={notificationSettings.enabled ? Colors.primary : '#F3F4F6'}
                    />
                </View>

                {notificationSettings.enabled && (
                    <>
                        <View style={styles.separator} />

                        {/* Days in Advance */}
                        <View style={styles.subsection}>
                            <Text style={styles.subsectionTitle}>Días de Antelación</Text>
                            <View style={styles.daysRow}>
                                {[1, 2, 3, 7].map(days => (
                                    <TouchableOpacity
                                        key={days}
                                        style={[
                                            styles.dayButton,
                                            notificationSettings.daysInAdvance === days && styles.dayButtonActive
                                        ]}
                                        onPress={() => handleChangeDaysInAdvance(days)}
                                    >
                                        <Text style={[
                                            styles.dayButtonText,
                                            notificationSettings.daysInAdvance === days && styles.dayButtonTextActive
                                        ]}>
                                            {days} {days === 1 ? 'día' : 'días'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.separator} />

                        {/* Pending Notifications */}
                        <TouchableOpacity style={styles.item} onPress={handleViewPendingNotifications}>
                            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
                                <Ionicons name="list-outline" size={24} color="#8B5CF6" />
                            </View>
                            <View style={styles.itemContent}>
                                <Text style={styles.itemTitle}>Ver Notificaciones Programadas</Text>
                                <Text style={styles.itemSubtitle}>
                                    {pendingNotifications} pendiente{pendingNotifications !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Data and Backup Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Datos y Almacenamiento</Text>

                {/* Exportar */}
                <TouchableOpacity
                    style={[styles.item, isExporting && styles.itemDisabled]}
                    onPress={handleExport}
                    disabled={isExporting || isImporting}
                >
                    <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '20' }]}>
                        {isExporting ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <Ionicons name="cloud-download-outline" size={24} color={Colors.primary} />
                        )}
                    </View>
                    <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>
                            {isExporting ? 'Exportando...' : 'Exportar Copia de Seguridad'}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                            {isExporting
                                ? 'Creando archivo de respaldo...'
                                : `Guarda ${patients.length} pacientes y ${transactions.length} transacciones`
                            }
                        </Text>
                    </View>
                    {!isExporting && (
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                    )}
                </TouchableOpacity>

                <View style={styles.separator} />

                {/* Importar */}
                <TouchableOpacity
                    style={[styles.item, isImporting && styles.itemDisabled]}
                    onPress={handleImport}
                    disabled={isExporting || isImporting}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
                        {isImporting ? (
                            <ActivityIndicator size="small" color="#10B981" />
                        ) : (
                            <Ionicons name="cloud-upload-outline" size={24} color="#10B981" />
                        )}
                    </View>
                    <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>
                            {isImporting ? 'Importando...' : 'Importar Copia de Seguridad'}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                            {isImporting
                                ? 'Restaurando datos...'
                                : 'Restaura pacientes y transacciones desde un archivo'
                            }
                        </Text>
                    </View>
                    {!isImporting && (
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.statsBox}>
                    <Ionicons name="people-outline" size={20} color={Colors.primary} />
                    <Text style={styles.statsText}>{patients.length} pacientes</Text>
                </View>
                <View style={styles.statsBox}>
                    <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
                    <Text style={styles.statsText}>{transactions.length} transacciones</Text>
                </View>
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.infoText}>Consultorio App v1.0</Text>
                <Text style={styles.infoText}>Desarrollado para odontólogos</Text>
            </View>


        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        justifyContent: 'space-between',
    },
    itemDisabled: {
        opacity: 0.6,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.background,
        marginVertical: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    itemSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    subsection: {
        paddingVertical: 8,
    },
    subsectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    daysRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    dayButton: {
        flex: 1,
        minWidth: 70,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: Colors.background,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    dayButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    dayButtonTextActive: {
        color: 'white',
    },
    infoSection: {
        alignItems: 'center',
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    statsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    statsText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    infoText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalButtonConfirm: {
        backgroundColor: Colors.primary,
    },
    modalButtonTextCancel: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    modalButtonTextConfirm: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    }
});
