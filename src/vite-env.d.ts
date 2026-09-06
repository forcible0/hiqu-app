/// <reference types="vite/client" />

interface ElectronAPI {
  checkForUpdates: () => Promise<{ success: boolean; message?: string; error?: string }>;
  getAppVersion: () => Promise<string>;
  onUpdateAvailable: (callback: (event: any, info: any) => void) => void;
  onUpdateNotAvailable: (callback: (event: any, info: any) => void) => void;
  onDownloadProgress: (callback: (event: any, progress: { percent: number }) => void) => void;
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => void;
  onUpdateError: (callback: (event: any, err: any) => void) => void;
  installUpdate: () => void;
  // Ayarlar
  getSettings: () => Promise<{ patcherPath?: string; dllPath?: string; gamePath?: string }>;
  saveSettings: (settings: { patcherPath?: string; dllPath?: string; gamePath?: string }) => Promise<{ success: boolean; error?: string }>;
  selectPatcherPath: () => Promise<string | null>;
  selectDllPath: () => Promise<string | null>;
  selectGamePath: () => Promise<string | null>;
  // Skin yönetimi
  getDownloadedSkins: () => Promise<string[]>;
  downloadSkin: (params: { championKey: string; skinId: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  removeSkin: (params: { skinId: string }) => Promise<{ success: boolean; error?: string }>;
  applySkin: (params: { skinId: string }) => Promise<{ success: boolean; error?: string }>;
  onRemoveStatus: (callback: (event: any, data: { skinId: string; state: 'started' | 'finished' | 'warning' | 'error'; message?: string }) => void) => void;
  onSkinDownloadProgress: (callback: (event: any, data: { skinId: string; percent: number }) => void) => void;
  onApplyStatus: (callback: (event: any, data: { skinId: string; state: 'started' | 'running' | 'finished' | 'error'; message?: string }) => void) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
