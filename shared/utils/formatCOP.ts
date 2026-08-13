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

/**
 * Formatea una cadena de texto numérica para input en tiempo real (ej: 150000 -> 150.000)
 */
export const formatInputCOP = (raw: string | number | undefined | null): string => {
    if (raw === null || raw === undefined || raw === "") return "";
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return "";
    return parseInt(digits, 10).toLocaleString("es-CO");
};

/**
 * Convierte un texto con formato COP (ej: "150.000" o "$ 150.000") a número entero (150000)
 */
export const parseInputCOP = (formatted: string | undefined | null): number => {
    if (!formatted) return 0;
    const digits = String(formatted).replace(/\D/g, "");
    return digits ? parseInt(digits, 10) : 0;
};

