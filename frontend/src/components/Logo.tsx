export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#logo-grad)" />
        <path
          d="M11 22.5V17.5M16.5 25V15M22 27V13M27.5 22.5V17.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight">
        summary<span className="gradient-text">.ai</span>
      </span>
    </div>
  );
}
