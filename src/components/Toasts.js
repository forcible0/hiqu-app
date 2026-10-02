"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Toasts;
const jsx_runtime_1 = require("react/jsx-runtime");
const TOAST_STYLES = {
    success: 'bg-green-500/20 border-green-500/40 text-green-200',
    error: 'bg-red-500/20 border-red-500/40 text-red-200',
    info: 'bg-sky-500/20 border-sky-500/40 text-sky-200',
    warning: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200'
};
function Toasts({ toasts }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed bottom-28 right-4 z-[60] space-y-2 max-w-sm", children: toasts.map((toast) => ((0, jsx_runtime_1.jsx)("div", { className: `fade-in px-4 py-3 rounded-xl border shadow-2xl shadow-black/50 text-sm font-medium backdrop-blur-md ${TOAST_STYLES[toast.type]}`, children: toast.message }, toast.id))) }));
}
