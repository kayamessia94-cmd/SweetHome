require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');

// ---------- Config ----------
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const FLW_KEY = (process.env.FLW_SECRET_KEY || '').trim();
const FLW_HASH = (process.env.FLW_SECRET_HASH || '').trim();
const CURRENCY = process.env.CURRENCY || 'UGX';
const TEST_MODE = !FLW_KEY;               // no key = simulated payment page
const PAID_STATES = ['paid', 'processing', 'shipped', 'delivered'];

// ---------- Tiny JSON database ----------
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let db = fs.existsSync(DB_FILE)
  ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  : { users: [], products: [], orders: [] };

const uid = () => crypto.randomBytes(6).toString('hex');
const now = () => new Date().toISOString();
function save() {
  fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db, null, 2));
  fs.renameSync(DB_FILE + '.tmp', DB_FILE);
}

if (!db.products.length) {
  db.products.push(
    { id: uid(), name: 'Studio Apartment - Booking Fee', description: 'Reserve a bright studio close to campus. Fee is deducted from your first rent.', price: 50000, stock: 10, image: 'Image/pexels-eberhardgross-1612351.jpg' },
    { id: uid(), name: '2-Bedroom House - Deposit', description: 'Family-sized house with a garden. Pay the deposit to hold it for 7 days.', price: 150000, stock: 5, image: 'Image/pexels-jonathanborba-36394720.jpg' },
    { id: uid(), name: 'Furnished Room - First Month', description: 'Furnished room with Wi-Fi and water included.', price: 300000, stock: 8, image: 'Image/pexels-mographe-15531226.jpg' }
  );
  save();
}

// ---------- App + auth helpers ----------
const app = express();
app.use(express.json());
app.use(cookieParser());

const pub = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });
function setLogin(res, u) {
  const token = jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: BASE_URL.startsWith('https'), maxAge: 7 * 24 * 3600 * 1000 });
}
function userFromReq(req) {
  try {
    const p = jwt.verify(req.cookies.token, JWT_SECRET);
    return db.users.find(u => u.id === p.id) || null;
  } catch { return null; }
}
function auth(req, res, next) {
  const u = userFromReq(req);
  if (!u) return res.status(401).json({ error: 'Please log in first.' });
  req.user = u; next();
}
function admin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  next();
}

// ---------- Accounts ----------
app.post('/api/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Use a password of at least 6 characters.' });
  if (db.users.some(u => u.email === email)) return res.status(409).json({ error: 'This email already has an account. Try logging in.' });
  const isAdmin = email === ADMIN_EMAIL || (!ADMIN_EMAIL && db.users.length === 0);
  const user = { id: uid(), name, email, phone, role: isAdmin ? 'admin' : 'user', hash: await bcrypt.hash(password, 10), createdAt: now() };
  db.users.push(user); save();
  setLogin(res, user);
  res.json({ user: pub(user) });
});

app.post('/api/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.hash)))
    return res.status(401).json({ error: 'Wrong email or password.' });
  setLogin(res, user);
  res.json({ user: pub(user) });
});

app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/api/me', (req, res) => { const u = userFromReq(req); res.json({ user: u ? pub(u) : null }); });
app.get('/api/config', (req, res) => res.json({ testMode: TEST_MODE, currency: CURRENCY }));

// ---------- Products ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, f, cb) => cb(null, uid() + path.extname(f.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, f, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(f.mimetype))
});

function readProduct(body) {
  const name = String(body.name || '').trim();
  const price = parseInt(body.price, 10);
  const stock = parseInt(body.stock, 10);
  if (!name) return { error: 'Enter the product name.' };
  if (!(price > 0)) return { error: 'Enter a price above 0.' };
  if (!(stock >= 0)) return { error: 'Enter the stock (0 or more).' };
  return { name, price, stock, description: String(body.description || '').trim() };
}

app.get('/api/products', (req, res) => res.json({ products: db.products }));

app.post('/api/products', auth, admin, upload.single('image'), (req, res) => {
  const d = readProduct(req.body);
  if (d.error) return res.status(400).json({ error: d.error });
  const p = { id: uid(), ...d, image: req.file ? '/uploads/' + req.file.filename : '' };
  db.products.push(p); save();
  res.json({ product: p });
});

