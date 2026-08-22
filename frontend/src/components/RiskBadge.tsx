import { CheckCircle2, AlertTriangle, AlertOctagon, XCircle } from "lucide-react";

const CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  NORMAL:  { label: "طبيعي",      className: "badge-normal",  icon: CheckCircle2 },
  WARNING: { label: "تحذير",      className: "badge-warning", icon: AlertTriangle },
  DANGER:  { label: "خطر",        className: "badge-danger",  icon: AlertTriangle },
  SEVERE:  { label: "خطر شديد",   className: "badge-severe",  icon: AlertOctagon },
  EXPIRED: { label: "منتهي",      className: "badge-expired", icon: XCircle },
};

export default function RiskBadge({ level }: { level: string }) {
  const c = CONFIG[level] ?? { label: level, className: "badge-normal", icon: CheckCircle2 };
  const Icon = c.icon;
  return (
    <span className={`badge ${c.className}`}>
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {c.label}
    </span>
  );
}
