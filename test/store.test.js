import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {FileStore} from '../server/store.js';

test('local demo records and outage history persist after reloading the store', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'netguard-'));
  const filename = path.join(folder, 'records.json');
  try {
    const first = new FileStore(filename);
    await first.init();
    const service = await first.addService({name: 'Demo', host: '127.0.0.1', port: 43080, enabled: true});
    await first.addCheck({serviceId: service.id, checkedAt: new Date().toISOString(), reachable: true, latencyMs: 1, error: null});
    await first.addCheck({serviceId: service.id, checkedAt: new Date().toISOString(), reachable: false, latencyMs: 2, error: 'ECONNREFUSED'});
    await first.logEvent('service-added', service.name);
    await first.close();
    const second = new FileStore(filename);
    await second.init();
    assert.equal((await second.listServices()).length, 1);
    const history = await second.getChecks(service.id);
    assert.equal(history.length, 2);
    assert.equal(history[0].reachable, false);
    assert.equal(history[1].reachable, true);
    assert.equal((await second.getEvents()).length, 1);
  } finally {
    await fs.rm(folder, {recursive: true, force: true});
  }
});
