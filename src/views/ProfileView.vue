<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useFeatureFlags } from '@/composables/useFeatureFlags'
import Badge from '@/components/common/Badge.vue'
import AiChatPanel from '@/components/ai/AiChatPanel.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const { terminalEnabled, toggleTerminal } = useFeatureFlags()

const activeTab = ref<'profile' | 'ai'>('profile')

const editingCodename = ref(false)
const changingPassword = ref(false)
const newCodename = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmNew = ref('')
const localError = ref('')
const successMsg = ref('')

onMounted(() => {
  if (!auth.isAuthenticated) {
    router.push('/login')
  }
})

function startEditCodename() {
  newCodename.value = auth.user?.codename || ''
  editingCodename.value = true
  localError.value = ''
  auth.error = ''
  successMsg.value = ''
}

async function saveCodename() {
  localError.value = ''
  auth.error = ''
  successMsg.value = ''
  if (!newCodename.value.trim()) return
  const ok = await auth.updateProfile({ codename: newCodename.value.trim() })
  if (ok) {
    editingCodename.value = false
    successMsg.value = t('auth.codenameUpdated')
  }
}

async function savePassword() {
  localError.value = ''
  auth.error = ''
  successMsg.value = ''
  if (newPassword.value.length < 8) {
    localError.value = t('auth.errors.passwordLength')
    return
  }
  if (newPassword.value !== confirmNew.value) {
    localError.value = t('auth.errors.passwordMismatch')
    return
  }
  const ok = await auth.updateProfile({
    password: currentPassword.value,
    newPassword: newPassword.value,
  })
  if (ok) {
    changingPassword.value = false
    currentPassword.value = ''
    newPassword.value = ''
    confirmNew.value = ''
    successMsg.value = t('auth.passwordUpdated')
  }
}

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div v-if="auth.user" class="profile">
    <div class="page-header">
      <h1>{{ t('auth.profile') }}</h1>
      <p class="page-desc">{{ t('auth.profileDesc') }}</p>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'profile' }"
        @click="activeTab = 'profile'"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {{ t('auth.profile') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'ai' }" @click="activeTab = 'ai'">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
        {{ t('ai.title') }}
      </button>
    </div>

    <!-- AI Chat Panel -->
    <AiChatPanel v-if="activeTab === 'ai'" />

    <!-- Profile Content -->
    <div v-if="activeTab === 'profile'" class="profile-grid">
      <!-- User Info Card -->
      <div class="profile-card">
        <div class="card-header">
          <div class="avatar">{{ auth.user.codename.charAt(0).toUpperCase() }}</div>
          <div class="user-meta">
            <h2 class="codename">{{ auth.user.codename }}</h2>
            <Badge variant="info">{{ auth.user.role }}</Badge>
          </div>
        </div>

        <div class="info-list">
          <div class="info-row">
            <span class="info-label">{{ t('auth.clearance') }}</span>
            <span class="info-value clearance">{{ auth.user.clearance }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('auth.role') }}</span>
            <span class="info-value">{{ auth.user.role }}</span>
          </div>
          <div v-if="auth.user.created_at" class="info-row">
            <span class="info-label">{{ t('auth.joinedAt') }}</span>
            <span class="info-value">{{ auth.user.created_at }}</span>
          </div>
        </div>

        <button class="logout-btn" @click="handleLogout">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {{ t('auth.logout') }}
        </button>
      </div>

      <!-- Edit Section -->
      <div class="edit-section">
        <!-- Codename -->
        <div class="edit-card">
          <div class="edit-header">
            <h3>{{ t('auth.editCodename') }}</h3>
            <button v-if="!editingCodename" class="edit-btn" @click="startEditCodename">
              {{ t('auth.edit') }}
            </button>
          </div>
          <div v-if="editingCodename" class="edit-form">
            <input v-model="newCodename" type="text" spellcheck="false" />
            <div class="edit-actions">
              <button class="save-btn" :disabled="auth.loading" @click="saveCodename">
                {{ t('auth.save') }}
              </button>
              <button class="cancel-btn" @click="editingCodename = false">
                {{ t('auth.cancel') }}
              </button>
            </div>
          </div>
          <div v-else class="current-value">
            <span class="mono">{{ auth.user.codename }}</span>
          </div>
        </div>

        <!-- Password -->
        <div class="edit-card">
          <div class="edit-header">
            <h3>{{ t('auth.changePassword') }}</h3>
            <!-- prettier-ignore -->
            <button v-if="!changingPassword" class="edit-btn" @click="changingPassword = true; localError = ''; auth.error = ''; successMsg = ''">
              {{ t('auth.edit') }}
            </button>
          </div>
          <div v-if="changingPassword" class="edit-form">
            <div class="form-group">
              <label>{{ t('auth.currentPassword') }}</label>
              <input v-model="currentPassword" type="password" autocomplete="current-password" />
            </div>
            <div class="form-group">
              <label>{{ t('auth.newPassword') }}</label>
              <input v-model="newPassword" type="password" autocomplete="new-password" />
            </div>
            <div class="form-group">
              <label>{{ t('auth.confirmPassword') }}</label>
              <input v-model="confirmNew" type="password" autocomplete="new-password" />
            </div>
            <div class="edit-actions">
              <button class="save-btn" :disabled="auth.loading" @click="savePassword">
                {{ t('auth.save') }}
              </button>
              <!-- prettier-ignore -->
              <button class="cancel-btn" @click="changingPassword = false; localError = ''">{{ t('auth.cancel') }}</button>
            </div>
          </div>
          <div v-else class="current-value">
            <span class="mono">••••••••</span>
          </div>
        </div>

        <!-- Status messages -->
        <Transition name="fade">
          <div v-if="localError || auth.error" class="error-msg">
            <span>⚠</span> {{ localError || auth.error }}
          </div>
        </Transition>
        <Transition name="fade">
          <div v-if="successMsg" class="success-msg"><span>✓</span> {{ successMsg }}</div>
        </Transition>
      </div>

      <!-- Experimental Features -->
      <div class="edit-card">
        <div class="edit-header">
          <h3>{{ t('experimental.title') }}</h3>
        </div>
        <p class="experimental-desc">{{ t('experimental.desc') }}</p>
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-info">
              <span class="feature-name">{{ t('experimental.terminal') }}</span>
              <span class="feature-detail">{{ t('experimental.terminalDesc') }}</span>
            </div>
            <button class="toggle-btn" :class="{ active: terminalEnabled }" @click="toggleTerminal">
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile {
  max-width: var(--max-content);
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-xl);
}

