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
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'paths' | 'themes'>('paths')
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('themeMode') as 'dark' | 'light') || 'dark'
  })
  const [accentColor, setAccentColor] = useState<'blue' | 'purple' | 'green' | 'orange'>(() => {
    return (localStorage.getItem('accentColor') as 'blue' | 'purple' | 'green' | 'orange') || 'blue'
  })
  const [champFilter, setChampFilter] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
const letterRefs = useRef<Record<string, HTMLDivElement | null>>({})
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

  // Theme persistence
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode)
    document.documentElement.classList.toggle('dark', themeMode === 'dark')
  }, [themeMode])

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor)
  }, [accentColor])

  // Close modal on Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettingsModal) {
        setShowSettingsModal(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [showSettingsModal])

  const filteredChampions = champFilter
  ? champions.filter(
      (c) =>
        c.name.toLowerCase().includes(champFilter.toLowerCase()) ||
        c.id.toLowerCase().includes(champFilter.toLowerCase())
    )
  : champions

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const groupedChampions = champFilter
  ? null
  : filteredChampions.reduce((acc, c) => {
      const letter = c.name[0]?.toUpperCase() || '#'
      if (!acc[letter]) acc[letter] = []
      acc[letter].push(c)
      return acc
    }, {} as Record<string, typeof filteredChampions>)

const availableLetters = groupedChampions ? Object.keys(groupedChampions).sort() : []

const scrollToLetter = (letter: string) => {
  letterRefs.current[letter]?.scrollIntoView({ block: 'start' })
}

