import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Settings = {
  darkMode: boolean
  haptics: boolean
}

type SettingsContextType = {
  settings: Settings
  setDarkMode: (v: boolean) => void
  setHaptics: (v: boolean) => void
  loaded: boolean
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  haptics: true,
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem('settings')
        if (stored) {
          const parsed = JSON.parse(stored)
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        }
      } catch {
        // corrupted storage — fall back to defaults
      } finally {
        setLoaded(true)
      }
    })()
  }, [])

  const persist = async (next: Settings) => {
    setSettings(next)
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(next))
    } catch {}
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loaded,
        // Use functional update to avoid stale closure
        setDarkMode: (v: boolean) =>
          setSettings(prev => {
            const next = { ...prev, darkMode: v }
            AsyncStorage.setItem('settings', JSON.stringify(next)).catch(() => {})
            return next
          }),
        setHaptics: (v: boolean) =>
          setSettings(prev => {
            const next = { ...prev, haptics: v }
            AsyncStorage.setItem('settings', JSON.stringify(next)).catch(() => {})
            return next
          }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}