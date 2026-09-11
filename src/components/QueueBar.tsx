import { SkinMeta } from '../types'
import { getSkinImageUrl } from '../api'

interface QueueBarProps {
  queue: SkinMeta[]
  activeIds: Set<string>
  isPatching: boolean
  patchProgress: string
  onRemoveItem: (id: string) => void
  onClear: () => void
  onPatch: () => void
  onStopPatches: () => void
}

// Alttaki yatay skin sırası — "Patchle" butonu tüm kuyruğu tek seferde aktif eder
export default function QueueBar({
  queue,
  activeIds,
  isPatching,
  patchProgress,
  onRemoveItem,
  onClear,
  onPatch,
  onStopPatches
}: QueueBarProps) {
  return (
    <div className="shrink-0 border-t border-white/[0.08] bg-[#0c0c0e]/95 backdrop-blur-md">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Sıra başlığı */}
        <div className="flex items-center gap-2 shrink-0 w-24">
          <span className="text-sky-400 text-lg">🧺</span>
          <div>
            <p className="text-xs font-bold tracking-wide text-sky-300">SKİN SIRASI</p>
            <p className="text-[10px] text-gray-500">{queue.length} skin</p>
          </div>
        </div>

        {/* Sıradaki skin kartları (yatay kaydırılabilir) */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          {queue.length === 0 ? (
            <p className="text-gray-600 text-xs italic px-2">
              Skini modalden veya kart üzerindeki{' '}
              <span className="text-blue-400 not-italic border border-blue-500/40 rounded px-1">＋</span>{' '}
              butonu ile sıraya ekleyin; tek tıkla toplu patchleyin.
            </p>
          ) : (
            <div className="flex gap-2 pb-1">
              {queue.map((meta) => {
                const isActive = activeIds.has(meta.id)
                return (
                  <div
                    key={meta.id}
                    className={`relative shrink-0 w-28 rounded-lg overflow-hidden border transition ${
                      isActive ? 'border-green-500/60' : 'border-white/[0.1] hover:border-sky-500/50'
                    }`}
                  >
                    <div className="aspect-video overflow-hidden bg-white/[0.03]">
                      <img
                        src={getSkinImageUrl(meta.num, meta.championId)}
                        alt={meta.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-300 truncate px-1.5 py-0.5 bg-black/40">{meta.name}</p>
                    {isActive && (
                      <span className="absolute top-1 left-1 flex items-center gap-0.5 bg-green-500/90 text-white text-[8px] font-bold px-1 py-px rounded">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>AKTİF
                      </span>
                    )}
                    <button
                      onClick={() => onRemoveItem(meta.id)}
                      disabled={isPatching}
                      title="Sıradan çıkar"
                      className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/70 text-gray-300 hover:bg-red-500/80 hover:text-white text-[10px] leading-none transition disabled:opacity-40"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Aksiyonlar: Temizle + Patchle + Durdur */}
        <div className="shrink-0 flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={onClear}
              disabled={isPatching}
              className="text-xs text-gray-400 hover:text-red-300 border border-white/[0.1] hover:border-red-500/40 rounded-lg px-3 py-2.5 transition disabled:opacity-40"
            >
              Temizle
            </button>
          )}
          {activeIds.size > 0 && (
            <button
              onClick={onStopPatches}
              disabled={isPatching}
              className="text-xs text-gray-400 hover:text-amber-300 border border-white/[0.1] hover:border-amber-500/40 rounded-lg px-3 py-2.5 transition disabled:opacity-40"
            >
              ⏸ Durdur
            </button>
          )}
          <button
            onClick={onPatch}
            disabled={queue.length === 0 || isPatching}
            className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {isPatching ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                {patchProgress || 'Patchleniyor...'}
              </>
            ) : (
              <>⚡ Patchle ({queue.length})</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
