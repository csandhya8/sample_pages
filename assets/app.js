
// assets/app.js — LOB → App cascade + package display

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

async function init() {
  const lobSel = $('lobSel');
  const appSel = $('appSel');
  const clearBtn = $('clearBtn');
  const reloadBtn = $('reloadBtn');

  setStatus('Loading data…');

  let lobToApps, appToPackage, appToDescription;
  try {
    // Ensure these files exist under /data/
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

  // Populate LOBs
  const lobList = Object.keys(lobToApps).sort();
  setOptions(lobSel, lobList, 'Select LOB');
  setStatus(`Loaded ${lobList.length} LOBs.`);

  // Restore previous selection if available
  const saved = loadSelection();
  if (saved.lob && lobList.includes(saved.lob)) {
    lobSel.value = saved.lob;
    const apps = lobToApps[saved.lob] || [];
    setOptions(appSel, apps, apps.length ? 'Select App' : 'No apps found');
    appSel.disabled = apps.length === 0;

    if (saved.app && apps.includes(saved.app)) {
      appSel.value = saved.app;
      const pkg = appToPackage[saved.app] || '—';
      const desc = appToDescription[saved.app] || '—';
      updateSummary({ lob: saved.lob, app: saved.app, pkg, desc });
    } else {
      updateSummary({ lob: saved.lob, app: '', pkg: '', desc: '' });
    }
  } else {
    // Initial state
    appSel.disabled = true;
    updateSummary({ lob: '', app: '', pkg: '', desc: '' });
  }

  // LOB change → populate apps and reset package/desc
  lobSel.addEventListener('change', () => {
    const lob = lobSel.value;
    const apps = lob ? (lobToApps[lob] || []) : [];
    setOptions(appSel, apps, apps.length ? 'Select App' : 'No apps found');
    appSel.disabled = apps.length === 0;
    saveSelection({ lob, app: '' });
    updateSummary({ lob, app: '', pkg: '', desc: '' });
  });

  // App change → show package/desc
  appSel.addEventListener('change', () => {
    const lob = lobSel.value;
    const app = appSel.value;
    const pkg = app ? (appToPackage[app] || '—') : '—';
    const desc = app ? (appToDescription[app] || '—') : '—';
    saveSelection({ lob, app });
    updateSummary({ lob, app, pkg, desc });
  });

  // Clear
  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('lobApp');
    lobSel.value = '';
    setOptions(appSel, [], 'Select App');
    appSel.disabled = true;
    updateSummary({ lob: '', app: '', pkg: '', desc: '' });
    setStatus('Cleared.', 'info');
  });

  // Reload (re-fetch)
  reloadBtn.addEventListener('click', () => {
    init();
  });
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
