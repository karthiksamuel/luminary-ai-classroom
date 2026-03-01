// BoardPanel — the middle panel: shows Manim videos and a loading state

interface Props {
  videoUrl: string | null
  isRendering: boolean
  topic: string
}

export default function BoardPanel({ videoUrl, isRendering, topic }: Props) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(160deg, #0f1a2a 0%, #0a1020 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: videoUrl ? '#4ade80' : isRendering ? '#fbbf24' : 'rgba(255,255,255,0.2)',
          boxShadow: videoUrl ? '0 0 8px rgba(74,222,128,0.6)' : isRendering ? '0 0 8px rgba(251,191,36,0.6)' : 'none',
          transition: 'all 0.3s',
        }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
          {isRendering ? 'Rendering…' : videoUrl ? 'Animation' : topic}
        </span>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Video */}
        {videoUrl && !isRendering && (
          <video
            key={videoUrl}
            src={videoUrl}
            autoPlay
            loop
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        )}

        {/* Rendering spinner */}
        {isRendering && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '48px', height: '48px',
              border: '3px solid rgba(255,255,255,0.08)',
              borderTopColor: 'rgba(124,58,237,0.8)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontStyle: 'italic' }}>
              Generating animation…
            </p>
          </div>
        )}

        {/* Empty state */}
        {!videoUrl && !isRendering && (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginBottom: '12px',
            }}>
              luminary
            </p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
              Animations will appear here as you learn
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
