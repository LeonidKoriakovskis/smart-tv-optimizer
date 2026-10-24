// Smart TV Optimizer - Client Application Logic

const state = {
  adbReady: false,
  connected: false,
  deviceInfo: null,
  packages: [],
  currentFilter: 'all',
  searchQuery: '',
  pollTimer: null
};

// DOM Elements
const el = {
  // Badges
  badgeAdb: document.getElementById('badge-adb'),
  textAdbStatus: document.getElementById('text-adb-status'),
  badgeTv: document.getElementById('badge-tv'),
  textTvStatus: document.getElementById('text-tv-status'),
  bannerAdbDownload: document.getElementById('banner-adb-download'),
  btnAutoDownloadAdb: document.getElementById('btn-auto-download-adb'),
  labelDownloadProgress: document.getElementById('label-download-progress'),

  // Connection
  inputTvIp: document.getElementById('input-tv-ip'),
  btnConnectTv: document.getElementById('btn-connect-tv'),
  btnDisconnectTv: document.getElementById('btn-disconnect-tv'),
  btnScanNetwork: document.getElementById('btn-scan-network'),
  scanResults: document.getElementById('scan-results'),
  connectFeedback: document.getElementById('connect-feedback'),

  // Device Info
  cardDeviceInfo: document.getElementById('card-device-info'),
  badgeDeviceModel: document.getElementById('badge-device-model'),
  deviceInfoEmpty: document.getElementById('device-info-empty'),
  deviceInfoContent: document.getElementById('device-info-content'),
  specModel: document.getElementById('spec-model'),
  specManufacturer: document.getElementById('spec-manufacturer'),
  specAndroid: document.getElementById('spec-android'),
  specAnim: document.getElementById('spec-anim'),
  specRamText: document.getElementById('spec-ram-text'),
  ramProgressFill: document.getElementById('ram-progress-fill'),
  btnQuickRefreshDevice: document.getElementById('btn-quick-refresh-device'),
  btnRebootTv: document.getElementById('btn-reboot-tv'),

  // Packages
  inputSearchPkg: document.getElementById('input-search-pkg'),
  packagesGrid: document.getElementById('packages-grid'),
  summaryPkgCount: document.getElementById('summary-pkg-count'),
  btnRefreshPackages: document.getElementById('btn-refresh-packages'),

  // Tweaks
  btnApplyAnimation: document.getElementById('btn-apply-animation'),
  btnTrimCaches: document.getElementById('btn-trim-caches'),
  btnRebootTweak: document.getElementById('btn-reboot-tweak'),

  // Restore & Logs
  disabledPackagesList: document.getElementById('disabled-packages-list'),
  logConsole: document.getElementById('log-console'),
  btnRefreshLogs: document.getElementById('btn-refresh-logs'),

  // Toast
  toastContainer: document.getElementById('toast-container')
};

// ================= INITIALIZATION =================
window.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventListeners();
  await checkStatus();
  // Poll status periodically
  setInterval(checkStatus, 5000);
});

// Tab Switcher
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');

      if (targetId === 'tab-restore') {
        refreshLogs();
        renderRestoreList();
      }
    });
  });
}

