export type Subject =
  | 'Physics' | 'Mathematics' | 'Biology' | 'Chemistry'
  | 'History' | 'Economics' | 'Computer Science' | 'Philosophy'

export type AvatarPosition = 'left' | 'center' | 'right' | 'board'
export type BoardAction = 'write' | 'animate' | 'clear'
export type StudentInputType = 'question' | 'confusion' | 'acknowledgment'

export interface LessonSegment {
  id: number
  spokenText: string
  boardAction: BoardAction
  boardText?: string
  manimScript?: string
  avatarPosition: AvatarPosition
}

export interface Lesson {
  subject: Subject
  topic: string
  segments: LessonSegment[]
}

export interface RenderedSegment extends LessonSegment {
  audioUrl?: string
  videoUrl?: string
  audioBlob?: Blob
  videoBlob?: Blob
}

export type LessonStatus =
  | 'idle' | 'generating' | 'pre-rendering' | 'ready'
  | 'playing' | 'paused' | 'complete' | 'error'

export interface TeacherResponse {
  spokenText: string
  boardUpdate?: string
  inputType: StudentInputType
}

export interface PreRenderProgress {
  total: number
  completed: number
  currentStep: string
}
