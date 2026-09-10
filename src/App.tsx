import { useEffect, useMemo, useRef, useState } from 'react'
import { Skin, SkinItem, SkinMeta, AppSettings, TabKey, Toast, ApplySkinsResult } from './types'
import { fetchChampions, fetchChampionSkins } from './api'
import Sidebar from './components/Sidebar'
import SkinCard from './components/SkinCard'
import SkinModal from './components/SkinModal'
import QueueBar from './components/QueueBar'
import Toasts from './components/Toasts'

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

  // Ayarlar & güncelleme
  const [settings, setSettings] = useState<AppSettings>({})
  const [appVersion, setAppVersion] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const addToast = (type: Toast['type'], message: string) => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, type, message }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  // Türetilmiş set'ler
  const activeSet = useMemo(() => new Set(activeSkins), [activeSkins])
  const downloadedIds = useMemo(() => new Set(downloadedMetas.map((m) => m.id)), [downloadedMetas])
  const favoriteIds = useMemo(() => new Set(favorites.map((m) => m.id)), [favorites])
  const queueIds = useMemo(() => new Set(queue.map((m) => m.id)), [queue])

  const refreshDownloaded = () => {
    if (window.electronAPI) {
      window.electronAPI.getDownloadedSkins().then(setDownloadedMetas)
    }
  }

  // İlk yükleme: şampiyonlar, ayarlar, indirilenler, aktif skinler
  useEffect(() => {
    fetchChampions()
      .then(setChampions)
      .finally(() => setLoadingChampions(false))
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(setSettings)
      window.electronAPI.getAppVersion().then(setAppVersion)
      refreshDownloaded()
      window.electronAPI.getActiveSkins().then((ids) => {
        setActiveSkins(ids)
        setPatcherRunning(ids.length > 0)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    window.electronAPI.onUpdateError(() => {
      setCheckingUpdate(false)
      addToast('error', 'Güncelleme kontrolü başarısız')
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
      addToast('success', `"${meta.name}" favorilere eklendi ♥`)
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

  // --- Aktivasyon (tekil) ---

  const handleApply = async (meta: SkinMeta) => {
    if (!window.electronAPI) return
    if (activeSet.has(meta.id)) {
      addToast('warning', `"${meta.name}" zaten aktif`)
      return
    }
    if (!downloadedIds.has(meta.id)) {
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
  }

  const handleDeactivate = async (meta: SkinMeta) => {
    if (!window.electronAPI) return
    const res = await window.electronAPI.deactivateSkin({ skinId: meta.id })
    if (!res.success) {
      addToast('error', res.error || 'Skin pasifleştirilemedi')
      return
    }
    addToast('success', `"${meta.name}" pasifleştirildi`)
    res.warnings?.forEach((w) => addToast('warning', w))
  }

  // --- Kaldırma ---

  const handleRemove = async (meta: SkinMeta) => {
    if (!window.electronAPI) return
    setRemovingIds((prev) => setAdd(prev, meta.id))
    const res = await window.electronAPI.removeSkin({ skinId: meta.id })
    setRemovingIds((prev) => setRemove(prev, meta.id))
    if (res.success) {
      addToast('success', `"${meta.name}" kaldırıldı`)
      setQueue((prev) => prev.filter((q) => q.id !== meta.id))
      refreshDownloaded()
      if (modalMeta?.id === meta.id) setModalMeta(null)
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
    const res = await window.electronAPI.checkForUpdates()
    setCheckingUpdate(false)
    if (!res?.success && !updateAvailable && !updateDownloaded) {
      addToast('info', res?.message || 'Güncelleme kontrol edilemedi')
    }
  }

  // --- Görünüme hazırlık ---

  const searchLower = search.trim().toLowerCase()
  const metaMatches = (m: SkinMeta) =>
    !searchLower ||
    m.name.toLowerCase().includes(searchLower) ||
    m.championName.toLowerCase().includes(searchLower)

  const skinGrid = (metas: SkinMeta[], emptyIcon: string, emptyTitle: string, emptyHint: string) =>
    metas.length === 0 ? (
      <div className="h-full flex flex-col items-center justify-center text-center py-20">
        <span className="text-5xl mb-4 opacity-60">{emptyIcon}</span>
        <p className="text-gray-300 font-semibold">{emptyTitle}</p>
        <p className="text-gray-600 text-sm mt-1 max-w-xs">{emptyHint}</p>
      </div>
    ) : (
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
            onOpen={() => setModalMeta(meta)}
            onToggleFavorite={() => toggleFavorite(meta)}
            onToggleQueue={() => toggleQueue(meta)}
            onDownload={() => handleDownload(meta)}
          />
        ))}
      </div>
    )

  const headerTitle =
    tab === 'champions'
      ? selectedChampion
        ? selectedChampion.name
        : 'Şampiyonlar'
      : tab === 'favorites'
      ? '♥ Favoriler'
      : '⬇ İndirilenler'

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
            ← Tüm şampiyonlar
          </button>
          {loadingSkins ? (
            <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full"></span>
              Skinler yükleniyor...
            </div>
          ) : (
            skinGrid(metas, '🎨', 'Skin bulunamadı', 'Aramanızla eşleşen skin yok.')
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
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChampion(c)}
              className="group bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10 transition-shadow"
            >
              <div className="aspect-[3/4] relative overflow-hidden">
  <img
    src={`./champions/${c.id === 'KhaZix' ? 'khazix' : c.id === 'MonkeyKing' ? 'wukong' : getChampionImageFilename(c.id)}.jpg`}
    alt={c.name}
    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
    style={{
      objectPosition: (() => {
        if (c.id === 'KhaZix') return '95% center';
        if (c.id === 'MonkeyKing') return '80% center';
        return CHAMPION_POSITIONS[c.id] || 'center';
      })()
    }}
    onLoad={() => {
      console.log(`Görsel yüklendi: ${c.id} -> pozisyon: ${(() => {
        if (c.id === 'KhaZix') return '95% center';
        if (c.id === 'MonkeyKing') return '80% center';
        return CHAMPION_POSITIONS[c.id] || 'center';
      })()}`);
    }}
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
          ))}
        </div>
      )
    }
  } else if (tab === 'favorites') {
    content = skinGrid(
      favorites.filter(metaMatches),
      '💙',
      'Henüz favori yok',
      'Skin kartlarındaki ♥ butonu ile favorilerinize ekleyin.'
    )
  } else {
    content = skinGrid(
      downloadedMetas.filter(metaMatches),
      '📦',
      'İndirilmiş skin yok',
      'İndirdiğiniz skinler burada görünecek. İndirme, skini otomatik aktif ETMEZ.'
    )
  }
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0d14] text-gray-100 overflow-hidden select-none">
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
        />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Üst bar: başlık + arama */}
          <header className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <h1 className="text-lg font-bold tracking-tight truncate">{headerTitle}</h1>
            {tab === 'champions' && selectedChampion && (
              <span className="text-xs text-gray-500 bg-white/[0.05] border border-white/[0.08] rounded-full px-2 py-0.5">
                {championSkins.length} skin
              </span>
            )}
            <div className="ml-auto w-64">
              <input
                type="text"
                placeholder={tab === 'champions' && !selectedChampion ? '🔍 Şampiyon ara...' : '🔍 Skin ara...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/25 transition"
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
      />

      {/* Skin detay modalı */}
      {modalMeta && (
        <SkinModal
          meta={modalMeta}
          isDownloaded={downloadedIds.has(modalMeta.id)}
          downloadProgress={
            downloading.has(modalMeta.id) ? downloadProgress[modalMeta.id] ?? 0 : undefined
          }
          isActive={activeSet.has(modalMeta.id)}
          isFavorite={favoriteIds.has(modalMeta.id)}
          inQueue={queueIds.has(modalMeta.id)}
          isApplying={applyingIds.has(modalMeta.id)}
          isRemoving={removingIds.has(modalMeta.id)}
          onClose={() => setModalMeta(null)}
          onDownload={() => handleDownload(modalMeta)}
          onApply={() => handleApply(modalMeta)}
          onDeactivate={() => handleDeactivate(modalMeta)}
          onRemove={() => handleRemove(modalMeta)}
          onToggleFavorite={() => toggleFavorite(modalMeta)}
          onToggleQueue={() => toggleQueue(modalMeta)}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  )
}
