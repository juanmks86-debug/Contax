import React, { useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { FolderKanban, Plus, Pencil, Trash2 } from 'lucide-react';

export default function Sectores({ openSectorModal, openProdModal }) {
  const { cats, prods, delSector, config } = useContext(InventoryContext);

  const currency = config.currency || '$';

  const getSectorValuation = (catId) => {
    const sectorProds = prods.filter((p) => p.catId === catId);
    return sectorProds.reduce((acc, p) => acc + (p.cost * p.qty), 0);
  };

  const handleAddProductShortcut = (catId) => {
    openProdModal(null, catId);
  };

  const handleDeleteSector = (id, name) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el sector "${name}"? Se eliminarán todos los productos asociados.`)) {
      delSector(id);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="page-title">Sectores de Inventario</h1>
          <p className="page-subtitle">Organiza tus productos por departamentos o categorías.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openSectorModal(null)}>
          <Plus size={16} />
          Nuevo Sector
        </button>
      </div>

      {cats.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderKanban size={44} />
            <p className="empty-state-text">No has creado ningún sector aún. ¡Crea el primero para empezar a clasificar tus productos!</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => openSectorModal(null)}>
              Crear Sector
            </button>
          </div>
        </div>
      ) : (
        <div className="items-grid">
          {cats.map((c) => {
            const sectorProds = prods.filter((p) => p.catId === c.id);
            const valStock = getSectorValuation(c.id);

            return (
              <div key={c.id} className="card item-card">
                <div className="sector-card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div className="sector-emoji-box" style={{ background: `var(--${c.color}-bg)`, border: `1.5px solid var(--${c.color})` }}>
                    {c.icon || '📦'}
                  </div>
                  <div>
                    <h3 className="sector-title">{c.name}</h3>
                    <span className="sector-subtitle-text">
                      {sectorProds.length} productos registrados
                    </span>
                  </div>
                </div>

                <div className="sector-stats-row">
                  <span>Valor en Stock (Costo):</span>
                  <b>{currency}{valStock.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                </div>

                <div className="item-card-actions" style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => handleAddProductShortcut(c.id)}
                    style={{ flex: 2 }}
                  >
                    + Producto
                  </button>
                  <button 
                    className="btn btn-sm btn-icon" 
                    title="Editar Sector"
                    onClick={() => openSectorModal(c.id)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    className="btn btn-sm btn-danger btn-icon" 
                    title="Eliminar Sector"
                    onClick={() => handleDeleteSector(c.id, c.name)}
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
        .sector-emoji-box {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          flex-shrink: 0;
        }

        .sector-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .sector-subtitle-text {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .sector-stats-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        
        .sector-stats-row b {
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