app.put('/api/products/:id', auth, admin, upload.single('image'), (req, res) => {
  const p = db.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found.' });
  const d = readProduct(req.body);
  if (d.error) return res.status(400).json({ error: d.error });
  Object.assign(p, d);
  if (req.file) p.image = '/uploads/' + req.file.filename;
  save();
  res.json({ product: p });
});

app.delete('/api/products/:id', auth, admin, (req, res) => {
  db.products = db.products.filter(x => x.id !== req.params.id);
  save();
  res.json({ ok: true });
});

// ---------- Payments ----------
async function startPayment(order, user) {
  order.tx_ref = `SH-${Date.now()}-${uid()}`;   // fresh reference for every attempt
  save();
  if (TEST_MODE) return `/pay-test.html?ref=${order.tx_ref}`;

  const r = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FLW_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: order.tx_ref,
      amount: order.total,
      currency: order.currency,
      redirect_url: `${BASE_URL}/payment/callback`,
      payment_options: 'mobilemoneyuganda,card',
      customer: { email: user.email, name: user.name, phonenumber: order.phone || user.phone || '' },
      customizations: { title: 'Sweet Home', description: `Order ${order.tx_ref}` }
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status !== 'success' || !j.data || !j.data.link)
    throw new Error(j.message || 'Could not start the payment. Check your Flutterwave key.');
  return j.data.link;
}

function markPaid(order, gatewayId) {
  if (!['pending', 'failed'].includes(order.status)) return false;   // safe to call twice
  order.status = 'paid';
  order.paidAt = now();
  order.gatewayId = String(gatewayId);
  order.history.push({ status: 'paid', at: order.paidAt });
  for (const l of order.items) {
    const p = db.products.find(x => x.id === l.productId);
    if (p) p.stock = Math.max(0, p.stock - l.qty);
  }
  save();
  return true;
}

