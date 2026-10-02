"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PartyModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
function PartyModal({ roomCode, members, onClose, onCreate, onJoin, onLeave }) {
    const [joinCode, setJoinCode] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [copied, setCopied] = (0, react_1.useState)(false);
    const handleCreate = async () => {
        setLoading(true);
        setError('');
        try {
            await onCreate();
        }
        finally {
            setLoading(false);
        }
    };
    const handleJoin = async () => {
        if (joinCode.trim().length !== 6) {
            setError('6 haneli kodu tam gir');
            return;
        }
        setLoading(true);
        setError('');
        const ok = await onJoin(joinCode.trim());
        setLoading(false);
        if (!ok)
            setError('Bu kodla bir oda bulunamadı');
    };
    const handleCopy = () => {
        if (!roomCode)
            return;
        navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4", onClick: onClose, children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-[#18181b] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-black/60", onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-4", children: [(0, jsx_runtime_1.jsxs)("h2", { className: "text-xl font-bold flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.PartyPopper, { className: "w-5 h-5 text-sky-400", strokeWidth: 2 }), "Parti Modu"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-gray-400 hover:text-white transition", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "w-4 h-4", strokeWidth: 2 }) })] }), !roomCode ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-400", children: "Arkada\u015F\u0131nla ayn\u0131 odaya kat\u0131l\u0131n \u2014 biriniz bir skin aktive edince otomatik di\u011Ferine de d\u00FC\u015Fer." }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCreate, disabled: loading, className: "w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 px-4 py-3 rounded-xl font-semibold transition disabled:opacity-50", children: loading ? 'Oluşturuluyor...' : '+ Yeni Oda Kur' }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-gray-600 text-xs", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-1 h-px bg-white/[0.08]" }), "veya", (0, jsx_runtime_1.jsx)("div", { className: "flex-1 h-px bg-white/[0.08]" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: joinCode, onChange: (e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6)), placeholder: "6 haneli kod", className: "flex-1 bg-black/30 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:border-sky-500/50" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleJoin, disabled: loading, className: "px-4 py-2.5 rounded-lg font-semibold text-sm bg-white/[0.06] border border-white/[0.1] hover:bg-sky-500/20 hover:border-sky-500/40 transition disabled:opacity-50", children: "Kat\u0131l" })] }), error && (0, jsx_runtime_1.jsx)("p", { className: "text-red-400 text-xs", children: error })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center bg-white/[0.03] border border-white/[0.08] rounded-xl py-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-500 mb-1", children: "Oda Kodu" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-3xl font-bold tracking-[0.3em] font-mono", children: roomCode }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCopy, className: "inline-flex items-center justify-center text-xs px-2 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] transition", children: copied ? (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "w-3.5 h-3.5", strokeWidth: 2.5 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { className: "w-3.5 h-3.5", strokeWidth: 2 }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-xs font-bold text-gray-400 uppercase tracking-wide mb-2", children: ["\u00DCyeler (", members.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-1.5", children: members.map((m) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2 text-sm", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-2 h-2 bg-green-400 rounded-full" }), m.name] }, m.id))) })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onLeave, className: "w-full text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-lg px-4 py-2.5 transition", children: "Odadan Ayr\u0131l" })] }))] }) }));
}
