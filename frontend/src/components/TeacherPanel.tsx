// TeacherPanel — 3D teacher using WebSpatial Reality/ModelAsset/ModelEntity
// Mirrors the approach from 3d-main/src/App.tsx.
// Models are symlinked from 3d-main/public/models/teacher/ via npm run setup:models

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import {
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
} from '@webspatial/react-sdk'

type AnimationId = 'idle' | 'happyIdle' | 'talkingOne' | 'talkingTwo'

const ANIMATIONS = {
  idle:       { id: 'teacher-idle',        src: `${__XR_ENV_BASE__}/models/teacher/idle-apple.usdz` },
  happyIdle:  { id: 'teacher-happy-idle',  src: `${__XR_ENV_BASE__}/models/teacher/happy-idle-apple.usdz` },
  talkingOne: { id: 'teacher-talking-one', src: `${__XR_ENV_BASE__}/models/teacher/talking-apple.usdz` },
  talkingTwo: { id: 'teacher-talking-two', src: `${__XR_ENV_BASE__}/models/teacher/talking2-apple.usdz` },
} satisfies Record<AnimationId, { id: string; src: string }>

function nextTalking(current: AnimationId | null): AnimationId {
  return current === 'talkingOne' ? 'talkingTwo' : 'talkingOne'
}

interface Props {
  isTalking: boolean
}

export default function TeacherPanel({ isTalking }: Props) {
  const [activeTalking, setActiveTalking] = useState<AnimationId | null>(null)
  const [displayAnim, setDisplayAnim] = useState<AnimationId>('idle')
  const motionRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  // Talking animation alternator
  useEffect(() => {
    if (!isTalking) {
      setActiveTalking(null)
      return
    }
    // Pick immediately on talk start
    setActiveTalking((prev) => nextTalking(prev))
    // Alternate every 2.6 s to avoid repetition
    const timer = window.setInterval(() => {
      setActiveTalking((prev) => nextTalking(prev))
    }, 2600)
    return () => window.clearInterval(timer)
  }, [isTalking])

  // Compute target animation
  const targetAnim: AnimationId = isTalking && activeTalking
    ? activeTalking
    : 'idle'

  // GSAP fade transition when target animation changes
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    gsap.to(el, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        setDisplayAnim(targetAnim)
        gsap.to(el, { opacity: 1, duration: 0.35, ease: 'power2.out' })
      },
    })
  }, [targetAnim])

  // GSAP floating motion
  useEffect(() => {
    const el = motionRef.current
    if (!el) return
    const floatY = isTalking ? -6 : -2
    const tween = gsap.to(el, {
      y: floatY,
      duration: isTalking ? 1.2 : 2.0,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
    return () => { tween.kill() }
  }, [isTalking])

  const activeAnim = ANIMATIONS[displayAnim]

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'transparent',
      position: 'relative',
    }}>
      <div ref={motionRef} style={{ width: '100%', height: '100%' }}>
        <div ref={stageRef} style={{ width: '100%', height: '100%' }}>
          <Reality style={{ width: '100%', height: '100%', background: 'transparent' }}>
            {/* Pre-load all four animations */}
            {Object.values(ANIMATIONS).map((anim) => (
              <ModelAsset key={anim.id} id={anim.id} src={anim.src} />
            ))}

            <SceneGraph>
              <ModelEntity
                key={activeAnim.id}
                model={activeAnim.id}
                position={{ x: 0, y: -0.18, z: 0.1 }}
                rotation={{ x: 0, y: 30, z: 0 }}
                scale={{ x: 0.16, y: 0.16, z: 0.16 }}
              />
            </SceneGraph>
          </Reality>
        </div>
      </div>

      {/* Label */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: 0,
        right: 0,
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(164,228,255,0.5)',
        }}>
          {isTalking ? 'Speaking' : 'Listening'}
        </span>
      </div>
    </div>
  )
}
