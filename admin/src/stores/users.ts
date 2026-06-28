import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchAdminUsers,
  fetchAdminUser,
  updateUserRole,
  updateUserClearance,
  banUser,
  unbanUser,
  deleteUser,
  type AdminUser,
} from '@/services/users'

export const useUsersStore = defineStore('users', () => {
  const users = ref<AdminUser[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref('')
  const searchQuery = ref('')
  const roleFilter = ref('')
  const currentUser = ref<AdminUser | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = ''
    const res = await fetchAdminUsers({
      page: page.value,
      limit: limit.value,
      q: searchQuery.value || undefined,
      role: roleFilter.value || undefined,
    })
    loading.value = false
    if (res.ok) {
      users.value = res.data.users
      total.value = res.data.total
      totalPages.value = res.data.totalPages
    } else {
      error.value = res.error
    }
  }

  async function fetchUser(id: number) {
    loading.value = true
    error.value = ''
    const res = await fetchAdminUser(id)
    loading.value = false
    if (res.ok) {
      currentUser.value = res.data.user
    } else {
      error.value = res.error
    }
  }

  async function changeRole(id: number, role: string) {
    const res = await updateUserRole(id, role)
    if (res.ok) await fetchUsers()
    return res
  }

  async function changeClearance(id: number, clearance: number) {
    const res = await updateUserClearance(id, clearance)
    if (res.ok) await fetchUsers()
    return res
  }

  async function ban(id: number) {
    const res = await banUser(id)
    if (res.ok) await fetchUsers()
    return res
  }

  async function unban(id: number) {
    const res = await unbanUser(id)
    if (res.ok) await fetchUsers()
    return res
  }

  async function remove(id: number) {
    const res = await deleteUser(id)
    if (res.ok) await fetchUsers()
    return res
  }

  function setPage(p: number) {
    page.value = p
    fetchUsers()
  }

  function setSearch(q: string) {
    searchQuery.value = q
    page.value = 1
    fetchUsers()
  }

  function setRoleFilter(r: string) {
    roleFilter.value = r
    page.value = 1
    fetchUsers()
  }

  return {
    users, total, page, limit, totalPages, loading, error,
    searchQuery, roleFilter, currentUser,
    fetchUsers, fetchUser, changeRole, changeClearance,
    ban, unban, remove, setPage, setSearch, setRoleFilter,
  }
})
