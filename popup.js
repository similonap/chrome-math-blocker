// Select DOM Elements
const activeUnlocksList = document.getElementById('active-unlocks-list');
const noUnlocks = document.getElementById('no-unlocks');
const btnOpenDashboard = document.getElementById('btn-open-dashboard');

let intervalId = null;

// Formats millisecond duration as m:ss
function formatTime(ms) {
  if (ms <= 0) return '0m 00s';
  const totalSecs = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

// Fetch active unlocks and render them
function updatePopupList() {
  chrome.storage.local.get(['unlockedUntil'], (data) => {
    const unlockedUntil = data.unlockedUntil || {};
    const now = Date.now();
    
    // Filter active (unexpired) whitelisted domains
    const activeUnlocks = Object.entries(unlockedUntil)
      .filter(([_, expiration]) => expiration > now)
      .map(([domain, expiration]) => ({ domain, expiration }));

    if (activeUnlocks.length === 0) {
      activeUnlocksList.innerHTML = '';
      noUnlocks.classList.remove('hidden');
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }

    noUnlocks.classList.add('hidden');
    
    // Render list
    activeUnlocksList.innerHTML = '';
    activeUnlocks.forEach(({ domain, expiration }) => {
      const remainingMs = expiration - now;
      const li = document.createElement('li');
      li.className = 'unlock-item';
      li.id = `unlock-${domain.replace(/\./g, '_')}`;
      
      li.innerHTML = `
        <span class="domain-name" title="${domain}">${domain}</span>
        <span class="countdown" data-expiration="${expiration}">${formatTime(remainingMs)}</span>
      `;
      activeUnlocksList.appendChild(li);
    });

    // Start live countdown updater if not already running
    if (!intervalId) {
      intervalId = setInterval(runCountdownTimers, 1000);
    }
  });
}

// Loop to update all visible timer badges in real-time
function runCountdownTimers() {
  const now = Date.now();
  const timers = document.querySelectorAll('.countdown');
  let expiredFound = false;

  timers.forEach((timer) => {
    const expiration = parseInt(timer.getAttribute('data-expiration'), 10);
    const remainingMs = expiration - now;

    if (remainingMs <= 0) {
      timer.textContent = '0m 00s';
      expiredFound = true;
    } else {
      timer.textContent = formatTime(remainingMs);
    }
  });

  // Re-sync UI if any countdown has elapsed to refresh list contents
  if (expiredFound) {
    updatePopupList();
  }
}

// Setup Event Listeners
btnOpenDashboard.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Load popup state on open
document.addEventListener('DOMContentLoaded', () => {
  updatePopupList();
});
