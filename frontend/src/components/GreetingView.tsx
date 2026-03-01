// GreetingView — full-screen landing with ElevenLabs agent
// The agent greets the user and asks what they want to learn.
// When the user responds, the agent calls the start_lesson tool → classroom opens.

interface Props {
  status: 'disconnected' | 'connecting' | 'connected'
  isSpeaking: boolean
  onStart: () => void
  onStop: () => void
}

export default function GreetingView({ status, isSpeaking, onStart, onStop }: Props) {
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '40px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(124, 58, 237, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Branding */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(164, 228, 255, 0.7)',
          marginBottom: '10px',
        }}>
          AI Teacher
        </p>
        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 5.5rem)',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #ffffff 30%, rgba(164,228,255,0.85) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          luminary
        </h1>
        <p style={{
          marginTop: '14px',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '15px',
          fontWeight: 400,
        }}>
          A private AI teacher, for any subject, anywhere in the world.
        </p>
      </div>

      {/* Speaking orb */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: isConnected
            ? `radial-gradient(circle, rgba(124,58,237,${isSpeaking ? '0.9' : '0.5'}) 0%, rgba(37,99,235,0.4) 100%)`
            : 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          border: `1px solid rgba(255,255,255,${isConnected ? '0.2' : '0.08'})`,
          boxShadow: isSpeaking
            ? '0 0 60px rgba(124,58,237,0.6), 0 0 120px rgba(124,58,237,0.25)'
            : isConnected
            ? '0 0 30px rgba(124,58,237,0.3)'
            : 'none',
          transition: 'all 0.4s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isSpeaking ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}>
          {/* Mic icon */}
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
      </div>

      {/* Status + button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 1 }}>
        <p style={{
          fontSize: '13px',
          color: isConnected
            ? (isSpeaking ? 'rgba(164,228,255,0.9)' : 'rgba(255,255,255,0.55)')
            : 'rgba(255,255,255,0.35)',
          fontStyle: isConnected ? 'normal' : 'italic',
          transition: 'color 0.3s',
          minHeight: '20px',
        }}>
          {isConnecting && 'Connecting…'}
          {isConnected && !isSpeaking && "Listening — tell me what you'd like to learn"}
          {isConnected && isSpeaking && 'Speaking…'}
          {status === 'disconnected' && 'Tap to start your lesson'}
        </p>

        <button
          onClick={isConnected ? onStop : onStart}
          disabled={isConnecting}
          style={{
            padding: '14px 36px',
            borderRadius: '999px',
            border: 'none',
            fontWeight: 700,
            fontSize: '15px',
            cursor: isConnecting ? 'default' : 'pointer',
            background: isConnected
              ? 'rgba(220,38,38,0.15)'
              : 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(37,99,235,0.9))',
            color: 'white',
            boxShadow: isConnected
              ? 'inset 0 0 0 1px rgba(220,38,38,0.4)'
              : '0 4px 24px rgba(124,58,237,0.4)',
            opacity: isConnecting ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isConnecting ? 'Connecting…' : isConnected ? 'End session' : 'Start talking'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}
