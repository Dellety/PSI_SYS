import { create } from 'zustand'
import * as authApi from '@/api/auth'
import type { Employee } from '@/api/types'

interface AuthState {
  token: string | null
  user: Employee | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    const { access_token, refresh_token } = res.data
    localStorage.setItem('token', access_token)
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token)
    }
    set({ token: access_token, isAuthenticated: true })
    const userRes = await authApi.getMe()
    set({ user: userRes.data })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    set({ token: null, user: null, isAuthenticated: false })
  },

  loadUser: async () => {
    try {
      const res = await authApi.getMe()
      set({ user: res.data, isAuthenticated: true })
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAuthenticated: false })
    }
  },
}))
