import { Toast } from '../types'

const TOAST_STYLES: Record<Toast['type'], string> = {
  success: 'bg-green-500/20 border-green-500/40 text-green-200',
  error: 'bg-red-500/20 border-red-500/40 text-red-200',
  info: 'bg-sky-500/20 border-sky-500/40 text-sky-200',
  warning: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200'
}

export default function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-28 right-4 z-[60] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`fade-in px-4 py-3 rounded-xl border shadow-2xl shadow-black/50 text-sm font-medium backdrop-blur-md ${TOAST_STYLES[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
