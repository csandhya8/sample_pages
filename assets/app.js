
// assets/app.js — Diagnostic build: LOB → App cascade + package display

function $(id) { return document.getElementById(id); }

function setStatus(msg, type = 'info') {
  const el = $('status');
  el.textContent = msg || '';
  el.style.color = type === 'error' ? 'var(--err)' : 'var(--muted)';
}

function setOptions(select, items, placeholderText) {
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = placeholderText;
  select.appendChild(placeholder);

  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  }
}

async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: HTTP ${res.status}`);
  return res.json();
}

function updateSummary({ lob, app, pkg, desc }) {
  $('lobOut').textContent = lob || '—';
  $('appOut').textContent = app || '—';
  $('pkgOut').textContent = pkg || '—';
  $('descOut').textContent = desc || '—';
}

function saveSelection({ lob, app }) {
  localStorage.setItem('lobApp', JSON.stringify({ lob: lob || '', app: app || '' }));
}
function loadSelection() {
  try {
    const raw = localStorage.getItem('lobApp');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function diag(label, value) {
  console.log(`[GRS] ${label}:`, value);
  const el = $('status');
  el.textContent = `${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`;
}

async function init() {
  const lobSel = $('lobSel');
  const appSel = $('appSel');
  const clearBtn = $('clearBtn');
  const reloadBtn = $('reloadBtn');

  setStatus('Loading data…');

  let lobToApps, appToPackage, appToDescription;
  try {
    [lobToApps, appToPackage, appToDescription] = await Promise.all([
      fetchJSON('data/lobToApps.json'),
      fetchJSON('data/appToPackage.json'),
      fetchJSON('data/appToDescription.json'),
    ]);
  } catch (err) {
    console.error(err);
    setStatus(err.message, 'error');
    return;
  }

  const hasRTL = lobToApps && typeof lobToApps === 'object';
  const hasPkg = appToPackage && typeof appToPackage === 'object';
  const hasDesc = appToDescription && typeof appToDescription === 'object';
  diag('Loaded sections', { lobToApps: hasRTL, appToPackage: hasPkg, appToDescription: hasDesc });

  if (!hasRTL) {
    setStatus('No LOB data found (lobToApps.json missing or invalid).', 'error');
    return;
  }

  const lobList = Object.keys(lobToApps).sort();
  diag('LOB list', lobList);
  setOptions(lobSel, lobList, lobList.length ? 'Select LOB' : 'No LOBs found');

  if (!lobList.length) {
    setStatus('LOB list is empty. Check data/lobToApps.json content.', 'error');
    appSel.disabled = true;
    updateSummary({ lob: '', app: '', pkg: '', desc: '' });
    return;
  }

  setStatus(`Loaded ${lobList.length} LOBs.`);

  // Restore previous selection
  const saved = loadSelection();
  if (saved.lob && lobList.includes(saved.lob)) {
    lobSel.value = saved.lob;
    const apps = lobToApps[saved.lob] || [];
    setOptions(appSel, apps, apps.length ? 'Select App' : 'No apps found');
    appSel.disabled = apps.length === 0;
    diag('Apps for saved LOB', apps);

    if (saved.app && apps.includes(saved.app)) {
      appSel.value = saved.app;
      const pkg = hasPkg ? (appToPackage[saved.app] || '—') : '—';
      const desc = hasDesc ? (appToDescription[saved.app] || '—') : '—';
      updateSummary({ lob: saved.lob, app: saved.app, pkg, desc });
    } else {
      updateSummary({ lob: saved.lob, app: '', pkg: '', desc: '' });
    }
  } else {
    appSel.disabled = true;
    updateSummary({ lob: '', app: '', pkg: '', desc: '' });
  }

  // LOB change → Apps
  lobSel.addEventListener('change', () => {
    const lob = lobSel.value;
    const apps = lob ? (lobToApps[lob] || []) : [];
    diag(`Apps under ${lob}`, apps);
    setOptions(appSel, apps, apps.length ? 'Select App' : 'No apps found');
    appSel.disabled = apps.length === 0;
    saveSelection({ lob, app: '' });
    updateSummary({ lob, app: '', pkg: '', desc: '' });
  });

  // App change → Package/Desc
  appSel.addEventListener('change', () => {
    const lob = lobSel.value;
    const app = appSel.value;
    const pkg = hasPkg ? (appToPackage[app] || '—') : '—';
    const desc = hasDesc ? (appToDescription[app] || '—') : '—';
    diag(`Resolved for ${app}`, { package: pkg, description: desc });
    saveSelection({ lob, app });
    updateSummary({ lob, app, pkg, desc });
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('lobApp');
    lobSel.value = '';
    setOptions(appSel, [], 'Select App');
    appSel.disabled = true;
    updateSummary({ lob: '', app: '', pkg: '', desc: '' });
    setStatus('Cleared.', 'info');
  });

  reloadBtn.addEventListener('click', () => {
    init();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
