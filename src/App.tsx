import { useEffect, useMemo, useRef, useState } from 'react'
import { Skin, SkinItem, SkinMeta, AppSettings, TabKey, Toast, ApplySkinsResult, Chroma } from './types'
import { fetchChampions, fetchChampionSkins, fetchSkinChromas } from './api'
import Sidebar from './components/Sidebar'
import SkinCard from './components/SkinCard'
import SkinModal from './components/SkinModal'
import QueueBar from './components/QueueBar'
import Toasts from './components/Toasts'
import PartyModal from './components/PartyModal'
import { getDeviceId, getSavedRoomCode, createRoom, joinRoom, leaveRoom, listenToMembers, listenToRoomSkins, listenToRemovedSkins, broadcastActiveSkin, removeActiveSkin, getProcessedMap, setProcessedEntry, PartyMember, PartySkinEntry } from './party'
import { Check, Square, Trash2, ArrowLeft, Palette, Heart, Package, Dices, Wand2, Search, type LucideIcon } from 'lucide-react'


const FAVORITES_KEY = 'buck_favorites'
const QUEUE_KEY = 'buck_queue'

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// Şampiyon ID'lerini dosya adlarına map etme fonksiyonu
function getChampionImageFilename(championId: string): string {
  const mapping: Record<string, string> = {
    'Aatrox': 'aatrox',
    'Ahri': 'ahri',
    'Akali': 'akali',
    'Akshan': 'akshan',
    'Alistar': 'alistar',
    'Ambessa': 'ambessa',
    'Amumu': 'amumu',
    'Anivia': 'anivia',
    'Annie': 'annie',
    'Aphelios': 'aphelios',
    'Ashe': 'ashe',
    'AurelionSol': 'aurelionsol',
    'Aurora': 'aurora',
    'Azir': 'azir',
    'Bard': 'bard',
    'Belveth': 'belveth',
    'Blitzcrank': 'blitzcrank',
    'Brand': 'brand',
    'Braum': 'braum',
    'Briar': 'briar',
    'Caitlyn': 'caitlyn',
    'Camille': 'camille',
    'Cassiopeia': 'cassiopeia',
    'Chogath': 'chogath',
    'Corki': 'corki',
    'Darius': 'darius',
    'Diana': 'diana',
    'DrMundo': 'drmundo',
    'Draven': 'draven',
    'Ekko': 'ekko',
    'Elise': 'elise',
    'Evelynn': 'evelynn',
    'Ezreal': 'ezreal',
    'Fiddlesticks': 'fiddlesticks',
    'Fiora': 'fiora',
    'Fizz': 'fizz',
    'Galio': 'galio',
    'Gangplank': 'gangplank',
    'Garen': 'garen',
    'Gnar': 'gnar',
    'Gragas': 'gragas',
    'Graves': 'graves',
    'Gwen': 'gwen',
    'Hecarim': 'hecarim',
    'Heimerdinger': 'heimerdinger',
    'Hwei': 'hwei',
    'Illaoi': 'illaoi',
    'Irelia': 'irelia',
    'Ivern': 'ivern',
    'Janna': 'janna',
    'JarvanIV': 'jarvaniv',
    'Jax': 'jax',
    'Jayce': 'jayce',
    'Jhin': 'jhin',
    'Jinx': 'jinx',
    'KSante': 'ksante',
    'Kaisa': 'kaisa',
    'Kalista': 'kalista',
    'Karma': 'karma',
    'Karthus': 'karthus',
    'Kassadin': 'kassadin',
    'Katarina': 'katarina',
    'Kayle': 'kayle',
    'Kayn': 'kayn',
    'Kennen': 'kennen',
    'KhaZix': 'khazix',
    'Kindred': 'kindred',
    'Kled': 'kled',
    'KogMaw': 'kogmaw',
    'LeBlanc': 'leblanc',
    'LeeSin': 'leesin',
    'Leona': 'leona',
    'Lillia': 'lillia',
    'Lissandra': 'lissandra',
    'Locke': 'locke',
    'Lucian': 'lucian',
    'Lulu': 'lulu',
    'Lux': 'lux',
    'Malphite': 'malphite',
    'Malzahar': 'malzahar',
    'Maokai': 'maokai',
    'MasterYi': 'masteryi',
    'Mel': 'mel',
    'Milio': 'milio',
    'MissFortune': 'missfortune',
    'Mordekaiser': 'mordekaiser',
    'Morgana': 'morgana',
    'Naafiri': 'naafiri',
    'Nami': 'nami',
    'Nasus': 'nasus',
    'Nautilus': 'nautilus',
    'Neeko': 'neeko',
    'Nidalee': 'nidalee',
    'Nilah': 'nilah',
    'Nocturne': 'nocturne',
    'Nunu': 'nunu',
    'Olaf': 'olaf',
    'Orianna': 'orianna',
    'Ornn': 'ornn',
    'Pantheon': 'pantheon',
    'Poppy': 'poppy',
    'Pyke': 'pyke',
    'Qiyana': 'qiyana',
    'Quinn': 'quinn',
    'Rakan': 'rakan',
    'Rammus': 'rammus',
    'RekSai': 'reksai',
    'Rell': 'rell',
    'Renata': 'renata',
    'Renekton': 'renekton',
    'Rengar': 'rengar',
    'Riven': 'riven',
    'Rumble': 'rumble',
    'Ryze': 'ryze',
    'Samira': 'samira',
    'Sejuani': 'sejuani',
    'Senna': 'senna',
    'Seraphine': 'seraphine',
    'Sett': 'sett',
    'Shaco': 'shaco',
    'Shen': 'shen',
    'Shyvana': 'shyvana',
    'Singed': 'singed',
    'Sion': 'sion',
    'Sivir': 'sivir',
    'Skarner': 'skarner',
    'Smolder': 'smolder',
    'Sona': 'sona',
    'Soraka': 'soraka',
    'Swain': 'swain',
    'Sylas': 'sylas',
    'Syndra': 'syndra',
    'TahmKench': 'tahmkench',
    'Taliyah': 'taliyah',
    'Talon': 'talon',
    'Taric': 'taric',
    'Teemo': 'teemo',
    'Thresh': 'thresh',
    'Tristana': 'tristana',
    'Trundle': 'trundle',
    'Tryndamere': 'tryndamere',
    'TwistedFate': 'twistedfate',
    'Twitch': 'twitch',
    'Udyr': 'udyr',
    'Urgot': 'urgot',
    'Varus': 'varus',
    'Vayne': 'vayne',
    'Veigar': 'veigar',
    'VelKoz': 'velkoz',
    'Vex': 'vex',
    'Vi': 'vi',
    'Viego': 'viego',
    'Viktor': 'viktor',
    'Vladimir': 'vladimir',
    'Volibear': 'volibear',
    'Warwick': 'warwick',
    'Wukong': 'wukong',
    'Xayah': 'xayah',
    'Xerath': 'xerath',
    'XinZhao': 'xinzhao',
    'Yasuo': 'yasuo',
    'Yone': 'yone',
    'Yorick': 'yorick',
    'Yunara': 'yunara',
    'Yuumi': 'yuumi',
    'Zaahen': 'zaahen',
    'Zac': 'zac',
    'Zed': 'zed',
    'Zeri': 'zeri',
    'Ziggs': 'ziggs',
    'Zilean': 'zilean',
    'Zoe': 'zoe',
    'Zyra': 'zyra',
  };
  
  return mapping[championId] || championId.toLowerCase().replace(/[^a-z]/g, '');
}

