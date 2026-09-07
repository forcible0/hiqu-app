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

// Bir skini her yerde tanımlamak için yeterli kalıcı bilgi.
// Favoriler, Sıra ve İndirilenler bu yapıyla tutulur.
export interface SkinMeta {
  id: string;
  name: string;
  num: number;
  championId: string;   // 'Ahri' gibi (splash görseli için)
  championKey: string;  // Sayısal ID (LoLskins indirme URL'si için)
  championName: string;
  downloadedAt?: number;
}

export type TabKey = 'champions' | 'favorites' | 'downloaded';

export interface AppSettings {
  patcherPath?: string;
  dllPath?: string;
  gamePath?: string;
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface ApplySkinsResult {
  success: boolean;
  error?: string;
  alreadyActive?: string[];
  missing?: string[];
  warnings?: string[];
}
