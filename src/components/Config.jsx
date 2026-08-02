import React, { useContext, useState, useEffect } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Settings, ShieldAlert, Database, FileUp, FileDown, RefreshCw, Trash2, Heart } from 'lucide-react';

export default function Config() {
  const { 
    config, 
    updateConfig, 
    loadDemoData, 
    clearAllData, 
    exportJSON, 
    importJSON 
  } = useContext(InventoryContext);

  const [businessName, setBusinessName] = useState(config.businessName);
  const [logo, setLogo] = useState(config.logo);
  const [currency, setCurrency] = useState(config.currency);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    setBusinessName(config.businessName);
    setLogo(config.logo);
    setCurrency(config.currency);
  }, [config]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert('Por favor ingresa un nombre para tu negocio.');
      return;
    }
    updateConfig({
      businessName: businessName.trim(),
      logo: logo.trim() || '💼',
      currency: currency.trim() || '$'
    });
    alert('¡Perfil del negocio actualizado con éxito!');
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportError('');
    setImportSuccess(false);

    try {
      const result = await importJSON(file);
      if (result) {
        setImportSuccess(true);
        alert('Copia de seguridad restaurada correctamente. La página se actualizará.');
        window.location.reload();
      }
    } catch (err) {
      setImportError(err.message || 'Error al importar el archivo de respaldo.');
    }
  };

  const handleLoadDemo = async () => {
    if (window.confirm('¿Deseas cargar los datos de demostración? Esto reemplazará tus datos actuales.')) {
      await loadDemoData();
      alert('Datos de prueba cargados con éxito. ¡Explora los gráficos y notificaciones!');
      window.location.reload();
    }
  };

  const handleClearData = async () => {
    if (window.confirm('⚠ ATENCIÓN: ¿Estás seguro de que deseas vaciar por completo la base de datos? Esta acción eliminará permanentemente todos tus sectores, productos e historial de ventas, y NO se puede deshacer.')) {
      if (window.confirm('¿Confirmas que deseas borrar TODO?')) {
        await clearAllData();
        alert('Base de datos vaciada por completo.');
        window.location.reload();
      }
    }
  };

  return (
    <div>
      <h1 className="page-title">Configuración del Sistema</h1>
      <p className="page-subtitle">Personaliza tu perfil, gestiona copias de seguridad o carga datos demo.</p>

      <div className="config-grid">
        {/* PROFILE SECTION */}
        <div className="card config-card">
          <h2 className="config-card-title">
            <Settings size={18} />
            Perfil de Negocio
          </h2>
          
          <form onSubmit={handleSaveProfile}>
            <div className="form-field">
              <label>Nombre del Negocio</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Kiosco Don Carlos"
                maxLength={30}
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Emoji de Logo</label>
                <input
                  type="text"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="Ej: 🏪, 🥛"
                  maxLength={4}
                />
              </div>

              <div className="form-field">
                <label>Símbolo de Moneda</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="$">$ (Pesos / Dólares)</option>
                  <option value="€">€ (Euros)</option>
                  <option value="£">£ (Libras)</option>
                  <option value="S/.">S/. (Soles)</option>
                  <option value="Bs.">Bs. (Bolívares)</option>
                  <option value="CLP">CLP (Pesos Chilenos)</option>
                  <option value="MXN">MXN (Pesos Mexicanos)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Guardar Perfil
            </button>
          </form>
        </div>

        {/* BACKUP SECTION */}
        <div className="card config-card">
          <h2 className="config-card-title">
            <Database size={18} />
            Copias de Seguridad (JSON)
          </h2>
          <p className="config-card-desc">
            Dado que los datos se almacenan en tu dispositivo, descarga un respaldo para no perder tu información si limpias la caché.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-success" onClick={exportJSON} style={{ width: '100%' }}>
              <FileDown size={16} />
              Exportar Respaldo (.json)
            </button>

            <div className="file-import-wrapper">
              <label className="btn" style={{ width: '100%', cursor: 'pointer' }}>
                <FileUp size={16} />
                Importar Respaldo
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {importError && (
              <div style={{ fontSize: '12px', color: 'var(--red-text)', background: 'var(--red-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)' }}>
                {importError}
              </div>
            )}
          </div>
        </div>

        {/* SYSTEM ACTIONS */}
        <div className="card config-card danger-zone">
          <h2 className="config-card-title" style={{ color: 'var(--red-text)' }}>
            <ShieldAlert size={18} style={{ color: 'var(--red)' }} />
            Zona de Peligro / Pruebas
          </h2>
          <p className="config-card-desc">
            Carga información ficticia para evaluar la app o vacía toda la base de datos de manera definitiva.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleLoadDemo} style={{ width: '100%', background: 'var(--blue)' }}>
              <RefreshCw size={16} />
              Cargar Datos Demo
            </button>

            <button className="btn btn-danger" onClick={handleClearData} style={{ width: '100%' }}>
              <Trash2 size={16} />
              Vaciar Base de Datos
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .config-card {
          margin-bottom: 0;
          display: flex;
          flex-direction: column;
        }

        .config-card-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text);
        }

        .config-card-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .config-card.danger-zone {
          border-color: var(--red);
          background: rgba(239, 68, 68, 0.02);
        }
      `}</style>
    </div>
  );
}
