import { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-ink-950/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-popover w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-bold text-lg text-ink-900">{title}</h2>
          <button onClick={onClose} className="text-steel-500 hover:text-ink-900 hover:bg-steel-100 rounded-lg p-1 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
