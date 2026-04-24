import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Colors } from '../constants/Colors';

type DialogType = 'success' | 'error' | 'confirm' | 'info';

interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogContextType {
  alert: (title: string, message: string, type?: DialogType, onConfirm?: () => void) => void;
  confirm: (title: string, message: string, onConfirm: () => void, confirmStyle?: 'danger' | 'primary' | 'success') => void;
  custom: (title: string, message: string, type: DialogType, buttons: { text: string; style?: 'cancel' | 'danger' | 'primary' | 'success'; onPress: () => void; }[]) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText: string;
    cancelText: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmStyle: 'danger' | 'primary' | 'success';
    buttons?: { text: string; style?: 'cancel' | 'danger' | 'primary' | 'success'; onPress: () => void; }[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    confirmStyle: 'primary'
  });

  const hide = useCallback(() => setConfig(prev => ({ ...prev, visible: false })), []);

  const alert = useCallback((title: string, message: string, type: DialogType = 'info', onConfirm?: () => void) => {
    setConfig({
      visible: true,
      title,
      message,
      type,
      confirmText: 'Aceptar',
      cancelText: '',
      onConfirm: () => {
        hide();
        if (onConfirm) onConfirm();
      },
      confirmStyle: type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary',
      buttons: undefined
    });
  }, [hide]);

  const confirm = useCallback((title: string, message: string, onConfirm: () => void, confirmStyle: 'danger' | 'primary' | 'success' = 'danger') => {
    setConfig({
      visible: true,
      title,
      message,
      type: 'confirm',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        hide();
        onConfirm();
      },
      onCancel: hide,
      confirmStyle,
      buttons: undefined
    });
  }, [hide]);

  const custom = useCallback((title: string, message: string, type: DialogType, buttons: { text: string; style?: 'cancel' | 'danger' | 'primary' | 'success'; onPress: () => void; }[]) => {
    setConfig({
      visible: true,
      title,
      message,
      type,
      confirmText: '',
      cancelText: '',
      confirmStyle: 'primary',
      buttons: buttons.map(b => ({
        ...b,
        onPress: () => {
          hide();
          b.onPress();
        }
      }))
    });
  }, [hide]);

  let iconName = "information-circle";
  let iconColor = Colors.primary;
  
  if (config.type === 'error') {
    iconName = "close-circle";
    iconColor = Colors.danger;
  } else if (config.type === 'success') {
    iconName = "checkmark-circle";
    iconColor = Colors.success;
  } else if (config.type === 'confirm') {
    iconName = "warning";
    iconColor = config.confirmStyle === 'danger' ? Colors.danger : Colors.primary;
  }

  return (
    <DialogContext.Provider value={{ alert, confirm, custom }}>
      {children}
      <ConfirmModal
        visible={config.visible}
        title={config.title}
        message={config.message}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        onConfirm={config.onConfirm || hide}
        onCancel={config.onCancel || hide}
        hideCancel={config.type !== 'confirm'}
        icon={iconName as any}
        iconColor={iconColor}
        confirmStyle={config.confirmStyle}
        buttons={config.buttons}
      />
    </DialogContext.Provider>
  );
};
