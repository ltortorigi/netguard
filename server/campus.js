import https from 'node:https';
import {createHmac} from 'node:crypto';

// Fixed public entry points, verified against UNA ITS on November 25, 2026.
// No authenticated pages, arbitrary URLs, scans, or redirect traversal.
export const CAMPUS_SYSTEMS = [
  {id: 'una-web', name: 'UNA website', description: 'University information and announcements', url: 'https://www.una.edu/', checkUrl: 'https://www.una.edu/', supportUrl: 'https://www.una.edu/its/'},
  {id: 'canvas', name: 'Canvas', description: 'Courses, assignments, and grades', url: 'https://una.instructure.com/', checkUrl: 'https://una.instructure.com/', statusUrl: 'https://status.instructure.com/', supportUrl: 'https://www.una.edu/its/canvas/'},
  {id: 'portal', name: 'UNAPortal', description: 'Student portal and campus resources', url: 'https://experience.elluciancloud.com/uona/', checkUrl: 'https://experience.elluciancloud.com/uona/', supportUrl: 'https://www.una.edu/its/unaportal/'},
  {id: 'email', name: 'UNA email / Microsoft 365', description: 'Email, Teams, and Office services · reports only', url: 'https://www.una.edu/its/office-365/index.html', statusUrl: 'https://status.cloud.microsoft/', supportUrl: 'https://www.una.edu/its/'},
  {id: 'wifi', name: 'Campus Wi-Fi', description: 'On-campus connectivity · reports only', url: 'https://www.una.edu/its/internet-access/index.html', supportUrl: 'https://www.una.edu/its/'},
];
export const REPORT_REASONS = ['cannot-load', 'login', 'slow', 'other'];
export const REPORT_WINDOW_MS = 15 * 60 * 1000;
export const CAMPUS_INTERVAL_MS = 5 * 60 * 1000;

export function reportId(secret, ip, serviceId, now = Date.now()) {
  return createHmac('sha256', secret).update(`${ip}|${serviceId}|${Math.floor(now / REPORT_WINDOW_MS)}`).digest('hex');
}
export function classifyHttp(status) {
  if (status >= 200 && status < 400) return 'responding';
  if ([401, 403, 429].includes(status)) return 'restricted';
  return 'unavailable';
}
export function campusStatus(latest, now = Date.now()) {
  if (!latest) return 'unknown';
  if (now - Date.parse(latest.checkedAt) > CAMPUS_INTERVAL_MS * 2 + 5000) return 'stale';
  return latest.state;
}

// A strict wall-clock deadline includes DNS, TLS, and response headers.
export function httpCheck(url, timeoutMs = 5000, request = https.request) {
  return new Promise((resolve) => {
    const started = Date.now();
    let req;
    let finished = false;
    const finish = (state, httpStatus = null, error = null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      req?.destroy();
      resolve({state, httpStatus, error, latencyMs: Date.now() - started, checkedAt: new Date().toISOString()});
    };
    const timer = setTimeout(() => finish('unavailable', null, 'Request timed out'), timeoutMs);
    try {
      req = request(url, {method: 'GET', headers: {'User-Agent': 'NetGuard-Capstone/1.0 (public entry-point availability check)', Accept: 'text/html'}}, (res) => {
        // Only headers are needed. Do not download pages or follow login redirects.
        res.destroy();
        finish(classifyHttp(res.statusCode), res.statusCode);
      });
      req.once('error', () => finish('unavailable', null, 'Connection or TLS failed'));
      req.end();
    } catch { finish('unavailable', null, 'Request failed'); }
  });
}

export function summarizeReports(reports, now = Date.now()) {
  const startHour = Math.floor(now / 3600000) * 3600000 - 23 * 3600000;
  const hours = Array.from({length: 24}, (_, i) => ({at: new Date(startHour + i * 3600000).toISOString(), count: 0}));
  const reasons = Object.fromEntries(REPORT_REASONS.map(reason => [reason, 0]));
  let lastHour = 0;
  let last24Hours = 0;
  for (const report of reports) {
    const time = Date.parse(report.at);
    if (time > now || time <= now - 86400000) continue;
    last24Hours++;
    if (time > now - 3600000) lastHour++;
    if (Object.hasOwn(reasons, report.reason)) reasons[report.reason]++;
    const bucket = Math.floor((time - startHour) / 3600000);
    if (bucket >= 0 && bucket < hours.length) hours[bucket].count++;
  }
  return {lastHour, last24Hours, hours, reasons};
}

export function installCampus(app, store, secret, {monitor = true} = {}) {
  const busyReports = new Set();
  app.get('/api/campus', async (req, res) => {
    const systems = await Promise.all(CAMPUS_SYSTEMS.map(async system => {
      const [latest] = await store.getChecks(`campus:${system.id}`, 1);
      const reports = summarizeReports(await store.getReports(system.id));
      return {...system, status: system.checkUrl ? campusStatus(latest) : 'reports-only', latest: latest || null, reports};
    }));
    res.json({systems, intervalMs: CAMPUS_INTERVAL_MS, generatedAt: new Date().toISOString()});
  });
  app.get('/api/campus/:id/history', async (req, res) => {
    if (!CAMPUS_SYSTEMS.some(s => s.id === req.params.id)) return res.status(404).json({error: 'Unknown UNA system.'});
    res.json(await store.getChecks(`campus:${req.params.id}`, 40));
  });
  app.post('/api/campus/:id/reports', async (req, res) => {
    const service = CAMPUS_SYSTEMS.find(s => s.id === req.params.id);
    if (!service) return res.status(404).json({error: 'Unknown UNA system.'});
    if (!REPORT_REASONS.includes(req.body?.reason) || Object.keys(req.body).some(key => key !== 'reason')) {
      return res.status(400).json({error: 'Select a problem category. Do not send personal information.'});
    }
    const id = reportId(secret, req.ip, service.id);
    if (busyReports.has(id)) return res.status(429).json({error: 'A report for this system was already submitted from this network in this 15-minute window.'});
    busyReports.add(id);
    try {
      const added = await store.addReport({id, serviceId: service.id, reason: req.body.reason, at: new Date().toISOString()});
      if (!added) return res.status(429).json({error: 'A report for this system was already submitted from this network in this 15-minute window.'});
      res.status(201).json({accepted: true});
    } finally { busyReports.delete(id); }
  });
  let running = false;
  const cycle = async () => {
    if (running) return;
    running = true;
    try {
      for (const system of CAMPUS_SYSTEMS.filter(s => s.checkUrl)) {
        await store.addCheck({...await httpCheck(system.checkUrl), serviceId: `campus:${system.id}`});
      }
    } catch (error) { console.error('Campus monitoring failed:', error.name); }
    finally { running = false; }
  };
  const timer = monitor ? setInterval(cycle, CAMPUS_INTERVAL_MS) : null;
  timer?.unref();
  if (monitor) void cycle();
  return () => clearInterval(timer);
}
