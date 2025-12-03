
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listsGet: (type) => ipcRenderer.invoke('lists-get', type),
  listsAdd: (type, value) => ipcRenderer.invoke('lists-add', type, value),
  listsUpdate: (id, value) => ipcRenderer.invoke('lists-update', id, value),
  listsDelete: (id) => ipcRenderer.invoke('lists-delete', id),
  entryAdd: (entry) => ipcRenderer.invoke('entry-add', entry),
  entryQuery: (start, end) => ipcRenderer.invoke('entry-query', start, end),
  exportXlsx: (rows) => ipcRenderer.invoke('export-xlsx', rows)
});
