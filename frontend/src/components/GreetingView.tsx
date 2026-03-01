import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

const HERO_PHRASES = [
  'deeply human.',
  'clear at last.',
  'like it clicks.',
  'made for you.',
  'impossible to ignore.',
]

interface Props {
  status: 'disconnected' | 'connecting' | 'connected'
  isSpeaking: boolean
  onStart: () => void
  onStop: () => void
  onEnterDirectly: (topic: string, subject: string) => void
  error?: string | null
}

export default function GreetingView({ status, isSpeaking, onStart, onStop, onEnterDirectly, error }: Props) {
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const isSpatial = typeof document !== 'undefined'
    && document.documentElement.classList.contains('is-spatial')

  const [showBypass, setShowBypass] = useState(false)
  const [bypassTopic, setBypassTopic] = useState('')
  const [bypassSubject, setBypassSubject] = useState('')

  const heroRef = useRef<HTMLDivElement | null>(null)
  const sentenceRef = useRef<HTMLDivElement | null>(null)
  const lineOneRef = useRef<HTMLDivElement | null>(null)
  const phraseRef = useRef<HTMLSpanElement | null>(null)
  const subtitleRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    if (!phraseRef.current) {
      return
    }

    const ctx = gsap.context(() => {
      if (!phraseRef.current) {
        return
      }

      phraseRef.current.textContent = HERO_PHRASES[0]

      gsap.set(sentenceRef.current, { autoAlpha: 0, x: -88 })
      gsap.set(subtitleRef.current, { autoAlpha: 0, y: 16 })
      gsap.set(phraseRef.current, {
        autoAlpha: 0,
        x: -52,
        yPercent: 20,
        filter: 'blur(10px)',
      })

      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
      intro
        .to(sentenceRef.current, { autoAlpha: 1, x: 0, duration: 0.9, ease: 'expo.out' }, 0.1)
        .to(
          phraseRef.current,
          {
            autoAlpha: 1,
            x: 0,
            yPercent: 0,
            filter: 'blur(0px)',
            duration: 0.72,
            ease: 'expo.out',
          },
          0.32,
        )
        .to(subtitleRef.current, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.42)

      gsap.to(sentenceRef.current, {
        x: 10,
        y: -2,
        yoyo: true,
        repeat: -1,
        duration: 5.8,
        ease: 'sine.inOut',
        delay: 1.2,
      })

      gsap.to(lineOneRef.current, {
        x: -4,
        y: 2,
        yoyo: true,
        repeat: -1,
        duration: 3.8,
        ease: 'sine.inOut',
        delay: 1.35,
      })

      let activeIndex = 0
      const phraseLoop = gsap.timeline({ repeat: -1, repeatDelay: 0.08, paused: true })

      for (let step = 1; step <= HERO_PHRASES.length; step += 1) {
        phraseLoop
          .to(phraseRef.current, { duration: 1.04 })
          .to(
            phraseRef.current,
            {
              x: 72,
              autoAlpha: 0,
              filter: 'blur(6px)',
              duration: 0.16,
              ease: 'power4.in',
            },
          )
          .call(() => {
            activeIndex = (activeIndex + 1) % HERO_PHRASES.length
            if (phraseRef.current) {
              phraseRef.current.textContent = HERO_PHRASES[activeIndex]
            }
          })
          .set(phraseRef.current, {
            x: -56,
            yPercent: 16,
            filter: 'blur(10px)',
          })
          .to(
            phraseRef.current,
            {
              x: 0,
              yPercent: 0,
              autoAlpha: 1,
              filter: 'blur(0px)',
              duration: 0.52,
              ease: 'expo.out',
            },
          )
      }

      intro.call(() => {
        phraseLoop.play()
      })
    }, heroRef)

    return () => {
      ctx.revert()
    }
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '34px',
        position: 'relative',
        overflow: 'hidden',
        background: isSpatial ? 'transparent' : '#000000',
        backgroundColor: isSpatial ? 'transparent' : '#000000',
      }}
    >
      <div
        ref={heroRef}
        style={{
          textAlign: 'center',
          zIndex: 1,
          width: 'min(90vw, 920px)',
        }}
      >
        <div
          ref={sentenceRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.12em',
            width: '100%',
            willChange: 'transform',
          }}
        >
          <div
            ref={lineOneRef}
            style={{
              fontSize: 'clamp(2.55rem, 5.95vw, 4.95rem)',
              fontWeight: 620,
              lineHeight: 1.05,
              letterSpacing: '-0.038em',
              color: '#ffffff',
              textShadow: '0 0 1px rgba(255,255,255,0.86), 0 0 12px rgba(255,255,255,0.07)',
            }}
          >
            I create lessons that
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: '0.12em',
              fontSize: 'clamp(2.55rem, 5.95vw, 4.95rem)',
              fontWeight: 620,
              lineHeight: 1.05,
              letterSpacing: '-0.038em',
              color: '#ffffff',
              textShadow: '0 0 1px rgba(255,255,255,0.88), 0 0 12px rgba(255,255,255,0.07)',
            }}
          >
            <span>make hard ideas feel</span>
            <span
              style={{
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'baseline',
                minWidth: 'min(44vw, 10.5ch)',
                textAlign: 'center',
                paddingRight: '0.02em',
              }}
            >
              <span
                ref={phraseRef}
                style={{
                  display: 'inline-block',
                  fontSize: '1.03em',
                  lineHeight: 0.98,
                  color: '#efb2ff',
                  fontFamily: '"Unbounded", "SF Pro Display", "SF Pro Text", sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-0.045em',
                  textShadow: '0 0 1px rgba(255,236,255,0.96), 0 0 18px rgba(239,178,255,0.34), 0 0 34px rgba(167,72,255,0.28)',
                  willChange: 'transform, opacity, filter',
                }}
              />
            </span>
          </div>
        </div>

        <p
          ref={subtitleRef}
          style={{
            marginTop: '24px',
            color: 'rgba(255,255,255,0.26)',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.06em',
          }}
        >
          Built for the moment something impossible suddenly makes sense.
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: isConnected
              ? `radial-gradient(circle, rgba(124,58,237,${isSpeaking ? '0.9' : '0.5'}) 0%, rgba(37,99,235,0.4) 100%)`
              : 'radial-gradient(circle, rgba(32,42,64,0.8) 0%, rgba(10,14,24,0.92) 72%, rgba(5,8,14,0.98) 100%)',
            border: `1px solid rgba(255,255,255,${isConnected ? '0.2' : '0.06'})`,
            boxShadow: isSpeaking
              ? '0 0 60px rgba(124,58,237,0.6), 0 0 120px rgba(124,58,237,0.25)'
              : isConnected
              ? '0 0 30px rgba(124,58,237,0.3)'
              : '0 16px 40px rgba(0,0,0,0.55)',
            transition: 'all 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isSpeaking ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 1 }}>
        <p
          style={{
            fontSize: '13px',
            color: isConnected
              ? (isSpeaking ? 'rgba(164,228,255,0.9)' : 'rgba(255,255,255,0.55)')
              : 'rgba(255,255,255,0.35)',
            fontStyle: isConnected ? 'normal' : 'italic',
            transition: 'color 0.3s',
            minHeight: '20px',
          }}
        >
          {isConnecting && 'Connecting…'}
          {isConnected && !isSpeaking && "Listening — tell me what you'd like to learn"}
          {isConnected && isSpeaking && 'Speaking…'}
          {status === 'disconnected' && 'Tap to start your lesson'}
        </p>

        {error && (
          <p
            style={{
              fontSize: '12px',
              color: 'rgba(248,113,113,0.9)',
              textAlign: 'center',
              maxWidth: '280px',
            }}
          >
            {error}
          </p>
        )}

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

        {/* Bypass: skip voice agent, type topic/subject directly */}
        {!isConnected && !isConnecting && (
          <button
            onClick={() => setShowBypass((v) => !v)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.25)',
              fontSize: '11px', cursor: 'pointer',
              padding: '2px 8px',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(255,255,255,0.1)',
            }}
          >
            {showBypass ? 'Cancel' : 'Enter classroom manually'}
          </button>
        )}

        {showBypass && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const t = bypassTopic.trim()
              const s = bypassSubject.trim()
              if (t && s) onEnterDirectly(t, s)
            }}
            style={{
              display: 'flex', flexDirection: 'column', gap: '8px',
              padding: '14px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              width: '260px',
            }}
          >
            <input
              placeholder="Topic  (e.g. Pythagorean theorem)"
              value={bypassTopic}
              onChange={(e) => setBypassTopic(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '7px', padding: '8px 11px',
                color: 'white', fontSize: '12px', outline: 'none',
              }}
            />
            <input
              placeholder="Subject  (e.g. Mathematics)"
              value={bypassSubject}
              onChange={(e) => setBypassSubject(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '7px', padding: '8px 11px',
                color: 'white', fontSize: '12px', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!bypassTopic.trim() || !bypassSubject.trim()}
              style={{
                padding: '9px', borderRadius: '7px', border: 'none',
                background: 'rgba(124,58,237,0.65)',
                color: 'white', fontWeight: 600, fontSize: '12px',
                cursor: bypassTopic.trim() && bypassSubject.trim() ? 'pointer' : 'default',
                opacity: bypassTopic.trim() && bypassSubject.trim() ? 1 : 0.35,
                transition: 'opacity 0.2s',
              }}
            >
              Enter classroom →
            </button>
          </form>
        )}
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
