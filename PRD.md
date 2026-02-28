# Luminary — Product Requirements Document
**Version 2.0 · Hack for Humanity 2026 (Santa Clara University)**

---

## 1. Vision

Luminary is a private AI teacher that delivers personalised, multi-modal lessons to any student, anywhere in the world. A warm, 3D teacher avatar stands inside an immersive virtual classroom, explains concepts aloud, and draws Manim-rendered animations on the chalkboard in real time. On Apple Vision Pro the classroom appears as a volumetric window floating in the user's physical space; on desktop it runs as a full-screen web app.

---

## 2. Goals for Hack for Humanity

| # | Goal |
|---|------|
| G1 | Live demo: user picks a subject + topic → 5-segment lesson plays end-to-end |
| G2 | 3D USDZ teacher avatar animates in sync with ElevenLabs voice |
| G3 | Manim animations rendered on AMD MI300X GPU stream to the chalkboard |
| G4 | Works on desktop browser **and** Apple Vision Pro via WebSpatial |
| G5 | Five topics pre-cached so demo never waits on generation |

---

## 3. Tech Stack

### 3.1 Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Routing | React Router v7 |
| Spatial | WebSpatial SDK v1.2 (`@webspatial/react-sdk`, `@webspatial/core-sdk`, `@webspatial/vite-plugin`) |
| 3D models | `@google/model-viewer` for USDZ/GLB rendering |
| 3D engine | Three.js (utility, not primary renderer) |

### 3.2 Backend (Primary — Local MacBook)
| Layer | Technology |
|-------|-----------|
| Framework | Python Flask + Flask-CORS |
| LLM | Gemini 2.0 Flash (`gemini-2.0-flash-exp`) via `google-genai` |
| Voice | ElevenLabs Turbo v2.5 (`eleven_turbo_v2_5`) |
| Port | 3002 |
| Cache | File-based MD5 cache in `backend/cache/` |

### 3.3 Manim GPU Backend (AMD Cloud)
| Property | Value |
|----------|-------|
| Server IP | `134.199.193.195` |
| GPU | AMD MI300X (240 GB VRAM) |
| Stack | ROCm 7.0, PyTorch, Manim CE |
| Port | 3001 (internal) |
| Framework | Node.js / Express wrapper that calls Manim Python scripts |
| Primary backend proxies to this via `MANIM_API_URL` |

### 3.4 Environment Variables
```
# backend/.env
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=vDDsFF2fWRAHODFKKuEX
MANIM_API_URL=http://134.199.193.195:3001
PORT=3002

# frontend/.env.local
VITE_BACKEND_URL=http://localhost:3002
XR_DEV_SERVER=http://localhost:5174/webspatial/avp/
```

---

## 4. Avatar System (NEW)

### 4.1 USDZ Animation Files
The teacher is a photorealistic 3D avatar exported from Avaturn and rigged in Mixamo. Four USDZ files drive the animation state machine:

| File | State | Trigger |
|------|-------|---------|
| `idle-apple.usdz` | Default idle loop | No audio playing |
| `Happy Idle-apple.usdz` | Happy idle (lesson start/end) | Intro / outro segment |
| `Talking-apple.usdz` | Talking loop A | ElevenLabs audio starts |
| `talking2-apple.usdz` | Talking loop B | Alternate, to avoid repetition |

All files live in `frontend/public/avatars/`.

### 4.2 Animation State Machine
```
         ┌─────────────┐
    ──►  │  IDLE       │  ◄──────────────────────┐
         └──────┬──────┘                         │
                │ audioStart                      │ audioEnd
                ▼                                 │
         ┌─────────────┐                         │
         │  TALKING    │  (alternates A / B)  ───┘
         └─────────────┘

Segment 1 & 5: HAPPY_IDLE (brief, then transitions to IDLE or TALKING)
```

State transitions driven by `useAudioPlayer` callbacks:
- `onPlay` → set `isTalking = true`
- `onEnd` → set `isTalking = false`

Alternate between `Talking-apple.usdz` and `talking2-apple.usdz` on each new audio segment to prevent visual repetition.

