import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Feed from './screens/Feed'
import Login from './screens/Login'
import Signup from './screens/Signup'
import ForgotPassword from './screens/ForgotPassword'
import Profile from './screens/Profile'
import ActiveSessions from './screens/ActiveSessions'
import ArticleScreen from './screens/ArticleScreen'
import { useState, useEffect } from 'react'
import { AppState } from 'react-native'
import { eventLogger } from './utils/eventLogger'

type Screen =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'profile'
  | 'sessions'
  | 'article'

function Root() {
  const { session, loading, logout } = useAuth()

  const [screen, setScreen] = useState<Screen>('login')
  const [selectedArticle, setSelectedArticle] = useState<any>(null)

  if (loading) return null

  if (!session) {
    if (screen === 'signup')
      return (
        <Signup
          onLogin={() => setScreen('login')}
          onSignupSuccess={() => {}}
        />
      )

    if (screen === 'forgot')
      return <ForgotPassword onBack={() => setScreen('login')} />

    return (
      <Login
        onSignup={() => setScreen('signup')}
        onForgot={() => setScreen('forgot')}
        onLoginSuccess={() => {}}
      />
    )
  }

  if (screen === 'profile') {
    return (
      <Profile
        onBack={() => setScreen('login')}
        onSessions={() => setScreen('sessions')}
        onLogout={async () => {
          await logout()
          setScreen('login')
        }}
      />
    )
  }

  if (screen === 'sessions') {
    return (
      <ActiveSessions
        onBack={() => setScreen('profile')}
      />
    )
  }

  if (screen === 'article' && selectedArticle) {
    return (
      <ArticleScreen
        article={selectedArticle}
        onBack={() => setScreen('profile')}
      />
    )
  }
  
  return (
    <Feed
      onProfilePress={() => setScreen('profile')}
      onOpenArticle={(article) => {
        setSelectedArticle(article)
        setScreen('article')
      }}
    />
  )
}

export default function App() {

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        await eventLogger.forceFlush()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return (
    <SettingsProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SettingsProvider>
  )
}