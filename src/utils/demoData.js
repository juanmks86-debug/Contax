// Demo data generator for Contax PWA
export const DEMO_SECTORES = [
  { id: 'sec-lacteos', name: 'Lácteos', icon: '🥛', color: 'blue' },
  { id: 'sec-bebidas', name: 'Bebidas', icon: '🥤', color: 'green' },
  { id: 'sec-almacen', name: 'Almacén', icon: '🌾', color: 'amber' },
  { id: 'sec-perfumeria', name: 'Perfumería', icon: '🧴', color: 'purple' },
  { id: 'sec-fiambreria', name: 'Fiambrería', icon: '🧀', color: 'coral' }
];

export const DEMO_PRODUCTOS = [
  {
    id: 'prod-leche',
    name: 'Leche Entera 1L',
    sku: '7791234567890',
    catId: 'sec-lacteos',
    cost: 850,
    margin: 30,
    saleManual: 0,
    qty: 18,
    minQty: 8,
    unit: 'uds',
    vencimiento: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 15);
      return d.toISOString().split('T')[0];
    })()
  },
  {
    id: 'prod-yogurt',
    name: 'Yogurt Frutilla 1L',
    sku: '7798765432109',
    catId: 'sec-lacteos',
    cost: 1100,
    margin: 25,
    saleManual: 0,
    qty: 3,
    minQty: 6,
    unit: 'uds',
    vencimiento: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 4); // Expires in 4 days!
      return d.toISOString().split('T')[0];
    })()
  },
  {
    id: 'prod-coca',
    name: 'Coca Cola 1.5L',
    sku: '7790001112223',
    catId: 'sec-bebidas',
    cost: 1300,
    margin: 35,
    saleManual: 1800,
    qty: 24,
    minQty: 10,
    unit: 'uds',
    vencimiento: null
  },
  {
    id: 'prod-cerveza',
    name: 'Cerveza Lata 473ml',
    sku: '7794445556667',
    catId: 'sec-bebidas',
    cost: 650,
    margin: 40,
    saleManual: 0,
    qty: 0, // Out of stock!
    minQty: 12,
    unit: 'uds',
    vencimiento: null
  },
  {
    id: 'prod-fideos',
    name: 'Fideos Codito 500g',
    sku: '7791112223334',
    catId: 'sec-almacen',
    cost: 400,
    margin: 55,
    saleManual: 0,
    qty: 35,
    minQty: 10,
    unit: 'uds',
    vencimiento: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 200);
      return d.toISOString().split('T')[0];
    })()
  },
  {
    id: 'prod-arroz',
    name: 'Arroz Largo Fino 1kg',
    sku: '7795556667778',
    catId: 'sec-almacen',
    cost: 500,
    margin: 40,
    saleManual: 0,
    qty: 6, // Low stock!
    minQty: 10,
    unit: 'uds',
    vencimiento: null
  },
  {
    id: 'prod-shampoo',
    name: 'Shampoo Neutro 400ml',
    sku: '7798889990001',
    catId: 'sec-perfumeria',
    cost: 1800,
    margin: 30,
    saleManual: 2400,
    qty: 15,
    minQty: 5,
    unit: 'uds',
    vencimiento: null
  },
  {
    id: 'prod-queso',
    name: 'Queso Barra Tybo 1kg',
    sku: '7793334445556',
    catId: 'sec-fiambreria',
    cost: 4200,
    margin: 35,
    saleManual: 0,
    qty: 4.8,
    minQty: 2.0,
    unit: 'kg',
    vencimiento: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 22);
      return d.toISOString().split('T')[0];
    })()
  }
];

export function getDemoVentas() {
  const ventas = [];
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Configuration helper to calculate prices
  const getPrices = (p) => {
    const sale = p.saleManual > 0 ? p.saleManual : p.cost * (1 + p.margin / 100);
    const profit = sale - p.cost;
    return { sale, profit };
  };

  const prods = DEMO_PRODUCTOS;

  // Let's generate about 45 sales spread across the last 14 days
  const transactions = [
    // Today
    { daysAgo: 0, prodIdx: 0, qty: 3 }, // Leche
    { daysAgo: 0, prodIdx: 2, qty: 5 }, // Coca
    { daysAgo: 0, prodIdx: 4, qty: 2 }, // Fideos
    { daysAgo: 0, prodIdx: 7, qty: 0.8 }, // Queso

    // Yesterday
    { daysAgo: 1, prodIdx: 0, qty: 4 },
    { daysAgo: 1, prodIdx: 1, qty: 2 }, // Yogurt
    { daysAgo: 1, prodIdx: 2, qty: 6 },
    { daysAgo: 1, prodIdx: 5, qty: 3 }, // Arroz

    // 2 Days ago
    { daysAgo: 2, prodIdx: 0, qty: 2 },
    { daysAgo: 2, prodIdx: 2, qty: 8 },
    { daysAgo: 2, prodIdx: 6, qty: 1 }, // Shampoo

    // 3 Days ago
    { daysAgo: 3, prodIdx: 2, qty: 4 },
    { daysAgo: 3, prodIdx: 4, qty: 5 },
    { daysAgo: 3, prodIdx: 7, qty: 1.2 },

    // 4 Days ago
    { daysAgo: 4, prodIdx: 0, qty: 5 },
    { daysAgo: 4, prodIdx: 1, qty: 1 },
    { daysAgo: 4, prodIdx: 2, qty: 3 },

    // 5 Days ago
    { daysAgo: 5, prodIdx: 2, qty: 7 },
    { daysAgo: 5, prodIdx: 4, qty: 4 },
    { daysAgo: 5, prodIdx: 5, qty: 2 },

    // 6 Days ago
    { daysAgo: 6, prodIdx: 0, qty: 3 },
    { daysAgo: 6, prodIdx: 2, qty: 5 },
    { daysAgo: 6, prodIdx: 6, qty: 2 },

    // 7 Days ago
    { daysAgo: 7, prodIdx: 0, qty: 6 },
    { daysAgo: 7, prodIdx: 2, qty: 9 },
    { daysAgo: 7, prodIdx: 7, qty: 1.5 },

    // 8 to 14 Days ago
    { daysAgo: 8, prodIdx: 4, qty: 3 },
    { daysAgo: 9, prodIdx: 2, qty: 4 },
    { daysAgo: 10, prodIdx: 0, qty: 2 },
    { daysAgo: 11, prodIdx: 7, qty: 0.5 },
    { daysAgo: 12, prodIdx: 2, qty: 6 },
    { daysAgo: 13, prodIdx: 4, qty: 2 },
    { daysAgo: 14, prodIdx: 6, qty: 1 }
  ];

  transactions.forEach((tx, idx) => {
    const p = prods[tx.prodIdx];
    const { sale, profit } = getPrices(p);
    
    // Add a bit of randomness to the hour
    const date = now - (tx.daysAgo * MS_PER_DAY) - (Math.random() * 8 * 60 * 60 * 1000);

    ventas.push({
      id: `demo-v-${idx}`,
      prodId: p.id,
      prodName: p.name,
      prodSku: p.sku || '',
      catId: p.catId,
      qty: tx.qty,
      unit: p.unit || 'uds',
      saleUnit: sale,
      profitUnit: profit,
      total: parseFloat((sale * tx.qty).toFixed(2)),
      totalProfit: parseFloat((profit * tx.qty).toFixed(2)),
      fecha: date
    });
  });

  return ventas;
}
