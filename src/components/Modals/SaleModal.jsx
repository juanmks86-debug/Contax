import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../../context/InventoryContext';
import { Minus, Plus, ShoppingBag } from 'lucide-react';

export default function SaleModal({ isOpen, onClose, productId }) {
  const { prods, cats, confirmarVenta, config } = useContext(InventoryContext);
  const [qty, setQty] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  const currency = config.currency || '$';
  const product = prods.find((p) => p.id === productId);
  const sector = product ? cats.find((c) => c.id === product.catId) : null;

  useEffect(() => {
    if (isOpen) {
      setQty(1);
      setErrorMsg('');
    }
  }, [isOpen, productId]);

  if (!isOpen || !product) return null;

  const salePrice = product.saleManual > 0 ? product.saleManual : product.cost * (1 + product.margin / 100);
  const profit = salePrice - product.cost;

  const totalBilling = salePrice * qty;
  const totalProfit = profit * qty;

  const handleIncrement = () => {
    if (qty + 1 > product.qty) {
      setErrorMsg(`No puedes vender más del stock actual (${product.qty} ${product.unit}).`);
      return;
    }
    setErrorMsg('');
    setQty(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (qty - 1 < 1) return;
    setErrorMsg('');
    setQty(prev => prev - 1);
  };

  const handleManualChange = (e) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val) || val <= 0) {
      setQty('');
      return;
    }

    if (val > product.qty) {
      setErrorMsg(`No puedes vender más del stock actual (${product.qty} ${product.unit}).`);
      setQty(product.qty);
      return;
    }

    setErrorMsg('');
    setQty(val);
  };

  const handleConfirmSale = async (e) => {
    e.preventDefault();
    const finalQty = parseFloat(qty);
    if (isNaN(finalQty) || finalQty <= 0) {
      alert('Ingresa una cantidad válida.');
      return;
    }

    const success = await confirmarVenta(product.id, finalQty);
    if (success) {
      onClose();
    } else {
      alert('Hubo un error al registrar la venta. Verifica el stock.');
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Registrar Venta</h3>
        </div>

        {/* Product Brief info */}
        <div className="sale-product-card" style={{ background: `var(--${sector?.color || 'blue'}-bg)`, color: `var(--${sector?.color || 'blue'}-text)` }}>
          <span className="sale-product-emoji">{sector?.icon || '📦'}</span>
          <div className="sale-product-info">
            <h4 className="sale-product-name">{product.name}</h4>
            <span className="sale-product-meta">
              Sector: {sector?.name || 'General'} · Stock actual: {product.qty} {product.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleConfirmSale} style={{ marginTop: '16px' }}>
          <div className="form-field">
            <label style={{ display: 'block', textAlign: 'center', marginBottom: '10px' }}>Cantidad a Vender</label>
            
            <div className="qty-picker-wrapper">
              <button type="button" className="qty-picker-btn" onClick={handleDecrement} disabled={qty <= 1}>
                <Minus size={18} />
              </button>
              
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0.1"
                className="qty-picker-input"
                value={qty}
                onChange={handleManualChange}
                required
              />
              
              <button type="button" className="qty-picker-btn" onClick={handleIncrement} disabled={qty >= product.qty}>
                <Plus size={18} />
              </button>
            </div>

            {errorMsg && (
              <span className="error-text-block">{errorMsg}</span>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="preview-box">
            <div className="preview-row">
              Precio unitario: <span>{currency}{salePrice.toFixed(2)}</span>
            </div>
            <div className="preview-row" style={{ fontSize: '15px', fontWeight: 'bold' }}>
              Total a cobrar: <span style={{ color: 'var(--blue-text)' }}>{currency}{totalBilling.toFixed(2)}</span>
            </div>
            <div className="preview-row">
              Tu ganancia neta: <span style={{ color: 'var(--green-text)' }}>+{currency}{totalProfit.toFixed(2)}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-success" disabled={!qty || qty > product.qty}>
              <ShoppingBag size={15} />
              Confirmar Venta
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .sale-product-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .sale-product-emoji {
          font-size: 28px;
          flex-shrink: 0;
        }

        .sale-product-info {
          flex: 1;
        }

        .sale-product-name {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.3;
        }

        .sale-product-meta {
          font-size: 11px;
          opacity: 0.8;
          display: block;
          margin-top: 2px;
        }

        /* Qty picker control panel */
        .qty-picker-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin: 10px 0;
        }

        .qty-picker-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid var(--border);
          background: var(--bg-card);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .qty-picker-btn:active:not(:disabled) {
          transform: scale(0.9);
          background: var(--border);
        }

        .qty-picker-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .qty-picker-input {
          width: 80px;
          height: 44px;
          text-align: center;
          font-size: 20px;
          font-weight: 700;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--bg-input);
          color: var(--text);
          outline: none;
        }

        .error-text-block {
          display: block;
          text-align: center;
          font-size: 11px;
          color: var(--red-text);
          margin-top: 6px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
