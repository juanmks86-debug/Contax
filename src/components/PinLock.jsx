import React, { useContext, useState } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Lock, Delete, HelpCircle } from 'lucide-react';

// Pantalla de bloqueo local. No es un login "real" (no hay backend): el PIN
// se guarda en este dispositivo y solo sirve para que otra persona no entre
// directo a la app. Incluye recuperación vía pregunta de seguridad, también local.
export default function PinLock({ onUnlock }) {
  const { config, updateConfig } = useContext(InventoryContext);

  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('lock'); // 'lock' | 'recover' | 'reset'
  const [answerInput, setAnswerInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');

  const handleDigit = (d) => {
    if (pinInput.length >= 4 || error) return;
    const next = pinInput + d;
    setPinInput(next);
    if (next.length === 4) {
      if (next === config.pin) {
        onUnlock();
      } else {
        setError('PIN incorrecto');
        setTimeout(() => {
          setPinInput('');
          setError('');
        }, 700);
      }
    }
  };

  const handleDelete = () => setPinInput((p) => p.slice(0, -1));

  const handleRecoverSubmit = (e) => {
    e.preventDefault();
    if (answerInput.trim().toLowerCase() !== (config.pinAnswer || '').trim().toLowerCase()) {
      alert('La respuesta no coincide. Intentá de nuevo.');
      return;
    }
    setMode('reset');
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      alert('El PIN debe tener 4 números.');
      return;
    }
    if (newPin !== newPinConfirm) {
      alert('Los PIN no coinciden.');
      return;
    }
    updateConfig({ ...config, pin: newPin });
    setMode('lock');
    setPinInput('');
    setAnswerInput('');
    setNewPin('');
    setNewPinConfirm('');
    alert('PIN actualizado. Ingresalo para entrar.');
  };

  if (mode === 'recover') {
    return (
      <div className="pinlock-screen">
        <div className="pinlock-card">
          <div className="pinlock-icon"><HelpCircle size={26} /></div>
          <h1 className="pinlock-title">Recuperar PIN</h1>
          <p className="pinlock-subtitle">{config.pinQuestion || 'Pregunta de seguridad'}</p>
          <form onSubmit={handleRecoverSubmit}>
            <div className="form-field">
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="Tu respuesta"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Verificar</button>
            <button type="button" className="btn" style={{ width: '100%', marginTop: '8px' }} onClick={() => setMode('lock')}>
              Volver
            </button>
          </form>
        </div>
        <style>{pinlockStyles}</style>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="pinlock-screen">
        <div className="pinlock-card">
          <div className="pinlock-icon"><Lock size={26} /></div>
          <h1 className="pinlock-title">Nuevo PIN</h1>
          <p className="pinlock-subtitle">Elegí un PIN nuevo de 4 números</p>
          <form onSubmit={handleResetSubmit}>
            <div className="form-field">
              <label>Nuevo PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>Repetir PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPinConfirm}
                onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Guardar PIN</button>
          </form>
        </div>
        <style>{pinlockStyles}</style>
      </div>
    );
  }

  return (
    <div className="pinlock-screen">
      <div className="pinlock-card">
        <div className="pinlock-icon"><Lock size={26} /></div>
        <h1 className="pinlock-title">{config.businessName || 'Contax'}</h1>
        <p className="pinlock-subtitle">Ingresá tu PIN para continuar</p>

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${pinInput.length > i ? 'filled' : ''} ${error ? 'error' : ''}`} />
          ))}
        </div>
        {error && <div className="pin-error-text">{error}</div>}

        <div className="pin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" className="pin-key" onClick={() => handleDigit(d)}>{d}</button>
          ))}
          <span />
          <button type="button" className="pin-key" onClick={() => handleDigit('0')}>0</button>
          <button type="button" className="pin-key pin-key-icon" onClick={handleDelete}>
            <Delete size={18} />
          </button>
        </div>

        {config.pinQuestion && (
          <button type="button" className="pinlock-forgot" onClick={() => setMode('recover')}>
            Olvidé mi PIN
          </button>
        )}
      </div>
      <style>{pinlockStyles}</style>
    </div>
  );
}

const pinlockStyles = `
  .pinlock-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
    background: var(--bg);
    padding: 20px;
  }
  .pinlock-card {
    width: 100%;
    max-width: 340px;
    background: var(--card-bg, var(--bg-secondary));
    border: 1px solid var(--border);
    border-radius: var(--radius, 12px);
    padding: 28px 24px;
    text-align: center;
  }
  .pinlock-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: var(--blue-bg);
    color: var(--blue);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }
  .pinlock-title {
    font-size: 19px;
    font-weight: 800;
    margin: 0 0 4px;
    color: var(--text);
  }
  .pinlock-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 20px;
  }
  .pin-dots {
    display: flex;
    justify-content: center;
    gap: 14px;
    margin-bottom: 8px;
  }
  .pin-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: transparent;
    transition: all 0.15s ease;
  }
  .pin-dot.filled {
    background: var(--blue);
    border-color: var(--blue);
  }
  .pin-dot.error {
    background: var(--red);
    border-color: var(--red);
  }
  .pin-error-text {
    color: var(--red-text);
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    height: 14px;
  }
  .pin-keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 20px;
  }
  .pin-key {
    height: 56px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-input);
    color: var(--text);
    font-size: 20px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pin-key:active {
    background: var(--blue-bg);
  }
  .pin-key-icon {
    color: var(--text-secondary);
  }
  .pinlock-forgot {
    margin-top: 20px;
    background: none;
    border: none;
    color: var(--blue);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
`;
