import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { gsap } from 'gsap'

const MIC_VIDEO_SRC = '/mic-cta.mp4'
const WAVE_BAR_COUNT = 7
const MIC_FRAGMENT_CLIPS = [
  'polygon(0 0, 50% 0, 50% 50%, 0 50%)',
  'polygon(50% 0, 100% 0, 100% 50%, 50% 50%)',
  'polygon(0 50%, 50% 50%, 50% 100%, 0 100%)',
  'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)',
] as const
const MIC_FRAGMENT_BURST = [
  { x: -22, y: -20, rotate: -16 },
  { x: 24, y: -18, rotate: 14 },
  { x: -20, y: 22, rotate: 18 },
  { x: 22, y: 20, rotate: -14 },
] as const
const WAVE_AMPLITUDES = [0.52, 0.74, 0.98, 1.18, 0.98, 0.74, 0.52] as const

const HERO_PHRASES = [
  'deeply human.',
  'clear at last.',
  'like it clicks.',
  'made for you.',
  'unmissable.',
]

function buildWaveKeyframes(index: number) {
  const amplitude = WAVE_AMPLITUDES[index] ?? 0.72

  return [
    { scaleY: 0.2 + amplitude * 0.2, duration: 0.16, ease: 'sine.inOut' },
    { scaleY: 0.46 + amplitude * 0.44, duration: 0.2, ease: 'sine.inOut' },
    { scaleY: 0.28 + amplitude * 0.3, duration: 0.18, ease: 'sine.inOut' },
    { scaleY: 0.62 + amplitude * 0.54, duration: 0.22, ease: 'sine.inOut' },
    { scaleY: 0.24 + amplitude * 0.24, duration: 0.17, ease: 'sine.inOut' },
    { scaleY: 0.54 + amplitude * 0.4, duration: 0.19, ease: 'sine.inOut' },
    { scaleY: 0.18 + amplitude * 0.16, duration: 0.15, ease: 'sine.inOut' },
  ]
}

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
  const [isWaveformMode, setIsWaveformMode] = useState(false)
  const [showBypass, setShowBypass] = useState(false)
  const [bypassTopic, setBypassTopic] = useState('')
  const [bypassSubject, setBypassSubject] = useState('')

  const heroRef = useRef<HTMLDivElement | null>(null)
  const sentenceRef = useRef<HTMLDivElement | null>(null)
  const lineOneRef = useRef<HTMLDivElement | null>(null)
  const phraseRef = useRef<HTMLSpanElement | null>(null)
  const subtitleRef = useRef<HTMLParagraphElement | null>(null)
  const micCtaRef = useRef<HTMLDivElement | null>(null)
  const micButtonRef = useRef<HTMLButtonElement | null>(null)
  const micVideoRef = useRef<HTMLVideoElement | null>(null)
  const micSurfaceRef = useRef<HTMLDivElement | null>(null)
  const micVisualRef = useRef<HTMLDivElement | null>(null)
  const micGlowRef = useRef<HTMLDivElement | null>(null)
  const micTintRef = useRef<HTMLDivElement | null>(null)
  const ringRefs = useRef<Array<HTMLSpanElement | null>>([])
  const micFragmentRefs = useRef<Array<HTMLDivElement | null>>([])
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const waveBarRefs = useRef<Array<HTMLSpanElement | null>>([])
  const waveTweensRef = useRef<gsap.core.Tween[]>([])
  const micGlowXToRef = useRef<((value: number) => gsap.core.Tween) | null>(null)
  const micGlowYToRef = useRef<((value: number) => gsap.core.Tween) | null>(null)
  const micSurfaceXToRef = useRef<((value: number) => gsap.core.Tween) | null>(null)
  const micSurfaceYToRef = useRef<((value: number) => gsap.core.Tween) | null>(null)

  useEffect(() => {
    if (!phraseRef.current) {
      return
    }

    const ctx = gsap.context(() => {
      if (!phraseRef.current) {
        return
      }

      const rings = ringRefs.current.filter((ring): ring is HTMLSpanElement => Boolean(ring))

      phraseRef.current.textContent = HERO_PHRASES[0]

      gsap.set(sentenceRef.current, { autoAlpha: 0, x: -88 })
      gsap.set(subtitleRef.current, { autoAlpha: 0, y: 14 })
      gsap.set(micCtaRef.current, { autoAlpha: 0, y: 22 })
      gsap.set(micGlowRef.current, { autoAlpha: 0.18, scale: 0.92, x: 0, y: 0 })
      gsap.set(micTintRef.current, { autoAlpha: 0.08 })
      gsap.set(micSurfaceRef.current, {
        x: 0,
        y: 0,
        scale: 1,
        filter: 'brightness(1.03) contrast(1.03) saturate(1)',
      })
      gsap.set(phraseRef.current, {
        autoAlpha: 0,
        x: -52,
        yPercent: 20,
        filter: 'blur(10px)',
      })
      gsap.set(rings, {
        scale: 0.72,
        autoAlpha: 0,
        transformOrigin: '50% 50%',
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
        .to(subtitleRef.current, { autoAlpha: 1, y: 0, duration: 0.62 }, 0.48)
        .to(micCtaRef.current, { autoAlpha: 1, y: 0, duration: 0.62 }, 0.56)

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

      const ringLoop = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.1,
        paused: true,
      })

      rings.forEach((ring, index) => {
        ringLoop.fromTo(
          ring,
          {
            scale: 0.72,
            autoAlpha: 0.34,
          },
          {
            scale: 1.92,
            autoAlpha: 0,
            duration: 2.35,
            ease: 'power1.out',
          },
          index * 0.52,
        )
      })

      const breatheLoop = gsap.timeline({
        repeat: -1,
        paused: true,
        defaults: { ease: 'sine.inOut', overwrite: 'auto' },
      })

      breatheLoop
        .to(
          micButtonRef.current,
          {
            scale: 1.024,
            duration: 2.25,
          },
          0,
        )
        .to(
          micGlowRef.current,
          {
            autoAlpha: 0.34,
            scale: 1.04,
            duration: 2.25,
          },
          0,
        )
        .to(
          micTintRef.current,
          {
            autoAlpha: 0.24,
            duration: 2.25,
          },
          0,
        )
        .to(
          micSurfaceRef.current,
          {
            scale: 1.012,
            filter: 'brightness(1.16) contrast(1.1) saturate(1.14)',
            duration: 2.25,
          },
          0,
        )
        .to(
          micButtonRef.current,
          {
            scale: 1,
            duration: 2.65,
          },
        )
        .to(
          micGlowRef.current,
          {
            autoAlpha: 0.16,
            scale: 0.94,
            duration: 2.65,
          },
          '<',
        )
        .to(
          micTintRef.current,
          {
            autoAlpha: 0.06,
            duration: 2.65,
          },
          '<',
        )
        .to(
          micSurfaceRef.current,
          {
            scale: 1,
            filter: 'brightness(1.03) contrast(1.03) saturate(1)',
            duration: 2.65,
          },
          '<',
        )

      micGlowXToRef.current = gsap.quickTo(micGlowRef.current, 'x', {
        duration: 0.45,
        ease: 'power3.out',
      })
      micGlowYToRef.current = gsap.quickTo(micGlowRef.current, 'y', {
        duration: 0.45,
        ease: 'power3.out',
      })
      micSurfaceXToRef.current = gsap.quickTo(micSurfaceRef.current, 'x', {
        duration: 0.55,
        ease: 'power3.out',
      })
      micSurfaceYToRef.current = gsap.quickTo(micSurfaceRef.current, 'y', {
        duration: 0.55,
        ease: 'power3.out',
      })

      intro.call(() => {
        phraseLoop.play()
        ringLoop.play()
        breatheLoop.play()
      })
    }, heroRef)

    return () => {
      ctx.revert()
    }
  }, [])

  useEffect(() => {
    const video = micVideoRef.current

    if (!video) {
      return
    }

    const primeVideo = () => {
      if (!Number.isNaN(video.duration) && video.duration > 0.18) {
        video.currentTime = 0.12
      }
    }

    const playVideo = () => {
      void video.play().catch(() => {})
    }

    const restartVideo = () => {
      const restartTimeline = gsap.timeline()
      restartTimeline
        .to(video, {
          autoAlpha: 0.72,
          duration: 0.08,
          ease: 'power1.out',
        })
        .add(() => {
          primeVideo()
          playVideo()
        })
        .to(video, {
          autoAlpha: 1,
          duration: 0.14,
          ease: 'power1.inOut',
        })
    }

    if (video.readyState >= 2) {
      primeVideo()
      playVideo()
    }

    video.addEventListener('loadedmetadata', primeVideo)
    video.addEventListener('loadeddata', playVideo)
    video.addEventListener('ended', restartVideo)

    return () => {
      video.removeEventListener('loadedmetadata', primeVideo)
      video.removeEventListener('loadeddata', playVideo)
      video.removeEventListener('ended', restartVideo)
    }
  }, [])

  useEffect(() => {
    if (isConnected || isConnecting) {
      setIsWaveformMode(true)
      return
    }

    if (status === 'disconnected') {
      setIsWaveformMode(false)
    }
  }, [isConnected, isConnecting, status])

  useEffect(() => {
    const fragments = micFragmentRefs.current.filter((fragment): fragment is HTMLDivElement => Boolean(fragment))
    const waveBars = waveBarRefs.current.filter((bar): bar is HTMLSpanElement => Boolean(bar))

    waveTweensRef.current.forEach((tween) => tween.kill())
    waveTweensRef.current = []

    if (!micVisualRef.current || !waveformRef.current) {
      return
    }

    gsap.killTweensOf([
      micVisualRef.current,
      waveformRef.current,
      micGlowRef.current,
      micTintRef.current,
      ...fragments,
      ...waveBars,
    ])

    if (isWaveformMode) {
      gsap.set(fragments, {
        autoAlpha: 0.9,
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
      })
      gsap.set(waveformRef.current, {
        autoAlpha: 0,
        scale: 0.58,
        filter: 'blur(12px)',
      })
      gsap.set(waveBars, {
        transformOrigin: '50% 100%',
        scaleY: 0.28,
      })

      const morphIn = gsap.timeline({ defaults: { overwrite: 'auto' } })

      morphIn
        .to(
          micVisualRef.current,
          {
            autoAlpha: 0.06,
            scale: 0.72,
            filter: 'blur(10px)',
            duration: 0.3,
            ease: 'power2.in',
          },
          0,
        )
        .to(
          fragments,
          {
            autoAlpha: 0,
            x: (_index, element) => {
              const fragmentIndex = fragments.indexOf(element as HTMLDivElement)
              return MIC_FRAGMENT_BURST[fragmentIndex]?.x ?? 0
            },
            y: (_index, element) => {
              const fragmentIndex = fragments.indexOf(element as HTMLDivElement)
              return MIC_FRAGMENT_BURST[fragmentIndex]?.y ?? 0
            },
            rotate: (_index, element) => {
              const fragmentIndex = fragments.indexOf(element as HTMLDivElement)
              return MIC_FRAGMENT_BURST[fragmentIndex]?.rotate ?? 0
            },
            scale: 0.84,
            duration: 0.42,
            ease: 'power3.out',
            stagger: 0.02,
          },
          0.02,
        )
        .to(
          waveformRef.current,
          {
            autoAlpha: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.38,
            ease: 'expo.out',
          },
          0.14,
        )
        .to(
          micGlowRef.current,
          {
            autoAlpha: 0.42,
            scale: 1.08,
            duration: 0.34,
            ease: 'power2.out',
          },
          0.08,
        )
        .to(
          micTintRef.current,
          {
            autoAlpha: 0.26,
            duration: 0.3,
            ease: 'power2.out',
          },
          0.08,
        )

      waveTweensRef.current = waveBars.map((bar, index) => gsap.to(bar, {
        keyframes: buildWaveKeyframes(index),
        repeat: -1,
        paused: true,
        ease: 'none',
      }))

      return
    }

    gsap.set(fragments, {
      autoAlpha: 0,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    })

    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to(
        waveformRef.current,
        {
          autoAlpha: 0,
          scale: 0.72,
          filter: 'blur(10px)',
          duration: 0.22,
          ease: 'power2.in',
        },
        0,
      )
      .to(
        micVisualRef.current,
        {
          autoAlpha: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.34,
          ease: 'expo.out',
        },
        0.08,
      )
      .to(
        micGlowRef.current,
        {
          autoAlpha: 0.18,
          scale: 0.94,
          duration: 0.28,
          ease: 'power2.out',
        },
        0.08,
      )
      .to(
        micTintRef.current,
        {
          autoAlpha: 0.08,
          duration: 0.28,
          ease: 'power2.out',
        },
        0.08,
      )
  }, [isWaveformMode])

  useEffect(() => {
    const waveBars = waveBarRefs.current.filter((bar): bar is HTMLSpanElement => Boolean(bar))

    if (!isWaveformMode || !waveBars.length) {
      waveTweensRef.current.forEach((tween) => tween.pause(0))
      return
    }

    if (!isSpeaking) {
      waveTweensRef.current.forEach((tween) => tween.pause(0))

      gsap.to(waveBars, {
        scaleY: (index) => 0.18 + ((WAVE_AMPLITUDES[index] ?? 0.5) * 0.08),
        duration: 0.42,
        ease: 'power2.out',
        stagger: 0.015,
        overwrite: 'auto',
      })

      gsap.to(waveformRef.current, {
        autoAlpha: 0.72,
        duration: 0.36,
        ease: 'power2.out',
        overwrite: 'auto',
      })

      return
    }

    gsap.to(waveformRef.current, {
      autoAlpha: 1,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    })

    waveTweensRef.current.forEach((tween, index) => {
      tween.progress((index * 0.07) % 1)
      tween.play()
    })
  }, [isSpeaking, isWaveformMode])

  const handleMicAction = () => {
    if (isConnecting) {
      return
    }

    gsap.to(micGlowRef.current, {
      autoAlpha: 0.48,
      scale: 1.12,
      duration: 0.38,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      overwrite: 'auto',
    })

    gsap.to(micTintRef.current, {
      autoAlpha: 0.34,
      duration: 0.34,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      overwrite: 'auto',
    })

    if (isConnected) {
      setIsWaveformMode(false)
      onStop()
      return
    }

    setIsWaveformMode(true)
    onStart()
  }

  const handleMicPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const offsetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const offsetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2

    micGlowXToRef.current?.(offsetX * 9)
    micGlowYToRef.current?.(offsetY * 9)
    micSurfaceXToRef.current?.(offsetX * 2.6)
    micSurfaceYToRef.current?.(offsetY * 2.6)
  }

  const handleMicPointerLeave = () => {
    micGlowXToRef.current?.(0)
    micGlowYToRef.current?.(0)
    micSurfaceXToRef.current?.(0)
    micSurfaceYToRef.current?.(0)
  }

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
                  fontSize: '0.92em',
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
            color: 'rgba(255,255,255,0.36)',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'none',
          }}
        >
          Built for the kid who never had a great teacher.
        </p>
      </div>

      <div
        ref={micCtaRef}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <button
          ref={micButtonRef}
          type="button"
          onClick={handleMicAction}
          onPointerMove={handleMicPointerMove}
          onPointerLeave={handleMicPointerLeave}
          disabled={isConnecting}
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            padding: 0,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: isConnecting ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={isConnecting ? 'Connecting' : isConnected ? 'End session' : 'Start your lesson'}
        >
          <div
            ref={micGlowRef}
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(167,72,255,0.34) 0%, rgba(140,58,255,0.2) 34%, rgba(92,32,180,0) 72%)',
              pointerEvents: 'none',
            }}
          />
          {[0, 1, 2].map((ringIndex) => (
            <span
              key={ringIndex}
              ref={(element) => {
                ringRefs.current[ringIndex] = element
              }}
              style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: '50%',
                border: '1px solid rgba(167,72,255,0.28)',
                background: 'radial-gradient(circle, rgba(167,72,255,0.14) 0%, rgba(167,72,255,0.04) 48%, rgba(167,72,255,0) 72%)',
                pointerEvents: 'none',
              }}
            />
          ))}

          <div
            ref={micSurfaceRef}
            style={{
              position: 'relative',
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              transformOrigin: '50% 50%',
            }}
          >
            <div
              ref={micVisualRef}
              style={{
                position: 'absolute',
                inset: 0,
              }}
            >
              <video
                ref={micVideoRef}
                src={MIC_VIDEO_SRC}
                muted
                playsInline
                autoPlay
                loop
                preload="auto"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  transform: 'scale(1.06)',
                  opacity: 1,
                  filter: 'brightness(1.34) contrast(1.16) saturate(1.08)',
                }}
              />
              <div
                ref={micTintRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(190,112,255,0.3) 0%, rgba(142,62,255,0.18) 38%, rgba(94,38,176,0.02) 72%, rgba(94,38,176,0) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: isConnected
                    ? 'radial-gradient(circle, rgba(10,10,20,0.01) 26%, rgba(10,10,20,0.08) 62%, rgba(6,8,14,0.2) 100%)'
                    : 'radial-gradient(circle, rgba(10,10,20,0.02) 28%, rgba(10,10,20,0.12) 62%, rgba(6,8,14,0.28) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -10px 18px rgba(4,6,12,0.12)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {MIC_FRAGMENT_CLIPS.map((clipPath, index) => (
              <div
                key={clipPath}
                ref={(element) => {
                  micFragmentRefs.current[index] = element
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  borderRadius: '50%',
                  clipPath,
                  background: 'linear-gradient(135deg, rgba(206,154,255,0.42), rgba(120,54,220,0.08))',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  pointerEvents: 'none',
                }}
              />
            ))}

            <div
              ref={waveformRef}
              style={{
                position: 'absolute',
                inset: '32px 18px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '6px',
                opacity: 0,
                filter: 'blur(10px)',
                pointerEvents: 'none',
              }}
            >
              {Array.from({ length: WAVE_BAR_COUNT }).map((_, index) => (
                <span
                  key={index}
                  ref={(element) => {
                    waveBarRefs.current[index] = element
                  }}
                  style={{
                    width: index % 2 === 0 ? '7px' : '5px',
                    height: `${24 + ((index + 1) % 3) * 10}px`,
                    borderRadius: '999px',
                    background: 'linear-gradient(180deg, rgba(245,226,255,0.96) 0%, rgba(208,136,255,0.94) 28%, rgba(124,58,237,0.88) 72%, rgba(73,30,132,0.62) 100%)',
                    boxShadow: '0 0 12px rgba(167,72,255,0.28)',
                    transformOrigin: '50% 100%',
                  }}
                />
              ))}
            </div>
          </div>
        </button>

        <p
          style={{
            fontSize: '13px',
            color: isConnected
              ? (isSpeaking ? 'rgba(164,228,255,0.9)' : 'rgba(255,255,255,0.55)')
              : 'rgba(255,255,255,0.35)',
            fontStyle: isConnected ? 'normal' : 'italic',
            minHeight: '20px',
          }}
        >
          {isConnecting && 'Connecting…'}
          {isConnected && !isSpeaking && "Listening — tell me what you'd like to learn"}
          {isConnected && isSpeaking && 'Speaking…'}
        </p>

        {error && (
          <p
            style={{
              marginTop: '-2px',
              fontSize: '12px',
              color: 'rgba(248,113,113,0.9)',
              textAlign: 'center',
              maxWidth: '280px',
            }}
          >
            {error}
          </p>
        )}

        {/* Bypass: skip voice agent, type topic/subject directly */}
        {!isConnected && !isConnecting && (
          <button
            onClick={() => setShowBypass((v) => !v)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.2)',
              fontSize: '11px', cursor: 'pointer',
              padding: '2px 8px',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(255,255,255,0.08)',
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
              border: '1px solid rgba(255,255,255,0.08)',
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
    </div>
  )
}
