export type ApiUser = { id: string; name: string; email: string; role: 'buyer' | 'seller'; approvalStatus?: 'pending' | 'approved'; profileImage?: string; phone?: string; address?: string; details?: string; shopName?: string; shopDescription?: string; shopLocation?: string; shopImage?: string; paymentEmail?: string; payoutReady?: boolean; payoutBank?: string; payoutAccountLast4?: string }

const API_BASE = import.meta.env.VITE_API_URL || ''
const isGithubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  if (!API_BASE && isGithubPages) {
    throw new Error('Live API is not configured. Set the VITE_API_URL GitHub Actions secret to your deployed backend URL.')
  }
  let userId: string | undefined
  try {
    userId = JSON.parse(localStorage.getItem('marketday-user') || 'null')?.id
  } catch {
    localStorage.removeItem('marketday-user')
  }
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...options.headers,
    },
  })

  const text = await response.text()
  let result: { error?: string } | T | null = null
  if (text) {
    try {
      result = JSON.parse(text) as T
    } catch {
      if (!response.ok) {
        throw new Error(`API request failed (${response.status}). The server returned an invalid response.`)
      }
      throw new Error('The server returned an invalid response. Please try again.')
    }
  }

  if (!response.ok) {
    throw new Error((result as { error?: string } | null)?.error || `Request failed (${response.status})`)
  }

  return result as T
}

const adminRequest = async <T>(path: string, adminKey: string, options: RequestInit = {}): Promise<T> => request<T>(path, { ...options, headers: { 'X-Admin-Key': adminKey, ...options.headers } })

export const api = {
  products: () => request<unknown[]>('/products'),
  signup: (input: unknown) => request<{ user: ApiUser }>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  signin: (input: unknown) => request<{ user: ApiUser }>('/auth/signin', { method: 'POST', body: JSON.stringify(input) }),
  session: (userId: string) => request<{ user: ApiUser }>('/auth/session', { headers: { 'X-User-Id': userId } }),
  savePayoutProfile: (input: unknown) => request<{ user: ApiUser }>('/seller/payout-profile', { method: 'POST', body: JSON.stringify(input) }),
  saveSellerProfile: (input: unknown) => request<{ user: ApiUser }>('/seller/profile', { method: 'POST', body: JSON.stringify(input) }),
  sellerProfile: (id: string) => request<{ seller: ApiUser; products: unknown[] }>(`/sellers/${encodeURIComponent(id)}`),
  saveAccountSettings: (input: unknown) => request<{ user: ApiUser }>('/account/settings', { method: 'POST', body: JSON.stringify(input) }),
  changePassword: (input: unknown) => request<{ ok: boolean }>('/account/password', { method: 'POST', body: JSON.stringify(input) }),
  orders: (userId: string, role: 'buyer' | 'seller' = 'buyer') => request<unknown[]>(`/orders?${role === 'seller' ? 'sellerId' : 'buyerId'}=${encodeURIComponent(userId)}`),
  initializePayment: (items: unknown[]) => request<{ authorization_url: string; reference: string }>('/payments/initialize', { method: 'POST', body: JSON.stringify({ items }) }),
  verifyPayment: (reference: string) => request<{ order: unknown; products: unknown[] }>(`/payments/verify?reference=${encodeURIComponent(reference)}`),
  createOrder: (items: unknown[]) => request<{ order: unknown; products: unknown[] }>('/orders', { method: 'POST', body: JSON.stringify({ items }) }),
  createProduct: (input: unknown) => request<{ product: unknown; reviewRequired?: boolean }>('/products', { method: 'POST', body: JSON.stringify(input) }),
  removeProduct: (id: string) => request<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' }),
  submitRating: (input: unknown) => request<{ rating: unknown }>('/ratings', { method: 'POST', body: JSON.stringify(input) }),
  contactSeller: (input: unknown) => request<{ contact: unknown }>('/contacts', { method: 'POST', body: JSON.stringify(input) }),
  sellerContacts: (sellerId: string) => request<unknown[]>(`/contacts?sellerId=${encodeURIComponent(sellerId)}`),
  adminOverview: (adminKey: string) => adminRequest<{ users: unknown[]; products: unknown[]; orders: unknown[] }>('/admin/overview', adminKey),
  adminApproveSeller: (adminKey: string, sellerId: string) => adminRequest<{ user: unknown }>(`/admin/sellers/${encodeURIComponent(sellerId)}/approve`, adminKey, { method: 'POST' }),
  adminSetAccountStatus: (adminKey: string, userId: string, status: 'active' | 'blocked') => adminRequest<{ user: unknown }>(`/admin/accounts/${encodeURIComponent(userId)}/status`, adminKey, { method: 'POST', body: JSON.stringify({ status }) }),
  adminUpdateProduct: (adminKey: string, productId: string, input: unknown) => adminRequest<{ product: unknown }>(`/admin/products/${encodeURIComponent(productId)}`, adminKey, { method: 'POST', body: JSON.stringify(input) }),
}
