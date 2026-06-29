<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUsersStore } from '@/stores/users'
import { fetchAdminUserHistory, fetchAdminUserBookmarks } from '@/services/users'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const route = useRoute()
const { t } = useI18n()
const store = useUsersStore()
const userId = Number(route.params.id)

const activeTab = ref<'info' | 'history' | 'bookmarks'>('info')
const history = ref<any[]>([])
const bookmarks = ref<any[]>([])
const loadingTab = ref(false)
const showRoleEdit = ref(false)
const showClearanceEdit = ref(false)
const newRole = ref('')
const newClearance = ref(0)

onMounted(() => store.fetchUser(userId))

async function loadTab(tab: 'history' | 'bookmarks') {
  activeTab.value = tab
  loadingTab.value = true
  if (tab === 'history' && !history.value.length) {
    const res = await fetchAdminUserHistory(userId)
    if (res.ok) history.value = res.data.history
  } else if (tab === 'bookmarks' && !bookmarks.value.length) {
    const res = await fetchAdminUserBookmarks(userId)
    if (res.ok) bookmarks.value = res.data.bookmarks
  }
  loadingTab.value = false
}

async function saveRole() {
  if (newRole.value && store.currentUser) {
    await store.changeRole(store.currentUser.id, newRole.value)
    await store.fetchUser(userId)
    showRoleEdit.value = false
  }
}

async function saveClearance() {
  if (store.currentUser) {
    await store.changeClearance(store.currentUser.id, newClearance.value)
    await store.fetchUser(userId)
    showClearanceEdit.value = false
  }
}

function formatDate(d: string) {
  return new Date(d + 'Z').toLocaleString()
}
</script>

