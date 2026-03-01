/// <reference types="vite/client" />
/// <reference types="@webspatial/vite-plugin" />

declare const __XR_ENV_BASE__: string

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_ELEVENLABS_AGENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