// League of Legends resmi sitesine göre tahmini pozisyon değerleri (kullanıcı geri bildirimlerine göre)
const CHAMPION_POSITIONS: Record<string, string> = {
  'Aatrox': '75% center',
  'Ahri': '70% center',
  'Akali': '45% center',
  'Akshan': '65% center',
  'Alistar': '65% center',
  'Amumu': '70% center',
  'Anivia': '65% center',
  'Annie': '95% center',
  'Aphelios': '50% center',
  'Ashe': '85% center',
  'AurelionSol': '50% center',
  'Azir': '80% center',
  'Bard': '65% center',
  'Belveth': '50% center',
  'Blitzcrank': '70% center',
  'Brand': '90% center',
  'Braum': '80% center',
  'Briar': '65% center',
  'Caitlyn': '90% center',
  'Camille': '90% center',
  'Cassiopeia': '85% center',
  'Chogath': '80% center',
  'Corki': '85% center',
  'Darius': '65% center',
  'Diana': '85% center',
  'DrMundo': '50% center',
  'Draven': '95% center',
  'Ekko': '90% center',
  'Elise': '90% center',
  'Evelynn': '50% center',
  'Ezreal': '80% center',
  'Fiddlesticks': '25% center',
  'Fiora': '85% center',
  'Fizz': '90% center',
  'Galio': '40% center',
  'Gangplank': '80% center',
  'Garen': '90% center',
  'Gnar': '90% center',
  'Gragas': '80% center',
  'Graves': '85% center',
  'Gwen': '50% center',
  'Hecarim': '65% center',
  'Heimerdinger': '80% center',
  'Illaoi': '70% center',
  'Irelia': '50% center',
  'Ivern': '50% center',
  'Janna': '90% center',
  'JarvanIV': '85% center',
  'Jax': '70% center',
  'Jayce': '85% center',
  'Jhin': '55% center',
  'Jinx': '90% center',
  'Kaisa': '30% center',
  'Kalista': '80% center',
  'Karma': '90% center',
  'Karthus': '80% center',
  'Kassadin': '80% center',
  'Katarina': '80% center',
  'Kayle': '95% center',
  'Kayn': '50% center',
  'Kennen': '80% center',
  'KhaZix': '60% center',
  'Kindred': '50% center',
  'Kled': '90% center',
  'KogMaw': '85% center',
  'LeBlanc': '50% center',
  'LeeSin': '80% center',
  'Leona': '95% center',
  'Lillia': '30% center',
  'Locke': '70% center',
  'Lissandra': '80% center',
  'Lucian': '90% center',
  'Lulu': '80% center',
  'Lux': '70% center',
  'Malphite': '80% center',
  'Malzahar': '70% center',
  'Maokai': '80% center',
  'MasterYi': '90% center',
  'Mel': '40% center',
  'Milio': '70% center',
  'MissFortune': '90% center',
  'Mordekaiser': '50% center',
  'Morgana': '95% center',
  'Naafiri': '30% center',
  'Nami': '90% center',
  'Nasus': '80% center',
  'Nautilus': '85% center',
  'Neeko': '50% center',
  'Nidalee': '90% center',
  'Nilah': '80% center',
  'Nocturne': '80% center',
  'Nunu': '80% center',
  'Olaf': '75% center',
  'Orianna': '80% center',
  'Ornn': '50% center',
  'Pantheon': '50% center',
  'Poppy': '70% center',
  'Pyke': '50% center',
  'Qiyana': '50% center',
  'Quinn': '70% center',
  'Rakan': '60% center',
  'Rammus': '80% center',
  'RekSai': '70% center',
  'Rell': '50% center',
  'Renata': '70% center',
  'Renekton': '70% center',
  'Rengar': '80% center',
  'Riven': '80% center',
  'Rumble': '80% center',
  'Ryze': '80% center',
  'Samira': '60% center',
  'Sejuani': '60% center',
  'Senna': '60% center',
  'Seraphine': '50% center',
  'Sett': '50% center',
  'Shaco': '90% center',
  'Shen': '80% center',
  'Shyvana': '50% center',
  'Singed': '70% center',
  'Sion': '80% center',
  'Sivir': '50% center',
  'Skarner': '50% center',
  'Smolder': '50% center',
  'Sona': '80% center',
  'Soraka': '70% center',
  'Swain': '80% center',
  'Sylas': '50% center',
  'Syndra': '50% center',
  'TahmKench': '80% center',
  'Taliyah': '80% center',
  'Talon': '70% center',
  'Taric': '90% center',
  'Teemo': '60% center',
  'Thresh': '70% center',
  'Tristana': '70% center',
  'Trundle': '70% center',
  'Tryndamere': '70% center',
  'TwistedFate': '85% center',
  'Twitch': '50% center',
  'Udyr': '50% center',
  'Urgot': '60% center',
  'Varus': '50% center',
  'Vayne': '80% center',
  'Veigar': '60% center',
  'VelKoz': '70% center',
  'Vex': '70% center',
  'Vi': '80% center',
  'Viego': '70% center',
  'Viktor': '50% center',
  'Vladimir': '70% center',
  'Volibear': '70% center',
  'Warwick': '70% center',
  'Wukong': '95% center',
  'Xayah': '75% center',
  'Xerath': '60% center',
  'XinZhao': '60% center',
  'Yasuo': '95% center',
  'Yone': '70% center',
  'Yorick': '80% center',
  'Yunara': '70% center',
  'Yuumi': '40% center',
  'Zac': '70% center',
  'Zed': '80% center',
  'Zeri': '50% center',
  'Ziggs': '85% center',
  'Zilean': '50% center',
  'Zoe': '50% center',
  'Zyra': '85% center',
}

