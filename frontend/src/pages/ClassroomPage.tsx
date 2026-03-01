import { useEffect, useCallback, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLesson } from '@/hooks/useLesson'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { respondToStudent, synthesizeVoice, createObjectUrl } from '@/lib/api'
import ClassroomStage from '@/components/ClassroomStage'
import Sidebar from '@/components/Sidebar'
import SpatialClassroom from '@/components/spatial/SpatialClassroom'
import type { Subject, BoardAction, AvatarPosition } from '@/types/lesson'

export interface TeacherOverride {
  boardText: string
  boardAction: BoardAction
  avatarPosition: AvatarPosition
}

export default function ClassroomPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const subject = (searchParams.get('subject') ?? 'Physics') as Subject
  const topic = searchParams.get('topic') ?? 'How black holes form'

  const {
    lesson, currentSegment, currentSegmentIndex, status, error, progress,
    startLesson, play, nextSegment,
  } = useLesson()

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [teacherOverride, setTeacherOverride] = useState<TeacherOverride | null>(null)
  // Track whether currently-playing audio is a teacher response (vs lesson segment)
  const isResponseAudioRef = useRef(false)

  const onAudioEnd = useCallback(() => {
    setIsSpeaking(false)
    if (isResponseAudioRef.current) {
      // Teacher finished responding to student — clear override and resume lesson
      isResponseAudioRef.current = false
      setTeacherOverride(null)
      setTimeout(() => play(), 600)
    } else {
      // Normal lesson segment finished — advance
      setTimeout(() => nextSegment(), 800)
    }
  }, [nextSegment, play])

  const { play: playAudio, stop: stopAudio } = useAudioPlayer({
    onPlay: () => setIsSpeaking(true),
    onEnd: onAudioEnd,
  })

  // Start lesson on mount
  useEffect(() => {
    startLesson(subject, topic)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, topic])

  // Auto-play when ready
  useEffect(() => {
    if (status === 'ready') play()
  }, [status, play])

  // Play audio for current segment
  useEffect(() => {
    if (status === 'playing' && currentSegment?.audioUrl) {
      playAudio(currentSegment.audioUrl)
    } else if (status === 'playing' && !currentSegment?.audioUrl) {
      const t = setTimeout(() => nextSegment(), 2500)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSegment, status])

  const handleStudentInput = useCallback(async (transcript: string) => {
    if (!lesson || isResponding) return
    setIsResponding(true)
    stopAudio()
    setIsSpeaking(false)
    try {
      const response = await respondToStudent(transcript, currentSegmentIndex, lesson.subject, lesson.topic)

      // Update the board with what the teacher is about to explain
      if (response.boardUpdate) {
        setTeacherOverride({
          boardText: response.boardUpdate,
          boardAction: 'write',
          avatarPosition: 'board',
        })
      }

      const audioBlob = await synthesizeVoice(response.spokenText)
      // Mark this audio as a response — onAudioEnd will clear override and resume
      isResponseAudioRef.current = true
      playAudio(createObjectUrl(audioBlob))
      setIsResponding(false)
    } catch {
      isResponseAudioRef.current = false
      setTeacherOverride(null)
      setIsResponding(false)
      play()
    }
  }, [lesson, isResponding, currentSegmentIndex, stopAudio, playAudio, play])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a0a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        padding: '16px',
      }}>
        <div>
          <p style={{ fontSize: '20px', marginBottom: '16px' }}>{error}</p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'white',
              color: '#1a0a2e',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  const sidebar = (
    <Sidebar
      lesson={lesson}
      status={status}
      progress={progress}
      currentSegmentIndex={currentSegmentIndex}
      onStudentInput={handleStudentInput}
      onStopAudio={stopAudio}
    />
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d1a',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        padding: '0 4px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '4px 8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          ← Back
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: 'white', fontWeight: '800', margin: 0, fontSize: '18px' }}>luminary</h1>
          {lesson && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>
              {lesson.subject} · {lesson.topic}
            </p>
          )}
        </div>

        <div style={{ width: '48px' }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SpatialClassroom sidebarContent={sidebar}>
          <ClassroomStage
            currentSegment={currentSegment}
            status={status}
            isSpeaking={isSpeaking}
            onSegmentEnd={nextSegment}
            teacherOverride={teacherOverride}
          />
        </SpatialClassroom>
      </div>
    </div>
  )
}
