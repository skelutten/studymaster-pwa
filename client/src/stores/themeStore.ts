import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  systemTheme: 'light' | 'dark'
  
  // Actions
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      systemTheme: 'light',

      setTheme: (theme: Theme) => {
        set({ theme })
        
        // Apply theme immediately
        const { systemTheme } = get()
        const effectiveTheme = theme === 'system' ? systemTheme : theme
        
        if (effectiveTheme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      toggleTheme: () => {
        const { theme } = get()
        const newTheme = theme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },

      initializeTheme: () => {
        // Detect system theme preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? 'dark' 
          : 'light'
        
        set({ systemTheme })
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', (e) => {
            const newSystemTheme = e.matches ? 'dark' : 'light'
            set({ systemTheme: newSystemTheme })
            
            // If using system theme, update the applied theme
            const { theme } = get()
            if (theme === 'system') {
              if (newSystemTheme === 'dark') {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            }
          })
        
        // Apply initial theme
        const { theme } = get()
        const effectiveTheme = theme === 'system' ? systemTheme : theme
        
        if (effectiveTheme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme })
    }
  )
)