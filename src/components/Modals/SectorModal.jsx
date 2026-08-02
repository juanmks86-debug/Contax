import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../../context/InventoryContext';

export default function SectorModal({ isOpen, onClose, sectorId }) {
  const { cats, saveSector } = useContext(InventoryContext);
  
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('blue');

  useEffect(() => {
    if (isOpen) {
      if (sectorId) {
        const sector = cats.find(c => c.id === sectorId);
        if (sector) {
          setName(sector.name);
          setIcon(sector.icon || '📦');
          setColor(sector.color || 'blue');
        }
      } else {
        setName('');
        setIcon('📦');
        setColor('blue');
      }
    }
  }, [isOpen, sectorId, cats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Ingresa el nombre del sector.');
      return;
    }

    const sectorData = {
      name: name.trim(),
      icon: icon.trim() || '📦',
      color
    };

    if (sectorId) {
      sectorData.id = sectorId;
    }

    await saveSector(sectorData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{sectorId ? 'Editar Sector' : 'Nuevo Sector'}</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Nombre del Sector</label>
            <input
              type="text"
              placeholder="Ej: Lácteos, Bebidas, Fiambrería..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Emoji / Icono</label>
              <input
                type="text"
                placeholder="🥛"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
              />
            </div>

            <div className="form-field">
              <label>Color Temático</label>
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="blue">🔵 Azul</option>
                <option value="green">🟢 Verde</option>
                <option value="amber">🟡 Ámbar</option>
                <option value="coral">🟠 Coral</option>
                <option value="purple">🟣 Violeta</option>
                <option value="teal">🩵 Turquesa</option>
                <option value="pink">🩷 Rosa</option>
              </select>
            </div>
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