### 4.3 WebSpatial Integration
On visionOS (`XR_ENV=avp`):
- Teacher avatar loads in a **Volume** scene via `<model-viewer>` with `enable-xr`
- `--xr-background-material: translucent` applied to all UI panels
- Chalkboard and sidebar panels are WebSpatial **Window** scenes

On desktop:
- `<model-viewer>` renders inline in normal DOM with `camera-controls` disabled
- Falls back to contained `div` with fixed aspect ratio

### 4.4 TeacherAvatar Component
Replace the current SVG avatar with a `<model-viewer>` component:

```tsx
// frontend/src/components/TeacherAvatar.tsx
interface Props {
  isTalking: boolean
  position: 'left' | 'center' | 'right' | 'board'
  segmentId: number
}
```

Avatar USDZ selection logic:
```
segmentId === 1 || segmentId === 5 → Happy Idle-apple.usdz (when idle)
isTalking && segmentId % 2 === 0   → Talking-apple.usdz
isTalking && segmentId % 2 === 1   → talking2-apple.usdz
default                             → idle-apple.usdz
```

Position is expressed as CSS `translate-x` on the parent container (no avatar position changes in the USDZ — the camera/container moves).

---

## 5. Lesson Generation (Gemini)

### 5.1 API Route
`POST /generate-lesson` (Flask, port 3002)

**Request:**
```json
{ "subject": "Mathematics", "topic": "Derivatives" }
```

**Response — 5-segment JSON:**
```json
{
  "subject": "Mathematics",
  "topic": "Derivatives",
  "segments": [
    {
      "id": 1,
      "spokenText": "Welcome! Today we're exploring derivatives...",
      "boardAction": "write" | "animate" | "clear",
      "boardText": "Short chalk heading (≤10 words)",
      "manimScript": "Plain-English description of animation (animate segments only)",
      "avatarPosition": "left" | "center" | "right" | "board"
    }
  ]
}
```

### 5.2 Lesson Rules (enforced in Gemini system prompt)
- Exactly 5 segments
- At least 2 `boardAction: "animate"` segments with `manimScript`
- Segments 1 and 5 → `avatarPosition: "center"`
- `avatarPosition: "board"` requires `boardAction: "animate"` or `"write"`
- `spokenText` conversational and warm, never bullet points

### 5.3 Caching
- Cache key: `md5("{subject}::{topic}")`
- Stored at: `backend/cache/lessons/lesson_{key}.json`
- On hit: returns immediately, no Gemini call

---

## 6. Voice Synthesis (ElevenLabs)

### 6.1 API Route
`POST /synthesize-voice` (Flask, port 3002)

**Request:**
```json
{ "text": "Welcome! Today we're exploring derivatives..." }
```

**Response:** `audio/mpeg` binary stream

**Model:** `eleven_turbo_v2_5`
**Voice settings:** stability 0.5, similarity boost 0.75, style 0.3, speaker boost on

### 6.2 Caching
- Cache key: `md5(text)`
- Stored at: `backend/cache/audio/{key}.mp3`

### 6.3 isTalking State Sync
The `useAudioPlayer` hook exposes `onPlay` and `onEnd` callbacks. `ClassroomPage` passes these down to set `isTalking` in local state, which flows to `TeacherAvatar` as a prop.

```
Audio.play()  → onPlay()  → setIsTalking(true)  → USDZ switches to Talking anim
Audio.ended() → onEnd()   → setIsTalking(false) → USDZ switches to Idle anim
```

---

## 7. Manim Rendering (AMD MI300X Cloud)

### 7.1 Architecture
```
Frontend → POST /render-manim (Flask :3002)
               ↓
           Flask checks cache → hit: return MP4
               ↓ miss
           POST http://134.199.193.195:3001/generate
           (Gemini generates Manim Python code from manimScript)
               ↓
           AMD MI300X renders MP4 via Manim CE + ROCm
               ↓
           Flask fetches MP4 from AMD server
           Flask caches MP4 locally
               ↓
           Flask streams MP4 to frontend
```

### 7.2 Flask `/render-manim` Route
**Request:**
```json
{
  "script": "Animate a sine wave being drawn from left to right, with the x-axis labeled and amplitude highlighted in gold.",
  "duration": 12
}
```

**Response:** `video/mp4` binary stream

