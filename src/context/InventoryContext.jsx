import React, { createContext, useState, useEffect } from 'react';
import { dbGetAll, dbPut, dbClearAll } from '../utils/db';
import { DEMO_SECTORES, DEMO_PRODUCTOS, getDemoVentas } from '../utils/demoData';

export const InventoryContext = createContext();

const DEFAULT_CONFIG = {
  businessName: 'Contax',
  currency: '$',
  logo: '💼'
};

export const InventoryProvider = ({ children }) => {
  const [cats, setCats] = useState([]);
  const [prods, setProds] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  // Load initial data from IndexedDB & LocalStorage
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedCats, loadedProds, loadedVentas] = await Promise.all([
          dbGetAll('sectores'),
          dbGetAll('productos'),
          dbGetAll('ventas')
        ]);
        
        setCats(loadedCats);
        setProds(loadedProds);
        setVentas(loadedVentas);
        
        const storedConfig = localStorage.getItem('contax_config');
        if (storedConfig) {
          setConfig(JSON.parse(storedConfig));
        }

        // Request browser notifications permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } catch (e) {
        console.error('Error al cargar IndexedDB:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Listen to network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync state to IndexedDB helpers
  const syncCats = async (newCats) => {
    setCats(newCats);
    await dbPut('sectores', newCats);
  };

  const syncProds = async (newProds) => {
    setProds(newProds);
    await dbPut('productos', newProds);
  };

  const syncVentas = async (newVentas) => {
    setVentas(newVentas);
    await dbPut('ventas', newVentas);
  };

  // ----------------------------------------------------
  // BUSINESS ACTIONS
  // ----------------------------------------------------

  const saveSector = async (sector) => {
    let newCats;
    if (sector.id) {
      newCats = cats.map(c => c.id === sector.id ? sector : c);
    } else {
      const newSector = { ...sector, id: 'cat-' + Date.now().toString(36) };
      newCats = [...cats, newSector];
    }
    await syncCats(newCats);
  };

  const delSector = async (id) => {
    const newCats = cats.filter(c => c.id !== id);
    const newProds = prods.filter(p => p.catId !== id);
    await syncCats(newCats);
    await syncProds(newProds);
  };

  const saveProd = async (prod) => {
    let newProds;
    if (prod.id) {
      newProds = prods.map(p => p.id === prod.id ? prod : p);
    } else {
      const newProd = { ...prod, id: 'prod-' + Date.now().toString(36) };
      newProds = [...prods, newProd];
    }
    await syncProds(newProds);
  };

  const delProd = async (id) => {
    const newProds = prods.filter(p => p.id !== id);
    await syncProds(newProds);
  };

  // Helper to send low stock notification
  const triggerNotification = (prod, cat) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const emoji = cat?.icon || '⚠️';
      try {
        new Notification(`Stock bajo en ${cat?.name || 'Inventario'}`, {
          body: `El producto "${prod.name}" bajó a ${prod.qty} ${prod.unit || 'uds'} (Mínimo: ${prod.minQty})`,
          icon: '/icons/icon-192.png'
        });
      } catch (err) {
        console.warn('Fallo al disparar notificación nativa:', err);
      }
    }
  };

  const confirmarVenta = async (prodId, qty) => {
    const prodIndex = prods.findIndex(p => p.id === prodId);
    if (prodIndex === -1) return false;

    const prod = prods[prodIndex];
    if (prod.qty < qty) return false;

    // Deduct stock
    const updatedProd = { ...prod, qty: parseFloat((prod.qty - qty).toFixed(2)) };
    const newProds = prods.map(p => p.id === prodId ? updatedProd : p);
    await syncProds(newProds);

    // Get prices
    const sale = prod.saleManual > 0 ? prod.saleManual : prod.cost * (1 + prod.margin / 100);
    const profit = sale - prod.cost;

    // Create sale record
    const newSale = {
      id: 'sale-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      prodId: prod.id,
      prodName: prod.name,
      prodSku: prod.sku || '',
      catId: prod.catId,
      qty: qty,
      unit: prod.unit || 'uds',
      saleUnit: sale,
      profitUnit: profit,
      total: parseFloat((sale * qty).toFixed(2)),
      totalProfit: parseFloat((profit * qty).toFixed(2)),
      fecha: Date.now()
    };

    const newVentas = [...ventas, newSale];
    await syncVentas(newVentas);

    // Check if it goes below minimum stock
    if (updatedProd.qty <= updatedProd.minQty) {
      const cat = cats.find(c => c.id === prod.catId);
      triggerNotification(updatedProd, cat);
    }

    return true;
  };

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('contax_config', JSON.stringify(newConfig));
  };

  const loadDemoData = async () => {
    setLoading(true);
    try {
      await syncCats(DEMO_SECTORES);
      await syncProds(DEMO_PRODUCTOS);
      const demoVentas = getDemoVentas();
      await syncVentas(demoVentas);
      
      const newConfig = {
        businessName: 'MiniMarket Demo',
        currency: '$',
        logo: '🏪'
      };
      updateConfig(newConfig);
    } catch (e) {
      console.error('Error loading demo data:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    setLoading(true);
    try {
      await dbClearAll();
      setCats([]);
      setProds([]);
      setVentas([]);
      setConfig(DEFAULT_CONFIG);
      localStorage.removeItem('contax_config');
    } catch (e) {
      console.error('Error clearing data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Backup & Restore
  const exportJSON = () => {
    const dataStr = JSON.stringify({
      version: '1.0.0',
      cats,
      prods,
      ventas,
      config
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contax_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importJSON = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.cats && data.prods && data.ventas) {
            await syncCats(data.cats);
            await syncProds(data.prods);
            await syncVentas(data.ventas);
            if (data.config) {
              updateConfig(data.config);
            }
            resolve(true);
          } else {
            reject(new Error('Formato de copia de seguridad inválido.'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsText(file);
    });
  };

  return (
    <InventoryContext.Provider value={{
      cats,
      prods,
      ventas,
      config,
      isOnline,
      loading,
      saveSector,
      delSector,
      saveProd,
      delProd,
      confirmarVenta,
      updateConfig,
      loadDemoData,
      clearAllData,
      exportJSON,
      importJSON
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
