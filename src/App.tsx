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
    window.electronAPI.getDownloadedSkins().then(setDownloadedMetas)
  }

  // İlk yükleme: şampiyonlar, ayarlar, indirilenler, aktif skinler
  useEffect(() => {
    fetchChampions()
      .then(setChampions)
      .finally(() => setLoadingChampions(false))
    window.electronAPI.getSettings().then(setSettings)
    window.electronAPI.getAppVersion().then(setAppVersion)
    refreshDownloaded()
    window.electronAPI.getActiveSkins().then((ids) => {
      setActiveSkins(ids)
      setPatcherRunning(ids.length > 0)
    })
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
    let result: string | null = null
    if (field === 'patcherPath') result = await window.electronAPI.selectPatcherPath()
    else if (field === 'dllPath') result = await window.electronAPI.selectDllPath()
    else result = await window.electronAPI.selectGamePath()
    if (result) {
      setSettings((prev) => ({ ...prev, [field]: result }))
    }
  }

  const handleSaveSettings = async (next: AppSettings) => {
    const res = await window.electronAPI.saveSettings(next)
    if (res.success) addToast('success', 'Ayarlar kaydedildi')
    else addToast('error', res.error || 'Ayarlar kaydedilemedi')
  }

  const handleCheckUpdate = async () => {
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
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChampion(c)}
              className="group bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10 hover:-translate-y-0.5 transition-all text-center"
            >
              <img
                src={c.image}
                alt={c.name}
                className="w-14 h-14 rounded-lg mx-auto mb-2 group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              <p className="text-xs font-medium text-gray-300 truncate">{c.name}</p>
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
          onInstallUpdate={() => window.electronAPI.installUpdate()}
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
