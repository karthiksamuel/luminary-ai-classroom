/// <reference types="vite/client" />

declare global {
  const __XR_ENV_BASE__: string;

  interface Window {
    luminaryTeacher?: {
      setTalking: (nextState: boolean) => void;
      toggleTalking: () => void;
    };
  }
}

export {};
