import { SkinItem } from './types';

const DRAGON_API_BASE = 'https://ddragon.leagueoflegends.com/cdn';
let currentVersion = '';

async function getLatestVersion(): Promise<string> {
  if (currentVersion) return currentVersion;
  
  try {
    const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await response.json();
    currentVersion = versions[0]; // En son sürüm
    return currentVersion;
  } catch (error) {
    console.error('Versiyon alınamadı:', error);
    return '14.1.1'; // Fallback versiyon
  }
}

export async function fetchChampions(): Promise<SkinItem[]> {
  try {
    const version = await getLatestVersion();
    const response = await fetch(`${DRAGON_API_BASE}/${version}/data/tr_TR/champion.json`);
    
    if (!response.ok) {
      throw new Error('API yanıt vermedi');
    }
    
    const data = await response.json();
    const champions = Object.values(data.data) as any[];
    
    // Şampiyonları A'dan Z'ye sırala
    const sortedChampions = champions.sort((a, b) => 
      a.name.localeCompare(b.name, 'tr')
    );
    
    // Her şampiyonu SkinItem formatına dönüştür
    return sortedChampions.map((champion: any) => ({
      id: champion.id,
      key: champion.key, // Sayısal ID (LeagueSkins reposu için gerekli)
      name: champion.name,
      champion: champion.name,
      title: champion.title,
      description: champion.blurb,
      image: `${DRAGON_API_BASE}/${version}/img/champion/${champion.image.full}`,
      version: version
    }));
  } catch (error) {
    console.error('Şampiyonlar yüklenirken hata:', error);
    return [];
  }
}

// Data Dragon'dan skinleri çek (chromasız)
export async function fetchChampionSkins(championId: string): Promise<any[]> {
  try {
    const version = await getLatestVersion();
    const response = await fetch(`${DRAGON_API_BASE}/${version}/data/tr_TR/champion/${championId}.json`);
    
    if (!response.ok) {
      throw new Error('Şampiyon detayları alınamadı');
    }
    
    const data = await response.json();
    const championData = data.data[championId];
    
    // Skin'leri al ve chromaları filtrele
    const skins = championData.skins
      .filter((skin: any) => {
        const skinName = skin.name.toLowerCase();
        // Default ve chroma içeren skin'leri filtrele
        return !skinName.includes('default') && 
               !skinName.includes('(') &&
               !skinName.includes('chroma');
      })
      .map((skin: any) => ({
        id: skin.id.toString(),
        name: skin.name,
        num: skin.num
      }));
    
    return skins;
  } catch (error) {
    console.error('Skinler yüklenirken hata:', error);
    return [];
  }
}