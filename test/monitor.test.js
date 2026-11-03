import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {tcpCheck, readAllowedTargets, isAllowedTarget} from '../server/tcp.js';

test('connects to a running local TCP service', async () => {
  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const check = await tcpCheck('127.0.0.1', port, 500);
    assert.equal(check.reachable, true);
    assert.equal(check.error, null);
    assert.equal(typeof check.latencyMs, 'number');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('detects a local TCP service after it has stopped', async () => {
  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const check = await tcpCheck('127.0.0.1', port, 500);
  assert.equal(check.reachable, false);
  assert.ok(check.error);
});

test('only explicitly listed addresses and ports are approved', () => {
  const allowed = readAllowedTargets('127.0.0.1:43080,localhost:4000');
  assert.equal(isAllowedTarget('127.0.0.1', 43080, allowed), true);
  assert.equal(isAllowedTarget('localhost', 4000, allowed), true);
  assert.equal(isAllowedTarget('example.com', 443, allowed), false);
  assert.equal(isAllowedTarget('127.0.0.1', 22, allowed), false);
  assert.throws(() => readAllowedTargets('localhost:70000'), /Invalid port/);
});