export default function App() {
  // Şampiyon verisi
  const [champions, setChampions] = useState<SkinItem[]>([])
  const [selectedChampion, setSelectedChampion] = useState<SkinItem | null>(null)
  const [championSkins, setChampionSkins] = useState<Skin[]>([])
  const [loadingChampions, setLoadingChampions] = useState(true)
  const [loadingSkins, setLoadingSkins] = useState(false)

  // Sekmeler + arama
  const [tab, setTab] = useState<TabKey>('champions')
  const [search, setSearch] = useState('')

  // Skin koleksiyonları (kalıcı: localStorage / main process)
  const [favorites, setFavorites] = useState<SkinMeta[]>(() => loadJson<SkinMeta[]>(FAVORITES_KEY, []))
  const [queue, setQueue] = useState<SkinMeta[]>(() => loadJson<SkinMeta[]>(QUEUE_KEY, []))
  const [downloadedMetas, setDownloadedMetas] = useState<SkinMeta[]>([])
  const [activeSkins, setActiveSkins] = useState<string[]>([])

  // Devam eden işlemler
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [isPatching, setIsPatching] = useState(false)
  const [patchProgress, setPatchProgress] = useState('')
  const [patcherRunning, setPatcherRunning] = useState(false)

  // Modal
  const [modalMeta, setModalMeta] = useState<SkinMeta | null>(null)
  const [modalChromas, setModalChromas] = useState<Chroma[]>([])
const [loadingChromas, setLoadingChromas] = useState(false)
const [selectedChromaId, setSelectedChromaId] = useState<string | null>(null)
const [showPartyModal, setShowPartyModal] = useState(false)
const [partyRoomCode, setPartyRoomCode] = useState<string | null>(getSavedRoomCode())
const [partyMembers, setPartyMembers] = useState<PartyMember[]>([])

  // Ayarlar & güncelleme
  const [settings, setSettings] = useState<AppSettings>({})
  const [appVersion, setAppVersion] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  // Multi-select mode for downloaded tab
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const addToast = (type: Toast['type'], message: string) => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, type, message }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  // Multi-select handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDeleteAllDownloaded = async () => {
    if (!window.electronAPI) return
    if (downloadedMetas.length === 0) {
      addToast('info', 'İndirilen skin yok')
      return
    }

    let blockedCount = 0
    for (const meta of downloadedMetas) {
      const blocked = getPartyBlock(meta)
      if (blocked) {
        blockedCount++
        continue
      }
      const res = await window.electronAPI.removeSkin({ skinId: meta.id })
      if (!res.success) {
        addToast('error', `"${meta.name}" silinemedi: ${res.error || 'Bilinmeyen hata'}`)
      } else {
        maybeBroadcastRemoval(meta)
      }
    }
    if (blockedCount > 0) {
      addToast('warning', `${blockedCount} skin arkadaşın tarafından aktive edildiği için atlandı`)
    }
    addToast('success', 'İndirilenler silindi')
    refreshDownloaded()
  }

  const handleDeleteSelected = async () => {
    if (!window.electronAPI) return
    if (selectedIds.size === 0) {
      addToast('info', 'Seçilen skin yok')
      return
    }

    let blockedCount = 0
    for (const id of selectedIds) {
      const meta = downloadedMetas.find((m) => m.id === id)
      if (meta) {
        const blocked = getPartyBlock(meta)
        if (blocked) {
          blockedCount++
          continue
        }
        const res = await window.electronAPI.removeSkin({ skinId: id })
        if (!res.success) {
          addToast('error', `"${meta.name}" silinemedi: ${res.error || 'Bilinmeyen hata'}`)
        } else {
          maybeBroadcastRemoval(meta)
        }
      }
    }
    if (blockedCount > 0) {
      addToast('warning', `${blockedCount} skin arkadaşın tarafından aktive edildiği için atlandı`)
    }
    addToast('success', 'Seçilenler silindi')
    setSelectedIds(new Set())
    setSelectionMode(false)
    refreshDownloaded()
  }

  // Türetilmiş set'ler
  const activeSet = useMemo(() => new Set(activeSkins), [activeSkins])
  const downloadedIds = useMemo(() => new Set(downloadedMetas.map((m) => m.id)), [downloadedMetas])
  const favoriteIds = useMemo(() => new Set(favorites.map((m) => m.id)), [favorites])
  const queueIds = useMemo(() => new Set(queue.map((m) => m.id)), [queue])

  const refreshDownloaded = () => {
    if (window.electronAPI) {
      return window.electronAPI.getDownloadedSkins().then(setDownloadedMetas)
    }
    return Promise.resolve()
  }

