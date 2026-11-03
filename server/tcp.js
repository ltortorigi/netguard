import net from 'node:net';
import {performance} from 'node:perf_hooks';

/** TCP checks answer whether the socket accepted a connection, not app health. */
export function tcpCheck(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const started = performance.now();
    let settled = false;
    let socket;
    const finish = (reachable, error = null) => {
      if (settled) return;
      settled = true;
      const latencyMs = Math.round(performance.now() - started);
      socket?.destroy();
      resolve({
        reachable,
        latencyMs,
        error,
        checkedAt: new Date().toISOString(),
      });
    };
    try {
      socket = net.createConnection({host, port});
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false, 'Connection timed out'));
      socket.once('error', (err) => {
        const safeCodes = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ETIMEDOUT', 'ENOTFOUND']);
        finish(false, safeCodes.has(err.code) ? err.code : 'Connection failed');
      });
    } catch {
      finish(false, 'Connection failed');
    }
  });
}

export function readAllowedTargets(value = '127.0.0.1:43080') {
  return value.split(',').map((part) => part.trim()).filter(Boolean).map((item) => {
    const match = /^(\[[a-f\d:]+\]|[a-z\d.-]+):(\d+)$/i.exec(item);
    if (!match) throw new Error(`Invalid ALLOWED_TARGETS entry: ${item}`);
    const port = Number(match[2]);
    if (port < 1 || port > 65535) throw new Error(`Invalid port in ALLOWED_TARGETS: ${item}`);
    return {host: match[1].replace(/^\[|\]$/g, '').toLowerCase(), port};
  });
}

export function isAllowedTarget(host, port, allowed) {
  return allowed.some((target) => target.host === String(host).toLowerCase() && target.port === port);
}
