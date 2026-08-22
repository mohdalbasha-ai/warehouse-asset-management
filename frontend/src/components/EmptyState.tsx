import { LucideIcon } from "lucide-react";

export default function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <Icon className="w-10 h-10 text-steel-300" strokeWidth={1.5} />
      <div className="font-medium text-ink-700">{title}</div>
      {hint && <div className="text-xs text-steel-500">{hint}</div>}
    </div>
  );
}
