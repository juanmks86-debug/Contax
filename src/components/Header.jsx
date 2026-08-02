import React, { useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Menu, Wifi, WifiOff } from 'lucide-react';

export default function Header({ setMobileOpen }) {
  const { config, isOnline, prods, cats } = useContext(InventoryContext);

  return (
    <header className="mobile-header">
      <button className="menu-toggle-btn" onClick={() => setMobileOpen(true)}>
        <Menu size={22} />
      </button>
      
      <div className="header-brand">
        <span className="brand-emoji">{config.logo || '💼'}</span>
        <span className="brand-name">{config.businessName || 'Contax'}</span>
      </div>

      <div className="header-status">
        {isOnline ? (
          <span className="status-badge online" title="Conectado a Internet">
            <Wifi size={14} />
            <span className="badge-text">Online</span>
          </span>
        ) : (
          <span className="status-badge offline" title="Modo sin conexión activado">
            <WifiOff size={14} />
            <span className="badge-text">Offline</span>
          </span>
        )}
      </div>

      <style>{`
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: var(--bg-sidebar);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border-bottom: var(--glass-border);
          padding: 0 16px;
          align-items: center;
          justify-content: space-between;
          z-index: 400;
        }

        .menu-toggle-btn {
          background: none;
          border: none;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
        }

        .menu-toggle-btn:active {
          background: rgba(148, 163, 184, 0.1);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .brand-emoji {
          font-size: 20px;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .header-status {
          display: flex;
          align-items: center;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-badge.online {
          background: var(--green-bg);
          color: var(--green-text);
        }

        .status-badge.offline {
          background: var(--amber-bg);
          color: var(--amber-text);
          animation: pulse 2s infinite;
        }

        .badge-text {
          display: inline-block;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 900px) {
          .mobile-header {
            display: flex;
          }
          .badge-text {
            display: none; /* Hide label on very narrow mobile screens */
          }
        }
        
        @media (min-width: 600px) {
          .badge-text {
            display: inline-block;
          }
        }
      `}</style>
    </header>
  );
}
