/**
 * Formatea un número como pesos colombianos
 * @param amount - Número a formatear
 * @returns String formateado como COP
 */
export const formatCOP = (amount: number): string => {
    const safeAmount = (amount != null && !isNaN(amount)) ? amount : 0;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(safeAmount);
};

/**
 * Formatea un número como pesos colombianos con símbolo simplificado
 * @param amount - Número a formatear
 * @returns String con formato $ 1.000 (sin decimales)
 */
export const formatCOPShort = (amount: number): string => {
    const safeAmount = (amount != null && !isNaN(amount)) ? amount : 0;
    return `$ ${Math.round(safeAmount).toLocaleString('es-CO')}`;
};
