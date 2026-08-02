import React, { useContext, useState } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { generateListaCompras, generateVencimientos } from '../utils/pdfGenerator';
import { 
  Zap, 
  ShoppingCart, 
  CalendarRange, 
  LineChart, 
  AlertTriangle, 
  Check, 
  Download,
  CheckSquare,
  Square
} from 'lucide-react';

export default function Auto() {
  const { prods, cats, ventas, config } = useContext(InventoryContext);
  const [checkedItems, setCheckedItems] = useState({});

  const currency = config.currency || '$';

  // ----------------------------------------------------
  // DATE HELPERS & DEMAND VELOCITY
  // ----------------------------------------------------
  const getSalesVelocity = (prodId, days = 30) => {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const salesForProd = ventas.filter((v) => v.prodId === prodId && v.fecha >= cutoffTime);
    if (salesForProd.length === 0) return 0;
    const totalQty = salesForProd.reduce((acc, v) => acc + v.qty, 0);
    return totalQty / days;
  };

  const getDaysOfStockLeft = (p, velocity) => {
    if (velocity <= 0) {
      return p.qty <= p.minQty ? 0 : 999; // 999 represents "infinite" or stagnant
    }
    return Math.floor(p.qty / velocity);
  };

  const getCatDetails = (catId) => {
    return cats.find((c) => c.id === catId) || { name: 'Sin sector', icon: '📦' };
  };

  // ----------------------------------------------------
  // 1. SMART ALERTS
  // ----------------------------------------------------
  const getSmartAlerts = () => {
    const alerts = [];
    prods.forEach((p) => {
      const velocity = getSalesVelocity(p.id, 30);
      const daysLeft = getDaysOfStockLeft(p, velocity);
      const cat = getCatDetails(p.catId);

      if (p.qty <= 0) {
        alerts.push({
          id: `alert-empty-${p.id}`,
          type: 'critical',
          icon: '🚨',
          title: `Sin Stock: ${p.name}`,
          desc: `El stock se ha agotado por completo. Se han detenido las ventas de este producto.`,
          actionLabel: 'Comprar urgente'
        });
      } else if (daysLeft >= 0 && daysLeft <= 7) {
        alerts.push({
          id: `alert-low-${p.id}`,
          type: 'warning',
          icon: '⚠️',
          title: `Stock Crítico: ${p.name}`,
          desc: `Quedan ${p.qty} ${p.unit}. Al ritmo de ventas actual, se agotará en ${daysLeft} días.`,
          actionLabel: 'Reponer pronto'
        });
      } else if (daysLeft === 999 && p.qty > p.minQty * 3) {
        alerts.push({
          id: `alert-stagnant-${p.id}`,
          type: 'info',
          icon: '💡',
          title: `Stock Estancado: ${p.name}`,
          desc: `Tienes ${p.qty} ${p.unit} en stock, pero no se ha registrado ninguna venta en los últimos 30 días.`,
          actionLabel: 'Revisar precio / Oferta'
        });
      }
    });
    return alerts;
  };

  // ----------------------------------------------------
  // 2. SUGGESTED REORDER LIST
  // ----------------------------------------------------
  const getSuggestedReorders = () => {
    const list = [];
    prods.forEach((p) => {
      const velocity = getSalesVelocity(p.id, 30);
      const daysLeft = getDaysOfStockLeft(p, velocity);
      const cat = getCatDetails(p.catId);

      if (daysLeft <= 14 || p.qty <= p.minQty) {
        // Suggest ordering enough stock for 30 days
        const suggestedQty = Math.max(
          p.minQty * 2,
          Math.ceil(velocity * 30) - p.qty
        );

        if (suggestedQty > 0) {
          let priority = 'baja';
          if (daysLeft <= 3 || p.qty <= 0) priority = 'alta';
          else if (daysLeft <= 7) priority = 'media';

          list.push({
            id: p.id,
            sku: p.sku,
            nombre: p.name,
            icono: cat.icon,
            actual: p.qty,
            sugerido: suggestedQty,
            unidad: p.unit,
            dias: daysLeft,
            prioridad: priority
          });
        }
      }
    });
    // Sort by priority (days of stock remaining ascending)
    return list.sort((a, b) => a.dias - b.dias);
  };

  const reorderList = getSuggestedReorders();

  const toggleCheckItem = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const downloadShoppingListPDF = () => {
    generateListaCompras(reorderList, config);
  };

  // ----------------------------------------------------
  // 3. EXPIRATION LOGS
  // ----------------------------------------------------
  const getExpirationLogs = () => {
    const logs = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    prods.forEach((p) => {
      if (!p.vencimiento) return;
      
      const expiration = new Date(p.vencimiento);
      const diffTime = expiration - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Only care if expired or expiring in the next 30 days
      if (diffDays <= 30) {
        let estado = 'ok';
        if (diffDays <= 0) estado = 'critical';
        else if (diffDays <= 7) estado = 'warning';

        logs.push({
          id: p.id,
          nombre: p.name,
          icono: getCatDetails(p.catId).icon,
          fecha: p.vencimiento,
          dias: diffDays,
          estado: estado,
          qty: p.qty,
          unidad: p.unit
        });
      }
    });

    return logs.sort((a, b) => a.dias - b.dias);
  };

  const expirationLogs = getExpirationLogs();

  const downloadExpirationsPDF = () => {
    generateVencimientos(expirationLogs, config);
  };

  // ----------------------------------------------------
  // 4. DEMAND FORECAST (TOP 10)
  // ----------------------------------------------------
  const getDemandForecasts = () => {
    const forecasts = [];
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    prods.forEach((p) => {
      const currentVelocity = getSalesVelocity(p.id, 30);
      if (currentVelocity <= 0) return;

      // Calculate velocity for previous 30 days (days 31 to 60)
      const startPrev = Date.now() - 60 * MS_PER_DAY;
      const endPrev = Date.now() - 30 * MS_PER_DAY;
      const prevSales = ventas.filter((v) => v.prodId === p.id && v.fecha >= startPrev && v.fecha < endPrev);
      const prevQty = prevSales.reduce((acc, v) => acc + v.qty, 0);
      const prevVelocity = prevQty / 30;

      let trendPct = 0;
      if (prevVelocity > 0) {
        trendPct = ((currentVelocity - prevVelocity) / prevVelocity) * 100;
      }

      forecasts.push({
        id: p.id,
        nombre: p.name,
        icono: getCatDetails(p.catId).icon,
        ventaDiaria: currentVelocity,
        tendencia: trendPct,
        unidad: p.unit,
        estimado30dias: Math.ceil(currentVelocity * 30)
      });
    });

    return forecasts.sort((a, b) => b.ventaDiaria - a.ventaDiaria).slice(0, 10);
  };

  const forecasts = getDemandForecasts();
  const maxVelocity = forecasts.length > 0 ? forecasts[0].ventaDiaria : 1;

  const smartAlerts = getSmartAlerts();

  return (
    <div>
      <h1 className="page-title">Automatizaciones Inteligentes</h1>
      <p className="page-subtitle">Sugerencias inteligentes basadas en el comportamiento histórico de tus ventas.</p>

      {/* SMART ALERTS */}
      <div className="card">
        <h2 className="card-title" style={{ fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} style={{ color: 'var(--blue)' }} /> Alertas del Asistente
        </h2>
        
        {smartAlerts.length === 0 ? (
          <div className="empty-state">
            <Check size={40} style={{ color: 'var(--green)' }} />
            <p className="empty-state-text"><b>¡Todo en orden!</b><br />No se detectan productos con stock bajo o estancado actualmente.</p>
          </div>
        ) : (
          <div className="alerts-list">
            {smartAlerts.map((alert) => (
              <div key={alert.id} className={`alert-card ${alert.type}`}>
                <span style={{ fontSize: '20px' }}>{alert.icon}</span>
                <div className="alert-content">
                  <h4 className="alert-title">{alert.title}</h4>
                  <p className="alert-desc">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SHOPPING LIST */}
      {reorderList.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="card-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} style={{ color: 'var(--blue)' }} /> Lista de Compras Sugerida
            </h2>
            <button className="btn btn-sm" onClick={downloadShoppingListPDF}>
              <Download size={14} /> PDF
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Lista generada automáticamente para reabastecer productos por debajo del stock mínimo.
          </p>

          <div className="shopping-list">
            {reorderList.map((item) => {
              const isChecked = !!checkedItems[item.id];
              const priorityColor = item.prioridad === 'alta' ? 'var(--red)' : item.prioridad === 'media' ? 'var(--amber)' : 'var(--text-secondary)';
              
              return (
                <div key={item.id} className={`compra-row-item ${isChecked ? 'checked' : ''}`}>
                  <button className="checkbox-btn" onClick={() => toggleCheckItem(item.id)}>
                    {isChecked ? <CheckSquare size={20} style={{ color: 'var(--green)' }} /> : <Square size={20} />}
                  </button>
                  
                  <div className="compra-item-info">
                    <span className="compra-item-name">{item.icono} {item.nombre}</span>
                    <span className="compra-item-details">
                      Stock: {item.actual} {item.unidad} · {item.dias === 0 ? 'Sin stock' : `${item.dias} días restantes`}
                    </span>
                  </div>

                  <div className="compra-item-qty">
                    <span className="compra-qty-val">+{item.sugerido} {item.unidad}</span>
                    <span className="compra-priority-badge" style={{ color: priorityColor }}>
                      {item.prioridad}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EXPIRATIONS */}
      {expirationLogs.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="card-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarRange size={18} style={{ color: 'var(--blue)' }} /> Control de Vencimientos
            </h2>
            <button className="btn btn-sm" onClick={downloadExpirationsPDF}>
              <Download size={14} /> PDF
            </button>
          </div>

          <div className="expirations-list">
            {expirationLogs.map((item) => {
              const diasText = item.dias <= 0 ? 'VENCIDO' : item.dias === 1 ? '1 día' : `${item.dias} días`;
              const statusClass = item.estado === 'critical' ? 'vencido' : item.estado === 'warning' ? 'critico' : 'normal';

              return (
                <div key={item.id} className={`expiration-row-item ${statusClass}`}>
                  <span className="exp-icon">{item.icono}</span>
                  <div className="exp-info">
                    <span className="exp-name">{item.nombre}</span>
                    <span className="exp-detail">
                      Vence: {new Date(item.fecha).toLocaleDateString('es-ES')} · Stock: {item.qty} {item.unidad}
                    </span>
                  </div>
                  <span className="exp-days">{diasText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DEMAND FORECAST */}
      {forecasts.length > 0 && (
        <div className="card">
          <h2 className="card-title" style={{ fontSize: '15px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineChart size={18} style={{ color: 'var(--blue)' }} /> Predicción de Demanda (30 días)
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Estimación de rotación de mercadería calculada según el ritmo de ventas.
          </p>

          <div className="forecasts-list">
            {forecasts.map((item) => {
              const trendColor = item.tendencia > 0 ? 'var(--green-text)' : item.tendencia < 0 ? 'var(--red-text)' : 'var(--text-secondary)';
              const trendText = item.tendencia > 0 ? `+${item.tendencia.toFixed(0)}%` : `${item.tendencia.toFixed(0)}%`;
              const barWidth = Math.max(10, (item.ventaDiaria / maxVelocity) * 100);

              return (
                <div key={item.id} className="forecast-row-item">
                  <div className="forecast-header">
                    <span className="forecast-name">{item.icono} {item.nombre}</span>
                    <span className="forecast-trend" style={{ color: trendColor }}>
                      {item.tendencia > 0 ? '📈' : item.tendencia < 0 ? '📉' : '➡️'} {trendText}
                    </span>
                  </div>

                  <div className="analytics-bar-bg">
                    <div 
                      className="analytics-bar-fill" 
                      style={{ 
                        width: `${barWidth}%`, 
                        background: item.tendencia > 0 ? 'var(--green)' : 'var(--blue)' 
                      }} 
                    />
                  </div>

                  <div className="forecast-footer">
                    <span>Venta diaria: <b>{item.ventaDiaria.toFixed(1)}</b> {item.unidad}</span>
                    <span>Sugerido 30d: <b>{item.estimado30dias}</b> {item.unidad}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        /* Shopping checklist custom styles */
        .compra-row-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        .compra-row-item:last-child {
          border-bottom: none;
        }
        .compra-row-item.checked .compra-item-name {
          text-decoration: line-through;
          color: var(--text-muted);
        }
        .checkbox-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          margin-right: 10px;
        }
        .compra-item-info {
          flex: 1;
        }
        .compra-item-name {
          display: block;
          font-size: 14px;
          font-weight: 600;
        }
        .compra-item-details {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
          display: block;
        }
        .compra-item-qty {
          text-align: right;
        }
        .compra-qty-val {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: var(--blue-text);
        }
        .compra-priority-badge {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 2px;
          display: block;
        }

        /* Expiration styles */
        .expiration-row-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          margin-bottom: 8px;
          border: 1px solid var(--border);
        }
        .expiration-row-item.vencido {
          background: var(--red-bg);
          border-color: var(--red);
        }
        .expiration-row-item.vencido .exp-days {
          color: var(--red-text);
          font-weight: 700;
        }
        .expiration-row-item.critico {
          background: var(--amber-bg);
          border-color: var(--amber);
        }
        .expiration-row-item.critico .exp-days {
          color: var(--amber-text);
          font-weight: 700;
        }
        .exp-icon {
          font-size: 20px;
        }
        .exp-info {
          flex: 1;
        }
        .exp-name {
          display: block;
          font-size: 14px;
          font-weight: 600;
        }
        .exp-detail {
          display: block;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .exp-days {
          font-size: 12px;
        }

        /* Forecast styles */
        .forecast-row-item {
          margin-bottom: 16px;
        }
        .forecast-row-item:last-child {
          margin-bottom: 0;
        }
        .forecast-header {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 600;
        }
        .forecast-footer {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
