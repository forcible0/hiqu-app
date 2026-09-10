import { SkinMeta } from '../types'
import { getSkinImageUrl } from '../api'

interface SkinCardProps {
  meta: SkinMeta
  isDownloaded: boolean
  isActive: boolean
  isFavorite: boolean
  inQueue: boolean
  isDownloading: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onToggleQueue: () => void
  onDownload: () => void
}

// Tüm grid'lerde (Şampiyonlar / Favoriler / İndirilenler) kullanılan ortak skin kartı
export default function SkinCard({
  meta,
  isDownloaded,
  isActive,
  isFavorite,
  inQueue,
  isDownloading,
  onOpen,
  onToggleFavorite,
  onToggleQueue,
  onDownload
}: SkinCardProps) {
  const imageUrl = getSkinImageUrl(meta.num, meta.championId)

  return (
    <div
  onClick={onOpen}
  className="group relative cursor-pointer transition-shadow duration-300"
>
  <div
    className={`relative bg-white/[0.03] border rounded-2xl overflow-hidden transition-all duration-300 hover:border-sky-400/60 hover:shadow-xl hover:shadow-sky-500/10 ${
      isActive ? 'border-green-500/50' : 'border-white/[0.06]'
    }`}
  >
      <div className="relative aspect-video bg-white/[0.03] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={meta.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">🎮</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-10 pb-2 px-3 pointer-events-none rounded-b-2xl">
  <p className="text-sm font-semibold text-white truncate">{meta.name}</p>
  {meta.championName && (
    <p className="text-[11px] text-gray-300 truncate">{meta.championName}</p>
  )}
</div>

        {/* Favori butonu (sol üst) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm backdrop-blur transition ${
            isFavorite
              ? 'bg-sky-500/90 text-white shadow-lg shadow-sky-500/40'
              : 'bg-black/50 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-sky-500/70'
          }`}
        >
          {isFavorite ? '♥' : '♡'}
        </button>

        {/* Durum rozetleri (sağ üst) */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
          {isDownloading && (
            <span className="bg-sky-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-sky-500/30 animate-pulse">
              İNDİRİLİYOR...
            </span>
          )}
          {!isDownloading && isActive && (
            <span className="flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-green-500/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              AKTİF
            </span>
          )}
          {!isDownloading && !isActive && isDownloaded && (
            <span className="bg-sky-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-sky-500/30">
              ✓ İNDİRİLDİ
            </span>
          )}
        </div>

        {/* Hover hızlı aksiyonlar (alt) */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 p-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-gradient-to-t from-black/85 via-black/40 to-transparent rounded-b-2xl">
          {!isDownloaded && !isDownloading && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDownload()
              }}
              title="İndir"
              className="w-9 h-9 rounded-full bg-sky-600/90 hover:bg-sky-500 text-white text-sm flex items-center justify-center shadow-lg shadow-sky-500/30 transition"
            >
              ⬇
            </button>
          )}
          {!isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleQueue()
              }}
              title={inQueue ? 'Sıradan çıkar' : 'Sıraya ekle'}
              className={`w-9 h-9 rounded-full text-sm flex items-center justify-center shadow-lg transition ${
                inQueue
                  ? 'bg-blue-500 text-white shadow-blue-500/40'
                  : 'bg-black/60 text-gray-200 hover:bg-blue-600/80 hover:text-white shadow-black/40'
              }`}
            >
              {inQueue ? '✓' : '＋'}
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}