import { useEffect, useRef, useState } from 'react'
import type { BoardAction } from '@/types/lesson'

interface ChalkboardProps {
  boardAction: BoardAction
  boardText?: string
  videoUrl?: string
  isActive: boolean
}

export default function Chalkboard({ boardAction, boardText, videoUrl, isActive }: ChalkboardProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [bulletPoints, setBulletPoints] = useState<string[]>([])
  const charIndexRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Typewriter effect for chalk text
  useEffect(() => {
    if (!isActive) return
    if (boardAction === 'clear') {
      setBulletPoints([])
      setDisplayedText('')
      return
    }
    if (boardAction !== 'write' || !boardText) return

    charIndexRef.current = 0
    setDisplayedText('')

    intervalRef.current = setInterval(() => {
      if (charIndexRef.current < boardText.length) {
        setDisplayedText(boardText.slice(0, charIndexRef.current + 1))
        charIndexRef.current++
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setBulletPoints((prev) => {
          if (!prev.includes(boardText)) return [...prev, boardText]
          return prev
        })
      }
    }, 40)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [boardAction, boardText, isActive])

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a3a15 0%, #2d5a27 40%, #1a3a15 100%)',
        border: '12px solid #6B3F1F',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,80,0,0.1)',
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Wood frame texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 8px,
            rgba(0,0,0,0.05) 8px,
            rgba(0,0,0,0.05) 10px
          )
        `,
        pointerEvents: 'none',
      }} />

      {/* Chalk dust texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.02) 0%, transparent 60%),
                          radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      {/* Video mode */}
      {boardAction === 'animate' && videoUrl && (
        <video
          key={videoUrl}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}

      {/* Fallback animation placeholder */}
      {boardAction === 'animate' && !videoUrl && (
        <div style={{ textAlign: 'center', color: 'rgba(240,240,224,0.5)', padding: '24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid rgba(240,240,224,0.4)',
            borderTopColor: 'rgba(240,240,224,0.9)',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1.5s linear infinite',
          }} />
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}>Rendering animation…</p>
        </div>
      )}

      {/* Text mode */}
      {boardAction !== 'animate' && (
        <div style={{ padding: '24px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Previous bullet points */}
          {bulletPoints.slice(0, -1).map((point, i) => (
            <p key={i} style={{
              fontFamily: "'Chalk', 'Segoe UI', sans-serif",
              fontSize: 'clamp(12px, 2vw, 18px)',
              color: 'rgba(240,240,224,0.6)',
              marginBottom: '8px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              letterSpacing: '0.5px',
            }}>
              • {point}
            </p>
          ))}

          {/* Currently typing text */}
          {displayedText && (
            <p style={{
              fontFamily: "'Segoe UI', Georgia, sans-serif",
              fontSize: 'clamp(16px, 3vw, 28px)',
              fontWeight: 'bold',
              color: '#f0f0e0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 10px rgba(255,255,255,0.1)',
              letterSpacing: '1px',
              margin: 0,
            }}>
              {displayedText}
              <span style={{ opacity: 0.8, animation: 'blink 1s step-end infinite' }}>|</span>
            </p>
          )}

          {/* Completed latest bullet */}
          {bulletPoints.length > 0 && displayedText === '' && (
            <p style={{
              fontFamily: "'Segoe UI', Georgia, sans-serif",
              fontSize: 'clamp(16px, 3vw, 28px)',
              fontWeight: 'bold',
              color: '#f0f0e0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              margin: 0,
            }}>
              • {bulletPoints[bulletPoints.length - 1]}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
