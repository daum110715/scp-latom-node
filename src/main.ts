import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useAuthStore } from './stores/auth'
import { ErrorCode } from './services/errors'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Global Vue error handler — catches uncaught render errors
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', { err, info, component: instance?.$options?.name })
  // Errors that propagate to the component tree are caught by ErrorBoundary.
  // This handler logs errors that escape the boundary itself.
}

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
})

// Restore auth session from stored token
const auth = useAuthStore()
auth.init()

app.mount('#app')
