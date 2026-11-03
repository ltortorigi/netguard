'use strict';

const el = (id) => document.getElementById(id);
const app = {services: [], targets: []};
const humanTime = (time) => time ? new Date(time).toLocaleString() : 'Never';
const nameFor = {reachable: 'Reachable', unreachable: 'Unreachable', unknown: 'Unknown', stale: 'Stale', paused: 'Paused'};

function showMessage(text, isError = false) {
  const box = el('message');
  box.textContent = text;
  box.classList.toggle('error', isError);
  box.hidden = false;
}
async function api(url, method = 'GET', payload) {
  const response = await fetch(url, {
    method,
    headers: payload === undefined ? {} : {'Content-Type': 'application/json'},
    body: payload === undefined ? undefined : JSON.stringify(payload),
    credentials: 'same-origin',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function authenticate(yes) {
  el('loginPanel').hidden = yes;
  el('dashboard').hidden = !yes;
  el('logout').hidden = !yes;
}
async function refresh() {
  app.services = await api('/api/services');
  el('totalCount').textContent = app.services.length;
  el('upCount').textContent = app.services.filter((service) => service.status === 'reachable').length;
  el('downCount').textContent = app.services.filter((service) => service.status === 'unreachable').length;
  const list = el('services');
  list.replaceChildren();
  if (!app.services.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No services yet. Add your approved test service above.';
    list.append(empty);
  }
  for (const service of app.services) {
    const section = document.createElement('article');
    section.className = 'service';
    const description = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = service.name;
    const address = document.createElement('div');
    address.className = 'address';
    address.textContent = `${service.host}:${service.port}`;
    description.append(title, address);
    const state = document.createElement('div');
    const pill = document.createElement('span');
    pill.className = `state-pill state-${service.status}`;
    pill.textContent = nameFor[service.status] || service.status;
    const time = document.createElement('p');
    time.className = 'muted';
    time.textContent = `Last check: ${humanTime(service.latest?.checkedAt)}${service.latest ? ` · ${service.latest.latencyMs} ms` : ''}`;
    state.append(pill, time);
    const actions = document.createElement('div');
    actions.className = 'service-actions';
    const buttons = [
      ['Check now', 'check', false], ['History', 'history', false],
      ['Edit', 'edit', false], [service.enabled ? 'Pause' : 'Resume', 'toggle', false],
      ['Delete', 'delete', true],
    ];
    for (const [text, action, danger] of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `button button-outline button-small${danger ? ' button-danger' : ''}`;
      button.dataset.id = service.id;
      button.dataset.action = action;
      button.textContent = text;
      actions.append(button);
    }
    section.append(description, state, actions);
    list.append(section);
  }
}
async function loadApp() {
  authenticate(true);
  app.targets = await api('/api/targets');
  const options = el('serviceTarget');
  options.replaceChildren();
  for (const target of app.targets) {
    const option = document.createElement('option');
    option.value = `${target.host}:${target.port}`;
    option.textContent = option.value;
    options.append(option);
  }
  if (!app.targets.length) showMessage('No approved targets are configured on this server.', true);
  const health = await api('/api/health');
  el('storageMode').textContent = health.storage;
  await refresh();
}
async function perform(action) {
  try { await action(); } catch (error) { showMessage(error.message, true); }
}
el('loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  perform(async () => {
    await api('/api/login', 'POST', {password: el('password').value});
    el('password').value = '';
    await loadApp();
    showMessage('Signed in.');
  });
});
el('logout').addEventListener('click', () => perform(async () => {
  await api('/api/logout', 'POST');
  authenticate(false);
  showMessage('Signed out.');
}));
el('refresh').addEventListener('click', () => perform(refresh));
el('addForm').addEventListener('submit', (event) => {
  event.preventDefault();
  perform(async () => {
    const choice = app.targets.find((target) => `${target.host}:${target.port}` === el('serviceTarget').value);
    if (!choice) throw new Error('Select an approved target.');
    await api('/api/services', 'POST', {name: el('serviceName').value.trim(), ...choice});
    el('serviceName').value = '';
    await refresh();
    showMessage('Service added. Select “Check now” to measure it immediately.');
  });
});
el('services').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const service = app.services.find((item) => item.id === button.dataset.id);
  if (!service) return;
  perform(async () => {
    button.disabled = true;
    try {
      if (button.dataset.action === 'check') {
        const result = await api(`/api/services/${service.id}/check`, 'POST');
        showMessage(`${service.name}: ${result.reachable ? 'reachable' : 'unreachable'} (${result.latencyMs} ms).`);
      } else if (button.dataset.action === 'history') {
        const checks = await api(`/api/services/${service.id}/history`);
        el('historyTitle').textContent = `${service.name} — check history`;
        const list = el('historyList');
        list.replaceChildren();
        if (!checks.length) {
          const item = document.createElement('p');
          item.textContent = 'No checks recorded yet.';
          list.append(item);
        }
        for (const check of checks) {
          const item = document.createElement('div');
          item.className = 'check-line';
          const headline = document.createElement('strong');
          headline.textContent = `${check.reachable ? 'Reachable' : 'Unreachable'} · ${check.latencyMs} ms`;
          const details = document.createElement('small');
          details.textContent = `${humanTime(check.checkedAt)}${check.error ? ` · ${check.error}` : ''}`;
          item.append(headline, details);
          list.append(item);
        }
        el('historyDialog').showModal();
      } else if (button.dataset.action === 'edit') {
        const name = window.prompt('Service name', service.name);
        if (name === null) return;
        await api(`/api/services/${service.id}`, 'PATCH', {name: name.trim()});
        showMessage('Service updated.');
      } else if (button.dataset.action === 'toggle') {
        await api(`/api/services/${service.id}`, 'PATCH', {enabled: !service.enabled});
        showMessage(`Service ${service.enabled ? 'paused' : 'resumed'}.`);
      } else if (button.dataset.action === 'delete') {
        if (!window.confirm(`Delete ${service.name} and its check history?`)) return;
        await api(`/api/services/${service.id}`, 'DELETE');
        showMessage('Service and its history deleted.');
      }
      await refresh();
    } finally {
      button.disabled = false;
    }
  });
});
el('closeHistory').addEventListener('click', () => el('historyDialog').close());
el('historyDialog').addEventListener('click', (event) => {
  if (event.target === el('historyDialog')) el('historyDialog').close();
});
perform(async () => {
  const me = await api('/api/me');
  if (me.authenticated) await loadApp();
  else authenticate(false);
});
