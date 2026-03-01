// TeacherPanel — 3D teacher using WebSpatial Reality/ModelAsset/ModelEntity
// Mirrors the approach from 3d-main/src/App.tsx.
// Models are symlinked from 3d-main/public/models/teacher/ via npm run setup:models

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!isTalking) {
      setActiveTalking(null)
      return
    }
    // Pick immediately on talk start
    setActiveTalking((prev) => nextTalking(prev))
    // Alternate every 3.2 s to avoid repetition
    const timer = window.setInterval(() => {
      setActiveTalking((prev) => nextTalking(prev))
    }, 3200)
    return () => window.clearInterval(timer)
  }, [isTalking])

  const activeAnim = isTalking && activeTalking
    ? ANIMATIONS[activeTalking]
    : ANIMATIONS.idle

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'transparent',
      position: 'relative',
    }}>
      <Reality style={{ width: '100%', height: '100%', background: 'transparent' }}>
        {/* Pre-load all four animations */}
        {Object.values(ANIMATIONS).map((anim) => (
          <ModelAsset key={anim.id} id={anim.id} src={anim.src} />
        ))}

        <SceneGraph>
          <ModelEntity
            key={activeAnim.id}
            model={activeAnim.id}
            position={{ x: 0, y: -0.23, z: 0.1 }}
            rotation={{ x: 0, y: 30, z: 0 }}
            scale={{ x: 0.23, y: 0.23, z: 0.23 }}
          />
        </SceneGraph>
      </Reality>

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
