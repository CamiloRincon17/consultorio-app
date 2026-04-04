/**
 * Formatea un número como pesos colombianos
 * @param amount - Número a formatear
 * @returns String formateado como COP
 */
export const formatCOP = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Formatea un número como pesos colombianos con símbolo simplificado
 * @param amount - Número a formatear
 * @returns String con formato $ 1.000 (sin decimales)
 */
export const formatCOPShort = (amount: number): string => {
    return `$ ${Math.round(amount).toLocaleString('es-CO')}`;
};
