// REPLACE with your deployed Worker URL after wrangler deploy
export const API_BASE = 'https://proseai-api.YOUR_SUBDOMAIN.workers.dev'

function getToken() {
  return localStorage.getItem('prose_token')
}

function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function isLoggedIn() {
  return !!getToken()
}

export function logout() {
  localStorage.removeItem('prose_token')
  localStorage.removeItem('prose_email')
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/me`, { headers: authHeaders() })
  if (res.status === 401) { logout(); return null }
  return res.json()
}

export async function fetchFeedback({ userText, skill, tip }) {
  const res = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userText, skill, tip }),
  })
  const data = await res.json()
  if (res.status === 402) throw new Error('no_credits')
  if (res.status === 401) { logout(); throw new Error('unauthorized') }
  if (!res.ok) throw new Error(data.error ?? 'api_error')
  return data  // { feedback, creditsRemaining }
}

export async function startCheckout(tier) {
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ tier }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'checkout_error')
  window.location.href = data.checkoutUrl
}

export async function activate(sessionId) {
  const res = await fetch(`${API_BASE}/api/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'activate_error')
  localStorage.setItem('prose_token', data.token)
  localStorage.setItem('prose_email', data.email)
  return data
}
