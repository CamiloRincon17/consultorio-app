import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useThemedStyles, type Palette } from '../theme';

interface FormInputProps extends TextInputProps {
  /** Etiqueta visible encima del input */
  label?: string;
  /** Texto de ayuda debajo del input (opcional) */
  helperText?: string;
  /** Icono opcional a la izquierda del campo (Ionicons) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Componente de icono personalizado (ej: MaterialCommunityIcons, FontAwesome5, etc.) */
  iconComponent?: React.ReactNode;
  /** Estilo adicional para el contenedor del input */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Campo de formulario reutilizable con etiqueta, icono y texto de ayuda opcional.
 * Extiende todas las props de TextInput de React Native.
 *
 * Uso con icono de Ionicons:
 * ```tsx
 * <FormInput icon="person-outline" label="Nombre" ... />
 * ```
 *
 * Uso con icono personalizado (ej. muela/diente):
 * ```tsx
 * <FormInput
 *   label="Nombre"
 *   iconComponent={<MaterialCommunityIcons name="tooth" size={20} color={colors.textSecondary} />}
 *   ...
 * />
 * ```
 */
export const FormInput: React.FC<FormInputProps> = ({
  label,
  helperText,
  icon,
  iconComponent,
  containerStyle,
  style,
  ...rest
}) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.group}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, rest.editable === false && styles.disabledInput, containerStyle]}>
        {iconComponent ? (
          <View style={styles.iconContainer}>{iconComponent}</View>
        ) : icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={colors.textSecondary}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textSecondary}
          {...rest}
        />
      </View>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
};

const createStyles = (colors: Palette) => StyleSheet.create({
  group: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 10,
    color: colors.text,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  disabledInput: {
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
