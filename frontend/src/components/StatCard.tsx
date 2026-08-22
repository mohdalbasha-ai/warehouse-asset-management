import { LucideIcon } from "lucide-react";

const TONE_STYLES = {
  normal: { icon: "bg-petrol-50 text-petrol-600", value: "text-ink-900" },
  warning: { icon: "bg-amber-50 text-amber-600", value: "text-ink-900" },
  danger: { icon: "bg-danger-50 text-danger-600", value: "text-danger-600" },
};

export default function StatCard({
  label, value, tone = "normal", icon: Icon,
}: {
  label: string; value: number | string; tone?: "normal" | "warning" | "danger"; icon: LucideIcon;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className="stat-card">
      <div className={`stat-icon ${s.icon}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div>
        <div className="text-xs text-steel-500 mb-0.5">{label}</div>
        <div className={`text-2xl font-bold font-display ${s.value}`}>{value}</div>
      </div>
    </div>
  );
}
