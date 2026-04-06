import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import * as Device from 'expo-device'
import { Picker } from '@react-native-picker/picker'
import { signup } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'

type Props = {
  onLogin: () => void
  onSignupSuccess: () => void
}

type SignupResponse = {
  sessionToken: string
}

const LOCATIONS = [
  'USA', 'United Kingdom', 'Australia', 'New Zealand',
  'Canada', 'Singapore', 'Germany', 'France',
  'Switzerland', 'Netherlands', 'Spain', 'Luxembourg',
]

const CATEGORIES = [
  'World 🌍', 'Sports ⚽', 'Technology 💻', 'Business 💼',
  'Crypto 🪙', 'Politics 🏛️', 'Entertainment 🎬', 'Health 🧠',
]

export default function Signup({ onLogin, onSignupSuccess }: Props) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [location, setLocation] = useState('USA')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { loginSuccess } = useAuth()

  const toggleInterest = (item: string) => {
    setSelectedInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  const handleNextStep1 = () => {
    setError(null)
    if (!email || !password || !confirmPassword) {
      setError('Please fill all required fields')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setStep(2)
  }

  const handleSignup = async () => {
    setError(null)

    // ✅ Added interest validation
    if (selectedInterests.length === 0) {
      setError("Select at least one interest")
      return
    }

    try {
      setLoading(true)

      // ✅ Added logging
      console.log("🚀 SIGNUP CLICKED", {
        email,
        location,
        interests: selectedInterests,
      })

      const data = await signup({
        email: email.trim().toLowerCase(),
        password,
        location,
        interests: selectedInterests.map(i => i.split(' ')[0]),
        deviceName: Device.modelName ?? 'Unknown device',
        deviceOS: Device.osName ?? 'Unknown OS',
      }) as SignupResponse

      // ✅ Added response logging
      console.log("✅ SIGNUP RESPONSE:", data)

      await loginSuccess(data.sessionToken)
      onSignupSuccess()
    } catch (err: unknown) {
      // ✅ Improved error logging
      console.error("❌ SIGNUP ERROR:", err)
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.step}>Step {step} of 3</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {step === 1 && (
            <>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>Join PolyArticle</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#bbb"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="At least 8 characters"
                  placeholderTextColor="#bbb"
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#777" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Repeat Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="Repeat your password"
                  placeholderTextColor="#bbb"
                  style={styles.passwordInput}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#777" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.button} onPress={handleNextStep1}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>Pick topics you care about</Text>
              <Text style={styles.subtitle}>Select at least one to personalise your feed</Text>
              <View style={styles.interestsWrap}>
                {CATEGORIES.map(item => {
                  const active = selectedInterests.includes(item)
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => toggleInterest(item)}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.title}>Select your region</Text>
              <Text style={styles.subtitle}>We'll personalise your regional news</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={location}
                  onValueChange={val => setLocation(val)}
                >
                  {LOCATIONS.map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.6 }]}
                onPress={handleSignup}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Creating account…' : 'Finish'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={onLogin}>
              <Text style={styles.link}> Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  step: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#888',
    fontSize: 13,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#777',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
    marginTop: 8,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    fontSize: 15,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
  },
  pillActive: { backgroundColor: '#000' },
  pillText: { fontSize: 13, color: '#333' },
  pillTextActive: { color: '#fff' },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#000',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  backText: {
    color: '#555',
    fontSize: 14,
  },
  link: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#444',
  },
  errorBox: {
    backgroundColor: '#fff0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  errorText: {
    color: '#cc0000',
    fontSize: 13,
  },
})