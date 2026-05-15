'use client'

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: { id: string; name: string; email: string; avatar?: string; role: string } | null
  setUser: (user: User | null) => void
  setProfile: (profile: AuthState['profile']) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  clear: () => set({ user: null, profile: null }),
}))
