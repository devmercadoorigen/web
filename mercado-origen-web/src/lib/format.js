export const money = (n) => '$' + Math.round(n).toLocaleString('es-CO');
export const rating = (n) => n.toFixed(1).replace('.', ',');
