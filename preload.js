const { contextBridge, ipcRenderer } = require('electron');

// Exposer les API sécurisées au processus de rendu
contextBridge.exposeInMainWorld('api', {
  // Pour les établissements
  getDrenList: () => ipcRenderer.invoke('get-dren-list'),
  getCiscoBydren: (drenId) => ipcRenderer.invoke('get-cisco-by-dren', drenId),
  getZapByCisco: (ciscoId) => ipcRenderer.invoke('get-zap-by-cisco', ciscoId),
  
  // Pour les autres opérations CRUD
  createEtablissement: (data) => ipcRenderer.invoke('create-etablissement', data),
  readEtablissement: () => ipcRenderer.invoke('read-etablissement'),
  updateEtablissement: (data) => ipcRenderer.invoke('update-etablissement', data),
  deleteEtablissement: (id) => ipcRenderer.invoke('delete-etablissement', id)
});