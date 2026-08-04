import React, { useState, useContext } from 'react';
import { InventoryContext } from './context/InventoryContext';
import Onboarding from './components/Onboarding';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Vender from './components/Vender';
import Analytics from './components/Analytics';
import Auto from './components/Auto';
import Sectores from './components/Sectores';
import Productos from './components/Productos';
import Config from './components/Config';

// Modals
import SectorModal from './components/Modals/SectorModal';
import ProductModal from './components/Modals/ProductModal';
import SaleModal from './components/Modals/SaleModal';

export default function App() {
  const { loading, cats, config } = useContext(InventoryContext);
  const [activeTab, setActiveTab] = useState('inicio');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Modal states
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [prefilledCatId, setPrefilledCatId] = useState(null);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedSaleProductId, setSelectedSaleProductId] = useState(null);

  // ----------------------------------------------------
  // MODAL HANDLERS
  // ----------------------------------------------------
  const openSectorModal = (id = null) => {
    setSelectedSectorId(id);
    setSectorModalOpen(true);
  };

  const openProdModal = (id = null, catId = null) => {
    if (cats.length === 0) {
      alert('Debes crear primero un sector (categoría) antes de añadir productos.');
      setActiveTab('sectores');
      return;
    }
    setSelectedProductId(id);
    setPrefilledCatId(catId);
    setProductModalOpen(true);
  };

  const openVentaModal = (productId) => {
    setSelectedSaleProductId(productId);
    setSaleModalOpen(true);
  };

  // Render proper tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'vender':
        return <Vender openVentaModal={openVentaModal} />;
      case 'ganancias':
        return <Analytics />;
      case 'auto':
        return <Auto />;
      case 'sectores':
        return (
          <Sectores 
            openSectorModal={openSectorModal} 
            openProdModal={openProdModal} 
          />
        );
      case 'productos':
        return (
          <Productos 
            openProdModal={openProdModal} 
            openVentaModal={openVentaModal} 
          />
        );
      case 'config':
        return <Config />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  if (loading) {
    return (
      <div className="app-loader-container">
        <div className="spinner"></div>
        <p className="loader-text">Inicializando Base de Datos Offline...</p>
        <style>{`
          .app-loader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            width: 100vw;
            background: var(--bg);
            color: var(--text);
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid var(--border);
            border-top: 5px solid var(--blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .loader-text {
            margin-top: 20px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!config.businessType) {
    return <Onboarding />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Nav (Desktop & Mobile Drawer) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
      />
      
      {/* Main body wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Mobile Header status and toggle */}
        <Header setMobileOpen={setMobileOpen} />
        
        {/* Render pages */}
        <main className="main-content">
          {renderTabContent()}
        </main>
      </div>

      {/* Modals */}
      <SectorModal
        isOpen={sectorModalOpen}
        onClose={() => setSectorModalOpen(false)}
        sectorId={selectedSectorId}
      />

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        productId={selectedProductId}
        prefilledCatId={prefilledCatId}
      />

      <SaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        productId={selectedSaleProductId}
      />
    </div>
  );
}
