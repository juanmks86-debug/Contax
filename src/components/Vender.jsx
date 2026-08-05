import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Search, ScanBarcode, ShoppingBag } from 'lucide-react';
import { formatMoney } from '../utils/format';

export default function Vender({ openVentaModal }) {
  const { prods, cats, config } = useContext(InventoryContext);
  
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanSimulator, setShowScanSimulator] = useState(false);
  const [scannedCodeInput, setScannedCodeInput] = useState('');

  const currency = config.currency || '$';

  // ----------------------------------------------------
  // FILTER & SEARCH LOGIC
  // ----------------------------------------------------
  const filteredProducts = prods.filter((p) => {
    // Sector Filter
    const matchesCat = selectedCat === 'all' || p.catId === selectedCat;
    
    // Search Query (matches Name or SKU)
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  const getCatDetails = (catId) => {
    return cats.find((c) => c.id === catId) || { name: 'Sin sector', icon: '📦', color: 'blue' };
  };

  const getProductPrices = (p) => {
    const sale = p.saleManual > 0 ? p.saleManual : p.cost * (1 + p.margin / 100);
    const profit = sale - p.cost;
    return { sale, profit };
  };

  // Simulate scanning code
  const handleSimulateScan = () => {
    if (!scannedCodeInput.trim()) return;
    setSearchQuery(scannedCodeInput.trim());
    setShowScanSimulator(false);
    setScannedCodeInput('');
  };

  return (
    <div>
      <h1 className="page-title">Registrar Ventas</h1>
      <p className="page-subtitle">Busca productos por nombre o SKU y registra ventas rápidamente.</p>

      {/* SEARCH AND SCAN BAR */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o código SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-icon btn-primary" 
          title="Simular escaneo de código de barras"
          onClick={() => setShowScanSimulator(true)}
        >
          <ScanBarcode size={20} />
        </button>
      </div>

      {/* SECTOR CHIPS */}
      <div className="chips-container">
        <button
          onClick={() => setSelectedCat('all')}
          className={`chip ${selectedCat === 'all' ? 'active' : ''}`}
        >
          Todos
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={`chip ${selectedCat === c.id ? 'active' : ''}`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* PRODUCTS LISTING */}
      {filteredProducts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Search size={44} />
            <p className="empty-state-text">No se encontraron productos que coincidan con los filtros seleccionados.</p>
          </div>
        </div>
      ) : (
        <div className="items-grid">
          {filteredProducts.map((p) => {
            const cat = getCatDetails(p.catId);
            const { sale, profit } = getProductPrices(p);
            const isOutOfStock = p.qty <= 0;
            const isLowStock = p.qty <= p.minQty && !isOutOfStock;

            let stockColorClass = 'in-stock';
            let stockLabel = `${p.qty} ${p.unit}`;

            if (isOutOfStock) {
              stockColorClass = 'out-of-stock';
              stockLabel = 'AGOTADO';
            } else if (isLowStock) {
              stockColorClass = 'low-stock';
              stockLabel = `${p.qty} ${p.unit} (BAJO)`;
            }

            return (
              <div key={p.id} className="card item-card" style={{ opacity: isOutOfStock ? 0.6 : 1 }}>
                <div className="item-card-header">
                  <div>
                    <h3 className="item-card-title">{p.name}</h3>
                    <div className="item-card-subtitle">
                      <span className="item-cat-badge" style={{ background: `var(--${cat.color}-bg)`, color: `var(--${cat.color}-text)` }}>
                        {cat.icon} {cat.name}
                      </span>
                      {p.sku && <span className="item-sku">SKU: {p.sku}</span>}
                    </div>
                  </div>
                  <div>
                    <div className="item-card-price">{currency}{formatMoney(sale)}</div>
                    <div className="item-card-profit">+{currency}{formatMoney(profit)}</div>
                  </div>
                </div>

                <div className="item-card-stats">
                  <span>Costo: <b>{currency}{formatMoney(p.cost)}</b></span>
                  <span>Margen: <b>{p.margin}%</b></span>
                  <span>Stock: <b className={`stock-indicator ${stockColorClass}`}>{stockLabel}</b></span>
                </div>

                <div className="item-card-actions">
                  <button
                    className="btn btn-success"
                    disabled={isOutOfStock}
                    onClick={() => openVentaModal(p.id)}
                  >
                    <ShoppingBag size={16} />
                    Vender
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BARCODE SCAN SIMULATOR MODAL */}
      {showScanSimulator && (
        <div className="modal-overlay open">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Simulador de Escáner de Barras</h3>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
              En un dispositivo real, esto levantaría la cámara. Ingresa un código SKU manualmente para simular el escaneo:
            </p>

            <div className="form-field">
              <label>Código SKU / Código de barras</label>
              <input
                type="text"
                placeholder="Ej: 7791234567890 o ARR-002"
                value={scannedCodeInput}
                onChange={(e) => setScannedCodeInput(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ fontSize: '11px', background: 'rgba(148, 163, 184, 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <b>Códigos de prueba rápidos:</b><br />
              - Leche: <code style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setScannedCodeInput('7791234567890')}>7791234567890</code><br />
              - Coca: <code style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setScannedCodeInput('7790001112223')}>7790001112223</code><br />
              - Arroz: <code style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setScannedCodeInput('7795556667778')}>7795556667778</code>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowScanSimulator(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSimulateScan}>Escanear</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .item-cat-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          margin-right: 8px;
        }

        .item-sku {
          font-size: 11px;
          color: var(--text-muted);
        }

        .stock-indicator {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .stock-indicator.in-stock {
          background: var(--green-bg);
          color: var(--green-text);
        }

        .stock-indicator.low-stock {
          background: var(--amber-bg);
          color: var(--amber-text);
        }

        .stock-indicator.out-of-stock {
          background: var(--red-bg);
          color: var(--red-text);
        }
      `}</style>
    </div>
  );
}
