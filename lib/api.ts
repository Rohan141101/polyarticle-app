import { getSession } from './session'

export const API_URL = "https://render.com"

type AuthPayload = {
  email: string
  password: string
  location?: string
  interests?: string[]
  deviceName?: string
  deviceOS?: string
}

export type Article = {
  id: string
  title: string
  summary: string
  image?: string
  url: string
  source: string
  publishedAt?: string
  category?: string
  country?: string
}

type ApiResponse<T = unknown> = {
  data?: T
  error?: string
  user?: User
}

type User = {
  id: string
  email: string
  phone?: string
  location?: string
  is_email_verified: boolean
  is_active: boolean
}

function fetchWithTimeout(url: string, options: RequestInit, ms = 60000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)

  return fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      ...(options.headers || {}),
      Connection: 'keep-alive',
    },
  }).finally(() => clearTimeout(timer))
}

async function handleJson<T>(res: Response): Promise<T> {
  const text = await res.text()

  if (!text) throw new Error('Empty response from server')

  let data: ApiResponse<T>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON from server')
  }

  if (res.status === 401) throw new Error('UNAUTHORIZED')

  if (!res.ok) {
    throw new Error(data?.error || text || 'Request failed')
  }

  return data as T
}

export async function signup(payload: AuthPayload) {
  const res = await fetchWithTimeout(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      location: payload.location,
      interests: payload.interests,
      deviceName: payload.deviceName,
      deviceOS: payload.deviceOS,
    }),
  }, 30000)

  return handleJson(res)
}

export async function login(payload: AuthPayload) {
  const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  }, 30000)

  return handleJson(res)
}

export async function getMe(token?: string): Promise<{ user: User }> {
  const authToken = token || (await getSession())

  if (!authToken) throw new Error('NO_TOKEN')

  const res = await fetchWithTimeout(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  })

  return handleJson(res)
}

export async function updateLocation(location: string) {
  const token = await getSession()

  if (!token) throw new Error('NO_TOKEN')

  const res = await fetchWithTimeout(`${API_URL}/profile/location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ location }),
  })

  return handleJson(res)
}

export async function getActiveSessions(token?: string) {
  const authToken = token || (await getSession())

  if (!authToken) throw new Error('NO_TOKEN')

  const res = await fetchWithTimeout(`${API_URL}/auth/sessions`, {
    headers: { Authorization: `Bearer ${authToken}` },
  })

  return handleJson(res)
}

export async function logout(sessionToken?: string) {
  const token = sessionToken || (await getSession())

  if (!token) throw new Error('NO_TOKEN')

  const res = await fetchWithTimeout(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  return handleJson(res)
}

export async function revokeOtherSessions(token?: string) {
  const authToken = token || (await getSession())

  if (!authToken) throw new Error('NO_TOKEN')

  const res = await fetchWithTimeout(`${API_URL}/auth/revoke-others`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  })

  return handleJson(res)
}

export async function fetchNews(
  category?: string,
  page: number = 1,
  limit: number = 10,
  fresh: boolean = false
): Promise<Article[]> {
  const token = await getSession()

  if (!token) throw new Error('NO_TOKEN')

  const selectedCategory = category || 'For You'

  const url = `${API_URL}/news?category=${encodeURIComponent(selectedCategory)}&page=${page}&limit=${limit}&fresh=${fresh}`

  const res = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const response = await handleJson<{ data: any[] }>(res)
  const articlesArray = response?.data || []

  return articlesArray.map((a: any) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    image: a.image_url
      ? String(a.image_url).replace(/&amp;/g, '&')
      : undefined,
    url: a.url,
    source: a.source || '',
    publishedAt: a.published_at || undefined,
    category: a.category || undefined,
  }))
}

export async function fetchRegionalNews(limit: number = 10): Promise<Article[]> {
  const token = await getSession()

  if (!token) throw new Error('NO_TOKEN')

  const res = await fetchWithTimeout(`${API_URL}/news/regional?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const response = await handleJson<{ data: any[] }>(res)
  const articlesArray = response?.data || []

  return articlesArray.map((a: any) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    image: a.image_url
      ? String(a.image_url).replace(/&amp;/g, '&')
      : undefined,
    url: a.url,
    source: a.source || '',
    publishedAt: a.published_at || undefined,
    category: a.category || undefined,
    country: a.country || undefined,
  }))
}

export async function revokeSessionById(sessionId: string): Promise<any> {
  const token = await getSession()

  if (!token) throw new Error('NO_TOKEN')

  const res = await fetchWithTimeout(`${API_URL}/auth/revoke-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  })

  return handleJson(res)
}
