// Catálogo de rubros de negocio y qué campos de producto le corresponden a cada uno.
// Se usa en el onboarding/registro (elegir rubro) y en el ProductModal (mostrar
// solo los campos que tienen sentido para ese tipo de negocio).

export const RUBROS = [
  { id: 'supermercadito', label: 'Supermercadito / Almacén', icon: '🛒' },
  { id: 'verduleria', label: 'Verdulería / Frutería', icon: '🥬' },
  { id: 'ropa', label: 'Ropa / Indumentaria', icon: '👕' },
  { id: 'bazar', label: 'Bazar', icon: '🏺' },
  { id: 'bijouteria', label: 'Bijouterie', icon: '💍' },
  { id: 'perfumeria', label: 'Perfumería', icon: '🧴' },
  { id: 'ferreteria', label: 'Ferretería', icon: '🔩' },
  { id: 'libreria', label: 'Librería', icon: '📚' },
  { id: 'otro', label: 'Otro / Rubro general', icon: '🏬' },
];

// extraFields: campos específicos del rubro que se guardan en prod.extra = { [key]: valor }
// type puede ser: 'text' | 'number' | 'select'
export const RUBRO_CONFIG = {
  supermercadito: { showVencimiento: true, extraFields: [] },
  verduleria: { showVencimiento: true, extraFields: [] },
  ropa: {
    showVencimiento: false,
    extraFields: [
      { key: 'talle', label: 'Talle', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Único'] },
      { key: 'color', label: 'Color', type: 'text' },
    ],
  },
  bazar: { showVencimiento: false, extraFields: [] },
  bijouteria: {
    showVencimiento: false,
    extraFields: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
    ],
  },
  perfumeria: {
    showVencimiento: true,
    extraFields: [{ key: 'volumen', label: 'Volumen (ml)', type: 'number' }],
  },
  ferreteria: {
    showVencimiento: false,
    extraFields: [{ key: 'medida', label: 'Medida / Calibre', type: 'text' }],
  },
  libreria: { showVencimiento: false, extraFields: [] },
  otro: { showVencimiento: true, extraFields: [] },
};

export function getRubroConfig(businessType) {
  return RUBRO_CONFIG[businessType] || RUBRO_CONFIG.otro;
}

export function getRubroLabel(businessType) {
  const r = RUBROS.find((r) => r.id === businessType);
  return r ? `${r.icon} ${r.label}` : 'Sin definir';
}
