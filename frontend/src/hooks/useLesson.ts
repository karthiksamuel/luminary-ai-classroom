import { useState, useCallback, useRef } from 'react'
import type { Subject, Lesson, RenderedSegment, LessonStatus, PreRenderProgress } from '@/types/lesson'
import { generateLesson, renderManim, synthesizeVoice, createObjectUrl } from '@/lib/api'

export function useLesson() {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [renderedSegments, setRenderedSegments] = useState<RenderedSegment[]>([])
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [status, setStatus] = useState<LessonStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<PreRenderProgress>({ total: 0, completed: 0, currentStep: '' })
  const objectUrlsRef = useRef<string[]>([])

  const cleanup = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
  }, [])

  const startLesson = useCallback(async (subject: Subject, topic: string) => {
    cleanup()
    setStatus('generating')
    setError(null)
    setCurrentSegmentIndex(0)
    setRenderedSegments([])

    let generatedLesson: Lesson
    try {
      generatedLesson = await generateLesson(subject, topic)
      setLesson(generatedLesson)
    } catch {
      setError('Failed to generate lesson. Please try again.')
      setStatus('error')
      return
    }

    setStatus('pre-rendering')
    const total = generatedLesson.segments.length * 2
    setProgress({ total, completed: 0, currentStep: 'Preparing lesson...' })

    const rendered: RenderedSegment[] = []

    for (let i = 0; i < generatedLesson.segments.length; i++) {
      const segment = generatedLesson.segments[i]
      const renderedSegment: RenderedSegment = { ...segment }

      setProgress((p) => ({ ...p, currentStep: `Synthesizing voice for segment ${i + 1}…` }))
      try {
        const audioBlob = await synthesizeVoice(segment.spokenText)
        const audioUrl = createObjectUrl(audioBlob)
        objectUrlsRef.current.push(audioUrl)
        renderedSegment.audioBlob = audioBlob
        renderedSegment.audioUrl = audioUrl
      } catch { /* silent fallback */ }
      setProgress((p) => ({ ...p, completed: p.completed + 1 }))

      if (segment.manimScript) {
        setProgress((p) => ({ ...p, currentStep: `Rendering animation for segment ${i + 1}…` }))
        try {
          const videoBlob = await renderManim(segment.manimScript)
          const videoUrl = createObjectUrl(videoBlob)
          objectUrlsRef.current.push(videoUrl)
          renderedSegment.videoBlob = videoBlob
          renderedSegment.videoUrl = videoUrl
        } catch { /* fallback: show chalk text */ }
      }
      setProgress((p) => ({ ...p, completed: p.completed + 1 }))
      rendered.push(renderedSegment)
      setRenderedSegments([...rendered])
    }

    setStatus('ready')
  }, [cleanup])

  const play = useCallback(() => setStatus('playing'), [])
  const pause = useCallback(() => setStatus('paused'), [])
  const nextSegment = useCallback(() => {
    setCurrentSegmentIndex((i) => {
      if (lesson && i >= lesson.segments.length - 1) {
        setStatus('complete')
        return i
      }
      return i + 1
    })
  }, [lesson])

  return {
    lesson, renderedSegments,
    currentSegment: renderedSegments[currentSegmentIndex] ?? null,
    currentSegmentIndex, status, error, progress,
    startLesson, play, pause, nextSegment, setCurrentSegmentIndex,
  }
}
