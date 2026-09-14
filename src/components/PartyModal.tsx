import { useState } from 'react'
import { PartyMember } from '../party'

interface PartyModalProps {
  roomCode: string | null
  members: PartyMember[]
  onClose: () => void
  onCreate: () => Promise<void>
  onJoin: (code: string) => Promise<boolean>
  onLeave: () => Promise<void>
}

export default function PartyModal({ roomCode, members, onClose, onCreate, onJoin, onLeave }: PartyModalProps) {
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      await onCreate()
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (joinCode.trim().length !== 6) {
      setError('6 haneli kodu tam gir')
      return
    }
    setLoading(true)
    setError('')
    const ok = await onJoin(joinCode.trim())
    setLoading(false)
    if (!ok) setError('Bu kodla bir oda bulunamadı')
  }

  const handleCopy = () => {
    if (!roomCode) return
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#18181b] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">🎉 Parti Modu</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-gray-400 hover:text-white transition">
            ×
          </button>
        </div>

        {!roomCode ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Arkadaşınla aynı odaya katılın — biriniz bir skin aktive edince otomatik diğerine de düşer.
            </p>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 px-4 py-3 rounded-xl font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : '+ Yeni Oda Kur'}
            </button>

            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <div className="flex-1 h-px bg-white/[0.08]"></div>
              veya
              <div className="flex-1 h-px bg-white/[0.08]"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 haneli kod"
                className="flex-1 bg-black/30 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:border-sky-500/50"
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-white/[0.06] border border-white/[0.1] hover:bg-sky-500/20 hover:border-sky-500/40 transition disabled:opacity-50"
              >
                Katıl
              </button>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center bg-white/[0.03] border border-white/[0.08] rounded-xl py-4">
              <p className="text-xs text-gray-500 mb-1">Oda Kodu</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold tracking-[0.3em] font-mono">{roomCode}</span>
                <button
                  onClick={handleCopy}
                  className="text-xs px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] transition"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                Üyeler ({members.length})
              </p>
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2 text-sm">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    {m.name}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onLeave}
              className="w-full text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-lg px-4 py-2.5 transition"
            >
              Odadan Ayrıl
            </button>
          </div>
        )}
      </div>
    </div>
  )
}