// İlk yükleme: şampiyonlar, ayarlar, indirilenler, aktif skinler
// İlk "indirilenler" yüklemesi bitene kadar parti'den gelen aktivasyonları işlemeye başlamıyoruz
  // (yoksa disk henüz okunmadan "indirilmemiş" sanılıp zaten indirilmiş bir skin tekrar indirilmeye çalışılır)
  const initialDownloadedLoadedRef = useRef(false)

  useEffect(() => {
    fetchChampions()
      .then(setChampions)
      .finally(() => setLoadingChampions(false))
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(setSettings)
      window.electronAPI.getAppVersion().then(setAppVersion)
      refreshDownloaded().finally(() => {
        initialDownloadedLoadedRef.current = true
      })
      window.electronAPI.getActiveSkins().then((ids) => {
        setActiveSkins(ids)
        setPatcherRunning(ids.length > 0)
      })
    } else {
      initialDownloadedLoadedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Parti üyelerini dinleme
  useEffect(() => {
    if (!partyRoomCode) {
      setPartyMembers([])
      return
    }
    const unsubscribe = listenToMembers(partyRoomCode, setPartyMembers)
    return () => unsubscribe()
  }, [partyRoomCode])

  const partyProcessedRef = useRef<Record<string, number>>({})
  const partyProcessingRef = useRef<Set<string>>(new Set())
  // Odadaki en güncel activeSkins anlık görüntüsü — handleRemove'ın "bu skin
  // hâlâ benim partiye gönderdiğim güncel kayıt mı?" kontrolü için senkron
  // olarak buradan okunur (React state'i beklemeye gerek kalmadan).
  const partyActiveEntriesRef = useRef<Record<string, PartySkinEntry>>({})
  const activeSetRef = useRef(activeSet)
  const downloadedIdsRef = useRef(downloadedIds)
  const championsRef = useRef(champions)
  const handleApplyRef = useRef<((meta: SkinMeta, chromaOf?: string) => Promise<void>) | null>(null)

  useEffect(() => {
    activeSetRef.current = activeSet
    downloadedIdsRef.current = downloadedIds
    championsRef.current = champions
  }, [activeSet, downloadedIds, champions])

  // Partiden gelen skin aktivasyonlarını dinleyip otomatik uygula
  useEffect(() => {
    if (!partyRoomCode) return
    const myDeviceId = getDeviceId()
    // Odaya (yeniden) bağlanırken daha önce bu odada işlenmiş kayıtları
    // localStorage'dan yükle — yoksa uygulama kapanıp açıldığında Firebase'in
    // yolladığı geçmiş activeSkins verisi baştan işlenmeye çalışılır.
    partyProcessedRef.current = getProcessedMap(partyRoomCode)

    let cancelled = false
    let pendingSkins: Record<string, PartySkinEntry> | null = null

    const processSkins = (skins: Record<string, PartySkinEntry>) => {
      Object.values(skins).forEach(async (entry: PartySkinEntry) => {
        if (cancelled) return
        if (entry.setBy === myDeviceId) return
        if (partyProcessedRef.current[entry.championId] === entry.setAt) return
        // chroma seçiliyse gerçekte indirilip aktive edilecek olan id chroma'nınkidir
        const targetId = entry.chromaId || entry.skinId
        if (partyProcessingRef.current.has(targetId)) return
        if (activeSetRef.current.has(targetId)) {
          partyProcessedRef.current[entry.championId] = entry.setAt
          setProcessedEntry(partyRoomCode, entry.championId, entry.setAt)
          return
        }

        partyProcessedRef.current[entry.championId] = entry.setAt
        setProcessedEntry(partyRoomCode, entry.championId, entry.setAt)
        partyProcessingRef.current.add(targetId)

        try {
          addToast('info', `Parti: "${entry.name}" arkadaşın tarafından aktive edildi, indiriliyor...`)
          const championKey = championsRef.current.find((c) => c.id === entry.championId)?.key || ''
          const partyMeta: SkinMeta = {
            id: targetId,
            name: entry.name,
            num: entry.num,
            championId: entry.championId,
            championKey,
            championName: entry.championName
          }
          if (!downloadedIdsRef.current.has(targetId)) {
            if (entry.chromaId) {
              await window.electronAPI?.downloadChroma({
                championKey,
                skinId: entry.skinId,
                chromaId: entry.chromaId,
                meta: partyMeta
              })
            } else {
              await window.electronAPI?.downloadSkin({ championKey, skinId: entry.skinId, meta: partyMeta })
            }
            downloadedIdsRef.current = new Set(downloadedIdsRef.current).add(targetId)
            refreshDownloaded()
          }
          await handleApplyRef.current?.(partyMeta)
        } finally {
          partyProcessingRef.current.delete(targetId)
        }
      })
    }

    const unsubscribe = listenToRoomSkins(partyRoomCode, (skins) => {
      partyActiveEntriesRef.current = skins
      // İndirilenler listesi diskten henüz okunmadıysa işlemeyi ertele —
      // yoksa "indirilmemiş" sanılıp zaten indirilmiş bir skin tekrar
      // indirilmeye çalışılır (kısa süreli bir yarış durumu).
      if (!initialDownloadedLoadedRef.current) {
        pendingSkins = skins
        return
      }
      processSkins(skins)
    })

    // İlk yükleme bitince bekleyen (varsa) son snapshot'ı işle
    const waitId = window.setInterval(() => {
      if (initialDownloadedLoadedRef.current) {
        window.clearInterval(waitId)
        if (pendingSkins) processSkins(pendingSkins)
      }
    }, 150)

    return () => {
      cancelled = true
      window.clearInterval(waitId)
      unsubscribe()
    }
  }, [partyRoomCode])

  // Bir parti üyesi kendi aktive ettiği skini Firebase'den kaldırdığında
  // (bkz. handleRemove) burada yakalanır ve bizim tarafımızda da kaldırılır.
  // onChildRemoved eski (silinmiş) kayıtları tekrar oynatmadığı için burada
  // "aktivasyon" dinleyicisindeki restart/replay riski yok, ekstra bir
  // kalıcı-kayıt takibine gerek kalmıyor.
  useEffect(() => {
    if (!partyRoomCode) return
    const myDeviceId = getDeviceId()
    const unsubscribe = listenToRemovedSkins(partyRoomCode, async (_championId, entry) => {
      if (entry.setBy === myDeviceId) return // kendi sildiğimizi tekrar işlemeyelim
      const targetId = entry.chromaId || entry.skinId
      if (!downloadedIdsRef.current.has(targetId)) return // zaten bizde yoksa yapacak bir şey yok
      try {
        addToast('info', `Parti: "${entry.name}" arkadaşın tarafından kaldırıldı, senden de kaldırılıyor...`)
        await window.electronAPI?.removeSkin({ skinId: targetId })
        downloadedIdsRef.current = new Set(
          [...downloadedIdsRef.current].filter((id) => id !== targetId)
        )
        refreshDownloaded()
      } catch (err) {
        console.error('Parti silme senkronizasyonu başarısız:', err)
      }
    })
    return () => unsubscribe()
  }, [partyRoomCode])

  useEffect(() => {
  setSelectedChromaId(null)
  if (!modalMeta) {
    setModalChromas([])
    return
  }
  let cancelled = false
  setLoadingChromas(true)
  fetchSkinChromas(modalMeta.id)
    .then((chromas) => {
      if (!cancelled) setModalChromas(chromas)
    })
    .finally(() => {
      if (!cancelled) setLoadingChromas(false)
    })
  return () => {
    cancelled = true
  }
}, [modalMeta])

  // Favoriler ve sıra kalıcılığı
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites])
  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }, [queue])

  // IPC dinleyicileri
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onSkinDownloadProgress((_, data) => {
      setDownloadProgress((prev) => ({ ...prev, [data.skinId]: data.percent }))
    })
    window.electronAPI.onActiveSkinsChanged((_, ids) => {
      setActiveSkins(ids)
      setPatcherRunning(ids.length > 0)
    })
    window.electronAPI.onPatchStatus((_, data) => {
      if (data.state === 'error') {
        addToast('error', data.message || 'Patch hatası')
        setPatcherRunning(activeSet.size > 0)
      } else if (data.state === 'finished' && data.message) {
        addToast('info', data.message)
        if (/pasifleştirildi|durdu/i.test(data.message)) setPatcherRunning(false)
      } else if (data.state === 'started' && data.message) {
        addToast('success', data.message)
        setPatcherRunning(true)
      }
    })
    window.electronAPI.onUpdateAvailable(() => {
      setUpdateAvailable(true)
      addToast('info', 'Yeni güncelleme bulundu, indiriliyor...')
    })
    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
      setUpdateAvailable(false)
      addToast('success', 'Güncelleme indirildi! Yeniden başlatmaya hazır.')
    })
    window.electronAPI.onUpdateError((_, err) => {
  setCheckingUpdate(false)
  console.error('Güncelleme hatası:', err)
  addToast('error', `Güncelleme ba\u015far\u0131s\u0131z: ${err?.message || err || 'bilinmeyen hata'}`)
})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // --- Yardımcılar ---

  const metaForSkin = (skin: Skin, champion: SkinItem): SkinMeta => ({
    id: skin.id,
    name: skin.name,
    num: skin.num,
    championId: champion.id,
    championKey: champion.key || '',
    championName: champion.name
  })

  const selectChampion = (c: SkinItem) => {
    setSelectedChampion(c)
    setLoadingSkins(true)
    fetchChampionSkins(c.id)
      .then(setChampionSkins)
      .finally(() => setLoadingSkins(false))
  }

  const [showRandomMenu, setShowRandomMenu] = useState(false)