### 7.3 AMD Server `/generate` Endpoint
**Request:**
```json
{ "context": "<manimScript plain-English>", "duration": 12 }
```

**Response:**
```json
{ "success": true, "videoUrl": "http://134.199.193.195:3001/videos/{id}.mp4" }
```

The AMD server uses Gemini to convert the plain-English `context` into Manim Python code, then runs Manim on the MI300X GPU, and serves the resulting MP4.

### 7.4 Caching
- Cache key: `md5("{manimScript}::{duration}")`
- Stored at: `backend/cache/video/{key}.mp4`
- On cache hit the AMD server is not contacted

### 7.5 Frontend Playback
The `Chalkboard` component has two modes:
- `boardAction: "write"` → chalk text typewriter effect (40 ms/char)
- `boardAction: "animate"` → fetches MP4 from `/render-manim`, plays via `<video autoplay loop>`

---

## 8. Student Interaction (Voice Input)

### 8.1 Push-to-Talk
- Web Speech API (`SpeechRecognition`) — browser-native, no extra package
- User holds microphone button in Sidebar
- Transcript sent to `/student-response`

### 8.2 `/student-response` Route
**Request:**
```json
{
  "transcript": "Wait, why does the slope become zero?",
  "subject": "Mathematics",
  "topic": "Derivatives",
  "currentSegmentId": 3
}
```

**Response:**
```json
{
  "inputType": "question" | "confusion" | "acknowledgment",
  "spokenText": "Great question! When the slope is zero, the function...",
  "boardUpdate": "Zero slope = flat tangent"
}
```

The teacher speaks the `spokenText` (ElevenLabs) and optionally updates the chalkboard with `boardUpdate`.

---

## 9. Pre-Rendering (Before Playback)

All audio and video for a lesson is pre-rendered before the first segment plays. This eliminates mid-lesson loading gaps.

**Pre-render sequence (in `useLesson`):**
1. Fetch lesson JSON from `/generate-lesson`
2. For each segment in parallel:
   - `POST /synthesize-voice` → cache audio blob URL
   - If `boardAction === "animate"`: `POST /render-manim` → cache video blob URL
3. Once all resolved → mark lesson `ready`
4. Play segments sequentially

**Progress bar** in Sidebar shows pre-render percentage (0–100%).

---

## 10. Frontend Component Tree

```
App (React Router)
├── HomePage         ← TopicSelector form
└── ClassroomPage    ← Orchestrator (useLesson hook)
    ├── ClassroomStage
    │   ├── TeacherAvatar  ← <model-viewer> USDZ
    │   └── Chalkboard     ← text or <video>
    ├── Sidebar
    │   ├── SegmentList
    │   ├── ProgressBar    ← pre-render %
    │   └── MicButton      ← push-to-talk
    └── SpatialClassroom   ← WebSpatial wrapper (visionOS only)
```

---

## 11. File Structure

```
luminary/
├── frontend/
│   ├── public/
│   │   ├── avatars/
│   │   │   ├── idle-apple.usdz
│   │   │   ├── Happy Idle-apple.usdz
│   │   │   ├── Talking-apple.usdz
│   │   │   └── talking2-apple.usdz
│   │   ├── icons/
│   │   │   ├── icon-512.png
│   │   │   └── icon-1024-maskable.png
│   │   └── manifest.webmanifest
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── vite-env.d.ts
│       ├── types/lesson.ts
│       ├── lib/api.ts
│       ├── hooks/
│       │   ├── useLesson.ts
│       │   ├── useAudioPlayer.ts
│       │   └── useVoiceInput.ts
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   └── ClassroomPage.tsx
│       └── components/
│           ├── TeacherAvatar.tsx    ← USDZ via model-viewer
│           ├── Chalkboard.tsx
│           ├── ClassroomStage.tsx
│           ├── Sidebar.tsx
│           ├── TopicSelector.tsx
│           └── spatial/
│               └── SpatialClassroom.tsx
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   └── cache/
│       ├── lessons/
│       ├── audio/
│       └── video/
└── PRD.md
```

---

## 12. WebSpatial / visionOS

### 12.1 Detection
```typescript
const isSpatial = import.meta.env.XR_ENV === 'avp'
```

