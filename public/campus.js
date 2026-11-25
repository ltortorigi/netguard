'use strict';
const $ = id => document.getElementById(id);
const labels = {responding:'Responding', unavailable:'Check failed', restricted:'Restricted', unknown:'Not checked', stale:'Stale result', 'reports-only':'Reports only'};
const reasons = {'cannot-load':'Cannot load', login:'Login', slow:'Slow', other:'Other'};
let systems = [];
let reportSystem;
function node(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}
function link(text, url) {
  const a = node('a', text);
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
const time = value => new Date(value).toLocaleString();
async function api(path, body) {
  const response = await fetch(path, body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : {});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load data.');
  return data;
}
function notice(text) { $('message').textContent = text; $('message').hidden = false; }
function renderSystems() {
  const container = $('systems'); container.replaceChildren();
  for (const s of systems) {
    const card = node('article', undefined, 'system-card');
    const top = node('div', undefined, 'card-top');
    top.append(node('span', s.id === 'una-web' ? 'UNA' : s.name.slice(0,1), 'system-icon'), node('span', labels[s.status] || 'Unknown', `badge ${s.status}`));
    card.append(top, node('h3', s.name), node('p', s.description, 'subtle'));
    const latest = s.latest ? `${time(s.latest.checkedAt)} · ${s.latest.latencyMs} ms${s.latest.httpStatus ? ` · HTTP ${s.latest.httpStatus}` : ''}` : s.checkUrl ? 'Waiting for the first check' : 'No automated check for this system';
    card.append(node('p', latest, 'check-time'), node('p', `${s.reports.lastHour} report${s.reports.lastHour === 1 ? '' : 's'} in the past hour`, 'report-count'));
    const actions = node('div', undefined, 'card-actions');
    const report = node('button', 'Report a problem', 'secondary');
    report.type = 'button'; report.onclick = () => { reportSystem = s.id; $('reportTitle').textContent = `Report: ${s.name}`; $('reportError').textContent = ''; $('reportDialog').showModal(); };
    actions.append(report);
    if (s.checkUrl) {
      const history = node('button', 'History', 'text-button'); history.type = 'button';
      history.onclick = async () => {
        try {
          const data = await api(`/api/campus/${s.id}/history`);
          $('historyTitle').textContent = `${s.name} history`;
          $('history').replaceChildren();
          if (!data.length) $('history').append(node('p', 'No checks recorded yet.'));
          for (const check of data) $('history').append(node('p', `${time(check.checkedAt)} · ${labels[check.state] || 'Unknown'} · ${check.latencyMs} ms${check.httpStatus ? ` · HTTP ${check.httpStatus}` : ''}${check.error ? ` · ${check.error}` : ''}`, 'history-row'));
          $('historyDialog').showModal();
        } catch(error) { notice(error.message); }
      };
      actions.append(history);
    }
    card.append(actions);
    const links = node('div', undefined, 'card-links');
    links.append(link('Open service ↗', s.url));
    if (s.statusUrl) links.append(link('Official status ↗', s.statusUrl));
    card.append(links); container.append(card);
  }
  container.setAttribute('aria-busy','false');
}
function renderChart() {
  const s = systems.find(s => s.id === $('chartSystem').value);
  if (!s) return;
  $('reportTotal').textContent = s.reports.last24Hours;
  const chart = $('chart'); chart.replaceChildren();
  const max = Math.max(1, ...s.reports.hours.map(h => h.count));
  const table = node('table'); const head = node('tr');
  head.append(node('th','Hour beginning'), node('th','Reports')); table.append(head);
  for (const h of s.reports.hours) {
    const column = node('div',undefined,'chart-column');
    const bar = node('div',undefined,'bar');
    // A fixed set of CSS classes works with the strict no-inline-style policy.
    bar.classList.add(`height-${Math.round(h.count / max * 10)}`);
    column.title = `${time(h.at)}: ${h.count} reports`;
    column.append(bar); chart.append(column);
    const row = node('tr'); row.append(node('td',time(h.at)), node('td',String(h.count))); table.append(row);
  }
  $('chartTable').replaceChildren(table);
  $('reportBreakdown').textContent = Object.entries(s.reports.reasons).map(([key,count]) => `${reasons[key]}: ${count}`).join(' · ');
}
async function refresh() {
  $('refresh').disabled = true;
  try {
    const data = await api('/api/campus'); systems = data.systems;
    const checked = systems.filter(s => s.checkUrl);
    const responding = checked.filter(s => s.status === 'responding').length;
    const waiting = checked.filter(s => ['unknown','stale'].includes(s.status)).length;
    $('summaryTitle').textContent = waiting === checked.length
      ? 'Waiting for current checks'
      : `${responding} of ${checked.length} entry points responding${waiting ? ` · ${waiting} awaiting a current result` : ''}`;
    $('summaryDetail').textContent = 'Automated checks and student reports are independent signals. Check times appear below.';
    $('updated').textContent = `Dashboard updated ${time(data.generatedAt)}`;
    const choice = $('chartSystem').value; $('chartSystem').replaceChildren();
    for (const s of systems) { const o = node('option',s.name); o.value = s.id; $('chartSystem').append(o); }
    if (systems.some(s => s.id === choice)) $('chartSystem').value = choice;
    renderSystems(); renderChart();
  } catch(error) {
    $('summaryTitle').textContent = 'Live status unavailable';
    $('summaryDetail').textContent = 'Could not refresh. Any results below are from the previous dashboard update; use their timestamps.';
    notice(error.message);
  } finally { $('refresh').disabled = false; }
}
$('refresh').onclick = refresh;
$('chartSystem').onchange = renderChart;
$('reportForm').onsubmit = async event => {
  event.preventDefault(); $('submitReport').disabled = true;
  try {
    await api(`/api/campus/${reportSystem}/reports`, {reason:$('reason').value});
    $('reportDialog').close(); notice('Report received. It is counted as an unverified user report.'); await refresh();
  } catch(error) { $('reportError').textContent = error.message; }
  finally { $('submitReport').disabled = false; }
};
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
refresh();
setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) refresh(); }, 60000);
