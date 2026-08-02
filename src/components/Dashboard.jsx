import React, { useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { 
  FolderKanban, 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  CalendarRange 
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const { cats, prods, ventas, config } = useContext(InventoryContext);

  const currency = config.currency || '$';

  // ----------------------------------------------------
  // CALCULATIONS
  // ----------------------------------------------------
  const totalSectores = cats.length;
  const totalProductos = prods.length;
  
  // Today's Sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const salesToday = ventas.filter((v) => v.fecha >= todayMs);
  const totalSalesToday = salesToday.length;

  // Total Accumulated Profit
  const totalProfit = ventas.reduce((acc, v) => acc + (v.totalProfit || 0), 0);

  // Critical Low Stock Products (qty <= minQty)
  const lowStockProducts = prods.filter((p) => p.qty <= p.minQty);

  // Expiring Soon (next 7 days)
  const expiringProducts = prods.filter((p) => {
    if (!p.vencimiento) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expiration = new Date(p.vencimiento);
    const diffTime = expiration - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Recent Sales (Last 6)
  const recentSales = [...ventas]
    .sort((a, b) => b.fecha - a.fecha)
    .slice(0, 6);

  const getCatDetails = (catId) => {
    return cats.find((c) => c.id === catId) || { name: 'Sin sector', icon: '📦', color: 'blue' };
  };

  const getRelativeTime = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div>
      <h1 className="page-title">Bienvenido, {config.businessName}</h1>
      <p className="page-subtitle">Resumen diario del estado de tu inventario y facturación.</p>

      {/* METRIC CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--blue-bg)', color: 'var(--blue-text)' }}>
            <FolderKanban size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Sectores</span>
            <span className="stat-value">{totalSectores}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)' }}>
            <Package size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Productos</span>
            <span className="stat-value">{totalProductos}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--coral-bg)', color: 'var(--coral-text)' }}>
            <ShoppingBag size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ventas Hoy</span>
            <span className="stat-value">{totalSalesToday}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--green-bg)', color: 'var(--green-text)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ganancia Total</span>
            <span className="stat-value">{currency}{totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* ALERTS PANEL */}
      {(lowStockProducts.length > 0 || expiringProducts.length > 0) && (
        <div className="card" style={{ borderColor: 'var(--amber)', background: 'rgba(245, 158, 11, 0.03)' }}>
          <h3 className="section-subtitle" style={{ color: 'var(--amber-text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={18} /> Alertas Críticas Recientes
          </h3>
          
          <div className="alerts-container">
            {lowStockProducts.slice(0, 3).map((p) => {
              const cat = getCatDetails(p.catId);
              return (
                <div key={p.id} className="dashboard-alert-item">
                  <span className="alert-badge low-stock">Stock Bajo</span>
                  <span className="alert-text">
                    El producto <b>{p.name}</b> en {cat.icon} {cat.name} tiene un stock de <b>{p.qty} {p.unit}</b> (Mínimo: {p.minQty})
                  </span>
                </div>
              );
            })}

            {expiringProducts.slice(0, 3).map((p) => {
              return (
                <div key={p.id} className="dashboard-alert-item">
                  <span className="alert-badge expiring">Vence Pronto</span>
                  <span className="alert-text">
                    <b>{p.name}</b> vence el {new Date(p.vencimiento).toLocaleDateString('es-ES')} (Stock: {p.qty} {p.unit})
                  </span>
                </div>
              );
            })}

            {(lowStockProducts.length > 3 || expiringProducts.length > 3) && (
              <button 
                className="view-more-alerts-btn"
                onClick={() => setActiveTab('auto')}
              >
                Ver todas las alertas inteligentes →
              </button>
            )}
          </div>
        </div>
      )}

      {/* RECENT SALES */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '16px', fontSize: '16px' }}>Últimas Ventas Registradas</h2>
        {recentSales.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={40} />
            <p className="empty-state-text">Aún no se han registrado ventas hoy. ¡Ve a la pestaña de <b>Vender</b> para comenzar!</p>
          </div>
        ) : (
          <div className="transactions-list">
            {recentSales.map((v) => (
              <div key={v.id} className="transaction-row">
                <div className="transaction-info">
                  <span className="transaction-name">{v.prodName}</span>
                  <span className="transaction-meta">
                    {v.qty} {v.unit} · {getRelativeTime(v.fecha)} {v.prodSku && `· SKU: ${v.prodSku}`}
                  </span>
                </div>
                <div className="transaction-values">
                  <span className="transaction-total">{currency}{v.total.toFixed(2)}</span>
                  <span className="transaction-profit">+{currency}{v.totalProfit.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .section-subtitle {
          font-size: 14px;
          font-weight: 700;
        }

        .alerts-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dashboard-alert-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background: var(--bg);
          border: 1px solid var(--border);
        }

        .alert-badge {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 20px;
          flex-shrink: 0;
        }

        .alert-badge.low-stock {
          background: var(--amber-bg);
          color: var(--amber-text);
        }

        .alert-badge.expiring {
          background: var(--red-bg);
          color: var(--red-text);
        }

        .alert-text {
          color: var(--text);
          line-height: 1.4;
        }

        .view-more-alerts-btn {
          align-self: flex-start;
          background: none;
          border: none;
          color: var(--blue-text);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 0;
          margin-top: 4px;
          text-align: left;
        }
        
        .view-more-alerts-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
