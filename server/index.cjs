const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const port = Number(process.env.PORT || 8787)
const dataDir = path.join(__dirname, '..', 'data')
const dataFile = path.join(dataDir, 'db.json')
const seedProducts = [
  { id: 'eggs', name: 'Fresh brown eggs', sellerId: 'seed-1', seller: 'Mama Efe Foods', price: 3500, category: 'Foodstuff', location: 'Bodija, Ibadan', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=700&q=80', stock: 18, tag: 'Fresh today' },
  { id: 'tote', name: 'Handwoven raffia tote', sellerId: 'seed-2', seller: 'Adunni Crafts', price: 12000, category: 'Fashion', location: 'Challenge, Ibadan', image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=700&q=80', stock: 7, tag: 'Popular' },
  { id: 'speaker', name: 'Bluetooth speaker', sellerId: 'seed-3', seller: 'Tech Corner', price: 18500, category: 'Electronics', location: 'Mokola, Ibadan', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80', stock: 5 },
  { id: 'shea', name: 'Shea butter glow set', sellerId: 'seed-4', seller: 'Kemi Naturals', price: 9800, category: 'Beauty', location: 'Ring Road, Ibadan', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80', stock: 12, tag: 'Made locally' },
]

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ users: [], products: seedProducts, orders: [] }, null, 2))
const readDb = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'))
const writeDb = (db) => fs.writeFileSync(dataFile, JSON.stringify(db, null, 2))
const initialDb = readDb()
if (!initialDb.products || initialDb.products.length === 0) { initialDb.products = seedProducts; writeDb(initialDb) }
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, approvalStatus: user.approvalStatus || 'approved', profileImage: user.profileImage, phone: user.phone, address: user.address, details: user.details, shopName: user.shopName, shopDescription: user.shopDescription, shopLocation: user.shopLocation, shopImage: user.shopImage, paymentEmail: user.paymentEmail, payoutReady: Boolean(user.subaccountCode), payoutBank: user.payoutBank, payoutAccountLast4: user.payoutAccountLast4 })
const sellerIsApproved = (seller) => seller && seller.role === 'seller' && seller.approvalStatus !== 'pending'
const productNeedsReview = (product) => /\b(nude|nudity|naked|porn|sexual|sexually explicit|xxx|onlyfans|escort)\b/i.test([product.name, product.category, product.description, product.tag].filter(Boolean).join(' '))
const ratingsFor = (db, targetType, targetId) => (db.ratings || []).filter((rating) => rating.targetType === targetType && rating.targetId === targetId)
const ratingStats = (db, targetType, targetId) => { const ratings = ratingsFor(db, targetType, targetId); return { rating: ratings.length ? Number((ratings.reduce((sum, item) => sum + item.score, 0) / ratings.length).toFixed(1)) : 0, reviewCount: ratings.length } }
const productSales = (db, productId) => db.orders.filter((order) => order.status === 'Paid' && order.items.some((item) => item.productId === productId)).reduce((sum, order) => sum + (order.items.find((item) => item.productId === productId)?.quantity || 0), 0)
const enrichProduct = (db, product) => { const productStats = ratingStats(db, 'product', product.id); const sellerStats = ratingStats(db, 'seller', product.sellerId); const salesCount = productSales(db, product.id); return { ...product, rating: productStats.rating, reviewCount: productStats.reviewCount, salesCount, sellerRating: sellerStats.rating, sellerReviewCount: sellerStats.reviewCount, performanceScore: salesCount * 4 + productStats.rating * productStats.reviewCount + sellerStats.rating * sellerStats.reviewCount } }
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', ...(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)]
const resolveOrigin = (origin) => (origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0])
const corsHeaders = (origin) => ({ 'Access-Control-Allow-Origin': resolveOrigin(origin), 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' })
const json = (response, status, body) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': resolveOrigin(response.requestOrigin), 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id' }); response.end(JSON.stringify(body)) }
const body = (request) => new Promise((resolve, reject) => { let data = ''; request.on('data', (chunk) => { data += chunk }); request.on('end', () => { try { resolve(data ? JSON.parse(data) : {}) } catch { reject(new Error('Invalid JSON')) } }) })
const rawBody = (request) => new Promise((resolve) => { const chunks = []; request.on('data', (chunk) => chunks.push(chunk)); request.on('end', () => resolve(Buffer.concat(chunks))) })
const hash = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, digest: crypto.scryptSync(password, salt, 64).toString('hex') })
const validPassword = (password, user) => crypto.timingSafeEqual(Buffer.from(hash(password, user.salt).digest), Buffer.from(user.passwordHash))
const validEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validPasswordPolicy = (password) => typeof password === 'string' && password.length >= 8 && password.length <= 72 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z\d]/.test(password)
const authAttempts = new Map()
const allowAuthAttempt = (key) => { const now = Date.now(); const recent = (authAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000); if (recent.length >= 10) return false; recent.push(now); authAttempts.set(key, recent); return true }
const userFromRequest = (request, db) => db.users.find((user) => user.id === request.headers['x-user-id'])
const paystackRequest = async (path, options = {}) => {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is not configured.')
  const result = await fetch(`https://api.paystack.co${path}`, { ...options, headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const data = await result.json()
  if (!result.ok || !data.status) throw new Error(data.message || 'Paystack request failed.')
  return data.data
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, corsHeaders(request.headers.origin)); response.end(); return }
  response.requestOrigin = request.headers.origin
  const url = new URL(request.url, `http://${request.headers.host}`)
  const db = readDb()
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true })
    if (request.method === 'POST' && url.pathname === '/api/payments/webhook') {
      const payload = await rawBody(request); const signature = request.headers['x-paystack-signature']; const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '').update(payload).digest('hex')
      if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return json(response, 401, { error: 'Invalid webhook signature.' })
      const event = JSON.parse(payload.toString()); const reference = event.data?.reference; const payment = (db.payments || []).find((item) => item.reference === reference)
      if (event.event === 'charge.success' && payment && payment.status !== 'paid' && event.data.amount === payment.total * 100) {
        for (const item of payment.items) { const product = db.products.find((entry) => entry.id === item.productId); if (!product || product.stock < item.quantity) return json(response, 409, { error: 'Stock changed before payment confirmation.' }); product.stock -= item.quantity }
        const order = { id: `MD-${Date.now().toString().slice(-6)}`, buyerId: payment.buyerId, items: payment.items, total: payment.total, date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }), status: 'Paid', paymentReference: reference }
        payment.status = 'paid'; db.orders.unshift(order); writeDb(db)
      }
      return json(response, 200, { received: true })
    }
    if (request.method === 'GET' && url.pathname === '/api/products') return json(response, 200, db.products.filter((product) => { const owner = db.users.find((user) => user.id === product.sellerId); return product.approvalStatus !== 'pending_review' && (!owner || sellerIsApproved(owner)) }).map((product) => enrichProduct(db, product)))
    const sellerMatch = url.pathname.match(/^\/api\/sellers\/([^/]+)$/)
    if (request.method === 'GET' && sellerMatch) {
      const viewer = userFromRequest(request, db)
      if (!viewer || viewer.role !== 'buyer') return json(response, 403, { error: 'Only buyer accounts can view seller pages.' })
      const seller = db.users.find((user) => user.id === sellerMatch[1] && user.role === 'seller')
      if (!seller || !sellerIsApproved(seller)) return json(response, 404, { error: 'Seller not found.' })
      return json(response, 200, { seller: publicUser(seller), ...ratingStats(db, 'seller', seller.id), products: db.products.filter((product) => product.sellerId === seller.id).map((product) => enrichProduct(db, product)) })
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/signup') {
      const input = await body(request)
      const email = input.email?.trim().toLowerCase()
      if (!input.name?.trim() || !validEmail(email) || !validPasswordPolicy(input.password) || input.password !== input.confirmPassword || input.acceptedTerms !== true || !['buyer', 'seller'].includes(input.role)) return json(response, 400, { error: 'Use a valid email, strong password, matching confirmation, and accept the terms.' })
      if (input.role === 'seller' && !input.shopName?.trim()) return json(response, 400, { error: 'Seller applications need a shop name.' })
      if (db.users.some((user) => user.email === email)) return json(response, 409, { error: 'An account with this email already exists.' })
      const password = hash(input.password)
      const user = { id: crypto.randomUUID(), name: input.name.trim().slice(0, 80), email, role: input.role, approvalStatus: input.role === 'seller' ? 'pending' : 'approved', shopName: input.shopName?.trim() || input.name.trim(), salt: password.salt, passwordHash: password.digest }
      db.users.push(user); writeDb(db); return json(response, 201, { user: publicUser(user) })
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/signin') {
      const input = await body(request)
      const email = input.email?.toLowerCase().trim() || ''
      if (!allowAuthAttempt(`${request.socket.remoteAddress}:${email}`)) return json(response, 429, { error: 'Too many sign-in attempts. Try again in 15 minutes.' })
      const user = db.users.find((item) => item.email === email)
      if (!user || !['buyer', 'seller'].includes(input.role) || !validPassword(input.password || '', user)) return json(response, 401, { error: 'Email or password is incorrect.' })
      if (user.role !== input.role) return json(response, 403, { error: `This email belongs to a ${user.role} account. Choose ${user.role} sign in.` })
      return json(response, 200, { user: publicUser(user) })
    }
    if (request.method === 'GET' && url.pathname === '/api/auth/session') {
      const account = userFromRequest(request, db)
      if (!account) return json(response, 401, { error: 'Your session has expired.' })
      return json(response, 200, { user: publicUser(account) })
    }
    if (request.method === 'POST' && url.pathname === '/api/seller/payout-profile') {
      const input = await body(request); const seller = userFromRequest(request, db)
      if (!seller || seller.role !== 'seller') return json(response, 403, { error: 'Only seller accounts can add payout details.' })
      if (!input.bankCode || !input.accountNumber || !input.businessName) return json(response, 400, { error: 'Business name, bank code and account number are required.' })
      const subaccount = await paystackRequest('/subaccount', { method: 'POST', body: JSON.stringify({ business_name: input.businessName.trim(), settlement_bank: input.bankCode.trim(), account_number: input.accountNumber.trim(), percentage_charge: Number(process.env.MARKETPLACE_COMMISSION_PERCENT || 5), primary_contact_email: seller.email }) })
      seller.subaccountCode = subaccount.subaccount_code; seller.payoutBank = input.bankCode.trim(); seller.payoutAccountLast4 = input.accountNumber.trim().slice(-4); writeDb(db)
      return json(response, 201, { user: publicUser(seller) })
    }
    if (request.method === 'POST' && url.pathname === '/api/account/settings') {
      const input = await body(request); const account = userFromRequest(request, db)
      if (!account) return json(response, 401, { error: 'You must be signed in to update settings.' })
      const email = input.email?.trim().toLowerCase() || account.email
      if (!input.name?.trim() || input.name.trim().length > 80 || !validEmail(email)) return json(response, 400, { error: 'Name and a valid email are required.' })
      if (db.users.some((user) => user.id !== account.id && user.email === email)) return json(response, 409, { error: 'That email is already in use.' })
      const profileImage = input.profileImage?.trim() || ''
      if (profileImage && !(/^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/.test(profileImage)) || profileImage.length > 1000000) return json(response, 400, { error: 'Profile image must be a valid URL or an image smaller than 1 MB.' })
      account.name = input.name.trim(); account.email = email; account.profileImage = profileImage; account.phone = input.phone?.trim().slice(0, 30) || ''; account.address = input.address?.trim().slice(0, 200) || ''; account.details = input.details?.trim().slice(0, 500) || ''
      if (account.role === 'buyer') {
        if (input.paymentEmail && !validEmail(input.paymentEmail.trim().toLowerCase())) return json(response, 400, { error: 'Enter a valid payment email.' })
        account.paymentEmail = input.paymentEmail?.trim().toLowerCase() || ''; account.phone = input.phone?.trim() || ''; writeDb(db); return json(response, 200, { user: publicUser(account) })
      }
      if (!input.businessName?.trim() || !/^\d{3,6}$/.test(String(input.bankCode).trim()) || !/^\d{10}$/.test(String(input.accountNumber).trim())) return json(response, 400, { error: 'Withdrawal setup needs a business name, valid bank code, and 10-digit account number.' })
      const subaccount = await paystackRequest('/subaccount', { method: 'POST', body: JSON.stringify({ business_name: input.businessName.trim(), settlement_bank: input.bankCode.trim(), account_number: input.accountNumber.trim(), percentage_charge: Number(process.env.MARKETPLACE_COMMISSION_PERCENT || 5), primary_contact_email: account.email }) })
      account.subaccountCode = subaccount.subaccount_code; account.payoutBank = input.bankCode.trim(); account.payoutAccountLast4 = input.accountNumber.trim().slice(-4); writeDb(db); return json(response, 200, { user: publicUser(account) })
    }
    if (request.method === 'POST' && url.pathname === '/api/account/password') {
      const input = await body(request); const account = userFromRequest(request, db)
      if (!account || !validPassword(input.currentPassword || '', account)) return json(response, 401, { error: 'Current password is incorrect.' })
      if (!validPasswordPolicy(input.newPassword) || input.newPassword !== input.confirmPassword) return json(response, 400, { error: 'New password must be strong and match its confirmation.' })
      const password = hash(input.newPassword); account.salt = password.salt; account.passwordHash = password.digest; writeDb(db); return json(response, 200, { ok: true })
    }
    if (request.method === 'POST' && url.pathname === '/api/seller/profile') {
      const input = await body(request); const seller = userFromRequest(request, db)
      if (!seller || seller.role !== 'seller') return json(response, 403, { error: 'Only seller accounts can set up a shop.' })
      if (!input.shopName?.trim() || input.shopName.trim().length > 80) return json(response, 400, { error: 'Shop name is required and must be 80 characters or fewer.' })
      seller.shopName = input.shopName.trim(); seller.shopDescription = input.shopDescription?.trim().slice(0, 300) || ''; seller.shopLocation = input.shopLocation?.trim().slice(0, 100) || 'Ibadan, Nigeria'; seller.shopImage = input.shopImage?.trim() || ''
      db.products.filter((product) => product.sellerId === seller.id).forEach((product) => { product.seller = seller.shopName; product.location = seller.shopLocation })
      writeDb(db); return json(response, 200, { user: publicUser(seller) })
    }
    const approvalMatch = url.pathname.match(/^\/api\/admin\/sellers\/([^/]+)\/approve$/)
    if (request.method === 'POST' && approvalMatch) {
      if (!process.env.ADMIN_APPROVAL_KEY || request.headers['x-admin-key'] !== process.env.ADMIN_APPROVAL_KEY) return json(response, 401, { error: 'Admin approval key is invalid.' })
      const seller = db.users.find((user) => user.id === approvalMatch[1] && user.role === 'seller')
      if (!seller) return json(response, 404, { error: 'Seller application not found.' })
      if (!seller.subaccountCode) return json(response, 409, { error: 'Seller must add withdrawal details before approval.' })
      seller.approvalStatus = 'approved'; writeDb(db); return json(response, 200, { user: publicUser(seller) })
    }
    if (request.method === 'POST' && url.pathname === '/api/payments/initialize') {
      const input = await body(request); const buyer = userFromRequest(request, db)
      if (!buyer || buyer.role !== 'buyer') return json(response, 403, { error: 'Only buyer accounts can pay for orders.' })
      if (!Array.isArray(input.items) || input.items.length === 0) return json(response, 400, { error: 'Your cart is empty.' })
      let total = 0; const sellers = new Set()
      for (const item of input.items) { const product = db.products.find((entry) => entry.id === item.productId); if (!product || product.stock < item.quantity) return json(response, 409, { error: `${product?.name || 'A product'} is out of stock.` }); sellers.add(product.sellerId); total += product.price * item.quantity }
      if (sellers.size !== 1) return json(response, 409, { error: 'For now, checkout must contain products from one seller at a time.' })
      const seller = db.users.find((item) => item.id === [...sellers][0]); if (!sellerIsApproved(seller) || !seller.subaccountCode) return json(response, 409, { error: 'This seller is still under review or has not completed payout setup yet.' })
      const reference = `MD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
      const payment = await paystackRequest('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email: buyer.email, amount: total * 100, reference, subaccount: seller.subaccountCode, callback_url: process.env.PAYSTACK_CALLBACK_URL || 'https://emydigitalpro-glitch.github.io/marketday/' }) })
      db.payments = db.payments || []; db.payments.push({ reference, buyerId: buyer.id, items: input.items, total, status: 'pending', date: new Date().toISOString() }); writeDb(db)
      return json(response, 201, { authorization_url: payment.authorization_url, reference })
    }
    if (request.method === 'GET' && url.pathname === '/api/payments/verify') {
      const reference = url.searchParams.get('reference'); const buyer = userFromRequest(request, db); const payment = (db.payments || []).find((item) => item.reference === reference)
      if (!buyer || !payment || payment.buyerId !== buyer.id) return json(response, 404, { error: 'Payment could not be found.' })
      if (payment.status === 'paid') return json(response, 200, { order: db.orders.find((order) => order.paymentReference === reference), products: db.products })
      const verified = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`)
      if (verified.status !== 'success' || verified.amount !== payment.total * 100) return json(response, 402, { error: 'Payment was not successful.' })
      for (const item of payment.items) { const product = db.products.find((entry) => entry.id === item.productId); if (!product || product.stock < item.quantity) return json(response, 409, { error: `${product?.name || 'A product'} is no longer in stock.` }); product.stock -= item.quantity }
      const order = { id: `MD-${Date.now().toString().slice(-6)}`, buyerId: buyer.id, items: payment.items, total: payment.total, date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }), status: 'Paid', paymentReference: reference }
      payment.status = 'paid'; db.orders.unshift(order); writeDb(db); return json(response, 200, { order, products: db.products })
    }
    if (request.method === 'GET' && url.pathname === '/api/orders') {
      const buyerId = url.searchParams.get('buyerId'); const sellerId = url.searchParams.get('sellerId')
      if (buyerId) return json(response, 200, db.orders.filter((order) => order.buyerId === buyerId).map((order) => ({ ...order, buyerName: db.users.find((user) => user.id === order.buyerId)?.name })))
      if (sellerId) {
        const seller = userFromRequest(request, db)
        if (!seller || seller.role !== 'seller' || seller.id !== sellerId) return json(response, 403, { error: 'Only the seller can view their customer history.' })
        return json(response, 200, db.orders.filter((order) => order.items.some((item) => db.products.find((product) => product.id === item.productId)?.sellerId === sellerId)).map((order) => { const buyer = db.users.find((user) => user.id === order.buyerId); return { ...order, buyerName: buyer?.name, buyerEmail: buyer?.email, buyerPhone: buyer?.phone, buyerAddress: buyer?.address } }))
      }
      return json(response, 200, [])
    }
    if (request.method === 'POST' && url.pathname === '/api/contacts') {
      const input = await body(request); const buyer = userFromRequest(request, db); const seller = db.users.find((user) => user.id === input.sellerId && user.role === 'seller')
      if (!buyer || buyer.role !== 'buyer') return json(response, 403, { error: 'Only buyer accounts can contact sellers.' })
      if (!seller || !sellerIsApproved(seller)) return json(response, 404, { error: 'Seller not found.' })
      db.contacts = db.contacts || []
      const existing = db.contacts.find((contact) => contact.buyerId === buyer.id && contact.sellerId === seller.id)
      if (existing) { existing.date = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }); existing.message = String(input.message || '').trim().slice(0, 300); writeDb(db); return json(response, 200, { contact: existing }) }
      const contact = { id: crypto.randomUUID(), buyerId: buyer.id, sellerId: seller.id, buyerName: buyer.name, buyerEmail: buyer.email, buyerPhone: buyer.phone, buyerAddress: buyer.address, message: String(input.message || '').trim().slice(0, 300), date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) }
      db.contacts.unshift(contact); writeDb(db); return json(response, 201, { contact })
    }
    if (request.method === 'GET' && url.pathname === '/api/contacts') {
      const sellerId = url.searchParams.get('sellerId'); const seller = userFromRequest(request, db)
      if (!seller || seller.role !== 'seller' || seller.id !== sellerId) return json(response, 403, { error: 'Only the seller can view buyer enquiries.' })
      return json(response, 200, (db.contacts || []).filter((contact) => contact.sellerId === sellerId))
    }
    if (request.method === 'POST' && url.pathname === '/api/ratings') {
      const input = await body(request); const actor = userFromRequest(request, db); const order = db.orders.find((item) => item.id === input.orderId)
      if (!actor || !order || order.status !== 'Paid') return json(response, 403, { error: 'Ratings are available after a paid order.' })
      if (!['seller', 'product', 'buyer'].includes(input.targetType) || !Number.isInteger(input.score) || input.score < 1 || input.score > 5) return json(response, 400, { error: 'Choose a rating from 1 to 5.' })
      const orderProducts = order.items.map((item) => db.products.find((product) => product.id === item.productId)).filter(Boolean)
      const canRateSeller = input.targetType === 'seller' && actor.role === 'buyer' && order.buyerId === actor.id && orderProducts.some((product) => product.sellerId === input.targetId)
      const canRateProduct = input.targetType === 'product' && actor.role === 'buyer' && order.buyerId === actor.id && orderProducts.some((product) => product.id === input.targetId)
      const canRateBuyer = input.targetType === 'buyer' && actor.role === 'seller' && orderProducts.some((product) => product.sellerId === actor.id) && order.buyerId === input.targetId
      if (!canRateSeller && !canRateProduct && !canRateBuyer) return json(response, 403, { error: 'You cannot rate this account or product.' })
      db.ratings = db.ratings || []
      if (db.ratings.some((rating) => rating.orderId === order.id && rating.raterId === actor.id && rating.targetType === input.targetType && rating.targetId === input.targetId)) return json(response, 409, { error: 'You have already rated this.' })
      const rating = { id: crypto.randomUUID(), orderId: order.id, raterId: actor.id, targetType: input.targetType, targetId: input.targetId, score: input.score, comment: String(input.comment || '').trim().slice(0, 300), date: new Date().toISOString() }
      db.ratings.push(rating); writeDb(db); return json(response, 201, { rating })
    }
    if (request.method === 'POST' && url.pathname === '/api/orders') {
      const input = await body(request); const buyer = userFromRequest(request, db)
      if (!buyer || buyer.role !== 'buyer') return json(response, 403, { error: 'Only buyer accounts can place orders.' })
      if (!Array.isArray(input.items) || input.items.length === 0) return json(response, 400, { error: 'Your cart is empty.' })
      let total = 0
      for (const item of input.items) { const product = db.products.find((entry) => entry.id === item.productId); if (!product || product.stock < item.quantity) return json(response, 409, { error: `${product?.name || 'A product'} is out of stock.` }); total += product.price * item.quantity }
      for (const item of input.items) { const product = db.products.find((entry) => entry.id === item.productId); product.stock -= item.quantity }
      const order = { id: `MD-${Date.now().toString().slice(-6)}`, buyerId: buyer.id, items: input.items, total, date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }), status: 'Pending' }
      db.orders.unshift(order); writeDb(db); return json(response, 201, { order, products: db.products })
    }
    if (request.method === 'POST' && url.pathname === '/api/products') {
      const input = await body(request); const seller = userFromRequest(request, db)
      if (!sellerIsApproved(seller)) return json(response, 403, { error: 'Your seller account must be approved before publishing products.' })
      const product = { ...input, id: crypto.randomUUID(), sellerId: seller.id, seller: seller.shopName || seller.name, price: Number(input.price), stock: Number(input.stock), tag: 'New listing', approvalStatus: productNeedsReview(input) ? 'pending_review' : 'approved' }
      if (!product.name || !product.price || !product.stock) return json(response, 400, { error: 'Name, price and stock are required.' })
      if (product.image && (!/^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/.test(product.image) || product.image.length > 1000000)) return json(response, 400, { error: 'Product image must be a valid URL or an image smaller than 1 MB.' })
      db.products.unshift(product); writeDb(db); return json(response, 201, { product, reviewRequired: product.approvalStatus === 'pending_review' })
    }
    const productMatch = url.pathname.match(/^\/api\/products\/([^/]+)$/)
    if (request.method === 'DELETE' && productMatch) {
      const seller = userFromRequest(request, db); const product = db.products.find((entry) => entry.id === productMatch[1])
      if (!seller || !product || product.sellerId !== seller.id) return json(response, 403, { error: 'You cannot remove this product.' })
      db.products = db.products.filter((entry) => entry.id !== product.id); writeDb(db); return json(response, 200, { ok: true })
    }
    return json(response, 404, { error: 'Not found' })
  } catch (error) { return json(response, 500, { error: error.message }) }
})
server.listen(port, () => console.log(`Marketday API running at http://localhost:${port}`))
