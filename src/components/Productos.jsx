import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { generateInventarioValorado } from '../utils/pdfGenerator';
import { Plus, FileDown, Search, Pencil, Trash2, ShoppingBag } from 'lucide-react';
import { formatMoney } from '../utils/format';

export default function Productos({ openProdModal, openVentaModal }) {
  const { prods, cats, delProd, config } = useContext(InventoryContext);
  
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currency = config.currency || '$';

  // ----------------------------------------------------
  // FILTERING LOGIC
  // ----------------------------------------------------
  const filteredProducts = prods.filter((p) => {
    const matchesCat = selectedCat === 'all' || p.catId === selectedCat;
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

  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el producto "${name}"?`)) {
      delProd(id);
    }
  };

  const downloadValuationPDF = () => {
    generateInventarioValorado(prods, cats, config);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Inventario de Productos</h1>
          <p className="page-subtitle">Visualiza, edita o elimina existencias en tu catálogo.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={downloadValuationPDF} disabled={prods.length === 0}>
            <FileDown size={16} />
            PDF Valorado
          </button>
          <button className="btn btn-primary" onClick={() => openProdModal(null)}>
            <Plus size={16} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* SECTOR FILTER CHIPS */}
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

      {/* PRODUCTS LIST */}
      {filteredProducts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Search size={40} />
            <p className="empty-state-text">No hay productos cargados en esta categoría o con este filtro.</p>
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
              stockLabel = `${p.qty} ${p.unit} (Mín: ${p.minQty})`;
            }

            return (
              <div key={p.id} className="card item-card" style={{ opacity: isOutOfStock ? 0.6 : 1 }}>
                <div className="item-card-header">
                  <div>
                    <h3 className="item-card-title">{p.name}</h3>
                    <div className="item-card-subtitle" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                      <span className="item-cat-badge" style={{ background: `var(--${cat.color}-bg)`, color: `var(--${cat.color}-text)` }}>
                        {cat.icon} {cat.name}
                      </span>
                      {p.sku && <span className="item-sku">SKU: {p.sku}</span>}
                      {p.extra && Object.entries(p.extra).filter(([, v]) => v).map(([k, v]) => (
                        <span key={k} className="item-sku">{v}</span>
                      ))}
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
                  {p.vencimiento && (
                    <span className="vencimiento-tag">
                      Vence: <b>{new Date(p.vencimiento).toLocaleDateString('es-ES')}</b>
                    </span>
                  )}
                </div>

                <div className="item-card-actions">
                  <button
                    className="btn btn-success btn-sm"
                    disabled={isOutOfStock}
                    onClick={() => openVentaModal(p.id)}
                  >
                    <ShoppingBag size={14} />
                    Vender
                  </button>
                  <button 
                    className="btn btn-sm btn-icon" 
                    onClick={() => openProdModal(p.id)}
                    title="Editar Producto"
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    className="btn btn-sm btn-danger btn-icon" 
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                    title="Eliminar Producto"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
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

        .vencimiento-tag {
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
