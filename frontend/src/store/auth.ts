'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, TOKEN_KEY } from '@/lib/api'

export interface NerumUser {
  id: number
  name: string
  email: string
  plan: string
  tokens_used: number
  token_limit: number
  two_fa_enabled: boolean
  is_verified: boolean
  avatar_url?: string | null
}

interface AuthResponse {
  access_token?: string
  user?: NerumUser
  requires_2fa?: boolean
  email?: string
  message?: string
}

interface AuthState {
  token: string | null
  user: NerumUser | null
  setSession: (token: string, user?: NerumUser) => void
  login: (email: string, password: string) => Promise<AuthResponse>
  verify2fa: (email: string, otp: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  verifyEmail: (email: string, otp: string) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      setSession: (token, user) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, token)
        set({ token, ...(user ? { user } : {}) })
      },

      login: async (email, password) => {
        const data = await api.post<AuthResponse>('/auth/login', { email, password })
        if (data.access_token) {
          if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, data.access_token)
          set({ token: data.access_token, user: data.user ?? null })
        }
        return data
      },

      verify2fa: async (email, otp) => {
        const data = await api.post<AuthResponse>('/auth/verify-2fa', { email, otp })
        if (data.access_token) {
          if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, data.access_token)
          set({ token: data.access_token, user: data.user ?? null })
        }
      },

      register: async (name, email, password) => {
        await api.post('/auth/register', { name, email, password })
      },

      verifyEmail: async (email, otp) => {
        const data = await api.post<AuthResponse>('/auth/verify-email', { email, otp })
        if (data.access_token) {
          if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, data.access_token)
          set({ token: data.access_token, user: data.user ?? null })
        }
      },

      fetchMe: async () => {
        const user = await api.get<NerumUser>('/auth/me')
        set({ user })
      },

      logout: () => {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY)
        set({ token: null, user: null })
      },
    }),
    { name: 'nerum-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
