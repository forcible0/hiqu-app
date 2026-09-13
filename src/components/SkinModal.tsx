import { useEffect, useRef, useState } from 'react'
import { SkinMeta, Chroma } from '../types'
import { getSkinImageUrl } from '../api'

interface SkinModalProps {
  meta: SkinMeta
  isDownloaded: boolean
  downloadProgress?: number
  isActive: boolean
  isFavorite: boolean
  inQueue: boolean
  isApplying: boolean
  isRemoving: boolean
  onClose: () => void
  onDownload: () => void
  onApply: () => void
  onDeactivate: () => void
  onRemove: () => void
  onToggleFavorite: () => void
  onToggleQueue: () => void
  chromas: Chroma[]
  loadingChromas?: boolean
  selectedChromaId: string | null
  onSelectChroma: (chromaId: string | null) => void
}

const Spinner = () => (
  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
  
)

function extractColorName(fullName: string): string {
  const match = fullName.match(/\(([^)]+)\)\s*$/)
  return match ? match[1] : fullName
}

export default function SkinModal({
  meta,
  isDownloaded,
  downloadProgress,
  isActive,
  isFavorite,
  inQueue,
  isApplying,
  isRemoving,
  onClose,
  onDownload,
  onApply,
  onDeactivate,
  onRemove,
  onToggleFavorite,
  onToggleQueue,
  chromas,
  loadingChromas,
  selectedChromaId,
  onSelectChroma
}: SkinModalProps) {
  const isDownloading = downloadProgress !== undefined
  const imageUrl = getSkinImageUrl(meta.num, meta.championId)
  const modalRef = useRef<HTMLDivElement>(null)
const [modalHeight, setModalHeight] = useState<number>()

useEffect(() => {
  if (!modalRef.current) return
  const el = modalRef.current
  const observer = new ResizeObserver((entries) => {
    setModalHeight(entries[0].contentRect.height)
  })
  observer.observe(el)
  return () => observer.disconnect()
}, [])

  return (
  <div
    className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={() => {
      if (!isDownloading) onClose()
    }}
  >
    <div className="flex items-start gap-3" onClick={(e) => e.stopPropagation()}>
      <div ref={modalRef} className="bg-[#18181b] border border-white/[0.1] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl shadow-black/60 fade-in">
    
        {/* Büyük skin görseli */}
        <div className="relative aspect-video bg-black/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={meta.name}
              className="w-full h-full object-cover object-[center_20%]"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gray-600">🎮</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent"></div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur text-gray-300 hover:text-white hover:bg-black/80 transition text-xl leading-none"
          >
            ×
          </button>
          <button
            onClick={onToggleFavorite}
            title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            className={`absolute top-3 right-14 w-9 h-9 flex items-center justify-center rounded-full backdrop-blur transition ${
              isFavorite
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40'
                : 'bg-black/60 text-gray-300 hover:bg-sky-500/70 hover:text-white'
            }`}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
          <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight truncate drop-shadow-lg">{meta.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {meta.championName && <>{meta.championName} · </>}Skin ID:{' '}
                <span className="font-mono text-gray-300">{meta.id}</span>
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              {isActive && (
                <span className="flex items-center gap-1.5 bg-green-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-green-500/30">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  AKTİF
                </span>
              )}
              {!isActive && isDownloaded && (
                <span className="bg-sky-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-sky-500/30">
                  ✓ İNDİRİLDİ
                </span>
              )}
            </div>
          </div>
        </div>
        {/* İşlem alanı */}
        <div className="p-5">
          {isDownloading ? (
            // İndirme ilerleme çubuğu
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full"></span>
                  İndiriliyor...
                </span>
                <span className="text-sm font-semibold text-sky-400">%{downloadProgress}</span>
              </div>
              <div className="w-full h-2.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : isDownloaded ? (
            // İndirilmiş: Aktif Et / Pasifleştir + Sıra + Kaldır
            <div className="space-y-3">
              {isActive && (
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-semibold bg-green-500/10 border border-green-500/30 rounded-xl py-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Patcher Aktif — bu skin oyunda uygulanıyor
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onApply}
                  disabled={isApplying}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-white/[0.07] border border-green-500/40 text-green-300 hover:bg-green-500/10 shadow-green-500/10'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-500/20'
                  }`}
                >
                  {isApplying ? (
                    <>
                      <Spinner />
                      Aktif Ediliyor...
                    </>
                  ) : isActive ? (
                    <>✓ Zaten Aktif</>
                  ) : (
                    <>✓ Aktif Et</>
                  )}
                </button>
                {isActive ? (
                  <button
                    onClick={onDeactivate}
                    disabled={isApplying}
                    className="px-5 py-3 rounded-xl font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    ⏹ Pasifleştir
                  </button>
                ) : (
                  <button
                    onClick={onToggleQueue}
                    className={`px-5 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      inQueue
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30'
                        : 'bg-white/[0.06] border border-white/[0.1] hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-200'
                    }`}
                  >
                    {inQueue ? '✓ Sırada' : '＋ Sıraya Ekle'}
                  </button>
                )}
                <button
                  onClick={onRemove}
                  disabled={isRemoving}
                  className="px-5 py-3 rounded-xl font-semibold bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRemoving ? (
                    <>
                      <Spinner />
                      Kaldırılıyor...
                    </>
                  ) : (
                    <>🗑️ Kaldır</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Henüz indirilmemiş: SADECE indir (+ sıraya ekle seçeneği)
            <div className="space-y-3">
              <button
                onClick={onDownload}
                className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 px-4 py-3 rounded-xl font-semibold transition shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
              >
                ⬇️ İndir
              </button>
              <button
                onClick={onToggleQueue}
                className={`w-full px-4 py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm ${
                  inQueue
                    ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30'
                    : 'bg-white/[0.05] border border-white/[0.1] text-gray-300 hover:bg-blue-500/15 hover:border-blue-500/40 hover:text-blue-200'
                }`}
              >
                {inQueue ? '✓ Sırada — çıkarmak için tıklayın' : '＋ Sıraya Ekle (sonra topluca patchleyin)'}
              </button>
            </div>
          )}
          <p className="text-gray-600 text-xs mt-3 text-center">
            Skin, LoLskins deposundan indirilir. Alt bardaki{' '}
            <span className="text-sky-400 font-semibold">⚡ Patchle</span> butonu ile sıradaki tüm
            skinleri tek seferde aktif edebilirsiniz.
          </p>
                </div>
      </div>

      {chromas.length > 0 && (
        <div
  className="w-72 shrink-0 bg-[#18181b] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 p-3 overflow-y-auto"
  style={{ maxHeight: modalHeight }}
>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Chromalar</p>
          <div className="grid grid-cols-2 gap-3">
  <button
    onClick={() => onSelectChroma(null)}
    className={`flex flex-col items-center gap-1.5 rounded-xl overflow-hidden border-2 transition p-2 ${
      selectedChromaId === null
        ? 'border-sky-400 bg-sky-500/10'
        : 'border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.05]'
    }`}
  >
    <div className="aspect-[3/4] w-full rounded-lg bg-white/[0.06] flex items-center justify-center text-gray-400 text-2xl">
      ⟲
    </div>
    <p className="text-xs font-semibold text-gray-300">Orijinal</p>
  </button>
  {chromas.map((chroma) => {
    const colorName = extractColorName(chroma.name)
    return (
      <button
        key={chroma.id}
        onClick={() => onSelectChroma(chroma.id)}
        className={`flex flex-col items-center gap-1.5 rounded-xl overflow-hidden border-2 transition p-2 ${
          selectedChromaId === chroma.id
            ? 'border-sky-400 bg-sky-500/10'
            : 'border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.05]'
        }`}
      >
        {chroma.imageUrl ? (
          <img
            src={chroma.imageUrl}
            alt={colorName}
            className="aspect-[3/4] w-full rounded-lg object-cover bg-white/[0.06]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div
            className="aspect-[3/4] w-full rounded-lg"
            style={{ background: chroma.colors?.[0] || '#333' }}
          ></div>
        )}
        <p className="text-xs font-bold truncate w-full text-center text-white">
  {colorName}
</p>
      </button>
    )
  })}
</div>
          {loadingChromas && <p className="text-[11px] text-gray-500 mt-2 px-1">Yükleniyor...</p>}
        </div>
      )}
    </div>
  </div>
  )
}