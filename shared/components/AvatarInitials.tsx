import { View, Text, StyleSheet } from 'react-native';

// ─── Paleta de colores pastel para avatares ──────────────────────────────────
const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#85C1E9', '#F8C471', '#82E0AA', '#F1948A',
  '#AED6F1', '#A3E4D7', '#FAD7A0', '#D7BDE2',
];

/** Genera un color consistente a partir del nombre del paciente. */
function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Extrae las iniciales del nombre: primera y última palabra, ignorando símbolos. */
function getInitials(name: string): string {
  // Solo conservamos letras y espacios
  const cleanName = name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
  
  if (!cleanName) return '??';

  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
}

/**
 * Avatar con iniciales del paciente.
 * Color de fondo determinístico basado en el nombre.
 */
export const AvatarInitials = ({ name, size = 50 }: AvatarProps) => {
  const bgColor = getColorFromName(name);
  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  initials: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
