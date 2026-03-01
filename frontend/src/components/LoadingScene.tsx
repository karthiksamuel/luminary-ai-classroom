// LoadingScene — branded loading overlay using the luminary loading video.
//
// mode="fill":    fills parent container (used in BoardPanel while rendering)
// mode="overlay": fixed full-screen overlay (used in GreetingView while connecting)

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  label?: string
  mode?: 'fill' | 'overlay'
}

export default function LoadingScene({ label, mode = 'fill' }: Props) {
  const rootRef    = useRef<HTMLDivElement>(null)
  const glowRef    = useRef<HTMLDivElement>(null)
  const labelRef   = useRef<HTMLParagraphElement>(null)
  const brandRef   = useRef<HTMLSpanElement>(null)

  // Fade in on mount
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: 'power2.out' })
    return () => { gsap.killTweensOf(el) }
  }, [])

  // Ambient glow pulse
  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    const t = gsap.to(el, {
      opacity: 0.75,
      scale: 1.14,
      duration: 2.4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
    return () => {
      t.kill()
    }
  }, [])

  // Label breathe
  useEffect(() => {
    const el = labelRef.current
    if (!el) return
    const t = gsap.to(el, {
      opacity: 0.4,
      duration: 1.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: 0.4,
    })
    return () => {
      t.kill()
    }
  }, [label])

  // Brand drift (overlay mode only)
  useEffect(() => {
    const el = brandRef.current
    if (!el) return
    const drift = () => gsap.to(el, {
      x: gsap.utils.random(-2.5, 2.5),
      y: gsap.utils.random(-1.5, 1.5),
      duration: gsap.utils.random(1.8, 3.2),
      ease: 'sine.inOut',
      onComplete: drift,
    })
    drift()
    return () => gsap.killTweensOf(el)
  }, [])

  // ── OVERLAY mode ─────────────────────────────────────────────────────────
  if (mode === 'overlay') {
    return (
      <div
        ref={rootRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse 90% 75% at 50% 48%, rgba(92,32,180,0.2) 0%, #000 62%)',
        }}
      >
        {/* Ambient glow blob */}
        <div
          ref={glowRef}
          style={{
            position: 'absolute',
            width: 'min(520px, 58vw)',
            height: 'min(520px, 58vw)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, rgba(92,32,180,0.16) 40%, transparent 70%)',
            pointerEvents: 'none',
            opacity: 0.42,
          }}
        />

        {/* Video */}
        <div style={{
          position: 'relative',
          width: 'min(400px, 52vw)',
          height: 'min(400px, 52vw)',
        }}>
          <video
            src="/loading.mov"
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'brightness(1.08) saturate(1.12)',
            }}
          />

          {/* Edge vignette to blend into bg */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 82% 82% at 50% 50%, transparent 38%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Brand label */}
        <span
          ref={brandRef}
          style={{
            marginTop: '8px',
            fontSize: '16px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#efb2ff',
            textShadow: '0 0 2px rgba(255,236,255,0.9), 0 0 18px rgba(239,178,255,0.45), 0 0 36px rgba(167,72,255,0.28)',
            userSelect: 'none',
          }}
        >
          luminary
        </span>

        {/* Status label */}
        {label && (
          <p
            ref={labelRef}
            style={{
              margin: '10px 0 0',
              fontSize: '12px',
              fontStyle: 'italic',
              letterSpacing: '0.1em',
              color: 'rgba(239,178,255,0.72)',
              textShadow: '0 0 10px rgba(167,72,255,0.38)',
            }}
          >
            {label}
          </p>
        )}

        <style>{`
          @keyframes lsOrbitRing {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // ── FILL mode ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          inset: '12%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, rgba(92,32,180,0.1) 50%, transparent 72%)',
          pointerEvents: 'none',
          opacity: 0.5,
        }}
      />

      {/* Video fills the panel */}
      <video
        src="/loading.mov"
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'brightness(1.06) saturate(1.1)',
        }}
      />

      {/* Edge vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 78% 78% at 50% 50%, transparent 35%, rgba(6,6,11,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Status label */}
      {label && (
        <p
          ref={labelRef}
          style={{
            position: 'absolute',
            bottom: '20px',
            margin: 0,
            fontSize: '13px',
            fontStyle: 'italic',
            letterSpacing: '0.06em',
            color: 'rgba(239,178,255,0.7)',
            textShadow: '0 0 12px rgba(167,72,255,0.42)',
          }}
        >
          {label}
        </p>
      )}
    </div>
  )
}
