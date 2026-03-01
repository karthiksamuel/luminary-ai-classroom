// ClassroomView — 3-panel layout: teacher | board | topics
// Shown after the agent calls the start_lesson tool.
// Teacher panel: 3D avatar driven by isTalking (from ElevenLabs isSpeaking)
// Board panel: Manim videos triggered by agent's render_animation tool calls
// Topics panel: history of all rendered animations, clickable to replay

import type { LessonInfo, CompletedTopic } from '@/App'
import TeacherPanel from './TeacherPanel'
import BoardPanel from './BoardPanel'
import TopicsPanel from './TopicsPanel'

interface Props {
  lessonInfo: LessonInfo
  isTalking: boolean
  currentVideoUrl: string | null
  isRendering: boolean
  completedTopics: CompletedTopic[]
  onSelectTopic: (url: string) => void
  conversationStatus: 'disconnected' | 'connecting' | 'connected'
}

export default function ClassroomView({
  lessonInfo,
  isTalking,
  currentVideoUrl,
  isRendering,
  completedTopics,
  onSelectTopic,
  conversationStatus,
}: Props) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
    }}>
      {/* Top bar */}
      <div style={{
        height: '48px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Left: branding + topic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em' }}>luminary</span>
          {lessonInfo && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                {lessonInfo.subject} — {lessonInfo.topic}
              </span>
            </>
          )}
        </div>

        {/* Right: conversation indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: conversationStatus === 'connected'
              ? (isTalking ? '#4ade80' : 'rgba(74,222,128,0.5)')
              : 'rgba(255,255,255,0.2)',
            boxShadow: conversationStatus === 'connected' && isTalking
              ? '0 0 8px rgba(74,222,128,0.7)' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {conversationStatus === 'connected'
              ? isTalking ? 'Speaking' : 'Listening'
              : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Three-panel body */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '10px',
        padding: '10px',
        minHeight: 0,
      }}>
        {/* Left — Teacher (25%) */}
        <div style={{ flex: '0 0 25%', minHeight: 0 }}>
          <TeacherPanel isTalking={isTalking} />
        </div>

        {/* Middle — Board (50%) */}
        <div style={{ flex: '0 0 50%', minHeight: 0 }}>
          <BoardPanel
            videoUrl={currentVideoUrl}
            isRendering={isRendering}
            topic={lessonInfo.topic}
          />
        </div>

        {/* Right — Topics (25%) */}
        <div style={{ flex: '0 0 25%', minHeight: 0, overflow: 'hidden' }}>
          <TopicsPanel
            topics={completedTopics}
            currentVideoUrl={currentVideoUrl}
            onSelect={onSelectTopic}
          />
        </div>
      </div>
    </div>
  )
}
