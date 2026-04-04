/**
 * Genera un ID único usando Math.random con suficiente entropía para uso local.
 * Formato: timestamp + random → ej. "k7f2x9a1b"
 *
 * Nota: Para producción con sincronización en servidor, migrar a expo-crypto o nanoid.
 */
export const generateId = (): string => {
  const timestamp = Date.now().toString(36); // base 36 timestamp
  const random = Math.random().toString(36).substring(2, 7); // 5 chars random
  return `${timestamp}${random}`;
};