// Ask Flutterwave directly whether the payment really succeeded (never trust the browser)
async function verifyTransaction(transactionId) {
  const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${FLW_KEY}` }
  });
  const j = await r.json().catch(() => ({}));
  const d = j.data;
  if (!r.ok || j.status !== 'success' || !d) return null;
  const order = db.orders.find(o => o.tx_ref === d.tx_ref);
  if (!order) return null;
  if (d.status === 'successful' && Number(d.amount) >= order.total && d.currency === order.currency) {
    markPaid(order, d.id);
  } else if (order.status === 'pending' && ['failed', 'cancelled'].includes(d.status)) {
    order.status = 'failed'; save();
  }
  return order;
}

app.post('/api/checkout', auth, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' });
  const lines = []; let total = 0;
  for (const it of items) {
    const p = db.products.find(x => x.id === it.id);
    const qty = parseInt(it.qty, 10);
    if (!p || !(qty > 0)) return res.status(400).json({ error: 'A product in your cart no longer exists.' });
    if (qty > p.stock) return res.status(400).json({ error: `${p.name}: only ${p.stock} left.` });
    lines.push({ productId: p.id, name: p.name, price: p.price, qty });   // price always comes from the server
    total += p.price * qty;
  }
  const order = {
    id: uid(), tx_ref: '', userId: req.user.id, items: lines, total, currency: CURRENCY,
    phone: String(req.body.phone || req.user.phone || '').trim(),
    status: 'pending', createdAt: now(), history: [{ status: 'pending', at: now() }]
  };
  db.orders.push(order); save();
  try { res.json({ orderId: order.id, url: await startPayment(order, req.user) }); }
  catch (e) { res.status(502).json({ error: e.message }); }
});

app.post('/api/orders/:id/pay', auth, async (req, res) => {
  const o = db.orders.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (!['pending', 'failed'].includes(o.status)) return res.status(400).json({ error: 'This order is already paid.' });
  o.status = 'pending'; 
  try { res.json({ url: await startPayment(o, req.user) }); }
  catch (e) { res.status(502).json({ error: e.message }); }
});

// Flutterwave sends the customer back here after paying
app.get('/payment/callback', async (req, res) => {
  const { status, tx_ref, transaction_id } = req.query;
  try { if (transaction_id && status !== 'cancelled') await verifyTransaction(transaction_id); }
  catch (e) { console.error('verify error', e.message); }
  const o = db.orders.find(x => x.tx_ref === tx_ref);
  const ok = o && PAID_STATES.includes(o.status);
  res.redirect(`/orders.html?${ok ? 'paid' : 'failed'}=${encodeURIComponent(tx_ref || '')}`);
});

// Flutterwave also calls this in the background (set the URL + secret hash in its dashboard)
app.post('/api/flw-webhook', async (req, res) => {
  if (!FLW_HASH || req.headers['verif-hash'] !== FLW_HASH) return res.sendStatus(401);
  try { if (req.body && req.body.data && req.body.data.id) await verifyTransaction(req.body.data.id); }
  catch (e) { console.error('webhook error', e.message); }
  res.sendStatus(200);
});

// ---------- Test mode: simulated Mobile Money prompt ----------
app.get('/api/pay-info/:ref', auth, (req, res) => {
  const o = db.orders.find(x => x.tx_ref === req.params.ref && x.userId === req.user.id);
  if (!TEST_MODE || !o) return res.status(404).json({ error: 'Payment not found.' });
  res.json({ total: o.total, currency: o.currency, phone: o.phone, status: o.status });
});
app.post('/api/test-pay/:ref', auth, (req, res) => {
  const o = db.orders.find(x => x.tx_ref === req.params.ref && x.userId === req.user.id);
  if (!TEST_MODE || !o) return res.status(404).json({ error: 'Payment not found.' });
  if (req.body.outcome === 'success') markPaid(o, 'TEST-' + uid());
  else if (o.status === 'pending') { o.status = 'failed'; save(); }
  res.json({ status: o.status });
});

// ---------- Orders ----------
app.get('/api/orders/mine', auth, (req, res) => {
  res.json({ orders: db.orders.filter(o => o.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
});

app.get('/api/orders', auth, admin, (req, res) => {
  const orders = db.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => {
    const u = db.users.find(x => x.id === o.userId) || {};
    return { ...o, customer: { name: u.name, email: u.email, phone: o.phone || u.phone } };
  });
  res.json({ orders });
});

app.put('/api/orders/:id/status', auth, admin, (req, res) => {
  const o = db.orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  const s = req.body.status;
  if (!['processing', 'shipped', 'delivered', 'cancelled'].includes(s)) return res.status(400).json({ error: 'Invalid status.' });
  if (['pending', 'failed'].includes(o.status)) return res.status(400).json({ error: 'This order is not paid yet.' });
  if (o.status === 'cancelled') return res.status(400).json({ error: 'Cancelled orders cannot be reopened.' });
  if (s === 'cancelled') {
    for (const l of o.items) { const p = db.products.find(x => x.id === l.productId); if (p) p.stock += l.qty; }
  }
  o.status = s;
  o.history.push({ status: s, at: now() });
  save();
  res.json({ order: o });
});

app.get('/api/stats', auth, admin, (req, res) => {
  const paid = db.orders.filter(o => PAID_STATES.includes(o.status));
  res.json({
    revenue: paid.reduce((s, o) => s + o.total, 0), currency: CURRENCY,
    paidOrders: paid.length,
    toShip: db.orders.filter(o => ['paid', 'processing'].includes(o.status)).length,
    awaitingPayment: db.orders.filter(o => o.status === 'pending').length,
    customers: db.users.filter(u => u.role !== 'admin').length,
    products: db.products.length,
    testMode: TEST_MODE
  });
});

// ---------- Static site + errors ----------
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 5 MB).' : (err.message || 'Server error.') });
});

app.listen(PORT, () => {
  console.log(`Sweet Home shop running on ${BASE_URL}`);
  console.log(TEST_MODE ? 'Payments: TEST MODE (simulated Mobile Money, no Flutterwave key)' : 'Payments: Flutterwave');
  console.log(ADMIN_EMAIL ? `Admin account: ${ADMIN_EMAIL}` : 'Admin account: the first person to register');
});
