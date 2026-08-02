// IndexedDB Helper for Contax React PWA
const DB_NAME = 'ContaxDB';
const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sectores')) {
        db.createObjectStore('sectores', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('productos')) {
        db.createObjectStore('productos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ventas')) {
        db.createObjectStore('ventas', { keyPath: 'id' });
      }
    };
  });
}

export function dbGetAll(storeName) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbPut(storeName, data) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // If it's an array, we overwrite the whole store to keep in sync
      if (Array.isArray(data)) {
        store.clear();
        data.forEach((item) => store.put(item));
      } else {
        store.put(data);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export function dbClearAll() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sectores', 'productos', 'ventas'], 'readwrite');
      transaction.objectStore('sectores').clear();
      transaction.objectStore('productos').clear();
      transaction.objectStore('ventas').clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}