### 12.2 Vite Plugin Guard
WebSpatial vite plugin is only active when `XR_ENV=avp` to prevent redirect loops in normal dev:
```typescript
// vite.config.ts
const isSpatial = process.env.XR_ENV === 'avp'
plugins: [
  isSpatial && webSpatial(),
  react({ jsxImportSource: '@webspatial/react-sdk' }),
  tailwindcss(),
]
```

### 12.3 Run Commands
```bash
# Normal dev (browser)
cd frontend && npm run dev

# WebSpatial dev (visionOS simulator)
cd frontend && npm run dev:avp
# In a second terminal:
cd frontend && npm run run:avp
```

### 12.4 Simulator Requirement
WebSpatial SDK v1.2 requires **visionOS 2.x simulator**. The Xcode 26 / visionOS 26 simulator is incompatible. Install visionOS 2.x in Xcode → Settings → Platforms.

---

## 13. Five Pre-Cached Demo Topics

These topics are pre-rendered on the AMD server before the demo so all Manim MP4s are cached locally:

| # | Subject | Topic |
|---|---------|-------|
| 1 | Mathematics | Derivatives |
| 2 | Mathematics | Pythagorean Theorem |
| 3 | Biology | Photosynthesis |
| 4 | Chemistry | How Glass is Formed |
| 5 | Physics | Newton's Three Laws of Motion |

**Pre-cache script:** `backend/scripts/precache_demo.py` — runs all 5 topics through the full pipeline (lesson → audio → Manim video) and stores results in `cache/`.

---

## 14. Implementation Roadmap

### Phase 1 — Avatar Integration (Next)
- [ ] Place USDZ files in `frontend/public/avatars/`
- [ ] Rewrite `TeacherAvatar.tsx` to use `<model-viewer>` instead of SVG
- [ ] Implement animation state machine (idle / happy-idle / talking-A / talking-B)
- [ ] Wire `isTalking` from `useAudioPlayer` → `TeacherAvatar`
- [ ] Test avatar in browser (GLB fallback if needed) and visionOS

### Phase 2 — AMD Manim Backend
- [ ] Confirm AMD server at `134.199.193.195:3001` is running and reachable
- [ ] Update `MANIM_API_URL` in `backend/.env` to AMD server URL
- [ ] Smoke-test `/render-manim` end-to-end (Flask → AMD → MP4 stream)
- [ ] Pre-cache all 5 demo topics via `backend/scripts/precache_demo.py`

### Phase 3 — Polish & Demo Prep
- [ ] Add 512×512 and 1024×1024 PNG icons to `frontend/public/icons/`
- [ ] Error boundary around `ClassroomPage`
- [ ] Loading skeleton during pre-render phase
- [ ] Segment timing: wait for both audio + video to finish before advancing
- [ ] Test full demo flow for all 5 pre-cached topics
- [ ] Run `npm run build:avp` + `npm run run:avp` for visionOS final check

---

## 15. API Summary

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/generate-lesson` | Generate 5-segment lesson via Gemini |
| POST | `/synthesize-voice` | Convert text to MP3 via ElevenLabs |
| POST | `/render-manim` | Render Manim animation on AMD MI300X → MP4 |
| POST | `/student-response` | Classify student input and generate teacher reply |
| GET  | `/health` | Health check |

---

## 16. Key Constraints & Decisions

| Decision | Rationale |
|----------|-----------|
| Vite (not Next.js) | User explicit requirement; simpler SPA architecture |
| React Router v7 | Replaces Next.js file routing, compatible with WebSpatial basename injection |
| `VITE_` env prefix | Vite convention (not `NEXT_PUBLIC_`) |
| Static `manifest.webmanifest` | `webspatial-builder` requires a file at the default path, not dynamically generated |
| WebSpatial plugin guard | Without `isSpatial` guard the plugin redirects all normal dev traffic to `/webspatial/avp/` |
| USDZ over GLB | Required for native visionOS spatial display via WebSpatial Volume scene |
| AMD MI300X for Manim | 240 GB VRAM enables fast parallel rendering; ROCm 7.0 PyTorch stack |
| File-based MD5 cache | Simple, no database dependency, survives server restarts |
| Pre-render before playback | Eliminates loading gaps mid-lesson for a seamless demo experience |
