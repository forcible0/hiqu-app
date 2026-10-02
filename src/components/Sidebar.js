"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Sidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const NAV_ITEMS = [
    { key: 'champions', label: 'Şampiyonlar', icon: lucide_react_1.Swords },
    { key: 'favorites', label: 'Favoriler', icon: lucide_react_1.Heart },
    { key: 'downloaded', label: 'İndirilenler', icon: lucide_react_1.Download }
];
function Sidebar({ tab, onTabChange, patcherRunning, activeCount, favoritesCount, downloadedCount, champions, selectedChampionId, onSelectChampion, settings, appVersion, updateAvailable, downloaded, checkingUpdate, onBrowse, onSaveSettings, onCheckUpdate, onOpenParty, onInstallUpdate }) {
    const [showSettingsModal, setShowSettingsModal] = (0, react_1.useState)(false);
    const [champFilter, setChampFilter] = (0, react_1.useState)('');
    const listRef = (0, react_1.useRef)(null);
    const letterRefs = (0, react_1.useRef)({});
    const badgeFor = (key) => {
        if (key === 'favorites')
            return favoritesCount;
        if (key === 'downloaded')
            return downloadedCount;
        return null;
    };
    // Her tab ve arama değişiminde şampiyon listesi en üste dönsün
    (0, react_1.useEffect)(() => {
        if (tab === 'champions') {
            listRef.current?.scrollTo(0, 0);
        }
    }, [tab, champFilter]);
    // Close modal on Esc key
    (0, react_1.useEffect)(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showSettingsModal) {
                setShowSettingsModal(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showSettingsModal]);
    const filteredChampions = champFilter
        ? champions.filter((c) => c.name.toLowerCase().includes(champFilter.toLowerCase()) ||
            c.id.toLowerCase().includes(champFilter.toLowerCase()))
        : champions;
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const groupedChampions = champFilter
        ? null
        : filteredChampions.reduce((acc, c) => {
            const letter = c.name[0]?.toUpperCase() || '#';
            if (!acc[letter])
                acc[letter] = [];
            acc[letter].push(c);
            return acc;
        }, {});
    const availableLetters = groupedChampions ? Object.keys(groupedChampions).sort() : [];
    const scrollToLetter = (letter) => {
        letterRefs.current[letter]?.scrollIntoView({ block: 'start' });
    };
    const renderChampionRow = (c) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => {
            onSelectChampion(c);
            onTabChange('champions');
        }, className: `group w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2.5 hover:scale-[1.02] origin-left ${selectedChampionId === c.id
            ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/10 text-sky-200 border-l-2 border-sky-400'
            : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 border-l-2 border-transparent'}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "w-7 h-7 rounded-full flex-shrink-0 overflow-hidden transition-transform duration-200 group-hover:scale-110", children: (0, jsx_runtime_1.jsx)("img", { src: c.image, alt: c.name, className: "w-full h-full object-cover scale-[1.35]", onError: (e) => {
                        ;
                        e.target.style.display = 'none';
                    } }) }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: c.name })] }, c.id));
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("aside", { className: "w-72 h-full bg-[#18181b] border-r border-white/[0.08] flex flex-col shrink-0", children: [(0, jsx_runtime_1.jsx)("nav", { className: "p-3 pb-2 space-y-1.5", children: NAV_ITEMS.map((item) => {
                            const active = tab === item.key;
                            const badge = badgeFor(item.key);
                            const Icon = item.icon;
                            return ((0, jsx_runtime_1.jsxs)("button", { onClick: () => onTabChange(item.key), className: `group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition border-l-2 ${active
                                    ? 'bg-gradient-to-r from-blue-500/15 to-sky-500/10 text-sky-200 border-sky-400'
                                    : 'text-gray-400 border-transparent hover:bg-white/[0.04] hover:text-gray-200'}`, children: [(0, jsx_runtime_1.jsx)(Icon, { className: `w-4 h-4 shrink-0 ${item.key === 'favorites' ? 'text-sky-400' : ''}`, strokeWidth: 2, fill: item.key === 'favorites' && active ? 'currentColor' : 'none' }), item.label, badge !== null && badge > 0 && ((0, jsx_runtime_1.jsx)("span", { className: "ml-auto text-[11px] font-semibold bg-white/[0.06] text-gray-300 rounded-full px-2 py-0.5 min-w-[22px] text-center group-hover:bg-sky-500/20 group-hover:text-sky-300 transition", children: badge }))] }, item.key));
                        }) }), (0, jsx_runtime_1.jsx)("div", { className: "h-px mx-4 my-1 bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" }), (0, jsx_runtime_1.jsx)("div", { className: "px-4 pt-2 pb-1", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none", strokeWidth: 2 }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "\u015Eampiyon ara...", value: champFilter, onChange: (e) => setChampFilter(e.target.value), className: "w-full bg-black/30 border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 overflow-hidden flex", children: [!champFilter && availableLetters.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "w-6 flex-shrink-0 flex flex-col items-center gap-[1px] pt-8 pb-1 overflow-y-auto", children: ALPHABET.map((letter) => ((0, jsx_runtime_1.jsx)("button", { onClick: () => scrollToLetter(letter), disabled: !availableLetters.includes(letter), className: `text-[11px] font-semibold leading-[18px] w-5 text-center rounded transition ${availableLetters.includes(letter)
                                        ? 'text-gray-400 hover:text-sky-300 hover:bg-white/[0.08] cursor-pointer'
                                        : 'text-gray-700 cursor-default'}`, children: letter }, letter))) })), (0, jsx_runtime_1.jsx)("div", { ref: listRef, className: "flex-1 overflow-y-auto pl-1 pr-3 pb-2", children: filteredChampions.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 text-sm p-3 text-center", children: "\u015Eampiyon bulunamad\u0131" })) : champFilter ? (filteredChampions.map((c) => renderChampionRow(c))) : (availableLetters.map((letter) => ((0, jsx_runtime_1.jsxs)("div", { ref: (el) => (letterRefs.current[letter] = el), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 px-1 pt-3 pb-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-bold text-sky-400", children: letter }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 h-px bg-white/[0.08]" })] }), groupedChampions[letter].map((c) => renderChampionRow(c))] }, letter)))) })] }), activeCount > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mx-3 mb-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: `w-2 h-2 rounded-full shrink-0 ${patcherRunning ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}` }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-green-300 leading-tight", children: patcherRunning
                                    ? `Patcher çalışıyor · ${activeCount} aktif skin`
                                    : `${activeCount} skin aktif (patcher bekleniyor)` })] })), (0, jsx_runtime_1.jsxs)("div", { className: "border-t border-white/[0.06] p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-gray-500 text-xs", children: ["v", appVersion] }), (0, jsx_runtime_1.jsx)("button", { onClick: onCheckUpdate, disabled: checkingUpdate || downloaded, className: `inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${updateAvailable
                                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                                            : downloaded
                                                ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                                                : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-sky-300 disabled:opacity-50'}`, children: checkingUpdate ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "animate-spin inline-block w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full" }), "Kontrol ediliyor..."] })) : downloaded ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "w-3.5 h-3.5", strokeWidth: 2.5 }), " Haz\u0131r"] })) : updateAvailable ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" }), "G\u00FCncelleme indiriliyor..."] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RotateCw, { className: "w-3.5 h-3.5", strokeWidth: 2 }), " G\u00FCncelleme kontrol"] })) })] }), downloaded && ((0, jsx_runtime_1.jsxs)("button", { onClick: onInstallUpdate, className: "w-full mb-2 flex items-center justify-center gap-2 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg px-3 py-2 transition shadow-lg shadow-green-500/20", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "w-4 h-4", strokeWidth: 2 }), " G\u00FCncellemeyi y\u00FCkle ve yeniden ba\u015Flat"] })), (0, jsx_runtime_1.jsxs)("button", { onClick: onOpenParty, className: "w-full mb-2 flex items-center justify-center gap-2 text-sm font-medium bg-white/[0.04] hover:bg-sky-500/15 border border-white/[0.08] hover:border-sky-500/30 rounded-lg px-3 py-2.5 transition", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.PartyPopper, { className: "w-4 h-4", strokeWidth: 2 }), " Parti Modu"] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setShowSettingsModal(true), className: "w-full text-left text-sm text-gray-400 hover:text-sky-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 transition flex items-center justify-between", children: (0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Settings, { className: "w-4 h-4", strokeWidth: 2 }), " Ayarlar"] }) })] })] }), showSettingsModal && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: () => setShowSettingsModal(false), children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-[#232326] border border-white/[0.08] rounded-2xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden", onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between p-4 border-b border-white/[0.06]", children: [(0, jsx_runtime_1.jsxs)("h2", { className: "text-lg font-semibold text-white flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Settings, { className: "w-5 h-5", strokeWidth: 2 }), " Ayarlar"] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setShowSettingsModal(false), className: "text-gray-400 hover:text-white transition p-1", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "w-4 h-4", strokeWidth: 2 }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "p-4 overflow-y-auto max-h-[60vh]", children: (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: ([
                                    { field: 'patcherPath', label: 'Patcher EXE', placeholder: "ltk_patcher_host.exe'nin tam yolu" },
                                    { field: 'dllPath', label: 'DLL (opsiyonel)', placeholder: 'Özel DLL yolu (boş bırakılabilir)' },
                                    { field: 'gamePath', label: 'LoL Klasörü', placeholder: 'League of Legends kurulum klasörü' }
                                ]).map(({ field, label, placeholder }) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-black/30 border border-white/[0.06] rounded-lg p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs font-bold uppercase tracking-wider text-gray-500", children: label }), (0, jsx_runtime_1.jsx)("button", { onClick: () => onBrowse(field), className: "text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 rounded px-2 py-1 transition", children: "G\u00F6zat" })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-400 truncate", title: settings[field] || '', children: settings[field] || (0, jsx_runtime_1.jsx)("span", { className: "text-gray-600 italic", children: placeholder }) })] }, field))) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 border-t border-white/[0.06] flex justify-end gap-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowSettingsModal(false), className: "px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition", children: "\u0130ptal" }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => {
                                        onSaveSettings(settings);
                                        setShowSettingsModal(false);
                                    }, className: "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 rounded-lg transition shadow-lg shadow-sky-500/20", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { className: "w-3.5 h-3.5", strokeWidth: 2 }), " Kaydet"] })] })] }) }))] }));
}