.page-header h1 {
  margin-bottom: var(--space-sm);
}

.page-desc {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: -1px;
}

.tab:hover {
  color: var(--text-secondary);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  align-items: start;
}

@media (max-width: 768px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

.profile-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-primary-muted);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: 700;
  font-family: var(--font-mono);
}

.user-meta h2 {
  font-size: var(--text-lg);
  margin-bottom: 2px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
}

.info-label {
  color: var(--text-tertiary);
}

.info-value {
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.clearance {
  color: var(--color-primary);
  font-weight: 600;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 10px;
  background: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-danger-muted);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.logout-btn:hover {
  background: var(--color-danger-muted);
}

.edit-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.edit-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.edit-header h3 {
  font-size: var(--text-base);
}

.edit-btn {
  padding: 4px 14px;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.edit-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.edit-form input,
.form-group input {
  padding: 8px var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.edit-form input:focus,
.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.edit-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.save-btn {
  padding: 6px 18px;
  background: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.save-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.save-btn:disabled {
  opacity: 0.6;
}

.cancel-btn {
  padding: 6px 18px;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.cancel-btn:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.current-value {
  padding: var(--space-sm) 0;
}

.mono {
  font-family: var(--font-mono);
  color: var(--text-secondary);
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

.success-msg {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-success-muted);
  border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-success);
}

/* ═══ Experimental Features ═══ */
.experimental-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-md);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.feature-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.feature-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.feature-detail {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  line-height: var(--leading-relaxed);
}

.toggle-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.toggle-track {
  display: block;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  position: relative;
  transition: all var(--transition-fast);
}

.toggle-btn.active .toggle-track {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.toggle-btn.active .toggle-thumb {
  left: 20px;
  background: #fff;
}

@media (max-width: 480px) {
  .profile-card {
    padding: var(--space-md);
  }

  .edit-card {
    padding: var(--space-md);
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .edit-actions {
    flex-direction: column;
  }
}
</style>