<template>
  <div class="user-detail">
    <div class="page-header">
      <nav class="breadcrumb">
        <router-link to="/users">{{ t('userDetail.breadcrumbUsers') }}</router-link>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">{{
          store.currentUser?.codename || t('userDetail.loadingPlaceholder')
        }}</span>
      </nav>
    </div>

    <div v-if="store.loading && !store.currentUser" class="loading-state">
      <div class="skeleton" style="height: 200px" />
    </div>

    <div v-else-if="store.currentUser" class="user-info">
      <div class="admin-card user-card">
        <div class="user-header">
          <div class="user-avatar">{{ store.currentUser.codename[0]?.toUpperCase() }}</div>
          <div class="user-meta">
            <h3>{{ store.currentUser.codename }}</h3>
            <div class="user-badges">
              <StatusBadge :variant="store.currentUser.role" :label="store.currentUser.role" />
              <span class="clearance-badge">{{
                t('common.level', { n: store.currentUser.clearance })
              }}</span>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ t('userDetail.userId') }}</span>
            <span class="detail-value">{{ store.currentUser.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('userDetail.joined') }}</span>
            <span class="detail-value">{{ formatDate(store.currentUser.created_at) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('userDetail.historyEntries') }}</span>
            <span class="detail-value">{{ store.currentUser.historyCount || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('userDetail.bookmarks') }}</span>
            <span class="detail-value">{{ store.currentUser.bookmarkCount || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('userDetail.proposals') }}</span>
            <span class="detail-value">{{ store.currentUser.proposalCount || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('userDetail.votesCast') }}</span>
            <span class="detail-value">{{ store.currentUser.voteCount || 0 }}</span>
          </div>
        </div>

        <!-- Edit Controls -->
        <div v-if="store.currentUser.role !== 'admin'" class="edit-controls">
          <div class="edit-section">
            <span class="edit-label">{{ t('userDetail.roleLabel') }}</span>
            <template v-if="showRoleEdit">
              <select v-model="newRole" class="select">
                <option value="personnel">Personnel</option>
                <option value="banned">Banned</option>
              </select>
              <button class="btn btn-primary btn-sm" @click="saveRole">
                {{ t('common.save') }}
              </button>
              <button class="btn btn-ghost btn-sm" @click="showRoleEdit = false">
                {{ t('common.cancel') }}
              </button>
            </template>
            <template v-else>
              <button
                class="btn btn-ghost btn-sm"
                @click="
                  newRole = store.currentUser!.role
                  showRoleEdit = true
                "
              >
                {{ t('common.edit') }}
              </button>
            </template>
          </div>
          <div class="edit-section">
            <span class="edit-label">{{ t('userDetail.clearanceLabel') }}</span>
            <template v-if="showClearanceEdit">
              <select v-model.number="newClearance" class="select">
                <option v-for="n in 6" :key="n - 1" :value="n - 1">
                  {{ t('common.level', { n: n - 1 }) }}
                </option>
              </select>
              <button class="btn btn-primary btn-sm" @click="saveClearance">
                {{ t('common.save') }}
              </button>
              <button class="btn btn-ghost btn-sm" @click="showClearanceEdit = false">
                {{ t('common.cancel') }}
              </button>
            </template>
            <template v-else>
              <button
                class="btn btn-ghost btn-sm"
                @click="
                  newClearance = store.currentUser!.clearance
                  showClearanceEdit = true
                "
              >
                {{ t('common.edit') }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">
          {{ t('userDetail.tabInfo') }}
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'history' }"
          @click="loadTab('history')"
        >
          {{ t('userDetail.tabHistory') }}
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'bookmarks' }"
          @click="loadTab('bookmarks')"
        >
          {{ t('userDetail.tabBookmarks') }}
        </button>
      </div>

      <div v-if="loadingTab" class="loading-state">
        <div v-for="i in 5" :key="i" class="skeleton" style="height: 40px" />
      </div>

      <div v-else-if="activeTab === 'history'" class="table-wrap">
        <table v-if="history.length" class="data-table">
          <thead>
            <tr>
              <th>{{ t('userDetail.colScp') }}</th>
              <th>{{ t('userDetail.colLanguage') }}</th>
              <th>{{ t('userDetail.colName') }}</th>
              <th>{{ t('userDetail.colClass') }}</th>
              <th>{{ t('userDetail.colVisited') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td class="cell-mono">SCP-{{ String(h.scp_number).padStart(3, '0') }}</td>
              <td>{{ h.language.toUpperCase() }}</td>
              <td>{{ h.name }}</td>
              <td>
                <StatusBadge
                  :variant="h.object_class?.toLowerCase() || 'unknown'"
                  :label="h.object_class"
                />
              </td>
              <td class="cell-mono">{{ formatDate(h.visited_at) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>{{ t('userDetail.noHistory') }}</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'bookmarks'" class="table-wrap">
        <table v-if="bookmarks.length" class="data-table">
          <thead>
            <tr>
              <th>{{ t('userDetail.colScp') }}</th>
              <th>{{ t('userDetail.colLanguage') }}</th>
              <th>{{ t('userDetail.colName') }}</th>
              <th>{{ t('userDetail.colClass') }}</th>
              <th>{{ t('userDetail.colAdded') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in bookmarks" :key="b.id">
              <td class="cell-mono">SCP-{{ String(b.scp_number).padStart(3, '0') }}</td>
              <td>{{ b.language.toUpperCase() }}</td>
              <td>{{ b.name }}</td>
              <td>
                <StatusBadge
                  :variant="b.object_class?.toLowerCase() || 'unknown'"
                  :label="b.object_class"
                />
              </td>
              <td class="cell-mono">{{ formatDate(b.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>{{ t('userDetail.noBookmarks') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-detail {
  max-width: var(--max-content);
  margin: 0 auto;
}
.page-header {
  margin-bottom: var(--space-lg);
}

.user-card {
  margin-bottom: var(--space-lg);
}

.user-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-primary-muted);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  font-weight: 700;
  font-family: var(--font-mono);
}

.user-meta h3 {
  margin-bottom: var(--space-xs);
}

.user-badges {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.clearance-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-primary);
}

.edit-controls {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.edit-section {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.edit-label {
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  width: 80px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.empty-state {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--text-tertiary);
}
</style>
