import type { RenderedSegment, LessonStatus, BoardAction, AvatarPosition } from '@/types/lesson'
import TeacherAvatar from './TeacherAvatar'
import Chalkboard from './Chalkboard'

interface TeacherOverride {
  boardText: string
  boardAction: BoardAction
  avatarPosition: AvatarPosition
}

interface ClassroomStageProps {
  currentSegment: RenderedSegment | null
  status: LessonStatus
  isSpeaking: boolean
  onSegmentEnd: () => void
  // Active during teacher→student responses; overrides board + avatar
  teacherOverride?: TeacherOverride | null
}

export default function ClassroomStage({ currentSegment, status, isSpeaking, teacherOverride }: ClassroomStageProps) {
  const isLoading = status === 'generating' || status === 'pre-rendering'
  const isComplete = status === 'complete'

  // Override takes priority when teacher is actively responding to a question
  const boardAction = teacherOverride?.boardAction ?? currentSegment?.boardAction ?? 'write'
  const boardText = teacherOverride?.boardText ?? currentSegment?.boardText
  const videoUrl = teacherOverride ? undefined : currentSegment?.videoUrl
  const avatarPosition = teacherOverride?.avatarPosition ?? currentSegment?.avatarPosition ?? 'center'

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '400px',
        background: 'linear-gradient(180deg, #0d0d1a 0%, #1a0a2e 40%, #0f1a2e 70%, #1a1000 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Atmospheric ceiling lights */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        height: '120px',
        background: 'radial-gradient(ellipse at center top, rgba(255,220,100,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Floor line */}
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      }} />

      {/* Chalkboard — driven by lesson segment or teacher override during Q&A */}
      <div style={{
        position: 'absolute',
        top: '8%',
        left: '10%',
        right: '10%',
        height: '48%',
      }}>
        {(currentSegment || teacherOverride) ? (
          <Chalkboard
            boardAction={boardAction}
            boardText={boardText}
            videoUrl={videoUrl}
            isActive={status === 'playing' || !!teacherOverride}
          />
        ) : !isLoading && (
          <Chalkboard boardAction="write" boardText="luminary" isActive={false} />
        )}
      </div>

      {/* Stage floor — 2D avatar (replaced by 3D WebSpatial Volume in visionOS) */}
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: 0,
        right: 0,
        height: '45%',
      }}>
        {(currentSegment || teacherOverride) ? (
          <TeacherAvatar position={avatarPosition} isSpeaking={isSpeaking} />
        ) : !isLoading && (
          <TeacherAvatar position="center" isSpeaking={false} />
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(13,13,26,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 10,
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.15)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0 }}>
            {status === 'generating' ? 'Generating your lesson…' : 'Preparing media assets…'}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Completion overlay */}
      {isComplete && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(13,13,26,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          zIndex: 10,
        }}>
          <div style={{ fontSize: '48px' }}>🎓</div>
          <h2 style={{ color: 'white', fontSize: '24px', margin: 0, fontWeight: 'bold' }}>Lesson Complete!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0, textAlign: 'center', maxWidth: '260px' }}>
            Great work! You've finished today's lesson. Feel free to ask any final questions.
          </p>
        </div>
      )}
    </div>
  )
}
