import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSettings } from '../context/SettingsContext'
import { useEffect, useState } from 'react'
import { Picker } from '@react-native-picker/picker'
import { updateLocation, getMe } from '../lib/api'
import { getSession } from '../lib/session'

type Props = {
  onBack: () => void
  onSessions: () => void
  onLogout: () => void
}

type SectionProps = {
  title: string
  children: React.ReactNode
  sub: string
  card: string
}

type RowProps = {
  label: string
  value?: string
  action?: boolean
  text: string
  sub: string
}

type ToggleRowProps = {
  label: string
  value: boolean
  onChange: (val: boolean) => void
  text: string
}

const LOCATIONS = [
  'USA',
  'United Kingdom',
  'Australia',
  'New Zealand',
  'Canada',
  'Singapore',
  'Germany',
  'France',
  'Switzerland',
  'Netherlands',
  'Spain',
  'Luxembourg',
]

export default function Profile({ onBack, onSessions, onLogout }: Props) {
  const { settings, setDarkMode, setHaptics } = useSettings()
  const isDark = settings.darkMode
  const bg = isDark ? '#000' : '#fff'
  const card = isDark ? '#121212' : '#f5f5f7'
  const text = isDark ? '#fff' : '#000'
  const sub = isDark ? '#aaa' : '#666'

  const [location, setLocationState] = useState('USA')
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getMe()
        if (data?.user?.location) setLocationState(data.user.location)
        if (data?.user?.email) setEmail(data.user.email)
      } catch {}
    }
    loadUser()
  }, [])

  const handleLocationChange = async (value: string) => {
    try {
      setLocationState(value)
      setSaving(true)
      await updateLocation(value)
    } catch {
      Alert.alert('Error', 'Failed to update location')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = () => {
    Alert.alert('Coming Soon', 'Password change will be available soon')
  }

  const handleDeleteAccount = async () => {
    const token = await getSession()

    if (!token) {
      Alert.alert('Error', 'User session not found')
      return
    }

    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const url = `https://polyarticle.com/delete-account?token=${token}`
              await Linking.openURL(url)
            } catch {
              Alert.alert('Error', 'Failed to open delete page')
            }
          },
        },
      ]
    )
  }

  // ✅ NEW: Contact handler
  const handleContactUs = async () => {
    try {
      await Linking.openURL('https://polyarticle.com/contact.html')
    } catch {
      Alert.alert('Error', 'Failed to open contact page')
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Account" sub={sub} card={card}>
          <Row label="Email" value={email} text={text} sub={sub} />
          <Row label="Phone number" value="Coming soon" text={text} sub={sub} />
          <Row label="Saved articles" value="Coming soon" text={text} sub={sub} />

          <TouchableOpacity onPress={handleChangePassword}>
            <Row label="Change password" action text={text} sub={sub} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onSessions}>
            <Row label="Active sessions" action text={text} sub={sub} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteAccount}>
            <Row label="Delete Account" action text="#ff3b30" sub={sub} />
          </TouchableOpacity>

          {/* ✅ NEW: Contact Us button */}
          <TouchableOpacity onPress={handleContactUs}>
            <Row label="Contact Us" action text={text} sub={sub} />
          </TouchableOpacity>

        </Section>

        <Section title="Preferences" sub={sub} card={card}>
          <ToggleRow
            label="Dark mode"
            value={settings.darkMode}
            onChange={setDarkMode}
            text={text}
          />
          <ToggleRow
            label="Haptics"
            value={settings.haptics}
            onChange={setHaptics}
            text={text}
          />
        </Section>

        <Section title="Location" sub={sub} card={card}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
            {saving && (
              <ActivityIndicator size="small" color={text} style={{ marginBottom: 8 }} />
            )}
            <Picker
              selectedValue={location}
              onValueChange={handleLocationChange}
              dropdownIconColor={text}
              style={{ color: text }}
            >
              {LOCATIONS.map((loc) => (
                <Picker.Item key={loc} label={loc} value={loc} />
              ))}
            </Picker>
          </View>
        </Section>

        <View style={styles.logoutWrap}>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children, sub, card }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: sub }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.sectionBox, { backgroundColor: card }]}>
        {children}
      </View>
    </View>
  )
}

function Row({ label, value, action, text, sub }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={{ color: text, fontSize: 15 }}>{label}</Text>
      {value && <Text style={{ color: sub, fontSize: 14 }}>{value}</Text>}
      {action && <Text style={{ color: sub, fontSize: 18 }}>›</Text>}
    </View>
  )
}

function ToggleRow({ label, value, onChange, text }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <Text style={{ color: text, fontSize: 15 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  back: { fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 18, paddingBottom: 60 },
  section: { marginTop: 30 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 1,
  },
  sectionBox: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  logoutWrap: { marginTop: 50, alignItems: 'center' },
  logoutBtn: {
    backgroundColor: '#111',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  logout: { fontSize: 15, color: '#fff', fontWeight: '600' },
})