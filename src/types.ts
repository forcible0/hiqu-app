export interface SkinItem {
  id: string;
  key?: string; // Sayısal şampiyon ID'si (LeagueSkins repo yapısı için)
  name: string;
  champion: string;
  title?: string;
  description?: string;
  image: string;
  skins?: any[];
  version?: string;
  [key: string]: any;
}

export interface Skin {
  id: string; // Sayısal skin ID'si (örn. "266001")
  name: string;
  num: number;
}

export interface AppSettings {
  patcherPath?: string;
  dllPath?: string;
  gamePath?: string;
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}
