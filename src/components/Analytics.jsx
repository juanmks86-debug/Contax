import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { generateCierreVentas } from '../utils/pdfGenerator';
import { FileText, TrendingUp, DollarSign, PieChart as PieIcon } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';

export default function Analytics() {
  const { ventas, prods, cats, config } = useContext(InventoryContext);
  const [period, setPeriod] = useState('todo'); // 'hoy' | 'semana' | 'mes' | 'todo'

  const currency = config.currency || '$';

  // ----------------------------------------------------
  // DATE RANGE FILTERING
  // ----------------------------------------------------
  const getPeriodRange = () => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === 'hoy') {
      return { start: start.getTime(), end: Date.now() };
    } else if (period === 'semana') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      return { start: start.getTime(), end: Date.now() };
    } else if (period === 'mes') {
      start.setDate(1);
      return { start: start.getTime(), end: Date.now() };
    } else {
      return { start: 0, end: Date.now() };
    }
  };

  const { start, end } = getPeriodRange();
  const filteredVentas = ventas.filter((v) => v.fecha >= start && v.fecha <= end);

  // ----------------------------------------------------
  // TOTALS CALCULATIONS
  // ----------------------------------------------------
  const totalRevenue = filteredVentas.reduce((acc, v) => acc + v.total, 0);
  const totalProfit = filteredVentas.reduce((acc, v) => acc + v.totalProfit, 0);
  const totalCostOfSales = totalRevenue - totalProfit;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalCostOfSales) * 100 : 0;

  // ----------------------------------------------------
  // PDF REPORT TRIGGER
  // ----------------------------------------------------
  const handleDownloadPDF = () => {
    generateCierreVentas(
      filteredVentas, 
      filteredVentas.length ? Math.min(...filteredVentas.map(v => v.fecha)) : start,
      Date.now(), 
      config
    );
  };

  // ----------------------------------------------------
  // GRAPH 1: SALES & PROFITS TREND (AREA CHART)
  // ----------------------------------------------------
  const getTrendData = () => {
    const dataMap = {};

    filteredVentas.forEach((v) => {
      const date = new Date(v.fecha);
      let key = '';

      if (period === 'hoy') {
        key = `${String(date.getHours()).padStart(2, '0')}:00`;
      } else if (period === 'semana') {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        key = days[date.getDay()];
      } else {
        key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!dataMap[key]) {
        dataMap[key] = { name: key, Ventas: 0, Ganancias: 0 };
      }
      dataMap[key].Ventas += v.total;
      dataMap[key].Ganancias += v.totalProfit;
    });

    const sortedData = Object.values(dataMap);
    
    // Sort chronological for days of month
    if (period === 'mes' || period === 'todo') {
      sortedData.sort((a, b) => {
        const [dayA, monthA] = a.name.split('/').map(Number);
        const [dayB, monthB] = b.name.split('/').map(Number);
        return monthA !== monthB ? monthA - monthB : dayA - dayB;
      });
    }

    return sortedData.length ? sortedData : [{ name: 'Sin datos', Ventas: 0, Ganancias: 0 }];
  };

  // ----------------------------------------------------
  // GRAPH 2: PROFITS BY SECTOR (PIE CHART)
  // ----------------------------------------------------
  const getSectorPieData = () => {
    const dataMap = {};
    filteredVentas.forEach((v) => {
      const cat = cats.find((c) => c.id === v.catId) || { name: 'Sin sector' };
      if (!dataMap[cat.name]) {
        dataMap[cat.name] = { name: cat.name, value: 0 };
      }
      dataMap[cat.name].value += v.totalProfit;
    });

    return Object.values(dataMap).map((item) => ({
      ...item,
      value: parseFloat(item.value.toFixed(2))
    })).sort((a, b) => b.value - a.value);
  };

  // ----------------------------------------------------
  // GRAPH 3: TOP 5 BEST SELLERS (BAR CHART)
  // ----------------------------------------------------
  const getTop5Data = () => {
    const dataMap = {};
    filteredVentas.forEach((v) => {
      if (!dataMap[v.prodName]) {
        dataMap[v.prodName] = { name: v.prodName, Vendido: 0, Ganancia: 0 };
      }
      dataMap[v.prodName].Vendido += v.qty;
      dataMap[v.prodName].Ganancia += v.totalProfit;
    });

    return Object.values(dataMap)
      .sort((a, b) => b.Vendido - a.Vendido)
      .slice(0, 5);
  };

  // ----------------------------------------------------
  // GRAPH 4: INVENTORY STATUS BY SECTOR (STACKED BAR CHART)
  // ----------------------------------------------------
  const getStockStatusData = () => {
    return cats.map((c) => {
      const prodsInCat = prods.filter((p) => p.catId === c.id);
      
      let normalStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      prodsInCat.forEach((p) => {
        if (p.qty <= 0) outOfStockCount++;
        else if (p.qty <= p.minQty) lowStockCount++;
        else normalStockCount++;
      });

      return {
        name: c.name,
        'En Stock': normalStockCount,
        'Stock Bajo': lowStockCount,
        'Agotado': outOfStockCount
      };
    });
  };

  // Palette colors for sectors
  const COLOR_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#14b8a6', '#ec4899'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">Panel de Analíticas</h1>
          <p className="page-subtitle">Reportes financieros y gráficos interactivos de rendimiento.</p>
        </div>
        <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={filteredVentas.length === 0}>
          <FileText size={18} />
          Exportar Cierre PDF
        </button>
      </div>

      {/* FILTERS */}
      <div className="chips-container">
        <button onClick={() => setPeriod('hoy')} className={`chip ${period === 'hoy' ? 'active' : ''}`}>Hoy</button>
        <button onClick={() => setPeriod('semana')} className={`chip ${period === 'semana' ? 'active' : ''}`}>Esta semana</button>
        <button onClick={() => setPeriod('mes')} className={`chip ${period === 'mes' ? 'active' : ''}`}>Este mes</button>
        <button onClick={() => setPeriod('todo')} className={`chip ${period === 'todo' ? 'active' : ''}`}>Todo</button>
      </div>

      {/* METRICS SUMMARY */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--blue-bg)', color: 'var(--blue-text)' }}>
            <DollarSign size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ingresos Totales</span>
            <span className="stat-value">{currency}{totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--green-bg)', color: 'var(--green-text)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ganancia Neta</span>
            <span className="stat-value">{currency}{totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-secondary)' }}>
            <DollarSign size={22} style={{ transform: 'rotate(180deg)' }} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Costo de lo Vendido</span>
            <span className="stat-value">{currency}{totalCostOfSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Margen Real Prom.</span>
            <span className="stat-value">{avgMargin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {filteredVentas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <TrendingUp size={44} />
            <p className="empty-state-text">No hay suficientes registros de ventas en este período para generar reportes analíticos.</p>
          </div>
        </div>
      ) : (
        <div className="charts-layout">
          {/* CHART 1: TRENDS */}
          <div className="card chart-card full-width">
            <h3 className="chart-title">Tendencia de Ventas y Ganancias ({period === 'todo' ? 'Historial' : period})</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={getTrendData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--blue)" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorGanancias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--green)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--green)" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-sidebar)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Ventas" stroke="var(--blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorVentas)" />
                  <Area type="monotone" dataKey="Ganancias" stroke="var(--green)" strokeWidth={2} fillOpacity={1} fill="url(#colorGanancias)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="charts-grid-row">
            {/* CHART 2: SECTORS */}
            <div className="card chart-card">
              <h3 className="chart-title">Ganancia por Sector</h3>
              <div className="chart-wrapper">
                {getSectorPieData().length === 0 ? (
                  <div className="empty-state"><p className="empty-state-text">Sin ventas</p></div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={getSectorPieData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {getSectorPieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val) => [`${currency}${val}`, 'Ganancia']}
                        contentStyle={{ 
                          background: 'var(--bg-sidebar)', 
                          borderColor: 'var(--border)', 
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} layout="horizontal" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* CHART 3: TOP PRODUCTS */}
            <div className="card chart-card">
              <h3 className="chart-title">Top 5 Productos más Vendidos</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={getTop5Data()} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={9} width={80} tickLine={false} />
                    <Tooltip 
                      formatter={(val, name) => [val, name]}
                      contentStyle={{ 
                        background: 'var(--bg-sidebar)', 
                        borderColor: 'var(--border)', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="Vendido" fill="var(--blue)" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CHART 4: STOCK DISTRIBUTION */}
          <div className="card chart-card full-width">
            <h3 className="chart-title">Distribución de Inventario por Sector (Unidades de Producto)</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={getStockStatusData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-sidebar)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="En Stock" stackId="a" fill="var(--green)" />
                  <Bar dataKey="Stock Bajo" stackId="a" fill="var(--amber)" />
                  <Bar dataKey="Agotado" stackId="a" fill="var(--red)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .charts-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chart-card {
          margin-bottom: 0;
        }

        .chart-card.full-width {
          width: 100%;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--text);
        }

        .chart-wrapper {
          width: 100%;
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .charts-grid-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .charts-grid-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