// Event Listeners
function setupEventListeners() {
  // Auto-Download ADB
  el.btnAutoDownloadAdb.addEventListener('click', autoDownloadAdb);

  // Connect Form
  el.btnConnectTv.addEventListener('click', handleConnect);
  el.btnDisconnectTv.addEventListener('click', handleDisconnect);

  // Scan Subnet
  el.btnScanNetwork.addEventListener('click', handleScanNetwork);

  // Refresh Device
  el.btnQuickRefreshDevice.addEventListener('click', loadDeviceInfo);
  el.btnRebootTv.addEventListener('click', handleReboot);

  // Package Filters & Search
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      renderPackages();
    });
  });

  el.inputSearchPkg.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderPackages();
  });

  el.btnRefreshPackages.addEventListener('click', loadPackages);

  // Tweaks
  el.btnApplyAnimation.addEventListener('click', handleApplyAnimation);
  el.btnTrimCaches.addEventListener('click', handleTrimCaches);
  el.btnRebootTweak.addEventListener('click', handleReboot);

  const btnOpenPlayStore = document.getElementById('btn-open-tv-playstore');
  if (btnOpenPlayStore) {
    btnOpenPlayStore.addEventListener('click', handleOpenPlayStore);
  }

  const btnLockProjectivy = document.getElementById('btn-lock-projectivy');
  if (btnLockProjectivy) {
    btnLockProjectivy.addEventListener('click', handleLockProjectivy);
  }

  const btnRestoreStock = document.getElementById('btn-restore-stock-launcher');
  if (btnRestoreStock) {
    btnRestoreStock.addEventListener('click', handleRestoreStockLauncher);
  }

  // Logs
  el.btnRefreshLogs.addEventListener('click', refreshLogs);
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ================= API CALLS =================

async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    state.adbReady = data.adbReady;

    if (!data.adbReady) {
      el.badgeAdb.className = 'status-pill status-disconnected';
      el.textAdbStatus.textContent = 'ADB Not Installed';
      el.bannerAdbDownload.classList.remove('hidden');
      if (data.downloadProgress && data.downloadProgress !== 'Idle') {
        el.labelDownloadProgress.textContent = data.downloadProgress;
      }
    } else {
      el.badgeAdb.className = 'status-pill status-ready';
      el.textAdbStatus.textContent = 'ADB Ready';
      el.bannerAdbDownload.classList.add('hidden');
    }

    if (data.connectedDevice) {
      if (!state.connected) {
        state.connected = true;
        el.badgeTv.className = 'status-pill status-connected';
        el.textTvStatus.textContent = `Connected: ${data.connectedDevice}`;
        el.btnConnectTv.classList.add('hidden');
        el.btnDisconnectTv.classList.remove('hidden');
        el.inputTvIp.value = data.connectedDevice.split(':')[0];
        await loadDeviceInfo();
        await loadPackages();
      }
    } else {
      if (state.connected) {
        state.connected = false;
        el.badgeTv.className = 'status-pill status-disconnected';
        el.textTvStatus.textContent = 'TV Disconnected';
        el.btnConnectTv.classList.remove('hidden');
        el.btnDisconnectTv.classList.add('hidden');
        el.badgeDeviceModel.textContent = 'No TV Connected';
        el.deviceInfoEmpty.classList.remove('hidden');
        el.deviceInfoContent.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Status check error:', err);
  }
}

async function autoDownloadAdb() {
  el.btnAutoDownloadAdb.disabled = true;
  el.btnAutoDownloadAdb.textContent = 'Downloading...';
  el.labelDownloadProgress.textContent = 'Contacting Google repository...';

  try {
    await fetch('/api/setup-adb', { method: 'POST' });
    showToast('Platform-Tools download initiated.', 'info');

    const poll = setInterval(async () => {
      const res = await fetch('/api/status');
      const data = await res.json();
      el.labelDownloadProgress.textContent = data.downloadProgress || 'In progress...';

      if (data.adbReady) {
        clearInterval(poll);
        el.btnAutoDownloadAdb.disabled = false;
        el.btnAutoDownloadAdb.textContent = 'Downloaded & Ready';
        showToast('ADB is now ready for use!', 'success');
        await checkStatus();
      }
    }, 1500);
  } catch (err) {
    el.btnAutoDownloadAdb.disabled = false;
    showToast('Failed to start download: ' + err.message, 'error');
  }
}

