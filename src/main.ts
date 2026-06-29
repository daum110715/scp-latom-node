import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { logger, startLogFlusher } from './services/logger'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Global Vue error handler — catches uncaught render errors
app.config.errorHandler = (err, instance, info) => {
  logger.error('Vue render error', {
    error: err,
    info,
    component: instance?.$options?.name,
  })
  // Errors that propagate to the component tree are caught by ErrorBoundary.
  // This handler logs errors that escape the boundary itself.
}

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', { reason: event.reason })
})

// Start periodic log flushing to server
startLogFlusher()

app.mount('#app')
