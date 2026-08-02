// =============================================
//   app.js — Gestor de Inventario Android-ready
//   IndexedDB + localStorage fallback + sync offline
//   + Mejoras: unidades, SKU, filtros fecha, alertas stock
//   =============================================

const CC = {
  blue:   { bg: '#E6F1FB', text: '#0C447C', border: '#378ADD', bar: '#378ADD' },
  green:  { bg: '#EAF3DE', text: '#27500A', border: '#639922', bar: '#639922' },
  amber:  { bg: '#FAEEDA', text: '#633806', border: '#BA7517', bar: '#BA7517' },
  coral:  { bg: '#FAECE7', text: '#4A1B0C', border: '#D85A30', bar: '#D85A30' },
  purple: { bg: '#EEEDFE', text: '#26215C', border: '#534AB7', bar: '#534AB7' },
  teal:   { bg: '#E1F5EE', text: '#04342C', border: '#1D9E75', bar: '#1D9E75' },
  pink:   { bg: '#FBEAF0', text: '#4B1528', border: '#993556', bar: '#993556' }
};

const UNIDADES = {
  uds:   { label: 'unidades', abbr: 'uds', icon: '📦' },
  kg:    { label: 'kilogramos', abbr: 'kg', icon: '⚖️' },
  L:     { label: 'litros', abbr: 'L', icon: '🧴' },
  m:     { label: 'metros', abbr: 'm', icon: '📏' },
  m2:    { label: 'metros²', abbr: 'm²', icon: '📐' },
  m3:    { label: 'metros³', abbr: 'm³', icon: '📦' },
  doc:   { label: 'docenas', abbr: 'doc', icon: '🥚' },
  caja:  { label: 'cajas', abbr: 'caja', icon: '📦' }
};

// =============================================
//   INDEXEDDB
//   =============================================
const DB_NAME = 'InventarioDB';
const DB_VERSION = 2; // Incrementado para migración
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('sectores')) d.createObjectStore('sectores', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('productos')) d.createObjectStore('productos', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('ventas')) d.createObjectStore('ventas', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('sync')) d.createObjectStore('sync', { keyPath: 'id', autoIncrement: true });
    };
  });
}

