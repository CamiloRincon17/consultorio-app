import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useThemedStyles, type Palette } from '../theme';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    confirmStyle?: 'danger' | 'primary' | 'success';
    hideCancel?: boolean;
    buttons?: { text: string; style?: 'cancel' | 'danger' | 'primary' | 'success'; onPress: () => void; }[];
}

export function ConfirmModal({
    visible,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    onCancel,
    icon = "warning",
    iconColor,
    confirmStyle = "danger",
    hideCancel = false,
    buttons
}: ConfirmModalProps) {
    const colors = useColors();
    const styles = useThemedStyles(createStyles);
    const resolvedIconColor = iconColor ?? colors.danger;

    const getConfirmColor = () => {
        switch(confirmStyle) {
            case 'primary': return colors.primary;
            case 'success': return colors.success;
            case 'danger': 
            default: return colors.danger;
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={[styles.iconContainer, { backgroundColor: resolvedIconColor + '15' }]}>
                        <Ionicons name={icon as any} size={40} color={resolvedIconColor} />
                    </View>
                    
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {buttons ? (
                            buttons.map((btn, index) => {
                                const isCancel = btn.style === 'cancel';
                                const btnColor = isCancel ? colors.surface : 
                                                 btn.style === 'primary' ? colors.primary : 
                                                 btn.style === 'success' ? colors.success : colors.danger;
                                return (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={[isCancel ? styles.cancelButton : styles.confirmButton, { backgroundColor: btnColor }]} 
                                        onPress={btn.onPress} 
                                        activeOpacity={0.7}
                                    >
                                        <Text style={isCancel ? styles.cancelText : styles.confirmText}>{btn.text}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <>
                                {!hideCancel && (
                                    <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
                                        <Text style={styles.cancelText}>{cancelText}</Text>
                                    </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity 
                                    style={[styles.confirmButton, { backgroundColor: getConfirmColor() }]} 
                                    onPress={onConfirm}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.confirmText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: Palette) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    }
});
