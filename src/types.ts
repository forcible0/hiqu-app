export interface SkinItem {
  id: string;
  name: string;
  champion: string;
  title?: string;
  description?: string;
  image: string;
  skins?: any[];
  version?: string;
  [key: string]: any;
}
