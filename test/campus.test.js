import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {httpCheck, classifyHttp, campusStatus, reportId, summarizeReports, CAMPUS_SYSTEMS} from '../server/campus.js';

test('public entry-point responses do not claim full application health', () => {
  assert.equal(classifyHttp(200), 'responding');
  assert.equal(classifyHttp(302), 'responding');
  for (const status of [401,403,429]) assert.equal(classifyHttp(status), 'restricted');
  for (const status of [404,500,503]) assert.equal(classifyHttp(status), 'unavailable');
  assert.equal(campusStatus(null), 'unknown');
  assert.equal(campusStatus({state:'responding', checkedAt:'2020-01-01T00:00:00Z'}), 'stale');
});

test('HTTPS check captures headers and destroys response without following redirects', async () => {
  let requestCount = 0, destroyed = false;
  const result = await httpCheck('https://fixture.invalid/', 200, (url, options, callback) => {
    requestCount++;
    const request = new EventEmitter(); request.destroy = () => {};
    request.end = () => callback({statusCode:302, destroy:() => { destroyed = true; }});
    return request;
  });
  assert.equal(result.state, 'responding'); assert.equal(result.httpStatus,302);
  assert.equal(requestCount,1); assert.equal(destroyed,true);
});

test('HTTPS outage and recovery classification and wall-clock timeout', async () => {
  for (const statusCode of [200,503,200]) {
    const result = await httpCheck('https://fixture.invalid/', 100, (url, options, callback) => {
      const req = new EventEmitter(); req.destroy = () => {}; req.end = () => callback({statusCode,destroy(){}}); return req;
    });
    assert.equal(result.state,statusCode === 503 ? 'unavailable' : 'responding');
  }
  const result = await httpCheck('https://fixture.invalid/', 20, () => {
    const req = new EventEmitter(); req.destroy = () => {}; req.end = () => {}; return req;
  });
  assert.equal(result.state,'unavailable'); assert.equal(result.error,'Request timed out');
});

test('report counts exclude expired and future records and preserve reason/hour totals', () => {
  const now = Date.parse('2026-11-25T12:30:00Z');
  const at = age => new Date(now - age).toISOString();
  const summary = summarizeReports([
    {reason:'login',at:at(1000)}, {reason:'slow',at:at(2*3600000)},
    {reason:'other',at:at(25*3600000)}, {reason:'login',at:at(-1000)},
  ],now);
  assert.equal(summary.lastHour,1); assert.equal(summary.last24Hours,2);
  assert.equal(summary.reasons.login,1); assert.equal(summary.hours.length,24);
  assert.equal(summary.hours.reduce((n,h)=>n+h.count,0),2);
});

test('duplicate identity is stable within a window and exposes no raw network address', () => {
  const id = reportId('test-secret','192.0.2.1','canvas',1000);
  assert.equal(id,reportId('test-secret','192.0.2.1','canvas',2000));
  assert.notEqual(id,reportId('test-secret','192.0.2.1','portal',2000));
  assert.notEqual(id,reportId('test-secret','192.0.2.1','canvas',900001));
  assert.match(id,/^[a-f0-9]{64}$/);
  assert.equal(CAMPUS_SYSTEMS.filter(s=>s.checkUrl).length,3);
});
