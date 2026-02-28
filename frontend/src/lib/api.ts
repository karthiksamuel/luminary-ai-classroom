import type { Lesson, Subject, TeacherResponse } from '@/types/lesson'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5000'

export async function generateLesson(subject: Subject, topic: string): Promise<Lesson> {
  const res = await fetch(`${BACKEND_URL}/generate-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, topic }),
  })
  if (!res.ok) throw new Error(`Lesson generation failed: ${res.status}`)
  return res.json()
}

export async function renderManim(script: string): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/render-manim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  })
  if (!res.ok) throw new Error(`Manim render failed: ${res.status}`)
  return res.blob()
}

export async function synthesizeVoice(text: string): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/synthesize-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Voice synthesis failed: ${res.status}`)
  return res.blob()
}

export async function respondToStudent(
  transcript: string,
  currentSegmentId: number,
  subject: Subject,
  topic: string
): Promise<TeacherResponse> {
  const res = await fetch(`${BACKEND_URL}/student-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, currentSegmentId, subject, topic }),
  })
  if (!res.ok) throw new Error(`Student response failed: ${res.status}`)
  return res.json()
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url)
}
