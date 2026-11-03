import 'dotenv/config';
import express from 'express';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.js';
import {tcpCheck, readAllowedTargets, isAllowedTarget} from './tcp.js';

const password = process.env.ADMIN_PASSWORD;
if (!password || password === 'replace-this-with-a-strong-password' || password.length < 12) {
  console.error('Set a unique ADMIN_PASSWORD with at least 12 characters in .env.');
  process.exit(1);
}

const allowed = readAllowedTargets(process.env.ALLOWED_TARGETS);
const intervalMs = Math.max(10000, Number(process.env.CHECK_INTERVAL_MS) || 60000);
const timeoutMs = Math.min(5000, Math.max(1000, Number(process.env.CHECK_TIMEOUT_MS) || 5000));
const store = createStore();
await store.init();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(express.json({limit: '12kb'}));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const sessions = new Map();
const loginAttempts = new Map();
const SESSION_MS = 8 * 60 * 60 * 1000;
const cookieName = 'netguard_session';
const matchesSecret = (given, expected) => {
  const a = Buffer.from(typeof given === 'string' ? given : '');
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
const tokenFromCookie = (req) => {
  const cookie = req.headers.cookie || '';
  const pair = cookie.split(';').map((value) => value.trim())
      .find((value) => value.startsWith(`${cookieName}=`));
  return pair ? pair.slice(cookieName.length + 1) : null;
};
const sessionFor = (req) => {
  const token = tokenFromCookie(req);
  const expires = token && sessions.get(token);
  if (!expires || expires < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return token;
};
const requireAuth = (req, res, next) => {
  if (!sessionFor(req)) return res.status(401).json({error: 'Sign in to continue.'});
  next();
};
const sameOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (!origin) return next(); // Curl or other non-browser clients still require login.
  try {
    if (new URL(origin).host === req.get('host')) return next();
  } catch { /* Reject malformed origins. */ }
  return res.status(403).json({error: 'Request origin is not allowed.'});
};
app.use('/api', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return sameOrigin(req, res, next);
  next();
});

app.get('/api/health', (req, res) => res.json({status: 'ok', storage: store.mode}));
app.get('/api/me', (req, res) => res.json({authenticated: Boolean(sessionFor(req))}));
app.post('/api/login', async (req, res) => {
  const key = req.ip;
  const now = Date.now();
  const attempts = loginAttempts.get(key) ?? {count: 0, until: now + 15 * 60 * 1000};
  if (now > attempts.until) { attempts.count = 0; attempts.until = now + 15 * 60 * 1000; }
  if (attempts.count >= 8) return res.status(429).json({error: 'Too many attempts. Try again later.'});
  if (!matchesSecret(req.body?.password, password)) {
    attempts.count++;
    loginAttempts.set(key, attempts);
    return res.status(401).json({error: 'Incorrect password.'});
  }
  loginAttempts.delete(key);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, now + SESSION_MS);
  res.cookie(cookieName, token, {
    httpOnly: true, sameSite: 'strict', secure: req.secure,
    maxAge: SESSION_MS, path: '/',
  });
  await store.logEvent('sign-in', 'Administrator signed in');
  res.json({authenticated: true});
});
app.post('/api/logout', requireAuth, (req, res) => {
  sessions.delete(tokenFromCookie(req));
  res.clearCookie(cookieName, {path: '/'});
  res.json({authenticated: false});
});

app.use('/api', requireAuth);
app.get('/api/targets', (req, res) => res.json(allowed));
app.get('/api/events', async (req, res) => res.json(await store.getEvents(20)));

const statusFor = (service, latest) => {
  if (!service.enabled) return 'paused';
  if (!latest) return 'unknown';
  if (Date.now() - Date.parse(latest.checkedAt) > intervalMs * 2 + timeoutMs) return 'stale';
  return latest.reachable ? 'reachable' : 'unreachable';
};
app.get('/api/services', async (req, res) => {
  const services = await store.listServices();
  const summary = await Promise.all(services.map(async (service) => {
    const [latest] = await store.getChecks(service.id, 1);
    return {...service, status: statusFor(service, latest), latest: latest || null};
  }));
  res.json(summary);
});

