<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1 class="title">Page Not Found</h1>
      <p class="description">The requested resource does not exist in this facility's records.</p>
      <div class="actions">
        <router-link v-if="auth.isAuthenticated" to="/" class="btn btn-primary">
          Return to Dashboard
        </router-link>
        <router-link v-else to="/login" class="btn btn-primary">
          Login
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.not-found-content {
  text-align: center;
  padding: var(--space-2xl);
}

.error-code {
  font-size: 5rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-danger);
  line-height: 1;
  margin-bottom: var(--space-lg);
}

.title {
  font-size: var(--text-3xl);
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.description {
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

.actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}
</style>
