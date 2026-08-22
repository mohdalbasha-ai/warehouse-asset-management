export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="40" height="40" rx="10" fill="#0E7C7B" />
      {/* رفوف مستودع مبسّطة */}
      <rect x="9" y="11" width="22" height="4" rx="1" fill="#EAF6F6" />
      <rect x="9" y="18" width="14" height="4" rx="1" fill="#EAF6F6" />
      <rect x="9" y="25" width="18" height="4" rx="1" fill="#EAF6F6" />
      <circle cx="29" cy="20" r="2.2" fill="#DA9C3E" />
    </svg>
  );
}
