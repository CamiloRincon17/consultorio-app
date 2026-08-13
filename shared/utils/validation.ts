// ─── Utilidades de validación de formularios ─────────────────────────────────

/**
 * Valida un número de teléfono colombiano.
 * @returns Mensaje de error o null si es válido.
 */
export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null; // Campo opcional
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 7) return 'El teléfono debe tener al menos 7 dígitos';
  if (cleaned.length > 15) return 'El teléfono es demasiado largo';
  return null;
}

/**
 * Valida un correo electrónico.
 * @returns Mensaje de error o null si es válido.
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return null; // Campo opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Correo electrónico inválido';
  return null;
}

import { parseInputCOP } from './formatCOP';

/**
 * Valida un monto numérico.
 * @returns Mensaje de error o null si es válido.
 */
export function validateAmount(amount: string): string | null {
  if (!amount || !amount.trim()) return null;
  const num = parseInputCOP(amount);
  if (isNaN(num)) return 'Ingresa un monto numérico válido';
  if (num < 0) return 'El monto no puede ser negativo';
  if (num > 999_999_999) return 'El monto es demasiado alto';
  return null;
}

/**
 * Valida que un campo no esté vacío.
 * @returns Mensaje de error o null si es válido.
 */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} es obligatorio`;
  return null;
}

/**
 * Ejecuta múltiples validaciones y retorna el primer error.
 */
export function runValidations(
  ...validations: (string | null)[]
): string | null {
  for (const v of validations) {
    if (v) return v;
  }
  return null;
}
