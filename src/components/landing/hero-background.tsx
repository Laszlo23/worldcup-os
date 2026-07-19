export function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-[0.45]"
        aria-hidden
      >
        <source src="/bgvideofix.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,oklch(0.55_0.22_300/0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_85%_15%,oklch(0.78_0.19_155/0.16),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      <div className="absolute inset-0 pitch-grid opacity-[0.4]" />
      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-background via-background/85 to-transparent" />
      <div className="data-stream-lines" />
      <div className="oracle-particles">
        {Array.from({ length: 28 }).map((_, i) => (
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
      <svg className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="none">
        <defs>
          <linearGradient id="net-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.78 0.19 155)" stopOpacity="0" />
            <stop offset="50%" stopColor="oklch(0.62 0.22 300)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="oklch(0.78 0.19 155)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[18, 38, 58, 78].map((y) => (
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