async function handleConnect() {
  const ip = el.inputTvIp.value.trim();
  if (!ip) {
    showToast('Please enter your Xiaomi TV IP address.', 'error');
    return;
  }

  el.btnConnectTv.disabled = true;
  el.btnConnectTv.textContent = 'Connecting...';
  el.connectFeedback.textContent = 'Connecting via Wi-Fi port 5555...';
  el.connectFeedback.style.color = '#94a3b8';

  try {
    const res = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    const data = await res.json();

    const errMsg = data.message || data.error || 'Connection failed. Please check TV IP and USB debugging.';

    if (data.success) {
      showToast(`Connected to TV at ${ip}!`, 'success');
      el.connectFeedback.textContent = 'Connected successfully!';
      el.connectFeedback.style.color = '#10b981';
      await checkStatus();
    } else if (data.unauthorized) {
      showToast('Unauthorized: Accept prompt on TV screen!', 'error');
      el.connectFeedback.textContent = errMsg;
      el.connectFeedback.style.color = '#f59e0b';
    } else {
      showToast('Connection failed: ' + errMsg, 'error');
      el.connectFeedback.textContent = errMsg;
      el.connectFeedback.style.color = '#f43f5e';
    }
  } catch (err) {
    showToast('Connection error: ' + err.message, 'error');
    el.connectFeedback.textContent = err.message;
    el.connectFeedback.style.color = '#f43f5e';
  } finally {
    el.btnConnectTv.disabled = false;
    el.btnConnectTv.textContent = 'Connect to TV';
  }
}

async function handleDisconnect() {
  try {
    await fetch('/api/disconnect', { method: 'POST' });
    showToast('Disconnected from TV.', 'info');
    await checkStatus();
  } catch (err) {
    showToast('Disconnect error: ' + err.message, 'error');
  }
}

async function handleScanNetwork() {
  el.btnScanNetwork.disabled = true;
  el.btnScanNetwork.textContent = 'Scanning...';
  el.scanResults.classList.remove('hidden');
  el.scanResults.textContent = 'Scanning local network for open ADB port 5555...';

  try {
    const res = await fetch('/api/scan');
    const data = await res.json();

    if (data.ips && data.ips.length > 0) {
      el.scanResults.innerHTML = '<strong>Found TV(s):</strong> ';
      data.ips.forEach(foundIp => {
        const tag = document.createElement('span');
        tag.className = 'scan-ip-tag';
        tag.textContent = foundIp;
        tag.title = 'Click to use this IP';
        tag.onclick = () => {
          el.inputTvIp.value = foundIp;
          showToast(`Selected ${foundIp}`, 'info');
        };
        el.scanResults.appendChild(tag);
      });
    } else {
      el.scanResults.textContent = 'No active Android TVs detected with port 5555 open. Ensure USB Debugging is ON in TV Developer Options, then enter IP manually.';
    }
  } catch (err) {
    el.scanResults.textContent = 'Scan error: ' + err.message;
  } finally {
    el.btnScanNetwork.disabled = false;
    el.btnScanNetwork.textContent = 'Scan Wi-Fi';
  }
}

async function loadDeviceInfo() {
  try {
    const res = await fetch('/api/device-info');
    if (!res.ok) return;
    const info = await res.json();
    state.deviceInfo = info;

    el.deviceInfoEmpty.classList.add('hidden');
    el.deviceInfoContent.classList.remove('hidden');

    el.specModel.textContent = info.model;
    el.badgeDeviceModel.textContent = info.model;
    el.specManufacturer.textContent = info.manufacturer;
    el.specAndroid.textContent = `Android ${info.androidVersion} (SDK ${info.sdkLevel})`;
    el.specAnim.textContent = `${info.animationScale}x`;

    // Select matching animation radio
    const radio = document.querySelector(`input[name="anim-scale"][value="${info.animationScale}"]`);
    if (radio) radio.checked = true;

    if (info.totalRamMb !== 'Unknown' && info.freeRamMb !== 'Unknown') {
      const usedRam = info.totalRamMb - info.freeRamMb;
      const pct = Math.min(100, Math.max(0, Math.round((usedRam / info.totalRamMb) * 100)));
      el.specRamText.textContent = `${usedRam} MB used / ${info.totalRamMb} MB total (${pct}%)`;
      el.ramProgressFill.style.width = `${pct}%`;
    } else {
      el.specRamText.textContent = 'Available';
      el.ramProgressFill.style.width = '50%';
    }
  } catch (err) {
    console.error('Error fetching device info:', err);
  }
}

