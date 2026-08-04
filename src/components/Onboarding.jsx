import React, { useContext, useState } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { RUBROS } from '../utils/businessTypes';
import { Store } from 'lucide-react';

// Registro 100% local: no hay backend ni contraseña. Solo sirve para guardar
// el nombre del negocio y el rubro, y así saber qué campos mostrar en productos.
export default function Onboarding() {
  const { updateConfig } = useContext(InventoryContext);

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [logo, setLogo] = useState('🏪');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert('Ingresá el nombre de tu negocio.');
      return;
    }
    if (!businessType) {
      alert('Elegí el rubro de tu negocio.');
      return;
    }

    updateConfig({
      businessName: businessName.trim(),
      businessType,
      logo,
      currency: '$',
      customFields: []
    });
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-icon">
          <Store size={28} />
        </div>
        <h1 className="onboarding-title">Bienvenido a Contax</h1>
        <p className="onboarding-subtitle">
          Contanos sobre tu negocio para adaptar la app a tu rubro. Esto se guarda solo en este dispositivo.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Nombre del negocio</label>
            <input
              type="text"
              placeholder="Ej: Almacén Don Carlos"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              autoFocus
              maxLength={30}
            />
          </div>

          <div className="form-field">
            <label>Rubro de tu negocio</label>
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} required>
              <option value="" disabled>Seleccioná una opción</option>
              {RUBROS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.icon} {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Emoji de tu negocio</label>
            <input
              type="text"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              maxLength={4}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            Empezar
          </button>
        </form>
      </div>

      <style>{`
        .onboarding-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          background: var(--bg);
          padding: 20px;
        }
        .onboarding-card {
          width: 100%;
          max-width: 420px;
          background: var(--card-bg, var(--bg-secondary));
          border: 1px solid var(--border);
          border-radius: var(--radius, 12px);
          padding: 28px 24px;
        }
        .onboarding-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: var(--blue-bg);
          color: var(--blue);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .onboarding-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 6px;
          color: var(--text);
        }
        .onboarding-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 20px;
        }
      `}</style>
    </div>
  );
}
