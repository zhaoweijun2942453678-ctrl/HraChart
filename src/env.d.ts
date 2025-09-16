/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
VITE_API_EVENTS=/api/events
VITE_API_CALC=/api/calc