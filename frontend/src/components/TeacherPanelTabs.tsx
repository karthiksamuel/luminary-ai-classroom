import { useEffect, useRef, useState } from 'react'
import TeacherPanel from './TeacherPanel'
import SpaceTeacherPanel from './SpaceTeacherPanel'

type PanelMode = 'teacher' | 'solar'

interface Props {
  isTalking: boolean
  isSpaceMode: boolean
}

export default function TeacherPanelTabs({ isTalking, isSpaceMode }: Props) {
  const [panelMode, setPanelMode] = useState<PanelMode>(isSpaceMode ? 'solar' : 'teacher')
  const previousSpaceModeRef = useRef(isSpaceMode)

  useEffect(() => {
    const previousSpaceMode = previousSpaceModeRef.current
    previousSpaceModeRef.current = isSpaceMode

    if (!isSpaceMode) {
      setPanelMode('teacher')
      return
    }

    if (!previousSpaceMode && isSpaceMode) {
      setPanelMode('solar')
    }
  }, [isSpaceMode])

  const showSolarTab = isSpaceMode

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setPanelMode('teacher')}
          style={{
            flex: 1,
            border: 'none',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: panelMode === 'teacher' ? 'rgba(124,58,237,0.32)' : 'transparent',
            color: panelMode === 'teacher' ? 'rgba(245,235,255,0.96)' : 'rgba(255,255,255,0.52)',
            boxShadow: panelMode === 'teacher'
              ? 'inset 0 0 0 1px rgba(196,181,253,0.18), 0 0 16px rgba(124,58,237,0.12)'
              : 'none',
          }}
        >
          3D Teacher
        </button>

        {showSolarTab && (
          <button
            onClick={() => setPanelMode('solar')}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: panelMode === 'solar' ? 'rgba(56,189,248,0.22)' : 'transparent',
              color: panelMode === 'solar' ? 'rgba(226,247,255,0.96)' : 'rgba(255,255,255,0.52)',
              boxShadow: panelMode === 'solar'
                ? 'inset 0 0 0 1px rgba(147,197,253,0.16), 0 0 16px rgba(56,189,248,0.1)'
                : 'none',
            }}
          >
            Solar
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {panelMode === 'solar' && showSolarTab
          ? <SpaceTeacherPanel isTalking={isTalking} />
          : <TeacherPanel isTalking={isTalking} />}
      </div>
    </div>
  )
}
