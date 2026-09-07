/// <reference types="vite/client" />

interface SkinMetaDto {
  id: string;
  name: string;
  num: number;
  championId: string;
  championKey: string;
  championName: string;
  downloadedAt?: number;
}

interface ApplySkinsResultDto {
  success: boolean;
  error?: string;
  alreadyActive?: string[];
  missing?: string[];
  warnings?: string[];
}

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
  // Skin indirme / kaldırma
  getDownloadedSkins: () => Promise<SkinMetaDto[]>;
  downloadSkin: (params: { championKey: string; skinId: string; meta?: SkinMetaDto }) => Promise<{ success: boolean; path?: string; error?: string }>;
  removeSkin: (params: { skinId: string }) => Promise<{ success: boolean; error?: string; wasActive?: boolean }>;
  onRemoveStatus: (callback: (event: any, data: { skinId: string; state: 'started' | 'finished' | 'warning' | 'error'; message?: string }) => void) => void;
  onSkinDownloadProgress: (callback: (event: any, data: { skinId: string; percent: number }) => void) => void;
  // Çoklu skin aktivasyonu (tek patcher + birleşik overlay)
  applySkins: (params: { skinIds: string[] }) => Promise<ApplySkinsResultDto>;
  deactivateSkin: (params: { skinId: string }) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
  getActiveSkins: () => Promise<string[]>;
  onActiveSkinsChanged: (callback: (event: any, ids: string[]) => void) => void;
  onPatchStatus: (callback: (event: any, data: { state: 'started' | 'finished' | 'error'; message?: string }) => void) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