const renderChampionRow = (c: (typeof filteredChampions)[number]) => (
  <button
    key={c.id}
    onClick={() => {
  onSelectChampion(c)
  onTabChange('champions')
}}
    className={`group w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2.5 hover:scale-[1.02] origin-left ${
      selectedChampionId === c.id
        ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/10 text-sky-200 border-l-2 border-sky-400'
        : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 border-l-2 border-transparent'
    }`}
  >
    <img
      src={c.image}
      alt={c.name}
      className="w-7 h-7 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.display = 'none'
      }}
    />
    <span className="truncate">{c.name}</span>
  </button>
)
  return (
    <>
      <aside className="w-72 h-full bg-[#18181b] border-r border-white/[0.08] flex flex-col shrink-0">
      {/* Ana sekmeler */}
      <nav className="p-3 pb-2 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.key
          const badge = badgeFor(item.key)
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition border-l-2 ${
                active
                  ? 'bg-gradient-to-r from-blue-500/15 to-sky-500/10 text-sky-200 border-sky-400'
                  : 'text-gray-400 border-transparent hover:bg-white/[0.04] hover:text-gray-200'
              }`}
            >
              <span className={`text-base ${item.key === 'favorites' ? 'text-sky-400' : ''}`}>{item.icon}</span>
              {item.label}
              {badge !== null && badge > 0 && (
  <span className="ml-auto text-[11px] font-semibold bg-white/[0.06] text-gray-300 rounded-full px-2 py-0.5 min-w-[22px] text-center group-hover:bg-sky-500/20 group-hover:text-sky-300 transition">
    {badge}
  </span>
)}
            </button>
          )
        })}
      </nav>

      <div className="h-px mx-4 my-1 bg-gradient-to-r from-transparent via-sky-500/30 to-transparent"></div>

      {/* Şampiyon listesi (sadece Şampiyonlar sekmesinde) */}
          <div className="px-4 pt-2 pb-1">
            <input
              type="text"
              placeholder="🔍 Şampiyon ara..."
              value={champFilter}
              onChange={(e) => setChampFilter(e.target.value)}
              className="w-full bg-black/30 border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition"
            />
          </div>
         <div className="flex-1 overflow-hidden flex">
  {!champFilter && availableLetters.length > 0 && (
    <div className="w-6 flex-shrink-0 flex flex-col items-center gap-[1px] pt-8 pb-1 overflow-y-auto">
  {ALPHABET.map((letter) => (
    <button
      key={letter}
      onClick={() => scrollToLetter(letter)}
      disabled={!availableLetters.includes(letter)}
      className={`text-[11px] font-semibold leading-[18px] w-5 text-center rounded transition ${
        availableLetters.includes(letter)
          ? 'text-gray-400 hover:text-sky-300 hover:bg-white/[0.08] cursor-pointer'
          : 'text-gray-700 cursor-default'
      }`}
    >
      {letter}
    </button>
  ))}
</div>
  )}
  <div ref={listRef} className="flex-1 overflow-y-auto pl-1 pr-3 pb-2">
    {filteredChampions.length === 0 ? (
      <p className="text-gray-500 text-sm p-3 text-center">Şampiyon bulunamadı</p>
    ) : champFilter ? (
      filteredChampions.map((c) => renderChampionRow(c))
    ) : (
      availableLetters.map((letter) => (
        <div key={letter} ref={(el) => (letterRefs.current[letter] = el)}>
          <div className="flex items-center gap-2 px-1 pt-3 pb-1">
            <span className="text-[11px] font-bold text-sky-400">{letter}</span>
            <div className="flex-1 h-px bg-white/[0.08]"></div>
          </div>
          {groupedChampions![letter].map((c) => renderChampionRow(c))}
        </div>
      ))
    )}
  </div>
</div>

      

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
          onClick={() => setShowSettingsModal(true)}
          className="w-full text-left text-sm text-gray-400 hover:text-sky-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 transition flex items-center justify-between"
        >
          <span>⚙️ Ayarlar</span>
        </button>
      </div>
    </aside>

    {/* Settings Modal */}
    {showSettingsModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setShowSettingsModal(false)}
      >
        <div
          className="bg-[#232326] border border-white/[0.08] rounded-2xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white">⚙️ Ayarlar</h2>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="text-gray-400 hover:text-white transition p-1"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setActiveSettingsTab('paths')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeSettingsTab === 'paths'
                  ? 'text-sky-300 border-b-2 border-sky-400 bg-sky-500/10'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Yollar
            </button>
            <button
              onClick={() => setActiveSettingsTab('themes')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeSettingsTab === 'themes'
                  ? 'text-sky-300 border-b-2 border-sky-400 bg-sky-500/10'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Temalar
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {activeSettingsTab === 'paths' && (
              <div className="space-y-3">
                {(
                  [
                    { field: 'patcherPath' as const, label: 'Patcher EXE', placeholder: "ltk_patcher_host.exe'nin tam yolu" },
                    { field: 'dllPath' as const, label: 'DLL (opsiyonel)', placeholder: 'Özel DLL yolu (boş bırakılabilir)' },
                    { field: 'gamePath' as const, label: 'LoL Klasörü', placeholder: 'League of Legends kurulum klasörü' }
                  ]
                ).map(({ field, label, placeholder }) => (
                  <div key={field} className="bg-black/30 border border-white/[0.06] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
                      <button
                        onClick={() => onBrowse(field)}
                        className="text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 rounded px-2 py-1 transition"
                      >
                        Gözat
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 truncate" title={settings[field] || ''}>
                      {settings[field] || <span className="text-gray-600 italic">{placeholder}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeSettingsTab === 'themes' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Mod</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setThemeMode('dark')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        themeMode === 'dark'
                          ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                          : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      🌙 Karanlık
                    </button>
                    <button
                      onClick={() => setThemeMode('light')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        themeMode === 'light'
                          ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                          : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      ☀️ Aydınlık
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Vurgu Rengi</h3>
                  <div className="flex gap-2">
                    {[
                      { color: 'blue' as const, label: 'Mavi', activeClass: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
                      { color: 'purple' as const, label: 'Mor', activeClass: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
                      { color: 'green' as const, label: 'Yeşil', activeClass: 'bg-green-500/20 border-green-500/40 text-green-300' },
                      { color: 'orange' as const, label: 'Turuncu', activeClass: 'bg-orange-500/20 border-orange-500/40 text-orange-300' }
                    ].map(({ color, label, activeClass }) => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          accentColor === color
                            ? activeClass
                            : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-white/[0.06] flex justify-end gap-2">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition"
            >
              İptal
            </button>
            <button
              onClick={() => {
                onSaveSettings(settings)
                setShowSettingsModal(false)
              }}
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 rounded-lg transition shadow-lg shadow-sky-500/20"
            >
              💾 Kaydet
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
