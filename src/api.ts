import { SkinItem, Chroma } from './types';

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

// Skin splash görseli URL'si
export function getSkinImageUrl(skinNum: number, championId: string): string {
  if (!championId) return '';
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
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
        num: skin.num,
        chromas: !!skin.chromas
      }));
    
    return skins;
  } catch (error) {
    console.error('Skinler yüklenirken hata:', error);
    return [];
  }
}

// ==================== CHROMA VERİSİ ====================
// Chroma isimleri/id'leri DDragon'da bulunmaz; CommunityDragon'un skins.json
// dosyasında her skinin "chromas" dizisi ({id, name, colors}) yer alır.
// Dosya büyük (~5MB) olduğu için bir kez çekilip bellekte önbelleğe alınır.

const CDRAGON_SKINS_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json'

interface CdBragonSkin {
  id: number
  name?: string
  chromas?: { id: number; name?: string; colors?: string[]; chromaPath?: string }[]
}

let skinsIndex: Map<number, CdBragonSkin> | null = null
let skinsIndexPromise: Promise<Map<number, CdBragonSkin>> | null = null

function loadSkinsIndex(): Promise<Map<number, CdBragonSkin>> {
  if (skinsIndex) return Promise.resolve(skinsIndex)
  if (!skinsIndexPromise) {
    skinsIndexPromise = (async () => {
      const res = await fetch(CDRAGON_SKINS_URL)
if (!res.ok) throw new Error(`Chroma verisi alınamadı (HTTP ${res.status})`)
const raw = await res.json()
const list: CdBragonSkin[] = Array.isArray(raw) ? raw : Object.values(raw)
const map = new Map<number, CdBragonSkin>()
for (const s of list) {
  if (s && typeof s.id === 'number') map.set(s.id, s)
}
      skinsIndex = map
      return map
    })().catch((err) => {
      // Hata durumunda promise'i sıfırla ki sonraki deneme tekrar çalışsın
      skinsIndexPromise = null
      throw err
    })
  }
  return skinsIndexPromise
}

// Uygulama açılışında chroma indeksini arka planda önceden çek (fire-and-forget)
export function preloadSkinIndex(): void {
  loadSkinsIndex().catch((err) => console.error('Chroma indeksi önceden çekilemedi:', err))
}

// Belirli bir skinin chroma varyantlarını döndürür
export async function fetchSkinChromas(skinId: string): Promise<Chroma[]> {
  try {
    const idx = await loadSkinsIndex()
    const skin = idx.get(Number(skinId))
    if (!skin || !Array.isArray(skin.chromas) || skin.chromas.length === 0) {
      return []
    }
    return skin.chromas.map((c) => ({
  id: String(c.id),
  name: c.name || `Chroma ${c.id}`,
  colors: Array.isArray(c.colors) ? c.colors : [],
  imageUrl: c.chromaPath
    ? `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default${c.chromaPath
        .replace(/^\/lol-game-data\/assets/i, '')
        .toLowerCase()}`
    : undefined
    }))
  } catch (error) {
    console.error('Chromalar yüklenirken hata:', error)
    return []
  }
}