function validatedService(input, current = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (Object.keys(input).some((key) => !['name', 'host', 'port', 'enabled'].includes(key))) return null;
  const name = input.name === undefined ? current?.name : input.name;
  const host = input.host === undefined ? current?.host : input.host;
  const port = input.port === undefined ? current?.port : Number(input.port);
  const enabled = input.enabled === undefined ? (current?.enabled ?? true) : input.enabled;
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 80 ||
      typeof host !== 'string' || !Number.isInteger(port) ||
      typeof enabled !== 'boolean' || !isAllowedTarget(host, port, allowed)) return null;
  return {name: name.trim(), host: host.toLowerCase(), port, enabled};
}
app.post('/api/services', async (req, res) => {
  const service = validatedService(req.body);
  if (!service) return res.status(400).json({error: 'Enter a name and select an approved host and port.'});
  const added = await store.addService(service);
  await store.logEvent('service-added', `${added.name} (${added.host}:${added.port})`);
  res.status(201).json(added);
});
app.patch('/api/services/:id', async (req, res) => {
  const existing = await store.getService(req.params.id);
  if (!existing) return res.status(404).json({error: 'Service not found.'});
  const changes = validatedService(req.body, existing);
  if (!changes) return res.status(400).json({error: 'Invalid changes or unapproved monitoring target.'});
  const updated = await store.updateService(existing.id, changes);
  await store.logEvent('service-updated', `${updated.name} (${updated.host}:${updated.port})`);
  res.json(updated);
});
app.delete('/api/services/:id', async (req, res) => {
  const existing = await store.getService(req.params.id);
  if (!existing) return res.status(404).json({error: 'Service not found.'});
  await store.deleteService(existing.id);
  await store.logEvent('service-deleted', existing.name);
  res.json({deleted: true});
});
app.get('/api/services/:id/history', async (req, res) => {
  const service = await store.getService(req.params.id);
  if (!service) return res.status(404).json({error: 'Service not found.'});
  res.json(await store.getChecks(service.id, 40));
});

const activeChecks = new Set();
async function runCheck(service) {
  if (!service.enabled) return {skipped: 'paused'};
  if (activeChecks.has(service.id)) return {skipped: 'already checking'};
  activeChecks.add(service.id);
  try {
    const check = await tcpCheck(service.host, service.port, timeoutMs);
    const record = {...check, serviceId: service.id};
    await store.addCheck(record);
    return record;
  } finally {
    activeChecks.delete(service.id);
  }
}
app.post('/api/services/:id/check', async (req, res) => {
  const service = await store.getService(req.params.id);
  if (!service) return res.status(404).json({error: 'Service not found.'});
  const result = await runCheck(service);
  if (result.skipped) return res.status(409).json({error: result.skipped});
  res.json(result);
});

app.use('/api', (req, res) => res.status(404).json({error: 'Unknown API endpoint.'}));
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
app.use(express.static(publicDir));
app.get(/.*/, (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('NetGuard request failed:', error.name || 'Error');
  res.status(error.type === 'entity.parse.failed' ? 400 : 503)
      .json({error: 'Request could not be completed.'});
});

let cycleRunning = false;
async function runCycle() {
  if (cycleRunning) return;
  cycleRunning = true;
  try {
    const services = await store.listServices();
    await Promise.all(services.filter((service) => service.enabled).map(runCheck));
  } catch (error) {
    console.error('Monitoring cycle failed:', error.name || 'Error');
  } finally {
    cycleRunning = false;
  }
}
const timer = setInterval(runCycle, intervalMs);
timer.unref();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, host, () => {
  console.log(`NetGuard running on http://${host}:${port} (storage: ${store.mode})`);
});
const stop = async () => {
  clearInterval(timer);
  server.close();
  await store.close();
};
process.once('SIGINT', () => { stop().finally(() => process.exit(0)); });
process.once('SIGTERM', () => { stop().finally(() => process.exit(0)); });
