// Formato de moneda consistente para toda la app.
// Usa separador de miles y 2 decimales fijos (ej: 15.000,00),
// igual al criterio que ya usaban Analytics/Dashboard/Sectores.
export function formatMoney(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
