// TeacherScene — runs in a separate spatial window.
// Listens on BroadcastChannel 'luminary-scene-sync' for { type: 'teacher-state', isTalking }
// and drives the 3D teacher avatar accordingly.

import { useState, useEffect } from 'react'
import TeacherPanel from '@/components/TeacherPanel'

export default function TeacherScene() {
  const [isTalking, setIsTalking] = useState(false)

  useEffect(() => {
    const channel = new BroadcastChannel('luminary-scene-sync')
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'teacher-state') {
        setIsTalking(e.data.isTalking)
      }
    }
    channel.addEventListener('message', onMessage)
    return () => {
      channel.removeEventListener('message', onMessage)
      channel.close()
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent' }}>
      <TeacherPanel isTalking={isTalking} />
    </div>
  )
}
