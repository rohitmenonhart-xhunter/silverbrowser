export function TitleBar() {
  return (
    <div
      style={{
        height: 36,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 78,
        paddingRight: 12,
        WebkitAppRegion: 'drag' as any,
        background: 'var(--sv-bg-base)',
        borderBottom: '1px solid var(--sv-border-subtle)',
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          background: 'linear-gradient(90deg, #7a8299 0%, #c8cfe0 40%, #ffffff 50%, #c8cfe0 60%, #7a8299 100%)',
          backgroundSize: '200% 100%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'sv-shimmer 6s ease infinite',
        }}
      >
        Silver
      </span>
    </div>
  )
}
