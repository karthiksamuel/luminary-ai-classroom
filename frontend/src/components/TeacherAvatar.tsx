import { useEffect, useRef, useState } from 'react'
import type { AvatarPosition } from '@/types/lesson'

interface TeacherAvatarProps {
  position: AvatarPosition
  isSpeaking: boolean
}

const POSITION_LEFT: Record<AvatarPosition, string> = {
  left: '8%',
  center: '42%',
  right: '68%',
  board: '62%',
}

export default function TeacherAvatar({ position, isSpeaking }: TeacherAvatarProps) {
  const [mouthRy, setMouthRy] = useState(1.5)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPosition = useRef<AvatarPosition>(position)
  const [flipped, setFlipped] = useState(false)

  // Mouth animation while speaking
  useEffect(() => {
    if (isSpeaking) {
      intervalRef.current = setInterval(() => {
        setMouthRy(0.5 + Math.random() * 3)
      }, 160)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setMouthRy(1.5)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isSpeaking])

  // Flip when moving left
  useEffect(() => {
    const positions: AvatarPosition[] = ['left', 'center', 'right', 'board']
    const prevIdx = positions.indexOf(prevPosition.current)
    const currIdx = positions.indexOf(position)
    if (currIdx < prevIdx) setFlipped(true)
    else if (currIdx > prevIdx) setFlipped(false)
    prevPosition.current = position
  }, [position])

  const atBoard = position === 'board'
  const leftArm = atBoard ? -60 : 0   // degrees rotation
  const leftArmY = atBoard ? -18 : 0  // translate up when raised

  return (
    <div
      style={{
        position: 'absolute',
        left: POSITION_LEFT[position],
        bottom: '0',
        transition: 'left 1.2s ease-in-out',
        transform: flipped ? 'scaleX(-1)' : 'scaleX(1)',
        width: '80px',
      }}
    >
      <svg
        viewBox="0 0 80 160"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Shadow */}
        <ellipse cx="40" cy="158" rx="24" ry="5" fill="rgba(0,0,0,0.3)" />

        {/* Hair */}
        <ellipse cx="40" cy="30" rx="22" ry="14" fill="#2d1810" />
        <ellipse cx="40" cy="20" rx="18" ry="18" fill="#2d1810" />

        {/* Head */}
        <circle cx="40" cy="36" r="20" fill="#F4C390" />

        {/* Eyes */}
        <ellipse cx="33" cy="34" rx="3" ry="3.5" fill="#2d1810" />
        <ellipse cx="47" cy="34" rx="3" ry="3.5" fill="#2d1810" />
        {/* Eye shine */}
        <circle cx="34" cy="33" r="1" fill="white" />
        <circle cx="48" cy="33" r="1" fill="white" />

        {/* Eyebrows */}
        <path d="M29 29 Q33 27 37 29" stroke="#2d1810" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M43 29 Q47 27 51 29" stroke="#2d1810" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <ellipse cx="40" cy="40" rx="1.5" ry="2" fill="#d4956b" />

        {/* Mouth */}
        <ellipse
          cx="40"
          cy="47"
          rx="5"
          ry={mouthRy}
          fill={isSpeaking ? '#2d1810' : 'none'}
          stroke="#2d1810"
          strokeWidth="1.2"
        />
        {!isSpeaking && (
          <path d="M35 47 Q40 50 45 47" stroke="#2d1810" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        )}

        {/* Neck */}
        <rect x="35" y="54" width="10" height="8" fill="#F4C390" />

        {/* Body / Dress */}
        <path d="M20 62 Q25 58 40 58 Q55 58 60 62 L65 130 Q40 138 15 130 Z" fill="#3B5BA5" />

        {/* Collar */}
        <path d="M35 58 L40 70 L45 58" fill="white" stroke="white" strokeWidth="0.5" />

        {/* Left arm (raises at board) */}
        <g style={{ transformOrigin: '18px 70px', transform: `rotate(${leftArm}deg) translateY(${leftArmY}px)`, transition: 'transform 0.6s ease-in-out' }}>
          <rect x="10" y="62" width="12" height="40" rx="6" fill="#3B5BA5" />
          {/* Hand */}
          <ellipse cx="16" cy="105" rx="7" ry="6" fill="#F4C390" />
        </g>

        {/* Right arm */}
        <rect x="58" y="62" width="12" height="40" rx="6" fill="#3B5BA5" />
        {/* Right hand */}
        <ellipse cx="64" cy="105" rx="7" ry="6" fill="#F4C390" />

        {/* Skirt / lower body */}
        <path d="M15 110 Q40 120 65 110 L68 150 Q40 158 12 150 Z" fill="#2d4a8a" />

        {/* Shoes */}
        <ellipse cx="27" cy="152" rx="10" ry="5" fill="#1a1a2e" />
        <ellipse cx="53" cy="152" rx="10" ry="5" fill="#1a1a2e" />

        {/* Speaking wave indicator */}
        {isSpeaking && (
          <g transform="translate(55, 18)">
            <circle cx="0" cy="0" r="2" fill="#7c3aed" opacity="0.9">
              <animate attributeName="r" values="2;5;2" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="5" fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.5">
              <animate attributeName="r" values="5;10;5" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}