async function loadPackages() {
  try {
    const res = await fetch('/api/packages');
    if (!res.ok) return;
    const data = await res.json();
    state.packages = data.packages || [];
    renderPackages();
    renderRestoreList();
  } catch (err) {
    console.error('Error loading packages:', err);
  }
}

// Render Package Cards
function renderPackages() {
  const container = el.packagesGrid;
  container.innerHTML = '';

  const filtered = state.packages.filter(pkg => {
    // Search query
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matches =
        pkg.name.toLowerCase().includes(q) ||
        pkg.id.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Filter Pill
    if (state.currentFilter === 'safe') return pkg.risk === 'safe';
    if (state.currentFilter === 'xiaomi') return pkg.id.includes('xiaomi') || pkg.id.includes('miui') || pkg.category.includes('xiaomi') || pkg.category === 'patchwall';
    if (state.currentFilter === 'google') return pkg.id.includes('google') && pkg.risk !== 'critical';
    if (state.currentFilter === 'disabled') return pkg.disabled || pkg.status === 'disabled';

    return true;
  });

  el.summaryPkgCount.textContent = `Showing ${filtered.length} of ${state.packages.length} packages`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No matching packages found.</p></div>`;
    return;
  }

  filtered.forEach(pkg => {
    const card = document.createElement('div');
    const isDisabled = pkg.disabled || pkg.status === 'disabled';
    card.className = `pkg-card ${isDisabled ? 'pkg-disabled' : ''}`;

    let riskBadgeClass = 'badge-emerald';
    let riskBadgeText = 'Safe';
    if (pkg.risk === 'optional') {
      riskBadgeClass = 'badge-yellow';
      riskBadgeText = 'Optional';
    } else if (pkg.risk === 'critical') {
      riskBadgeClass = 'badge-red';
      riskBadgeText = 'Protected';
    }

    let actionBtnHtml = '';
    if (pkg.risk === 'critical') {
      actionBtnHtml = `<span class="badge badge-red" title="System Protected">Locked</span>`;
    } else if (isDisabled) {
      actionBtnHtml = `<button class="btn btn-sm btn-secondary" onclick="restoreSinglePackage('${pkg.id}')">Restore App</button>`;
    } else {
      actionBtnHtml = `<button class="btn btn-sm btn-danger" onclick="disableSinglePackage('${pkg.id}')">Disable Bloat</button>`;
    }

    card.innerHTML = `
      <div class="pkg-header">
        <div class="pkg-title-area">
          <h4>${escapeHtml(pkg.name)}</h4>
          <span class="pkg-id">${escapeHtml(pkg.id)}</span>
        </div>
        <span class="badge ${riskBadgeClass}">${riskBadgeText}</span>
      </div>
      <p class="pkg-desc">${escapeHtml(pkg.description)}</p>
      <div class="pkg-footer">
        <span class="text-muted" style="font-size:0.75rem;">Status: <strong>${isDisabled ? 'Disabled' : 'Active'}</strong></span>
        ${actionBtnHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

function renderRestoreList() {
  const container = el.disabledPackagesList;
  container.innerHTML = '';

  const disabled = state.packages.filter(p => p.disabled || p.status === 'disabled');
  if (disabled.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No disabled packages. All system apps are currently active.</p></div>`;
    return;
  }

  disabled.forEach(pkg => {
    const item = document.createElement('div');
    item.className = 'disabled-item';
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(pkg.name)}</strong>
        <div class="pkg-id">${escapeHtml(pkg.id)}</div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="restoreSinglePackage('${pkg.id}')">Restore</button>
    `;
    container.appendChild(item);
  });
}

// Package Actions
async function disableSinglePackage(packageId) {
  try {
    showToast(`Disabling ${packageId}...`, 'info');
    const res = await fetch('/api/packages/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Disabled ${packageId} successfully!`, 'success');
      await loadPackages();
      await loadDeviceInfo();
    } else {
      showToast(`Error: ${data.output || 'Failed to disable'}`, 'error');
    }
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

async function restoreSinglePackage(packageId) {
  try {
    showToast(`Restoring ${packageId}...`, 'info');
    const res = await fetch('/api/packages/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Restored ${packageId}!`, 'success');
      await loadPackages();
      await loadDeviceInfo();
    } else {
      showToast(`Error: ${data.output || 'Failed to restore'}`, 'error');
    }
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

// Presets
window.applyPreset = async function(presetId) {
  if (!confirm(`Are you sure you want to apply the "${presetId.replace('_', ' ').toUpperCase()}" profile? This will optimize bloatware and speed up system animations.`)) {
    return;
  }

  showToast(`Applying ${presetId} profile...`, 'info');
  try {
    const res = await fetch('/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId })
    });
    const data = await res.json();

    if (data.preset) {
      showToast(`Applied ${data.preset}! Disabled ${data.disabledCount} bloat packages.`, 'success');
      await loadPackages();
      await loadDeviceInfo();
    } else {
      showToast(`Error applying preset`, 'error');
    }
  } catch (err) {
    showToast(`Preset error: ${err.message}`, 'error');
  }
};

// Tweaks
async function handleApplyAnimation() {
  const selected = document.querySelector('input[name="anim-scale"]:checked');
  if (!selected) return;

  const scale = selected.value;
  try {
    showToast(`Setting animation scale to ${scale}x...`, 'info');
    const res = await fetch('/api/animations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Animation speed set to ${scale}x! Remote navigation is now faster.`, 'success');
      await loadDeviceInfo();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function handleTrimCaches() {
  try {
    showToast('Trimming dead app caches...', 'info');
    const res = await fetch('/api/trim-caches', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Cache memory cleared successfully!', 'success');
      await loadDeviceInfo();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function handleReboot() {
  if (!confirm('Reboot your TV now?')) return;
  try {
    showToast('Reboot command sent to TV...', 'info');
    await fetch('/api/reboot', { method: 'POST' });
    showToast('TV is restarting.', 'success');
    await checkStatus();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function refreshLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (data.logs) {
      el.logConsole.innerHTML = data.logs.map(l => `<div class="log-entry">${escapeHtml(l)}</div>`).join('');
      el.logConsole.scrollTop = el.logConsole.scrollHeight;
    }
  } catch (err) {}
}

async function handleOpenPlayStore() {
  try {
    showToast('Opening Google Play Store on your TV...', 'info');
    const res = await fetch('/api/open-playstore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 'com.spocky.projengmenu' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Projectivy Launcher page opened on your TV screen! Look at your TV.', 'success');
    } else {
      showToast(`Error: ${data.output || 'Failed to open Play Store on TV'}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function handleLockProjectivy() {
  if (!confirm('Lock Projectivy as your permanent default home screen? This disables the stock launcher so pressing Home will always open Projectivy without exiting.')) return;
  try {
    showToast('Setting Projectivy as default launcher...', 'info');
    const res = await fetch('/api/launcher/set-default', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Projectivy is now your permanent default home screen! Press Home on your remote to test.', 'success');
      await loadPackages();
    } else {
      showToast(`Error: ${data.error || 'Failed to lock launcher'}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function handleRestoreStockLauncher() {
  if (!confirm('Restore the stock Android TV home screen?')) return;
  try {
    showToast('Restoring stock launcher...', 'info');
    const res = await fetch('/api/launcher/restore-stock', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Stock Android TV launcher restored!', 'success');
      await loadPackages();
    } else {
      showToast(`Error: ${data.error || 'Failed to restore stock launcher'}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
