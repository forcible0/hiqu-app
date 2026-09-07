import { useEffect, useRef, useState } from 'react'
import { SkinItem, AppSettings, TabKey } from '../types'

const NAV_ITEMS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'champions', label: 'Şampiyonlar', icon: '🎯' },
  { key: 'favorites', label: 'Favoriler', icon: '♥' },
  { key: 'downloaded', label: 'İndirilenler', icon: '⬇' }
]

interface SidebarProps {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  patcherRunning: boolean
  activeCount: number
  favoritesCount: number
  downloadedCount: number
  champions: SkinItem[]
  selectedChampionId: string | null
  onSelectChampion: (c: SkinItem) => void
  settings: AppSettings
  appVersion: string
  updateAvailable: boolean
  downloaded: boolean
  checkingUpdate: boolean
  onBrowse: (field: 'patcherPath' | 'dllPath' | 'gamePath') => void
  onSaveSettings: (settings: AppSettings) => void
  onCheckUpdate: () => void
  onInstallUpdate: () => void
}

export default function Sidebar({
  tab,
  onTabChange,
  patcherRunning,
  activeCount,
  favoritesCount,
  downloadedCount,
  champions,
  selectedChampionId,
  onSelectChampion,
  settings,
  appVersion,
  updateAvailable,
  downloaded,
  checkingUpdate,
  onBrowse,
  onSaveSettings,
  onCheckUpdate,
  onInstallUpdate
}: SidebarProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [champFilter, setChampFilter] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const badgeFor = (key: TabKey): number | null => {
    if (key === 'favorites') return favoritesCount
    if (key === 'downloaded') return downloadedCount
    return null
  }

  // Her tab ve arama değişiminde şampiyon listesi en üste dönsün
  useEffect(() => {
    if (tab === 'champions') {
      listRef.current?.scrollTo(0, 0)
    }
  }, [tab, champFilter])

  const filteredChampions = champFilter
    ? champions.filter(
        (c) =>
          c.name.toLowerCase().includes(champFilter.toLowerCase()) ||
          c.id.toLowerCase().includes(champFilter.toLowerCase())
      )
    : champions

  return (
    <aside className="w-72 h-full bg-[#12161f] border-r border-sky-500/10 flex flex-col shrink-0">
      {/* Ana sekmeler */}
      <nav className="p-3 pb-2 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.key
          const badge = badgeFor(item.key)
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition border-l-2 ${
                active
                  ? 'bg-gradient-to-r from-blue-500/15 to-sky-500/10 text-sky-200 border-sky-400'
                  : 'text-gray-400 border-transparent hover:bg-white/[0.04] hover:text-gray-200'
              }`}
            >
              <span className={`text-base ${item.key === 'favorites' ? 'text-sky-400' : ''}`}>{item.icon}</span>
              {item.label}
              {badge !== null && badge > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-sky-500/20 border border-sky-500/30 text-sky-300 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="h-px mx-4 my-1 bg-gradient-to-r from-transparent via-sky-500/30 to-transparent"></div>

      {/* Şampiyon listesi (sadece Şampiyonlar sekmesinde) */}
      {tab === 'champions' && (
        <>
          <div className="px-4 pt-2 pb-1">
            <input
              type="text"
              placeholder="🔍 Şampiyon ara..."
              value={champFilter}
              onChange={(e) => setChampFilter(e.target.value)}
              className="w-full bg-black/30 border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition"
            />
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-2">
            {filteredChampions.length === 0 ? (
              <p className="text-gray-500 text-sm p-3 text-center">Şampiyon bulunamadı</p>
            ) : (
              filteredChampions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectChampion(c)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2.5 ${
                    selectedChampionId === c.id
                      ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/10 text-sky-200 border-l-2 border-sky-400'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 border-l-2 border-transparent'
                  }`}
                >
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
      {tab !== 'champions' && <div className="flex-1"></div>}

      {/* Patcher durum göstergesi */}
      {activeCount > 0 && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              patcherRunning ? 'bg-green-400 animate-pulse' : 'bg-amber-400'
            }`}
          ></span>
          <p className="text-[11px] text-green-300 leading-tight">
            {patcherRunning
              ? `Patcher çalışıyor · ${activeCount} aktif skin`
              : `${activeCount} skin aktif (patcher bekleniyor)`}
          </p>
        </div>
      )}

      {/* Alt kısım: versiyon, güncelleme, ayarlar */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-xs">v{appVersion}</span>
          <button
            onClick={onCheckUpdate}
            disabled={checkingUpdate || downloaded}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
              updateAvailable
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : downloaded
                ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-sky-300 disabled:opacity-50'
            }`}
          >
            {checkingUpdate
              ? 'Kontrol ediliyor...'
              : downloaded
              ? '✓ Hazır'
              : updateAvailable
              ? '⬇ Güncelleme mevcut'
              : '↻ Güncelleme kontrol'}
          </button>
        </div>

        {downloaded && (
          <button
            onClick={onInstallUpdate}
            className="w-full mb-2 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg px-3 py-2 transition shadow-lg shadow-green-500/20"
          >
            🔄 Güncellemeyi yükle ve yeniden başlat
          </button>
        )}

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full text-left text-sm text-gray-400 hover:text-sky-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 transition flex items-center justify-between"
        >
          <span>⚙️ Ayarlar</span>
          <span className={`text-xs transition-transform ${showSettings ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showSettings && (
          <div className="mt-2 space-y-2 fade-in">
            {(
              [
                { field: 'patcherPath' as const, label: 'Patcher EXE', placeholder: "ltk_patcher_host.exe'nin tam yolu" },
                { field: 'dllPath' as const, label: 'DLL (opsiyonel)', placeholder: 'Özel DLL yolu (boş bırakılabilir)' },
                { field: 'gamePath' as const, label: 'LoL Klasörü', placeholder: 'League of Legends kurulum klasörü' }
              ]
            ).map(({ field, label, placeholder }) => (
              <div key={field} className="bg-black/30 border border-white/[0.06] rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                  <button
                    onClick={() => onBrowse(field)}
                    className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 rounded px-2 py-0.5 transition"
                  >
                    Gözat
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 truncate" title={settings[field] || ''}>
                  {settings[field] || <span className="text-gray-600 italic">{placeholder}</span>}
                </p>
              </div>
            ))}
            <button
              onClick={() => onSaveSettings(settings)}
              className="w-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 rounded-lg px-3 py-2 transition shadow-lg shadow-sky-500/20"
            >
              💾 Ayarları Kaydet
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
