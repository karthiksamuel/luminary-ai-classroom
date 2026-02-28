/// <reference types="vite/client" />
/// <reference types="@webspatial/vite-plugin" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly XR_ENV: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __XR_ENV_BASE__: string | undefined
