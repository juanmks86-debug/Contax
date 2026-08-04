import React, { useState, useEffect, useContext, useMemo } from 'react';
import { InventoryContext } from '../../context/InventoryContext';
import { getRubroConfig } from '../../utils/businessTypes';

export default function ProductModal({ isOpen, onClose, productId, prefilledCatId }) {
  const { cats, prods, saveProd, config } = useContext(InventoryContext);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [catId, setCatId] = useState('');
  const [qty, setQty] = useState('');
  const [minQty, setMinQty] = useState('5');
  const [unit, setUnit] = useState('uds');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('30');
  const [saleManual, setSaleManual] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [extra, setExtra] = useState({});

  const currency = config.currency || '$';

  // Campos según el rubro elegido en el registro + los campos propios que
  // el usuario haya agregado en Configuración. Se combinan sin duplicar keys.
  const dynamicFields = useMemo(() => {
    const rubroCfg = getRubroConfig(config.businessType);
    const custom = config.customFields || [];
    const seen = new Set(rubroCfg.extraFields.map((f) => f.key));
    const merged = [...rubroCfg.extraFields, ...custom.filter((f) => !seen.has(f.key))];
    return { showVencimiento: rubroCfg.showVencimiento, fields: merged };
  }, [config.businessType, config.customFields]);

  // Load product if editing
  useEffect(() => {
    if (isOpen) {
      if (productId) {
        const prod = prods.find(p => p.id === productId);
        if (prod) {
          setName(prod.name);
          setSku(prod.sku || '');
          setCatId(prod.catId);
          setQty(String(prod.qty));
          setMinQty(String(prod.minQty));
          setUnit(prod.unit || 'uds');
          setCost(String(prod.cost));
          setMargin(String(prod.margin));
          setSaleManual(prod.saleManual ? String(prod.saleManual) : '');
          setVencimiento(prod.vencimiento || '');
          setExtra(prod.extra || {});
        }
      } else {
        setName('');
        setSku('');
        setCatId(prefilledCatId || (cats.length > 0 ? cats[0].id : ''));
        setQty('');
        setMinQty('5');
        setUnit('uds');
        setCost('');
        setMargin('30');
        setSaleManual('');
        setVencimiento('');
        setExtra({});
      }
    }
  }, [isOpen, productId, prefilledCatId, prods, cats]);

  // Live price calculations
  const costVal = parseFloat(cost) || 0;
  const marginVal = parseFloat(margin) || 0;
  const manualVal = parseFloat(saleManual) || 0;
  
  const calculatedSalePrice = costVal * (1 + marginVal / 100);
  const finalSalePrice = manualVal > 0 ? manualVal : calculatedSalePrice;
  const unitProfit = finalSalePrice - costVal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Ingresa el nombre del producto.');
      return;
    }
    if (!catId) {
      alert('Por favor selecciona o crea primero un sector.');
      return;
    }

    const prodData = {
      name: name.trim(),
      sku: sku.trim(),
      catId,
      qty: parseFloat(qty) || 0,
      minQty: parseFloat(minQty) || 0,
      unit,
      cost: parseFloat(cost) || 0,
      margin: parseFloat(margin) || 0,
      saleManual: parseFloat(saleManual) || 0,
      vencimiento: dynamicFields.showVencimiento ? (vencimiento || null) : null,
      extra
    };

    if (productId) {
      prodData.id = productId;
    }

    await saveProd(prodData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{productId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Nombre del Producto</label>
            <input
              type="text"
              placeholder="Ej: Leche entera 1L, Coca Cola 1.5L..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Código SKU / Código de barras</label>
              <input
                type="text"
                placeholder="Opcional"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Sector</label>
              <select value={catId} onChange={(e) => setCatId(e.target.value)} required>
                <option value="" disabled>Selecciona un sector</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Cantidad Inicial</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Stock Mínimo</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="5"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            {dynamicFields.showVencimiento && (
              <div className="form-field">
                <label>Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                />
              </div>
            )}

            <div className="form-field">
              <label>Unidad de Medida</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="uds">📦 Unidades (uds)</option>
                <option value="kg">⚖️ Kilogramos (kg)</option>
                <option value="L">🧴 Litros (L)</option>
                <option value="m">📏 Metros (m)</option>
                <option value="m2">📐 Metros² (m²)</option>
                <option value="m3">📦 Metros³ (m³)</option>
                <option value="doc">🥚 Docenas (doc)</option>
                <option value="caja">📦 Cajas (caja)</option>
              </select>
            </div>
          </div>

          {/* Campos específicos del rubro + campos personalizados */}
          {dynamicFields.fields.length > 0 && (
            <div className="form-row" style={{ flexWrap: 'wrap' }}>
              {dynamicFields.fields.map((f) => (
                <div className="form-field" key={f.key} style={{ minWidth: '140px', flex: '1' }}>
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={extra[f.key] || ''}
                      onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      {(f.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      inputMode={f.type === 'number' ? 'decimal' : undefined}
                      value={extra[f.key] || ''}
                      onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}
                      placeholder={f.label}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label>Precio Costo ({currency})</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Margen de Ganancia (%)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="30"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
              />
            </div>
          </div>

          {/* Price Preview Panel */}
          <div className="preview-box">
            <div className="preview-row">
              Precio venta calculado: <span>{costVal > 0 ? `${currency}${calculatedSalePrice.toFixed(2)}` : '—'}</span>
            </div>
            <div className="preview-row">
              Ganancia unitaria estimada: <span style={{ color: 'var(--green-text)' }}>{costVal > 0 ? `${currency}${unitProfit.toFixed(2)}` : '—'}</span>
            </div>
          </div>

          <div className="form-field">
            <label>Precio de Venta Manual ({currency}) <span style={{ fontStyle: 'italic', textTransform: 'none', color: 'var(--text-muted)' }}>(Sobreescribe el calculado)</span></label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Ej: 150.00"
              value={saleManual}
              onChange={(e) => setSaleManual(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
