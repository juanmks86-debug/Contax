import React, { useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  TrendingUp, 
  Zap, 
  FolderKanban, 
  Package, 
  Settings,
  X 
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'vender', label: 'Vender', icon: ShoppingBag },
  { id: 'ganancias', label: 'Ganancias', icon: TrendingUp },
  { id: 'auto', label: 'Automatizaciones', icon: Zap },
  { id: 'sectores', label: 'Sectores', icon: FolderKanban },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'config', label: 'Configuración', icon: Settings }
];

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  const { config } = useContext(InventoryContext);

  const handleNav = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div 
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} 
        onClick={() => setMobileOpen(false)}
      />
      
      {/* Sidebar container */}
      <aside className={`sidebar-container ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-emoji">{config.logo || '💼'}</span>
            <span className="logo-text">{config.businessName || 'Contax'}</span>
          </div>
          <button className="sidebar-close-btn" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} className="sidebar-icon" />
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div className="version-tag">Contax React PWA v2.0</div>
        </div>
      </aside>

      <style>{`
        /* Sidebar container base style (Desktop) */
        .sidebar-container {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: var(--bg-sidebar);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border-right: var(--glass-border);
          display: flex;
          flex-direction: column;
          z-index: 500;
          transition: transform var(--transition-normal);
        }

        .sidebar-header {
          padding: 24px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-emoji {
          font-size: 24px;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--text);
        }

        .sidebar-close-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }

        .sidebar-nav {
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
          min-height: 44px;
        }

        .sidebar-link:hover {
          background: rgba(148, 163, 184, 0.1);
          color: var(--text);
        }

        .sidebar-link.active {
          background: var(--blue-bg);
          color: var(--blue-text);
        }

        .sidebar-icon {
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .version-tag {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* Mobile Responsive Drawer Overlay */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 499;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--transition-normal);
        }

        /* Mobile view stylesheet overrides */
        @media (max-width: 900px) {
          .sidebar-container {
            transform: translateX(-100%);
          }
          
          .sidebar-container.mobile-open {
            transform: translateX(0);
            box-shadow: var(--shadow-lg);
          }
          
          .sidebar-overlay.open {
            display: block;
            opacity: 1;
            pointer-events: auto;
          }
          
          .sidebar-close-btn {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}
