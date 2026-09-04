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
}

interface Window {
  electronAPI: ElectronAPI;
}
