<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="unauthorized-page">
    <div class="unauthorized-content">
      <div class="lock-icon">🔒</div>
      <h1 class="title">Insufficient Clearance</h1>
      <p class="description">You do not have admin privileges to access this terminal.</p>
      <p v-if="auth.user" class="codename">
        Logged in as: {{ auth.user.codename }} ({{ auth.user.role }})
      </p>
      <div class="actions">
        <router-link v-if="!auth.isAuthenticated" to="/login" class="btn btn-primary"
          >Login as Admin</router-link
        >
        <button v-else class="btn btn-ghost" @click="auth.logout()">Logout</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unauthorized-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.unauthorized-content {
  text-align: center;
  padding: var(--space-2xl);
}

.lock-icon {
  font-size: 4rem;
  margin-bottom: var(--space-lg);
}

.title {
  font-size: var(--text-3xl);
  color: var(--color-danger);
  margin-bottom: var(--space-sm);
}

.description {
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.codename {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
}

.actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}
</style>
