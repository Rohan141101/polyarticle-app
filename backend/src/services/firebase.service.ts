import admin from 'firebase-admin'

let initialized = false

function ensureInitialized(): void {
  if (initialized) return

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set')
  }

  let serviceAccount: admin.ServiceAccount
  try {
    serviceAccount = JSON.parse(raw) as admin.ServiceAccount
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON')
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  initialized = true
}

export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<string> {
  ensureInitialized()

  const message: admin.messaging.Message = {
    token: deviceToken,
    notification: { title, body },
    ...(data && { data }),
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
    android: { priority: 'normal' },
  }

  return admin.messaging().send(message)
}