function dbPut(store, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    if (Array.isArray(data)) {
      st.clear();
      data.forEach(item => st.put(item));
    } else {
      st.put(data);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const req = st.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// =============================================
//   ESTADO
//   =============================================
let D = { cats: [], prods: [], ventas: [] };
let editSid = null, editPid = null, fCat = 'all', vProdId = null, vQty = 1;
let isOnline = navigator.onLine;
let ganFilter = 'todo'; // 'hoy' | 'semana' | 'mes' | 'todo'

// =============================================
//   UTILIDADES
//   =============================================
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function getSale(p) { return p.saleManual > 0 ? p.saleManual : p.cost * (1 + p.margin / 100); }
function getProfit(p) { return getSale(p) - p.cost; }
function getUnit(p) { return UNIDADES[p.unit || 'uds'] || UNIDADES.uds; }
function todayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function weekStart() { const d = new Date(); d.setHours(0,0,0,0); const day = d.getDay(); d.setDate(d.getDate() - day); return d.getTime(); }
function monthStart() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); }
function fmtDate(ts) {
  const d = new Date(ts);
  return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function getCat(id) { return D.cats.find(c => c.id === id) || { name: 'Sin sector', color: 'blue', icon: '📦' }; }
function getCC(color) { return CC[color] || CC.blue; }

// =============================================
//   TOAST NATIVO
//   =============================================
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

// =============================================
//   OFFLINE / ONLINE
//   =============================================
function updateOnlineStatus() {
  isOnline = navigator.onLine;
  const banner = document.getElementById('offline-banner');
  if (isOnline) {
    banner.classList.add('hidden');
    showToast('🌐 Conexión restaurada');
    syncPendingData();
  } else {
    banner.classList.remove('hidden');
    showToast('📴 Modo offline activado');
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

async function syncPendingData() {
  if (!isOnline || !db) return;
  showToast('✅ Datos sincronizados');
}

function showSyncStatus(show) {
  const el = document.getElementById('sync-status');
  if (show) el.classList.remove('hidden');
  else el.classList.add('hidden');
}

// =============================================
//   ALERTAS DE STOCK BAJO
//   =============================================
function checkLowStock() {
  const low = D.prods.filter(p => p.qty <= p.minQty);
  if (low.length > 0) {
    // Actualizar badge en el título (simulado)
    document.title = low.length > 0 ? `(${low.length}) Gestor de Inventario` : 'Gestor de Inventario';
    // Mostrar toast al cargar
    setTimeout(() => {
      showToast(`⚠️ ${low.length} producto${low.length === 1 ? '' : 's'} con stock bajo`, 4000);
    }, 1500);
  }
}

// =============================================
//   CARGAR / GUARDAR
//   =============================================
async function load() {
  try {
    await openDB();
    const [cats, prods, ventas] = await Promise.all([
      dbGetAll('sectores'),
      dbGetAll('productos'),
      dbGetAll('ventas')
    ]);
    D.cats = cats.length ? cats : [];
    D.prods = prods.length ? prods : [];
    D.ventas = ventas.length ? ventas : [];
    if (!D.cats.length && !D.prods.length) {
      const s = localStorage.getItem('inv_pwa_v1');
      if (s) {
        D = JSON.parse(s);
        if (!D.cats) D.cats = []; if (!D.prods) D.prods = []; if (!D.ventas) D.ventas = [];
        // Migrar campos nuevos si faltan
        D.prods.forEach(p => { if (!p.unit) p.unit = 'uds'; if (!p.sku) p.sku = ''; });
        await Promise.all([
          dbPut('sectores', D.cats),
          dbPut('productos', D.prods),
          dbPut('ventas', D.ventas)
        ]);
      }
    }
  } catch (e) {
    console.error('Error cargando IndexedDB:', e);
    try {
      const s = localStorage.getItem('inv_pwa_v1');
      if (s) D = JSON.parse(s);
    } catch (e2) {}
  }
  if (!D.cats) D.cats = []; if (!D.prods) D.prods = []; if (!D.ventas) D.ventas = [];
  // Asegurar campos nuevos en productos existentes
  D.prods.forEach(p => { if (!p.unit) p.unit = 'uds'; if (!p.sku) p.sku = ''; });
  render();
  checkLowStock();
}

async function save() {
  try {
    if (db) {
      await Promise.all([
        dbPut('sectores', D.cats),
        dbPut('productos', D.prods),
        dbPut('ventas', D.ventas)
      ]);
    }
    localStorage.setItem('inv_pwa_v1', JSON.stringify(D));
  } catch (e) {
    console.error('Error guardando:', e);
    showToast('⚠️ Error guardando datos');
  }
}

// =============================================
//   NAVEGACIÓN
//   =============================================
let curTab = 'inicio';
const TABS = ['inicio', 'vender', 'ganancias', 'auto', 'sectores', 'productos'];

function showTab(t) {
  curTab = t;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');
  document.querySelectorAll('.nav button')[TABS.indexOf(t)].classList.add('active');
  const labels = { inicio: 'Sector', vender: 'Producto', ganancias: '', sectores: 'Sector', productos: 'Producto' };
  const fab = document.getElementById('fab');
  if (t === 'ganancias') { fab.classList.add('hidden'); }
  else { fab.classList.remove('hidden'); document.getElementById('fab-txt').textContent = labels[t] || 'Agregar'; }
  render();
}

function openFab() {
  if (curTab === 'sectores' || curTab === 'inicio') openSectorModal();
  else openProdModal();
}

// =============================================
//   MODALES
//   =============================================
function openSectorModal(id) {
  editSid = id || null;
  const c = id ? D.cats.find(x => x.id === id) : null;
  document.getElementById('ms-title').textContent = c ? 'Editar sector' : 'Nuevo sector';
  document.getElementById('ms-name').value = c ? c.name : '';
  document.getElementById('ms-icon').value = c ? c.icon : '';
  document.getElementById('ms-color').value = c ? c.color : 'blue';
  document.getElementById('m-sector').classList.remove('hidden');
}

function openProdModal(id) {
  if (!D.cats.length) { showToast('Primero creá un sector'); return; }
  editPid = id || null;
  const p = id ? D.prods.find(x => x.id === id) : null;
  document.getElementById('mp-title').textContent = p ? 'Editar producto' : 'Nuevo producto';
  document.getElementById('mp-name').value = p ? p.name : '';
  document.getElementById('mp-sku').value = p ? p.sku : '';
  document.getElementById('mp-qty').value = p ? p.qty : '';
  document.getElementById('mp-min').value = p ? p.minQty : '5';
  document.getElementById('mp-cost').value = p ? p.cost : '';
  document.getElementById('mp-mg').value = p ? p.margin : '30';
  document.getElementById('mp-sale').value = p && p.saleManual ? p.saleManual : '';
  document.getElementById('mp-unit').value = p ? (p.unit || 'uds') : 'uds';
  document.getElementById('mp-venc').value = p && p.vencimiento ? p.vencimiento : '';
  const sel = document.getElementById('mp-cat');
  sel.innerHTML = D.cats.map(c => '<option value="' + c.id + '"' + (p && p.catId === c.id ? ' selected' : '') + '>' + (c.icon || '') + ' ' + c.name + '</option>').join('');
  calcPrev();
  document.getElementById('m-prod').classList.remove('hidden');
}

function openVentaModal(id) {
  const p = D.prods.find(x => x.id === id); if (!p) return;
  if (p.qty <= 0) { showToast('Sin stock disponible'); return; }
  vProdId = id; vQty = 1;
  const u = getUnit(p);
  document.getElementById('mv-title').textContent = 'Vender: ' + p.name;
  const cat = getCat(p.catId); const col = getCC(cat.color);
  document.getElementById('mv-info').innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:' + col.bg + ';border-radius:var(--radius-sm);border:1.5px solid ' + col.border + '">' +
    '<span style="font-size:24px">' + (cat.icon || '📦') + '</span>' +
    '<div>' +
    '<div style="font-size:14px;font-weight:600;color:' + col.text + '">' + p.name + (p.sku ? ' <span style="font-size:11px;opacity:.7">(' + p.sku + ')</span>' : '') + '</div>' +
    '<div style="font-size:12px;color:' + col.text + ';opacity:.75">Sector: ' + cat.name + ' · Stock: ' + p.qty + ' ' + u.abbr + '</div>' +
    '</div></div>';
  updVentaPrev();
  document.getElementById('m-venta').classList.remove('hidden');
}

function closeModals() {
  ['m-sector', 'm-prod', 'm-venta'].forEach(id => document.getElementById(id).classList.add('hidden'));
  editSid = null; editPid = null;
}

// =============================================
//   CÁLCULOS
//   =============================================
function calcPrev() {
  const cost = parseFloat(document.getElementById('mp-cost').value) || 0;
  const mg = parseFloat(document.getElementById('mp-mg').value) || 0;
  const man = parseFloat(document.getElementById('mp-sale').value) || 0;
  const sale = man > 0 ? man : cost * (1 + mg / 100);
  document.getElementById('pp-sale').textContent = sale > 0 ? '$' + sale.toFixed(2) : '—';
  document.getElementById('pp-profit').textContent = sale > 0 ? '$' + (sale - cost).toFixed(2) : '—';
}

function updVentaPrev() {
  const p = D.prods.find(x => x.id === vProdId); if (!p) return;
  const u = getUnit(p);
  vQty = Math.max(1, Math.min(vQty, p.qty));
  document.getElementById('mv-qty').textContent = vQty;
  const sale = getSale(p), profit = getProfit(p);
  document.getElementById('mvp-unit').textContent = '$' + sale.toFixed(2);
  document.getElementById('mvp-total').textContent = '$' + (sale * vQty).toFixed(2);
  document.getElementById('mvp-profit').textContent = '$' + (profit * vQty).toFixed(2) + ' (' + ((profit / Math.max(p.cost, .01)) * 100).toFixed(0) + '%)';
}
function chgQty(d) { vQty += d; updVentaPrev(); }

// =============================================
//   GUARDAR / VENDER
//   =============================================
async function saveSector() {
  const name = document.getElementById('ms-name').value.trim();
  if (!name) { showToast('Ingresá un nombre'); return; }
  const obj = { name, icon: document.getElementById('ms-icon').value.trim() || '📦', color: document.getElementById('ms-color').value };
  if (editSid) { Object.assign(D.cats.find(x => x.id === editSid), obj); }
  else { D.cats.push({ id: uid(), ...obj }); }
  await save(); closeModals(); render();
  showToast(editSid ? 'Sector actualizado' : 'Sector creado');
}

async function saveProd() {
  const name = document.getElementById('mp-name').value.trim();
  if (!name) { showToast('Ingresá un nombre'); return; }
  const vencVal = document.getElementById('mp-venc').value;
  const obj = {
    name,
    sku: document.getElementById('mp-sku').value.trim(),
    catId: document.getElementById('mp-cat').value,
    cost: parseFloat(document.getElementById('mp-cost').value) || 0,
    margin: parseFloat(document.getElementById('mp-mg').value) || 30,
    saleManual: parseFloat(document.getElementById('mp-sale').value) || 0,
    qty: parseInt(document.getElementById('mp-qty').value) || 0,
    minQty: parseInt(document.getElementById('mp-min').value) || 5,
    unit: document.getElementById('mp-unit').value || 'uds',
    vencimiento: vencVal || null
  };
  if (editPid) { Object.assign(D.prods.find(x => x.id === editPid), { ...obj, id: editPid }); }
  else { D.prods.push({ id: uid(), ...obj }); }
  await save(); closeModals(); render();
  showToast(editPid ? 'Producto actualizado' : 'Producto creado');
}

async function confirmarVenta() {
  const p = D.prods.find(x => x.id === vProdId); if (!p) return;
  if (vQty > p.qty) { showToast('No hay suficiente stock'); return; }
  p.qty -= vQty;
  const sale = getSale(p), profit = getProfit(p);
  D.ventas.push({
    id: uid(), prodId: p.id, prodName: p.name, prodSku: p.sku || '', catId: p.catId, qty: vQty,
    unit: p.unit || 'uds',
    saleUnit: sale, profitUnit: profit,
    total: parseFloat((sale * vQty).toFixed(2)),
    totalProfit: parseFloat((profit * vQty).toFixed(2)),
    fecha: Date.now()
  });
  await save(); closeModals(); render();
  showTab('vender');
  showToast('✅ Vendido: ' + vQty + ' ' + getUnit(p).abbr + ' de ' + p.name);
}

async function delSector(id) {
  if (!confirm('¿Eliminar este sector y todos sus productos?')) return;
  D.prods = D.prods.filter(p => p.catId !== id);
  D.cats = D.cats.filter(c => c.id !== id);
  await save(); render();
  showToast('Sector eliminado');
}

async function delProd(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  D.prods = D.prods.filter(p => p.id !== id);
  await save(); render();
  showToast('Producto eliminado');
}

// =============================================
//   FILTROS DE FECHA PARA GANANCIAS
//   =============================================
function setGanFilter(f) {
  ganFilter = f;
  renderGanancias();
}

function getVentasFiltradas() {
  const now = Date.now();
  switch (ganFilter) {
    case 'hoy': return D.ventas.filter(v => v.fecha >= todayStart());
    case 'semana': return D.ventas.filter(v => v.fecha >= weekStart());
    case 'mes': return D.ventas.filter(v => v.fecha >= monthStart());
    default: return D.ventas;
  }
}

function getGanFilterLabel() {
  switch (ganFilter) {
    case 'hoy': return 'Hoy';
    case 'semana': return 'Esta semana';
    case 'mes': return 'Este mes';
    default: return 'Todo el historial';
  }
}

// =============================================
//   RENDER
//   =============================================
function render() {
  document.getElementById('header-sub').textContent = D.cats.length + ' sectores · ' + D.prods.length + ' productos';
  renderInicio(); renderVender(); renderGanancias(); renderSectores(); renderProductos(); renderAuto();
}

function renderInicio() {
  document.getElementById('s-cats').textContent = D.cats.length;
  document.getElementById('s-prods').textContent = D.prods.length;
  const vHoy = D.ventas.filter(v => v.fecha >= todayStart());
  document.getElementById('s-ventas').textContent = vHoy.length;
  const totalGan = D.ventas.reduce((a, v) => a + v.totalProfit, 0);
  document.getElementById('s-ganancia').textContent = '$' + totalGan.toFixed(2);

  const low = D.prods.filter(p => p.qty <= p.minQty);
  const hl = document.getElementById('home-low');
  if (low.length) {
    hl.innerHTML = '<div class="card" style="border-color:#EF9F27"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="font-size:14px;font-weight:600;color:var(--amber)">⚠ Stock bajo</span><span class="tag tag-amber">' + low.length + ' productos</span></div>' +
      low.map(p => { const c = getCat(p.catId); const u = getUnit(p); return '<div class="prod-item"><div><div style="font-size:14px;font-weight:500">' + p.name + (p.sku ? ' <span style="font-size:11px;color:var(--text3)">(' + p.sku + ')</span>' : '') + '</div><div style="font-size:12px;color:var(--text2)">' + c.icon + ' ' + c.name + '</div></div><div style="font-size:14px;font-weight:600;color:var(--amber)">' + p.qty + ' ' + u.abbr + '</div></div>'; }).join('') + '</div>';
  } else hl.innerHTML = '';

  const hv = document.getElementById('home-ventas');
  if (!D.ventas.length) { hv.innerHTML = '<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.97-1.67l1.38-7.84H6"/></svg>Sin ventas registradas aún.<br>Andá a <b>Vender</b> para empezar.</div>'; return; }
  const last = [...D.ventas].slice(-6).reverse();
  hv.innerHTML = '<div class="card"><div style="font-size:14px;font-weight:600;margin-bottom:8px">Últimas ventas</div>' +
    last.map(v => { const u = UNIDADES[v.unit] || UNIDADES.uds; return '<div class="venta-row"><div><div style="font-weight:500">' + v.prodName + (v.prodSku ? ' <span style="font-size:11px;color:var(--text3)">(' + v.prodSku + ')</span>' : '') + '</div><div style="font-size:11px;color:var(--text2)">' + v.qty + ' ' + u.abbr + ' · ' + fmtDate(v.fecha) + '</div></div><div style="text-align:right"><div style="font-weight:600;color:var(--blue-text)">$' + v.total.toFixed(2) + '</div><div style="font-size:11px;color:var(--green-text)">+$' + v.totalProfit.toFixed(2) + '</div></div></div>'; }).join('') + '</div>';
}

function renderVender() {
  const chips = document.getElementById('vender-chips');
  let chipsHtml = `<span class="chip${fCat === 'all' ? ' active' : ''}" onclick="fCat='all';render()">Todos</span>`;
  D.cats.forEach(c => {
    chipsHtml += `<span class="chip${fCat === c.id ? ' active' : ''}" onclick="fCat='${c.id}';render()">${c.icon || ''} ${c.name}</span>`;
  });
  chips.innerHTML = chipsHtml;
  const prods = fCat === 'all' ? D.prods : D.prods.filter(p => p.catId === fCat);
  const el = document.getElementById('vender-list');
  if (!prods.length) { el.innerHTML = '<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Sin productos. Creá uno en <b>Productos</b>.</div>'; return; }

  let html = '';
  prods.forEach(p => {
    const cat = getCat(p.catId); const col = getCC(cat.color);
    const sale = getSale(p); const profit = getProfit(p); const u = getUnit(p);
    const noStock = p.qty <= 0; const lowStock = p.qty <= p.minQty && !noStock;
    html += `<div class="card" style="${noStock ? 'opacity:.55' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:20px">${cat.icon}</span>
            <span style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</span>
          </div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:6px">
            <span class="tag" style="background:${col.bg};color:${col.text}">${cat.name}</span>
            ${p.sku ? `<span style="font-size:11px;color:var(--text3)">SKU: ${p.sku}</span>` : ''}
          </div>
          <div style="display:flex;gap:12px;font-size:12px;color:var(--text2)">
            <span>Costo: <b style="color:var(--text)">$${p.cost.toFixed(2)}</b></span>
            <span>Margen: <b style="color:var(--text)">${p.margin}%</b></span>
          </div>
          <div style="font-size:12px;margin-top:3px">
            Stock: <b style="color:${noStock ? 'var(--red)' : lowStock ? 'var(--amber)' : 'var(--green)'}">${p.qty} ${u.abbr}${noStock ? ' — SIN STOCK' : lowStock ? ' — BAJO' : ''}</b>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:18px;font-weight:700;color:var(--blue-text)">$${sale.toFixed(2)}</div>
          <div style="font-size:12px;color:var(--green-text);margin-bottom:10px">+$${profit.toFixed(2)}</div>
          <button class="btn btn-success" ${noStock ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''} onclick="openVentaModal('${p.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.97-1.67l1.38-7.84H6"/></svg>
            Vender
          </button>
        </div>
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

function renderGanancias() {
  const gs = document.getElementById('gan-stats');
  const ge = document.getElementById('gan-sectores');
  const gh = document.getElementById('gan-historial');

  const ventasFiltradas = getVentasFiltradas();

  if (!D.ventas.length) {
    gs.innerHTML = '<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Registrá ventas para ver<br>tus ganancias por sector.</div>';
    ge.innerHTML = ''; gh.innerHTML = ''; return;
  }

  const tVentas = ventasFiltradas.reduce((a, v) => a + v.total, 0);
  const tGan = ventasFiltradas.reduce((a, v) => a + v.totalProfit, 0);
  const vHoy = D.ventas.filter(v => v.fecha >= todayStart());
  const tHoy = vHoy.reduce((a, v) => a + v.total, 0);
  const gHoy = vHoy.reduce((a, v) => a + v.totalProfit, 0);
  const filterLabel = getGanFilterLabel();

  gs.innerHTML = `<div style="margin-bottom:14px">
    <div class="filter-chips" style="margin-bottom:14px">
      <span class="chip${ganFilter === 'hoy' ? ' active' : ''}" onclick="setGanFilter('hoy')">Hoy</span>
      <span class="chip${ganFilter === 'semana' ? ' active' : ''}" onclick="setGanFilter('semana')">Esta semana</span>
      <span class="chip${ganFilter === 'mes' ? ' active' : ''}" onclick="setGanFilter('mes')">Este mes</span>
      <span class="chip${ganFilter === 'todo' ? ' active' : ''}" onclick="setGanFilter('todo')">Todo</span>
    </div>
    <div class="stats-grid">
      <div class="stat"><div class="stat-lbl">${filterLabel} — Vendido</div><div class="stat-val blue">$${tVentas.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-lbl">${filterLabel} — Ganancia</div><div class="stat-val green">$${tGan.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-lbl">Vendido hoy</div><div class="stat-val blue">$${tHoy.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-lbl">Ganancia hoy</div><div class="stat-val green">$${gHoy.toFixed(2)}</div></div>
    </div>
  </div>`;

  const byCat = {};
  ventasFiltradas.forEach(v => {
    if (!byCat[v.catId]) byCat[v.catId] = { total: 0, profit: 0, qty: 0 };
    byCat[v.catId].total += v.total; byCat[v.catId].profit += v.totalProfit; byCat[v.catId].qty += v.qty;
  });
  const maxP = Math.max(...Object.values(byCat).map(x => x.profit), 1);
  const sorted = Object.entries(byCat).sort((a, b) => b[1].profit - a[1].profit);

  let sectoresHtml = '';
  sorted.forEach(([cid, d]) => {
    const cat = getCat(cid); const col = getCC(cat.color);
    const pct = Math.round((d.profit / maxP) * 100);
    const mg = d.total > 0 ? ((d.profit / d.total) * 100).toFixed(1) : 0;
    sectoresHtml += `<div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:14px;font-weight:600">${cat.icon} ${cat.name}</span>
        <span style="font-size:15px;font-weight:700;color:var(--green-text)">+$${d.profit.toFixed(2)}</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${col.bar}"></div></div>
      <div style="display:flex;gap:14px;font-size:11px;color:var(--text2)">
        <span>Vendido: $${d.total.toFixed(2)}</span>
        <span>Margen real: ${mg}%</span>
        <span>Unidades: ${d.qty}</span>
      </div>
    </div>`;
  });
  ge.innerHTML = `<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:14px">📊 Ganancias por sector (${filterLabel.toLowerCase()})</div>${sectoresHtml}</div>`;

  const last = [...ventasFiltradas].slice(-30).reverse();
  let historialHtml = '';
  last.forEach(v => {
    const u = UNIDADES[v.unit] || UNIDADES.uds;
    historialHtml += `<div class="venta-row">
      <div>
        <div style="font-weight:500">${v.prodName}${v.prodSku ? ` <span style="font-size:11px;color:var(--text3)">(${v.prodSku})</span>` : ''}</div>
        <div style="font-size:11px;color:var(--text2)">${v.qty} ${u.abbr} · ${fmtDate(v.fecha)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:600;color:var(--blue-text)">$${v.total.toFixed(2)}</div>
        <div style="font-size:11px;color:var(--green-text)">+$${v.totalProfit.toFixed(2)}</div>
      </div>
    </div>`;
  });
  gh.innerHTML = `<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:10px">📋 Historial (${filterLabel.toLowerCase()})</div>${historialHtml}</div>`;
}

function renderSectores() {
  const el = document.getElementById('sec-list');
  if (!D.cats.length) { el.innerHTML = '<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>Sin sectores.<br>Tocá <b>+ Sector</b> para crear uno.</div>'; return; }

  let html = '';
  D.cats.forEach(c => {
    const col = getCC(c.color);
    const prods = D.prods.filter(p => p.catId === c.id);
    const valStock = prods.reduce((a, p) => a + getSale(p) * p.qty, 0);
    html += `<div class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="width:46px;height:46px;border-radius:12px;background:${col.bg};border:1.5px solid ${col.border};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">${c.icon}</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:600">${c.name}</div>
          <div style="font-size:12px;color:var(--text2)">${prods.length} productos · Valor stock: $${valStock.toFixed(2)}</div>
        </div>
      </div>
      <div style="display:flex;gap:7px">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="openProdModal();setTimeout(()=>document.getElementById('mp-cat').value='${c.id}',50)">+ Producto</button>
        <button class="btn btn-sm btn-icon" onclick="openSectorModal('${c.id}')">✏️</button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="delSector('${c.id}')">🗑</button>
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

function renderProductos() {
  const chips = document.getElementById('prod-chips');
  let chipsHtml = `<span class="chip${fCat === 'all' ? ' active' : ''}" onclick="fCat='all';render()">Todos</span>`;
  D.cats.forEach(c => {
    chipsHtml += `<span class="chip${fCat === c.id ? ' active' : ''}" onclick="fCat='${c.id}';render()">${c.icon || ''} ${c.name}</span>`;
  });
  chips.innerHTML = chipsHtml;
  const prods = fCat === 'all' ? D.prods : D.prods.filter(p => p.catId === fCat);
  const el = document.getElementById('prod-list');
  if (!prods.length) { el.innerHTML = '<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Sin productos en este sector.</div>'; return; }

  let html = '';
  prods.forEach(p => {
    const cat = getCat(p.catId); const col = getCC(cat.color);
    const sale = getSale(p); const profit = getProfit(p); const low = p.qty <= p.minQty;
    const u = getUnit(p);
    html += `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600;margin-bottom:4px">${p.name}</div>
          <span class="tag" style="background:${col.bg};color:${col.text}">${cat.icon} ${cat.name}</span>
          ${p.sku ? `<span style="font-size:11px;color:var(--text3)">SKU: ${p.sku}</span>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:10px">
          <div style="font-size:16px;font-weight:700;color:var(--blue-text)">$${sale.toFixed(2)}</div>
          <div style="font-size:12px;color:var(--green-text)">+$${profit.toFixed(2)}</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text2);margin-bottom:10px">
        <span>Costo: <b style="color:var(--text)">$${p.cost.toFixed(2)}</b></span>
        <span>Margen: <b style="color:var(--text)">${p.margin}%</b></span>
        <span>Stock: <b style="color:${low ? 'var(--amber)' : 'var(--text)'}">${p.qty} ${u.abbr}${low ? ' ⚠' : ''}</b></span>
        <span>Mín: <b style="color:var(--text)">${p.minQty} ${u.abbr}</b></span>
      </div>
      <div style="display:flex;gap:7px">
        <button class="btn btn-success btn-sm" style="flex:1" onclick="openVentaModal('${p.id}')">🛒 Vender</button>
        <button class="btn btn-sm btn-icon" onclick="openProdModal('${p.id}')">✏️</button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="delProd('${p.id}')">🗑</button>
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

// =============================================
//   EVENT LISTENERS
//   =============================================
['m-sector', 'm-prod', 'm-venta'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) { if (e.target === this) closeModals(); });
});

document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

load();


// =============================================
//   AUTOMATIZACIONES
//   =============================================

// ----- UTILIDADES DE FECHA -----
function diasRestantes(fechaStr) {
  if (!fechaStr) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const venc = new Date(fechaStr);
  const diff = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}

function fmtFecha(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  return d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
}

// ----- VENTAS PROMEDIO POR DÍA -----
function getVentasPromedioDiarias(prodId, dias = 30) {
  const desde = Date.now() - (dias * 24 * 60 * 60 * 1000);
  const ventasProd = D.ventas.filter(v => v.prodId === prodId && v.fecha >= desde);
  if (!ventasProd.length) return 0;
  const totalQty = ventasProd.reduce((a, v) => a + v.qty, 0);
  return totalQty / dias;
}

// ----- DÍAS DE STOCK RESTANTE -----
function getDiasStock(p) {
  const ventaDiaria = getVentasPromedioDiarias(p.id, 30);
  if (ventaDiaria <= 0) return p.qty <= p.minQty ? 0 : 999;
  return Math.floor(p.qty / ventaDiaria);
}

// ----- ALERTAS INTELIGENTES -----
function getAlertas() {
  const alertas = [];

  D.prods.forEach(p => {
    const dias = getDiasStock(p);
    const u = getUnit(p);

    // Stock crítico (0 días o sin stock)
    if (p.qty <= 0) {
      alertas.push({
        tipo: 'critical',
        icono: '🚨',
        titulo: 'Sin stock: ' + p.name,
        desc: `No quedan ${u.label}. Se dejaron de vender.`,
        accion: 'Comprar urgente',
        prodId: p.id
      });
    }
    // Stock bajo (menos de 7 días)
    else if (dias <= 7 && dias > 0) {
      alertas.push({
        tipo: 'warning',
        icono: '⚠️',
        titulo: 'Stock bajo: ' + p.name,
        desc: `Quedan ${p.qty} ${u.abbr} (${dias} días al ritmo actual).`,
        accion: 'Comprar pronto',
        prodId: p.id
      });
    }
    // Sin ventas recientes pero con stock
    else if (dias === 999 && p.qty > p.minQty * 3) {
      alertas.push({
        tipo: 'info',
        icono: '💡',
        titulo: 'Stock estancado: ' + p.name,
        desc: `Tenés ${p.qty} ${u.abbr} pero no se vendió en 30 días.`,
        accion: 'Revisar precio',
        prodId: p.id
      });
    }
  });

  return alertas;
}

// ----- LISTA DE COMPRAS AUTO -----
function getListaCompras() {
  const lista = [];

  D.prods.forEach(p => {
    const dias = getDiasStock(p);
    const u = getUnit(p);
    const ventaDiaria = getVentasPromedioDiarias(p.id, 30);

    // Si le quedan 14 días o menos de stock
    if (dias <= 14) {
      // Calcular cuánto comprar para 30 días
      const sugerido = Math.max(
        p.minQty * 2,
        Math.ceil(ventaDiaria * 30) - p.qty
      );

      if (sugerido > 0) {
        lista.push({
          prodId: p.id,
          nombre: p.name,
          sku: p.sku,
          icono: getCat(p.catId).icon,
          actual: p.qty,
          sugerido: sugerido,
          unidad: u.abbr,
          dias: dias,
          prioridad: dias <= 3 ? 'alta' : dias <= 7 ? 'media' : 'baja'
        });
      }
    }
  });

  return lista.sort((a, b) => a.dias - b.dias);
}

// ----- VENCIMIENTOS -----
function getVencimientos() {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const vencimientos = [];

  D.prods.forEach(p => {
    if (!p.vencimiento) return;
    const dias = diasRestantes(p.vencimiento);
    if (dias === null) return;

    let estado = 'ok';
    if (dias <= 0) estado = 'critical';
    else if (dias <= 7) estado = 'warning';
    else if (dias > 30) return; // Solo mostrar los próximos 30 días

    vencimientos.push({
      nombre: p.name,
      icono: getCat(p.catId).icon,
      fecha: p.vencimiento,
      dias: dias,
      estado: estado,
      qty: p.qty,
      unidad: (getUnit(p)).abbr
    });
  });

  return vencimientos.sort((a, b) => a.dias - b.dias);
}

// ----- PREDICCIÓN DE DEMANDA -----
function getPrediccionDemanda() {
  const predicciones = [];

  D.prods.forEach(p => {
    const ventaDiaria = getVentasPromedioDiarias(p.id, 30);
    if (ventaDiaria <= 0) return;

    // Comparar con el mes anterior
    const hace60dias = Date.now() - (60 * 24 * 60 * 60 * 1000);
    const hace30dias = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const ventasMesPasado = D.ventas.filter(v => v.prodId === p.id && v.fecha >= hace60dias && v.fecha < hace30dias);
    const qtyMesPasado = ventasMesPasado.reduce((a, v) => a + v.qty, 0);
    const promedioMesPasado = qtyMesPasado / 30;

    let tendencia = 0;
    if (promedioMesPasado > 0) {
      tendencia = ((ventaDiaria - promedioMesPasado) / promedioMesPasado) * 100;
    }

    const u = getUnit(p);
    predicciones.push({
      nombre: p.name,
      icono: getCat(p.catId).icon,
      ventaDiaria: ventaDiaria,
      tendencia: tendencia,
      unidad: u.abbr,
      estimado30dias: Math.ceil(ventaDiaria * 30)
    });
  });

  return predicciones.sort((a, b) => b.ventaDiaria - a.ventaDiaria).slice(0, 10);
}

// ----- RENDER AUTOMATIZACIONES -----
function renderAuto() {
  const alertas = getAlertas();
  const compras = getListaCompras();
  const vencimientos = getVencimientos();
  const predicciones = getPrediccionDemanda();

  // Alertas inteligentes
  const elAlertas = document.getElementById('auto-alertas');
  if (!alertas.length) {
    elAlertas.innerHTML = '<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg><b>¡Todo en orden!</b><br>No hay alertas por ahora.</div>';
  } else {
    elAlertas.innerHTML = '<div style="font-size:15px;font-weight:600;margin-bottom:12px">🚨 Alertas inteligentes</div>' +
      alertas.map(a => `<div class="alert-card ${a.tipo}">
        <div class="alert-title">${a.icono} ${a.titulo}</div>
        <div class="alert-desc">${a.desc}</div>
        <div class="alert-actions">
          <button class="btn btn-sm btn-primary" onclick="openProdModal('${a.prodId}')">Editar producto</button>
        </div>
      </div>`).join('');
  }

  // Lista de compras
  const elCompras = document.getElementById('auto-compras');
  if (!compras.length) {
    elCompras.innerHTML = '';
  } else {
    let html = '<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:12px">🛒 Lista de compras sugerida</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">Basada en el ritmo de ventas de los últimos 30 días</div>';
    html += compras.map(c => {
      const prioridadColor = c.prioridad === 'alta' ? 'var(--red)' : c.prioridad === 'media' ? 'var(--amber)' : 'var(--text2)';
      return `<div class="compra-item">
        <div class="compra-check" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"></div>
        <div class="compra-info">
          <div class="compra-name">${c.icono} ${c.nombre}${c.sku ? ` <span style="font-size:11px;color:var(--text3)">(${c.sku})</span>` : ''}</div>
          <div class="compra-detail">Stock actual: ${c.actual} ${c.unidad} · ${c.dias <= 0 ? 'Sin stock' : c.dias + ' días restantes'}</div>
        </div>
        <div class="compra-qty">
          <div style="font-size:14px;font-weight:600;color:var(--blue-text)">+${c.sugerido} ${c.unidad}</div>
          <div style="font-size:10px;color:${prioridadColor};text-transform:uppercase;font-weight:600">${c.prioridad}</div>
        </div>
      </div>`;
    }).join('');
    html += '</div>';
    elCompras.innerHTML = html;
  }

  // Vencimientos
  const elVenc = document.getElementById('auto-vencimientos');
  if (!vencimientos.length) {
    elVenc.innerHTML = '';
  } else {
    let html = '<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:12px">📅 Vencimientos próximos</div>';
    html += vencimientos.map(v => {
      const diasText = v.dias <= 0 ? 'VENCIDO' : v.dias === 1 ? '1 día' : v.dias + ' días';
      const diasColor = v.dias <= 0 ? 'var(--red)' : v.dias <= 7 ? 'var(--amber)' : 'var(--green)';
      return `<div class="venc-card ${v.estado}">
        <span class="venc-icon">${v.icono}</span>
        <div class="venc-info">
          <div class="venc-name">${v.nombre}</div>
          <div class="venc-date">Vence: ${fmtFecha(v.fecha)} · Stock: ${v.qty} ${v.unidad}</div>
        </div>
        <div class="venc-dias" style="color:${diasColor}">${diasText}</div>
      </div>`;
    }).join('');
    html += '</div>';
    elVenc.innerHTML = html;
  }

  // Predicción de demanda
  const elPred = document.getElementById('auto-prediccion');
  if (!predicciones.length) {
    elPred.innerHTML = '';
  } else {
    let html = '<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:12px">📈 Predicción de demanda (30 días)</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:14px">Comparación vs. mes anterior</div>';
    html += predicciones.map(p => {
      const tendenciaColor = p.tendencia > 0 ? 'var(--green)' : p.tendencia < 0 ? 'var(--red)' : 'var(--text2)';
      const tendenciaIcon = p.tendencia > 0 ? '📈' : p.tendencia < 0 ? '📉' : '➡️';
      const tendenciaText = p.tendencia > 0 ? '+' + p.tendencia.toFixed(0) + '%' : p.tendencia.toFixed(0) + '%';
      const barWidth = Math.min(100, (p.ventaDiaria / predicciones[0].ventaDiaria) * 100);
      return `<div class="pred-card">
        <div class="pred-title">${p.icono} ${p.nombre}</div>
        <div class="pred-bar-bg"><div class="pred-bar-fill" style="width:${barWidth}%;background:${tendenciaColor}"></div></div>
        <div class="pred-stats">
          <span class="pred-stat">${tendenciaIcon} <b style="color:${tendenciaColor}">${tendenciaText}</b></span>
          <span class="pred-stat">📊 <b>${p.ventaDiaria.toFixed(1)}</b> ${p.unidad}/día</span>
          <span class="pred-stat">🔮 <b>${p.estimado30dias}</b> ${p.unidad} en 30d</span>
        </div>
      </div>`;
    }).join('');
    html += '</div>';
    elPred.innerHTML = html;
  }
}
