import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { titleKey: 'nav.home' },
  },
  {
    path: '/catalog',
    name: 'catalog',
    component: () => import('@/views/CatalogView.vue'),
    meta: { titleKey: 'nav.catalog' },
  },
  {
    path: '/entry/:id',
    name: 'entry',
    component: () => import('@/views/EntryView.vue'),
    meta: { titleKey: 'nav.catalog' },
  },
  {
    path: '/documents',
    name: 'documents',
    component: () => import('@/views/DocumentsView.vue'),
    meta: { titleKey: 'nav.documents' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { titleKey: 'nav.about' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { titleKey: 'auth.loginTitle', requiresGuest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { titleKey: 'auth.registerTitle', requiresGuest: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { titleKey: 'auth.profile', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { titleKey: 'notFound.accessDenied' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

// Set page title on navigation
router.beforeEach((to) => {
  const key = to.meta.titleKey as string
  const t = i18n.global.t
  const title = key ? t(key) : ''
  document.title = title ? `${title} — ${t('site.title')}` : t('site.title')
})

// Enforce auth guards: requiresAuth → must be logged in, requiresGuest → must NOT be logged in
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

// Handle chunk-load failures (e.g., stale deployment, network error loading a lazy route)
router.onError((error) => {
  const isChunkError =
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.message.includes('ChunkLoadError')

  if (isChunkError) {
    console.error('[Router] Chunk load failure — reloading page', error)
    window.location.reload()
  }
})

export default router
