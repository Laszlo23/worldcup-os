export function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
        aria-hidden
      >
        <source src="/bgvideofix.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,oklch(0.55_0.22_300/0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_20%,oklch(0.72_0.19_155/0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/55" />
      <div className="absolute inset-0 pitch-grid opacity-[0.35]" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="data-stream-lines" />
      <div className="oracle-particles">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="oracle-particle"
            style={{
              left: `${(i * 17 + 3) % 100}%`,
              animationDelay: `${(i % 8) * 0.7}s`,
              animationDuration: `${4 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
      <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="net-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity="0" />
            <stop offset="50%" stopColor="oklch(0.62 0.22 300)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1="0"
            y1={`${y}%`}
            x2="100%"
            y2={`${y}%`}
            stroke="url(#net-line)"
            strokeWidth="0.5"
            className="network-pulse"
            style={{ animationDelay: `${y * 20}ms` }}
          />
        ))}
      </svg>
    </div>
  );
}
