import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MongoStore} from '../server/store.js';

test('MongoDB stores checks and atomically rejects duplicate reports', {skip:!process.env.TEST_MONGODB_URI}, async () => {
  const store = new MongoStore(process.env.TEST_MONGODB_URI, `netguard_test_${randomUUID().replaceAll('-','')}`);
  try {
    await store.init();
    const s = await store.addService({name:'Fixture',host:'127.0.0.1',port:43080,enabled:true});
    await store.addCheck({serviceId:s.id,reachable:true,checkedAt:new Date().toISOString()});
    assert.equal((await store.getChecks(s.id))[0].reachable,true);
    const report = {id:'duplicate-fixture',serviceId:'canvas',reason:'login',at:new Date().toISOString()};
    const results = await Promise.all([store.addReport(report),store.addReport(report)]);
    assert.deepEqual(results.sort(),[false,true]);
    assert.equal((await store.getReports('canvas')).length,1);
    await store.updateService(s.id,{enabled:false});
    assert.equal((await store.getService(s.id)).enabled,false);
    await store.deleteService(s.id);
    assert.equal((await store.getChecks(s.id)).length,0);
    await store.logEvent('fixture','Test event');
    assert.equal((await store.getEvents()).length,1);
  } finally {
    if(store.client) await store.client.db(store.dbName).dropDatabase();
    await store.close();
  }
});
