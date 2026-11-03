import 'dotenv/config';
import net from 'node:net';
import {createInterface} from 'node:readline/promises';
import {stdin, stdout} from 'node:process';

// Guided, local-only demonstration using NetGuard's actual authenticated API.
// Start the NetGuard dashboard first with `npm.cmd start`.
// This script creates/reuses one named demo monitor and leaves its history saved.
const host = '127.0.0.1';
const targetPort = 43080;
const dashboardPort = Number(process.env.PORT || 3000);
const base = `http://${host}:${dashboardPort}`;
const serviceName = 'NetGuard Guided Demo';
const rl = createInterface({input: stdin, output: stdout});
let listener = null;
let cookie = '';

function say(text) {
  console.log(`\n${text}`);
}

async function request(path, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(cookie ? {Cookie: cookie} : {}),
      ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${data.error || `HTTP ${response.status}`}`);
  return {data, response};
}

async function startTarget() {
  const server = net.createServer((socket) => {
    // TCP checks commonly close the connection immediately after connecting.
    socket.on('error', (error) => {
      if (error.code !== 'ECONNRESET') console.error('Demo target socket:', error.message);
    });
    socket.end('NetGuard walkthrough target\n');
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(targetPort, host, () => {
        server.off('error', reject);
        resolve();
      });
    });
    listener = server;
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      throw new Error(`Port ${targetPort} is already in use. Stop the other demo:target window (Ctrl+C) and run this script again.`);
    }
    throw error;
  }
}

async function stopTarget() {
  if (!listener) return;
  const server = listener;
  listener = null;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function check(serviceId, expected) {
  const {data} = await request(`/api/services/${encodeURIComponent(serviceId)}/check`, 'POST');
  const status = data.reachable ? 'Reachable' : 'Unreachable';
  console.log(`  NetGuard check: ${status} (${data.latencyMs} ms) — ${data.checkedAt}`);
  if (data.reachable !== expected) {
    throw new Error(`Expected ${expected ? 'Reachable' : 'Unreachable'}, but NetGuard returned ${status}.`);
  }
}

async function main() {
  console.log('\n=== NETGUARD — GUIDED LIVE DEMONSTRATION ===');
  console.log('Demonstrates the actual API: login, approved target, TCP checks, and persisted history.');
  console.log(`Dashboard: ${base}`);
  console.log('Use the browser dashboard during the demonstration and click Refresh to update it.');

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12 ||
      process.env.ADMIN_PASSWORD === 'replace-this-with-a-strong-password') {
    throw new Error('Set your private ADMIN_PASSWORD (12+ characters) in .env first.');
  }

  let health;
  try {
    health = (await request('/api/health')).data;
  } catch (error) {
    throw new Error(`NetGuard is not responding at ${base}. Start it in another PowerShell window with npm.cmd start. (${error.message})`);
  }
  console.log(`Storage: ${health.storage}. No real service is affected.`);

  const login = await request('/api/login', 'POST', {password: process.env.ADMIN_PASSWORD});
  const setCookie = login.response.headers.get('set-cookie') || '';
  cookie = setCookie.split(';')[0];
  if (!cookie.startsWith('netguard_session=')) throw new Error('Login succeeded but no session cookie was returned.');

  const approved = (await request('/api/targets')).data;
  if (!approved.some((entry) => entry.host === host && entry.port === targetPort)) {
    throw new Error(`The local target ${host}:${targetPort} is not in ALLOWED_TARGETS. Add it to your .env and restart NetGuard.`);
  }

  let service = (await request('/api/services')).data.find((entry) =>
    entry.name === serviceName && entry.host === host && entry.port === targetPort);
  if (!service) {
    service = (await request('/api/services', 'POST',
        {name: serviceName, host, port: targetPort, enabled: true})).data;
    console.log('Added one approved demo monitor to your dashboard.');
  } else if (!service.enabled) {
    service = (await request(`/api/services/${encodeURIComponent(service.id)}`, 'PATCH', {enabled: true})).data;
    console.log('Resumed the existing guided-demo monitor.');
  } else {
    console.log('Reusing your existing guided-demo monitor; previous check history will remain.');
  }

  await startTarget();
  say('STEP 1 — Service ONLINE: a disposable TCP listener is now running.');
  await check(service.id, true);
  console.log('  In Chrome: open the dashboard, sign in, and click Refresh. Look for "NetGuard Guided Demo" = Reachable.');
  await rl.question('Press Enter to simulate an outage...');

  await stopTarget();
  say('STEP 2 — Service OFFLINE: the disposable listener has been stopped.');
  await check(service.id, false);
  console.log('  In Chrome: click Refresh. Look for Unreachable and explain that the TCP connection failed.');
  await rl.question('Press Enter to restore the service...');

  await startTarget();
  say('STEP 3 — Service RECOVERED: the same port is listening again.');
  await check(service.id, true);

  const history = (await request(`/api/services/${encodeURIComponent(service.id)}/history`)).data;
  say('STEP 4 — SAVED CHECK HISTORY (newest first):');
  for (const item of history.slice(0, 6)) {
    console.log(`  ${item.checkedAt} | ${item.reachable ? 'Reachable' : 'Unreachable'} | ${item.latencyMs} ms${item.error ? ` | ${item.error}` : ''}`);
  }
  console.log(`  NetGuard returned ${history.length} saved checks (up to its 40-check API window).`);
  console.log('  In Chrome: click Refresh, then History. Refresh the browser and open History again.');
  console.log('  Explain: the browser uses Express APIs, Node performs TCP checks, and storage saves the results.');
  console.log(`  Current storage mode: ${health.storage}.`);
  console.log('  Note: TCP reachability is not the same as full application health.');
  console.log('  Demo records are left in NetGuard so you can show them later.');
  await rl.question('\nPress Enter when you are finished presenting (this stops only the disposable listener)...');
}

try {
  await main();
  console.log('\nDemo complete. Your saved check history remains in NetGuard.');
} catch (error) {
  console.error(`\nDemo could not finish: ${error.message}`);
  process.exitCode = 1;
} finally {
  await stopTarget();
  rl.close();
}
