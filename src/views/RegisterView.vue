<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const codename = ref('')
const password = ref('')
const confirmPassword = ref('')
const localError = ref('')

const CODENAME_RE = /^[a-zA-Z0-9_]{3,32}$/

async function handleSubmit() {
  localError.value = ''

  if (!CODENAME_RE.test(codename.value)) {
    localError.value = t('auth.errors.codenameFormat')
    return
  }
  if (password.value.length < 8) {
    localError.value = t('auth.errors.passwordLength')
    return
  }
  if (password.value !== confirmPassword.value) {
    localError.value = t('auth.errors.passwordMismatch')
    return
  }

  const ok = await auth.register(codename.value, password.value)
  if (ok) router.push('/')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-icon">◎</div>
        <h1>{{ t('auth.registerTitle') }}</h1>
        <p class="auth-subtitle">{{ t('auth.registerSubtitle') }}</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="codename">{{ t('auth.codename') }}</label>
          <input
            id="codename"
            v-model="codename"
            type="text"
            :placeholder="t('auth.codenamePlaceholder')"
            autocomplete="username"
            spellcheck="false"
          />
          <span class="form-hint">{{ t('auth.codenameHint') }}</span>
        </div>

        <div class="form-group">
          <label for="password">{{ t('auth.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label for="confirm">{{ t('auth.confirmPassword') }}</label>
          <input
            id="confirm"
            v-model="confirmPassword"
            type="password"
            :placeholder="t('auth.confirmPasswordPlaceholder')"
            autocomplete="new-password"
          />
        </div>

        <Transition name="fade">
          <div v-if="localError || auth.error" class="error-msg">
            <span class="error-icon">⚠</span>
            {{ localError || auth.error }}
          </div>
        </Transition>

        <button type="submit" class="auth-submit" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          <span v-else>{{ t('auth.registerBtn') }}</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>{{ t('auth.hasAccount') }}</span>
        <router-link to="/login">{{ t('auth.loginLink') }}</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.auth-icon {
  font-size: var(--text-3xl);
  color: var(--color-primary);
  margin-bottom: var(--space-sm);
}

.auth-header h1 {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-xs);
}

.auth-subtitle {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
}

.form-group input {
  padding: 10px var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
}

.form-group input::placeholder {
  color: var(--text-tertiary);
}

.form-hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-danger-muted);
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-danger);
}

.error-icon {
  flex-shrink: 0;
}

.auth-submit {
  padding: 10px var(--space-lg);
  background: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.auth-submit:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: 0 4px 16px var(--color-primary-muted);
}

.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-footer {
  text-align: center;
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.auth-footer a {
  color: var(--color-accent);
  margin-left: var(--space-xs);
  font-weight: 500;
}

.auth-footer a:hover {
  color: var(--color-accent-hover);
}

@media (max-width: 480px) {
  .auth-card {
    padding: var(--space-lg);
    border-radius: var(--radius-md);
  }
}
</style>
