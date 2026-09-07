const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  installUpdate: () => ipcRenderer.send('install-update'),

  // Ayarlar (LTK Manager yolu, patcher DLL yolu)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectPatcherPath: () => ipcRenderer.invoke('select-patcher-path'),
  selectDllPath: () => ipcRenderer.invoke('select-dll-path'),
  selectGamePath: () => ipcRenderer.invoke('select-game-path'),

  // Skin indirme / kaldırma
  getDownloadedSkins: () => ipcRenderer.invoke('get-downloaded-skins'),
  downloadSkin: (params) => ipcRenderer.invoke('download-skin', params),
  removeSkin: (params) => ipcRenderer.invoke('remove-skin', params),
  onRemoveStatus: (callback) => ipcRenderer.on('remove-status', callback),
  onSkinDownloadProgress: (callback) => ipcRenderer.on('skin-download-progress', callback),

  // Çoklu skin aktivasyonu (tek patcher + birleşik overlay)
  applySkins: (params) => ipcRenderer.invoke('apply-skins', params),
  deactivateSkin: (params) => ipcRenderer.invoke('deactivate-skin', params),
  getActiveSkins: () => ipcRenderer.invoke('get-active-skins'),
  onActiveSkinsChanged: (callback) => ipcRenderer.on('active-skins-changed', callback),
  onPatchStatus: (callback) => ipcRenderer.on('patch-status', callback)
})