const handleRandomChampion = () => {
  if (champions.length === 0) return
  const randomChamp = champions[Math.floor(Math.random() * champions.length)]
  selectChampion(randomChamp)
  setTab('champions')
  setShowRandomMenu(false)
}
const handleCreateParty = async () => {
  const code = await createRoom()
  setPartyRoomCode(code)
}

const handleJoinParty = async (code: string) => {
  const ok = await joinRoom(code)
  if (ok) setPartyRoomCode(code)
  return ok
}

const handleLeaveParty = async () => {
  if (!partyRoomCode) return
  await leaveRoom(partyRoomCode)
  setPartyRoomCode(null)
}

const handleRandomSkin = async () => {
  if (champions.length === 0) return
  const randomChamp = champions[Math.floor(Math.random() * champions.length)]
  setShowRandomMenu(false)
  setLoadingSkins(true)
  try {
    const skins = await fetchChampionSkins(randomChamp.id)
    setSelectedChampion(randomChamp)
    setChampionSkins(skins)
    setTab('champions')
    if (skins.length > 0) {
      const randomSkin = skins[Math.floor(Math.random() * skins.length)]
      setModalMeta(metaForSkin(randomSkin, randomChamp))
    }
  } finally {
    setLoadingSkins(false)
  }
}

  const setAdd = (set: Set<string>, id: string) => new Set(set).add(id)
  const setRemove = (set: Set<string>, id: string) => {
    const next = new Set(set)
    next.delete(id)
    return next
  }

  // --- Favoriler ---

  const toggleFavorite = (meta: SkinMeta) => {
    if (favoriteIds.has(meta.id)) {
      setFavorites((prev) => prev.filter((f) => f.id !== meta.id))
    } else {
      setFavorites((prev) => [meta, ...prev])
      addToast('success', `"${meta.name}" favorilere eklendi`)
    }
  }

  // --- Sıra ---

  const toggleQueue = (meta: SkinMeta) => {
    if (queueIds.has(meta.id)) {
      setQueue((prev) => prev.filter((q) => q.id !== meta.id))
      return
    }
    if (activeSet.has(meta.id)) {
      addToast('warning', `"${meta.name}" zaten aktif — sıraya gerek yok`)
      return
    }
    setQueue((prev) => [...prev, meta])
    addToast('info', `"${meta.name}" sıraya eklendi`)
  }

  const removeFromQueue = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id))
  const clearQueue = () => setQueue([])

  // --- İndirme (aktif ETMEZ, sadece indirir) ---

  const handleDownload = async (meta: SkinMeta) => {
    if (!window.electronAPI) return
    if (downloading.has(meta.id) || downloadedIds.has(meta.id)) return
    if (!meta.championKey) {
      addToast('error', 'Bu skin için indirme bilgisi eksik (şampiyon anahtarı yok)')
      return
    }
    setDownloading((prev) => setAdd(prev, meta.id))
    setDownloadProgress((prev) => ({ ...prev, [meta.id]: 0 }))
    const res = await window.electronAPI.downloadSkin({
      championKey: meta.championKey,
      skinId: meta.id,
      meta
    })
    setDownloading((prev) => setRemove(prev, meta.id))
    setDownloadProgress((prev) => {
      const next = { ...prev }
      delete next[meta.id]
      return next
    })
    if (res.success) {
      addToast('success', `"${meta.name}" indirildi`)
      refreshDownloaded()
    } else {
      addToast('error', res.error || 'İndirme başarısız')
    }
  }
  
  const handleDownloadChroma = async (baseMeta: SkinMeta, chroma: Chroma) => {
  if (!window.electronAPI) return
  if (downloading.has(chroma.id) || downloadedIds.has(chroma.id)) return
  if (!baseMeta.championKey) {
    addToast('error', 'Bu skin için indirme bilgisi eksik (şampiyon anahtarı yok)')
    return
  }
  setDownloading((prev) => setAdd(prev, chroma.id))
  setDownloadProgress((prev) => ({ ...prev, [chroma.id]: 0 }))
  const res = await window.electronAPI.downloadChroma({
    championKey: baseMeta.championKey,
    skinId: baseMeta.id,
    chromaId: chroma.id,
    meta: { ...baseMeta, id: chroma.id, name: `${baseMeta.name} — ${chroma.name}` }
  })
  setDownloading((prev) => setRemove(prev, chroma.id))
  setDownloadProgress((prev) => {
    const next = { ...prev }
    delete next[chroma.id]
    return next
  })
  if (res.success) {
    addToast('success', `"${chroma.name}" indirildi`)
    refreshDownloaded()
  } else {
    addToast('error', res.error || 'İndirme başarısız')
  }
}

  // --- Aktivasyon (tekil) ---

  const handleApply = async (meta: SkinMeta, chromaOf?: string) => {
    if (!window.electronAPI) return
    if (applyingIds.has(meta.id)) return
    if (activeSet.has(meta.id)) {
      addToast('warning', `"${meta.name}" zaten aktif`)
      return
    }
    if (!downloadedIdsRef.current.has(meta.id)) {
      addToast('error', 'Önce skini indirmeniz gerekiyor')
      return
    }
    setApplyingIds((prev) => setAdd(prev, meta.id))
    const res: ApplySkinsResult = await window.electronAPI.applySkins({ skinIds: [meta.id] })
    setApplyingIds((prev) => setRemove(prev, meta.id))
        if (!res.success) {
      addToast('error', res.error || 'Skin aktif edilemedi')
      return
    }
    if (res.alreadyActive?.includes(meta.id) && !(activeSet.has(meta.id))) {
      addToast('warning', `"${meta.name}" zaten aktifti`)
    }
    res.warnings?.forEach((w) => addToast('warning', w))
       if (partyRoomCode) {
      // chromaOf verilmişse meta.id aslında chroma'nın kendi id'si — asıl
      // (indirme için gereken) skin id chromaOf'tur, chroma id ayrıca gönderilir.
      broadcastActiveSkin(partyRoomCode, {
        skinId: chromaOf || meta.id,
        ...(chromaOf ? { chromaId: meta.id } : {}),
        name: meta.name,
        championId: meta.championId,
        championName: meta.championName,
        num: meta.num
      })
    }
  }
  useEffect(() => {
  handleApplyRef.current = handleApply
})

  const handleDeactivate = async (meta: SkinMeta) => {
    if (!window.electronAPI) return
    const blocked = getPartyBlock(meta)
    if (blocked) {
      addToast('warning', `"${meta.name}" arkadaşın tarafından aktive edildi, sadece o pasifleştirebilir`)
      return
    }
    const res = await window.electronAPI.deactivateSkin({ skinId: meta.id })
    if (!res.success) {
      addToast('error', res.error || 'Skin pasifleştirilemedi')
      return
    }
    addToast('success', `"${meta.name}" pasifleştirildi`)
    res.warnings?.forEach((w) => addToast('warning', w))
  }

  // --- Kaldırma ---

  // Parti'deyken bir şampiyonun skinini SADECE onu aktive eden kişi
  // silebilir/pasifleştirebilir; başkasının skinine dokunulmaya çalışılırsa
  // bu, o kaydı (ve dolayısıyla arkadaşının bilgisayarındaki dosyayı) döner —
  // partiden ayrılınca (partyRoomCode boşalınca) kısıtlama kendiliğinden
  // kalkar, herkes yine kendi indirdiği/aktifleştirdiği gibi normal şekilde
  // yönetebilir.
  const getPartyBlock = (meta: SkinMeta): PartySkinEntry | null => {
    if (!partyRoomCode || !meta.championId) return null
    const entry = partyActiveEntriesRef.current[meta.championId]
    if (!entry) return null
    const entryTargetId = entry.chromaId || entry.skinId
    if (entryTargetId !== meta.id) return null
    if (entry.setBy === getDeviceId()) return null
    return entry
  }

  // Skin partide hâlâ BENİM (bu cihazın) o şampiyon için gönderdiğim güncel
  // kayıtsa, Firebase'deki kaydı da sil — böylece arkadaşımın bilgisayarından
  // da otomatik kaldırılır. Başkasının skinini silme zaten getPartyBlock ile
  // engellendiği için buraya her zaman "benim" bir kayıt gelir.
  const maybeBroadcastRemoval = (meta: SkinMeta) => {
    if (!partyRoomCode || !meta.championId) return
    const entry = partyActiveEntriesRef.current[meta.championId]
    if (!entry) return
    const entryTargetId = entry.chromaId || entry.skinId
    if (entryTargetId !== meta.id) return
    removeActiveSkin(partyRoomCode, meta.championId)
  }

  const handleRemove = async (meta: SkinMeta) => {
    if (!window.electronAPI) return
    const blocked = getPartyBlock(meta)
    if (blocked) {
      addToast('warning', `"${meta.name}" arkadaşın tarafından aktive edildi, sadece o silebilir`)
      return
    }
    setRemovingIds((prev) => setAdd(prev, meta.id))
    const res = await window.electronAPI.removeSkin({ skinId: meta.id })
    setRemovingIds((prev) => setRemove(prev, meta.id))
    if (res.success) {
      addToast('success', `"${meta.name}" kaldırıldı`)
      setQueue((prev) => prev.filter((q) => q.id !== meta.id))
      refreshDownloaded()
      if (modalMeta?.id === meta.id) setModalMeta(null)
      maybeBroadcastRemoval(meta)
    } else {
      addToast('error', res.error || 'Skin kaldırılamadı')
    }
  }

  // --- Patchle: sıradaki TÜM skinleri indir + aktif et ---

  const handlePatch = async () => {
    if (!window.electronAPI) return
    if (queue.length === 0 || isPatching) return
    setIsPatching(true)
    const failedIds = new Set<string>()
    try {
      // 1) İndirilmemiş olanları sırayla indir
      const missing = queue.filter((q) => !downloadedIds.has(q.id))
      for (let i = 0; i < missing.length; i++) {
        const meta = missing[i]
        setPatchProgress(`İndiriliyor (${i + 1}/${missing.length}): ${meta.name}`)
        setDownloading((prev) => setAdd(prev, meta.id))
        setDownloadProgress((prev) => ({ ...prev, [meta.id]: 0 }))
        const res = await window.electronAPI.downloadSkin({
          championKey: meta.championKey,
          skinId: meta.id,
          meta
        })
        setDownloading((prev) => setRemove(prev, meta.id))
        setDownloadProgress((prev) => {
          const next = { ...prev }
          delete next[meta.id]
          return next
        })
        if (!res.success) {
          failedIds.add(meta.id)
          addToast('error', `"${meta.name}" indirilemedi: ${res.error || 'Bilinmeyen hata'}`)
        }
      }
      refreshDownloaded()

      // 2) İndirilenleri topluca aktif et (zaten aktif olanlar atlanır)
      const applyIds = queue.filter((q) => !failedIds.has(q.id)).map((q) => q.id)
      if (applyIds.length > 0) {
        setPatchProgress('Skinler uygulanıyor...')
        const res: ApplySkinsResult = await window.electronAPI.applySkins({ skinIds: applyIds })
        if (!res.success) {
          addToast('error', res.error || 'Skinler uygulanamadı')
        } else {
          res.warnings?.forEach((w) => addToast('warning', w))
          if (res.missing?.length) {
            addToast('warning', `${res.missing.length} skin dosyası bulunamadı, atlandı`)
          }
          // Başarıyla aktif edilenleri ve zaten aktif olanları sıradan çıkar
          const applied = new Set(applyIds.filter((id) => !(res.missing || []).includes(id)))
          setQueue((prev) => prev.filter((q) => !applied.has(q.id)))
        }
      }
      if (failedIds.size > 0) {
        const failedNames = queue
          .filter((q) => failedIds.has(q.id))
          .map((q) => q.name)
          .join(', ')
        addToast('warning', `İndirilemediği için atlananlar: ${failedNames}`)
      }
    } finally {
      setPatchProgress('')
      setIsPatching(false)
    }
  }

  // --- Patchleri Durdur: tüm aktif skinleri pasif et ---
  const handleStopPatches = async () => {
    if (!window.electronAPI) return
    const activeIds = Array.from(activeSet)
    if (activeIds.length === 0) {
      addToast('info', 'Aktif skin yok')
      return
    }

    for (const id of activeIds) {
      const res = await window.electronAPI.deactivateSkin({ skinId: id })
      if (!res.success) {
        addToast('error', res.error || 'Skin pasif edilemedi')
      }
    }
    addToast('success', 'Tüm patchler durduruldu')
  }

  // --- Ayarlar ---

  const handleBrowse = async (field: 'patcherPath' | 'dllPath' | 'gamePath') => {
    if (!window.electronAPI) return
    let result: string | null = null
    if (field === 'patcherPath') result = await window.electronAPI.selectPatcherPath()
    else if (field === 'dllPath') result = await window.electronAPI.selectDllPath()
    else result = await window.electronAPI.selectGamePath()
    if (result) {
      setSettings((prev) => ({ ...prev, [field]: result }))
    }
  }

  const handleSaveSettings = async (next: AppSettings) => {
    if (!window.electronAPI) return
    const res = await window.electronAPI.saveSettings(next)
    if (res.success) addToast('success', 'Ayarlar kaydedildi')
    else addToast('error', res.error || 'Ayarlar kaydedilemedi')
  }

  const handleCheckUpdate = async () => {
    if (!window.electronAPI) return
    setCheckingUpdate(true)
    try {
      const res = await window.electronAPI.checkForUpdates()
      setCheckingUpdate(false)
      
      if (res?.success) {
        addToast('success', 'Güncelleme kontrolü tamamlandı')
      } else {
        addToast('error', res?.error || 'Güncelleme kontrolü başarısız')
      }
    } catch (error) {
      setCheckingUpdate(false)
      addToast('error', 'Güncelleme kontrolü sırasında hata oluştu')
    }
  }

  // --- Görünüme hazırlık ---

  const searchLower = search.trim().toLowerCase()
  const metaMatches = (m: SkinMeta) =>
    !searchLower ||
    m.name.toLowerCase().includes(searchLower) ||
    m.championName.toLowerCase().includes(searchLower)

  const skinGrid = (
    metas: SkinMeta[],
    EmptyIcon: LucideIcon,
    emptyTitle: string,
    emptyHint: string,
    showManagement: boolean = false
  ) =>
    metas.length === 0 ? (
      <div className="h-full flex flex-col items-center justify-center text-center py-20">
        <EmptyIcon className="w-10 h-10 mb-4 text-gray-500" strokeWidth={1.5} />
        <p className="text-gray-300 font-semibold">{emptyTitle}</p>
        <p className="text-gray-600 text-sm mt-1 max-w-xs">{emptyHint}</p>
      </div>
    ) : (
      <>
        {showManagement && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectionMode(!selectionMode)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectionMode
                  ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                  : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
              }`}
            >
              {selectionMode ? (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} /> Seçim Kapat
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" strokeWidth={2} /> Seç
                </>
              )}
            </button>
            {selectionMode && selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition"
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} /> Seçilenleri Sil ({selectedIds.size})
              </button>
            )}
            <button
              onClick={handleDeleteAllDownloaded}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2} /> Hepsini Sil
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {metas.map((meta) => (
            <SkinCard
              key={meta.id}
              meta={meta}
              isDownloaded={downloadedIds.has(meta.id)}
              isActive={activeSet.has(meta.id)}
              isFavorite={favoriteIds.has(meta.id)}
              inQueue={queueIds.has(meta.id)}
              isDownloading={downloading.has(meta.id)}
              isSelectable={selectionMode}
              isSelected={selectedIds.has(meta.id)}
              onSelect={() => toggleSelection(meta.id)}
              onOpen={() => setModalMeta(meta)}
              onToggleFavorite={() => toggleFavorite(meta)}
              onToggleQueue={() => toggleQueue(meta)}
              onDownload={() => handleDownload(meta)}
            />
          ))}
        </div>
      </>
    )

  const headerTitle =
    tab === 'champions'
      ? selectedChampion
        ? selectedChampion.name
        : 'Şampiyonlar'
      : tab === 'favorites'
      ? 'Favoriler'
      : 'İndirilenler'

  let content: JSX.Element
  if (tab === 'champions') {
    if (selectedChampion) {
      const metas = championSkins.map((s) => metaForSkin(s, selectedChampion)).filter(metaMatches)
      content = (
        <div>
          <button
            onClick={() => setSelectedChampion(null)}
            className="mb-4 text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} /> Tüm şampiyonlar
          </button>
          {loadingSkins ? (
            <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full"></span>
              Skinler yükleniyor...
            </div>
          ) : (
            skinGrid(metas, Palette, 'Skin bulunamadı', 'Aramanızla eşleşen skin yok.')
          )}
        </div>
      )
    } else {
      const filtered = searchLower
        ? champions.filter(
            (c) =>
              c.name.toLowerCase().includes(searchLower) || c.id.toLowerCase().includes(searchLower)
          )
        : champions
      content = loadingChampions ? (
        <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
          <span className="animate-spin inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full"></span>
          Şampiyonlar yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {filtered.map((c) => {
            const pos =
              c.id === 'KhaZix' ? '95% center' : c.id === 'MonkeyKing' ? '80% center' : CHAMPION_POSITIONS[c.id] || 'center'
            return (
            <button
              key={c.id}
              onClick={() => selectChampion(c)}
              className="group relative bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-400/70 hover:shadow-[0_8px_24px_-4px_rgba(56,189,248,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <div className="pointer-events-none absolute inset-0 z-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-1 ring-inset ring-sky-300/40"></div>
              <div className="aspect-[3/4] relative overflow-hidden">
  <img
    src={`./champions/${c.id === 'KhaZix' ? 'khazix' : c.id === 'MonkeyKing' ? 'wukong' : getChampionImageFilename(c.id)}.jpg`}
    alt={c.name}
    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.12]"
    style={{ objectPosition: pos, transformOrigin: pos }}
    loading="lazy"
    onError={(e) => {
      console.error(`Görsel yüklenemedi: ${c.id} -> ${getChampionImageFilename(c.id)}.jpg`);
      (e.target as HTMLImageElement).style.display = 'none';
    }}
  />
  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-16 pb-2 px-2">
    <p className="text-xs font-medium text-white truncate">{c.name}</p>
  </div>
</div>
            </button>
            )
          })}
        </div>
      )
    }
  } else if (tab === 'favorites') {
    content = skinGrid(
      favorites.filter(metaMatches),
      Heart,
      'Henüz favori yok',
      'Skin kartlarındaki kalp butonu ile favorilerinize ekleyin.'
    )
  } else {
    content = skinGrid(
      downloadedMetas.filter(metaMatches),
      Package,
      'İndirilmiş skin yok',
      'İndirdiğiniz skinler burada görünecek. İndirme, skini otomatik aktif ETMEZ.',
      true
    )
  }
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f11] text-gray-100 overflow-hidden select-none">
      <div className="flex flex-1 min-h-0">
        <Sidebar
          tab={tab}
          onTabChange={(t) => {
            setTab(t)
            setSearch('')
          }}
          patcherRunning={patcherRunning}
          activeCount={activeSkins.length}
          favoritesCount={favorites.length}
          downloadedCount={downloadedMetas.length}
          champions={champions}
          selectedChampionId={selectedChampion?.id || null}
          onSelectChampion={selectChampion}
          settings={settings}
          appVersion={appVersion}
          updateAvailable={updateAvailable}
          downloaded={updateDownloaded}
          checkingUpdate={checkingUpdate}
          onBrowse={handleBrowse}
          onSaveSettings={handleSaveSettings}
          onCheckUpdate={handleCheckUpdate}
          onInstallUpdate={() => window.electronAPI?.installUpdate()}
          onOpenParty={() => setShowPartyModal(true)}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Üst bar: başlık + arama */}
          <header className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="relative">
  <button
    onClick={() => setShowRandomMenu((v) => !v)}
    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-sky-500/15 hover:border-sky-500/30 hover:text-sky-300 transition"
  >
    <Dices className="w-3.5 h-3.5" strokeWidth={2} /> Rastgele
  </button>
  {showRandomMenu && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setShowRandomMenu(false)}></div>
      <div className="absolute top-full left-0 mt-2 z-50 w-44 bg-[#1c1c1f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
        <button
          onClick={handleRandomChampion}
          className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition flex items-center gap-2"
        >
          <Wand2 className="w-4 h-4" strokeWidth={2} /> Rastgele Karakter
        </button>
        <button
          onClick={handleRandomSkin}
          className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition border-t border-white/[0.06] flex items-center gap-2"
        >
          <Palette className="w-4 h-4" strokeWidth={2} /> Rastgele Skin
        </button>
      </div>
    </>
  )}
</div>
            <h1 className="text-lg font-bold tracking-tight truncate">{headerTitle}</h1>
            {tab === 'champions' && !selectedChampion && (
  <span className="text-sm text-gray-500">({champions.length})</span>
)}
            {tab === 'champions' && selectedChampion && (
              <span className="text-xs text-gray-500 bg-white/[0.05] border border-white/[0.08] rounded-full px-2 py-0.5">
                {championSkins.length} skin
              </span>
            )}
            <div className="ml-auto w-64 relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
              <input
                type="text"
                placeholder={tab === 'champions' && !selectedChampion ? 'Şampiyon ara...' : 'Skin ara...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/25 transition"
              />
            </div>
          </header>

          {/* İçerik */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5">{content}</div>
        </main>
      </div>

      {/* Alt sıra barı */}
      <QueueBar
        queue={queue}
        activeIds={activeSet}
        isPatching={isPatching}
        patchProgress={patchProgress}
        onRemoveItem={removeFromQueue}
        onClear={clearQueue}
        onPatch={handlePatch}
        onStopPatches={handleStopPatches}
      />

      {/* Skin detay modalı */}
      {modalMeta && (() => {
  const selectedChroma = modalChromas.find((c) => c.id === selectedChromaId) ?? null
  const activeModalMeta: SkinMeta = selectedChroma
  ? { ...modalMeta, id: selectedChroma.id }
  : modalMeta
  return (
    <SkinModal
      meta={activeModalMeta}
      isDownloaded={downloadedIds.has(activeModalMeta.id)}
      downloadProgress={
        downloading.has(activeModalMeta.id) ? downloadProgress[activeModalMeta.id] ?? 0 : undefined
      }
      isActive={activeSet.has(activeModalMeta.id)}
      isFavorite={favoriteIds.has(activeModalMeta.id)}
      inQueue={queueIds.has(activeModalMeta.id)}
      isApplying={applyingIds.has(activeModalMeta.id)}
      isRemoving={removingIds.has(activeModalMeta.id)}
      onClose={() => setModalMeta(null)}
      onDownload={() =>
        selectedChroma ? handleDownloadChroma(modalMeta, selectedChroma) : handleDownload(modalMeta)
      }
      onApply={() => handleApply(activeModalMeta, selectedChroma ? modalMeta.id : undefined)}
      onDeactivate={() => handleDeactivate(activeModalMeta)}
      onRemove={() => handleRemove(activeModalMeta)}
      onToggleFavorite={() => toggleFavorite(activeModalMeta)}
      onToggleQueue={() => toggleQueue(activeModalMeta)}
      chromas={modalChromas}
      loadingChromas={loadingChromas}
      selectedChromaId={selectedChromaId}
      onSelectChroma={setSelectedChromaId}
    />
  )
})()}
{showPartyModal && (
  <PartyModal
    roomCode={partyRoomCode}
    members={partyMembers}
    onClose={() => setShowPartyModal(false)}
    onCreate={handleCreateParty}
    onJoin={handleJoinParty}
    onLeave={handleLeaveParty}
  />
)}
      <Toasts toasts={toasts} />
    </div>
  )
}